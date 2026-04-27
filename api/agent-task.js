/**
 * Vercel serverless function: AI agent for task delegation.
 * Uses Claude with Tavily web search to research and answer tasks.
 */

const Anthropic = require('@anthropic-ai/sdk');

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

async function webSearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();
  const results = (data.results || []).map(r => ({
    title: r.title,
    url: r.url,
    content: r.content?.slice(0, 600),
  }));
  return JSON.stringify({ answer: data.answer || null, results });
}

const SYSTEM_PROMPT = `You are a smart personal assistant that searches the web to complete tasks.

Guidelines:
- Search the web to find accurate, current information
- For travel (flights, hotels, trains): always include a direct booking link with dates/routes pre-filled where possible. Skyscanner deeplinks follow this pattern: https://www.skyscanner.net/transport/flights/{FROM_IATA}/{TO_IATA}/{YYYYMMDD}/ for one-way, add /{RETURN_YYYYMMDD}/ for return
- For prices: give approximate ranges and note they may vary; always include a source link
- Be concise and practical — give the user what they need to act
- Use **bold** for key figures/prices, bullet points for lists of options
- At the end, include a "Sources:" line with the main URLs used`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables.' });
  }
  if (!process.env.TAVILY_API_KEY) {
    return res.status(500).json({ error: 'TAVILY_API_KEY not configured. Add it to your Vercel environment variables.' });
  }

  const body = parseBody(req) || {};
  const { taskText, taskDescription, conversationHistory = [] } = body;

  if (!taskText || typeof taskText !== 'string') {
    return res.status(400).json({ error: 'taskText is required' });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tools = [
    {
      name: 'web_search',
      description: 'Search the web for current information — prices, availability, news, routes, schedules, or any real-time data.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  ];

  // Build message history: task context first, then prior conversation
  const firstUserMessage = taskDescription?.trim()
    ? `${taskText}\n\nContext: ${taskDescription}`
    : taskText;

  const messages = [{ role: 'user', content: firstUserMessage }];

  for (const msg of conversationHistory) {
    if (msg.author && msg.content) {
      messages.push({
        role: msg.author === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  const searches = [];
  let finalComment = null;
  let iterations = 0;
  const MAX_ITERATIONS = 8;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools,
        messages,
        system: SYSTEM_PROMPT,
      });

      if (response.stop_reason === 'end_turn') {
        finalComment = response.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim();
        break;
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          searches.push(block.input.query);
          const result = await webSearch(block.input.query);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        messages.push({ role: 'user', content: toolResults });
      } else {
        break;
      }
    }

    if (!finalComment) {
      return res.status(500).json({ error: 'Agent did not produce a response' });
    }

    return res.status(200).json({ comment: finalComment, searches });
  } catch (err) {
    console.error('[agent-task] Error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Agent error' });
  }
};
