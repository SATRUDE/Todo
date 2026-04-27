/**
 * Vercel serverless function: AI agent for task delegation.
 * Uses Claude Opus 4.7 with Tavily web search and deterministic link construction.
 */

const Anthropic = require('@anthropic-ai/sdk');

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

// ── Tools ────────────────────────────────────────────────────────────────────

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

function buildFlightSearchLink({ origin_iata, destination_iata, outbound_date, return_date }) {
  const o = origin_iata.trim().toUpperCase();
  const d = destination_iata.trim().toUpperCase();
  const base = `https://www.kayak.com/flights/${o}-${d}/${outbound_date}`;
  return return_date?.trim() ? `${base}/${return_date}` : base;
}

function buildHotelSearchLink({ city, checkin_date, checkout_date, adults = 1 }) {
  const slug = encodeURIComponent(city.trim());
  return `https://www.kayak.com/hotels/${slug}/${checkin_date}/${checkout_date}/${adults}adults`;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const tools = [
  {
    name: 'web_search',
    description: 'Search the web for current information — prices, schedules, availability, news, or any real-time data.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'build_flight_search_link',
    description: 'Constructs a working Kayak flight search URL from IATA codes and dates. ALWAYS call this tool to generate flight links — never write flight URLs yourself.',
    input_schema: {
      type: 'object',
      properties: {
        origin_iata: { type: 'string', description: '3-letter IATA airport code for origin, e.g. OSL' },
        destination_iata: { type: 'string', description: '3-letter IATA airport code for destination, e.g. LGW' },
        outbound_date: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
        return_date: { type: 'string', description: 'Return date in YYYY-MM-DD format. Leave empty for one-way.' },
      },
      required: ['origin_iata', 'destination_iata', 'outbound_date'],
    },
  },
  {
    name: 'build_hotel_search_link',
    description: 'Constructs a working Kayak hotel search URL. ALWAYS call this tool to generate hotel links — never write hotel URLs yourself.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. London' },
        checkin_date: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
        checkout_date: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
        adults: { type: 'number', description: 'Number of adults (default 1)' },
      },
      required: ['city', 'checkin_date', 'checkout_date'],
    },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a smart personal assistant that searches the web and completes tasks.

Rules:
- Search the web to find current, accurate information
- For flights: search for prices and options first, then call build_flight_search_link to generate the booking link. Never write flight URLs yourself.
- For hotels: call build_hotel_search_link to generate the search link. Never write hotel URLs yourself.
- Only include URLs found directly in search results for everything else. Never construct or guess other URLs.
- Be concise and practical — give the user what they need to act
- Use **bold** for key figures/prices, bullet points for lists of options
- End with a "Sources:" line listing URLs from search results`;

// ── URL validation ────────────────────────────────────────────────────────────

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
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
}

async function stripDeadLinks(text) {
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const bareUrlRegex = /(?<!\()https?:\/\/[^\s\)>\]"]+/g;
  const urls = new Map();
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
      for (const m of urls.get(url)) {
        const isMarkdown = m.startsWith('[');
        result = result.replace(m, isMarkdown
          ? m.replace(/\]\(https?:\/\/[^\)]+\)/, '] *(link unavailable)*')
          : '*(link unavailable)*');
      }
    }
  }
  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────────

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
    return res.status(500).json({ error: 'TAVILY_API_KEY not configured. Get a free key at tavily.com.' });
  }

  const body = parseBody(req) || {};
  const { taskText, taskDescription, conversationHistory = [], customInstructions = '' } = body;

  if (!taskText || typeof taskText !== 'string') {
    return res.status(400).json({ error: 'taskText is required' });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemContent = customInstructions?.trim()
    ? `${SYSTEM_PROMPT}\n\nUser context:\n${customInstructions.trim()}`
    : SYSTEM_PROMPT;

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
  const MAX_ITERATIONS = 10;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        tools,
        messages,
        system: systemContent,
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

          let result;
          if (block.name === 'web_search') {
            searches.push(block.input.query);
            result = await webSearch(block.input.query);
          } else if (block.name === 'build_flight_search_link') {
            result = buildFlightSearchLink(block.input);
          } else if (block.name === 'build_hotel_search_link') {
            result = buildHotelSearchLink(block.input);
          } else {
            result = 'Unknown tool';
          }

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

    const verifiedComment = await stripDeadLinks(finalComment);
    return res.status(200).json({ comment: verifiedComment, searches });
  } catch (err) {
    console.error('[agent-task] Error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Agent error' });
  }
};
