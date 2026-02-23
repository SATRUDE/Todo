/**
 * Vercel serverless function to parse voice transcript into structured task data
 * Uses OpenAI to extract task text, type, list, deadline, and description
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables',
    });
  }

  try {
    const body = parseBody(req) || {};
    const { transcript, listNames = [], clientDate } = body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transcript is required and must be a string',
      });
    }

    const listNamesStr = Array.isArray(listNames)
      ? listNames.join(', ')
      : '';

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Use client's local date if provided (YYYY-MM-DD), otherwise server UTC date
    const todayStr = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr + 'T12:00:00Z');
    const todayDayName = dayNames[todayDate.getUTCDay()];

    const systemPrompt = `You parse voice transcripts of users adding tasks/reminders into structured JSON.

Available list names: ${listNamesStr || 'None'}

Extract:
- text: The main task text (required). Remove the date/weekday from the task text (e.g. "buy milk on Wednesday" -> text: "buy milk").
- description: Optional extra details (null if none)
- listName: If the user mentions a list, use the matching list name exactly as provided. Use null if no list mentioned.
- type: "task" or "reminder". Use "reminder" when user says "remind me", "reminder", "remind". Otherwise "task".
- deadline: null if no date/time. Otherwise: { date: "YYYY-MM-DD", time?: "HH:MM" (24h), recurring?: "daily"|"weekly"|"weekday"|"monthly" }

Date parsing rules (CRITICAL - today is ${todayDayName} ${todayStr}):
- "on Wednesday", "Wednesday" = the NEXT occurrence of that weekday. If today is Monday, "Wednesday" = 2 days from now. If today is Friday, "Wednesday" = 5 days from now (next week).
- "tomorrow" = today + 1 day
- "next Monday" = the Monday of next week
- "this Wednesday" = the Wednesday of the current week (if already passed, use next week's)
- Parse times: "at 3pm" -> "15:00", "at 9:30" -> "09:30"
- Recurring: "every day" -> daily, "weekdays" -> weekday, "every week" -> weekly, "monthly" -> monthly

Return ONLY valid JSON in this exact shape:
{"text":"...","description":null|"...","listName":null|"...","type":"task"|"reminder","deadline":null|{"date":"YYYY-MM-DD","time":"HH:MM","recurring":"daily"|"weekly"|"weekday"|"monthly"}}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({
        error: 'No response from OpenAI',
        message: 'The AI did not return a response',
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid AI response',
        message: 'Failed to parse AI response as JSON',
      });
    }

    if (!parsed.text || typeof parsed.text !== 'string') {
      return res.status(500).json({
        error: 'Invalid AI response',
        message: 'AI did not return a valid task text',
      });
    }

    const result = {
      text: parsed.text.trim(),
      description: parsed.description && typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
      listName: parsed.listName && typeof parsed.listName === 'string' ? parsed.listName.trim() : null,
      type: parsed.type === 'reminder' ? 'reminder' : 'task',
      deadline: null,
    };

    if (parsed.deadline && parsed.deadline.date) {
      result.deadline = {
        date: parsed.deadline.date,
        time: parsed.deadline.time || '',
        recurring: parsed.deadline.recurring || undefined,
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[parse-voice-task] Error:', error);
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'OpenAI API error',
        message: error.response.data?.error?.message || error.message || 'Unknown error',
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
};
