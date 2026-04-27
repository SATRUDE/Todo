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

async function isUrlAlive(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
    });
    clearTimeout(timer);
    // 404/410 = definitely dead. Anything else (200, 403, 405...) = URL exists.
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
}

async function stripDeadLinks(text) {
  // Extract all markdown links [label](url) and bare https:// URLs
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const bareUrlRegex = /(?<!\()https?:\/\/[^\s\)>\]"]+/g;

  const urls = new Map(); // url -> Set of full match strings in text
  let match;

  while ((match = mdLinkRegex.exec(text)) !== null) {
    const url = match[2];
    if (!urls.has(url)) urls.set(url, new Set());
    urls.get(url).add(match[0]);
  }
  while ((match = bareUrlRegex.exec(text)) !== null) {
    const url = match[0];
    if (!urls.has(url)) urls.set(url, new Set());
    urls.get(url).add(match[0]);
  }

  if (urls.size === 0) return text;

  const checks = await Promise.all(
    [...urls.keys()].map(url => isUrlAlive(url).then(alive => ({ url, alive })))
  );

  let result = text;
  for (const { url, alive } of checks) {
    if (!alive) {
      for (const match of urls.get(url)) {
        // Replace dead markdown link with just the label; replace dead bare URL with placeholder
        const isMarkdown = match.startsWith('[');
        const replacement = isMarkdown
          ? match.replace(/\]\(https?:\/\/[^\)]+\)/, '] *(link unavailable)*')
          : '*(link unavailable)*';
        result = result.replace(match, replacement);
      }
    }
  }
  return result;
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
- IMPORTANT: Only include URLs that you found directly in search results. Never construct, guess, or invent URLs — they will be broken. If a search result contains a useful link, use that exact URL.
- For travel (flights, hotels, trains): search for the specific route and dates. Report prices, airlines, and durations found. If a search result includes a direct booking URL, include it. If not, tell the user to search on skyscanner.net or google.com/travel/flights for the route and dates.
- For prices: give approximate ranges and note they may vary
- Be concise and practical — give the user what they need to act
- Use **bold** for key figures/prices, bullet points for lists of options
- At the end, include a "Sources:" line with the exact URLs from your search results`;

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
  const { taskText, taskDescription, conversationHistory = [], customInstructions = '' } = body;

  if (!taskText || typeof taskText !== 'string') {
    return res.status(400).json({ error: 'taskText is required' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const firstUserMessage = taskDescription?.trim()
    ? `${taskText}\n\nContext: ${taskDescription}`
    : taskText;

  const systemContent = customInstructions?.trim()
    ? `${SYSTEM_PROMPT}\n\nUser context:\n${customInstructions.trim()}`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
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

    const verifiedComment = await stripDeadLinks(finalComment);
    return res.status(200).json({ comment: verifiedComment, searches });
  } catch (err) {
    console.error('[agent-task] Error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Agent error' });
  }
};
