/**
 * Vercel serverless function: AI agent for task delegation.
 * Uses GPT-4o with Tavily web search to research and answer tasks.
 */

const OpenAI = require('openai');

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

const tools = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information — prices, availability, news, routes, schedules, or any real-time data.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured.' });
  }
  if (!process.env.TAVILY_API_KEY) {
    return res.status(500).json({ error: 'TAVILY_API_KEY not configured. Get a free key at tavily.com.' });
  }

  const body = parseBody(req) || {};
  const { taskText, taskDescription, conversationHistory = [] } = body;

  if (!taskText || typeof taskText !== 'string') {
    return res.status(400).json({ error: 'taskText is required' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const firstUserMessage = taskDescription?.trim()
    ? `${taskText}\n\nContext: ${taskDescription}`
    : taskText;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: firstUserMessage },
  ];

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

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2048,
        tools,
        messages,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === 'stop') {
        finalComment = choice.message.content?.trim() || '';
        break;
      }

      if (choice.finish_reason === 'tool_calls') {
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls || []) {
          if (toolCall.function.name !== 'web_search') continue;
          let args;
          try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
          searches.push(args.query);
          const result = await webSearch(args.query);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } else {
        finalComment = choice.message.content?.trim() || '';
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
