/**
 * Vercel serverless function: publish a reviewed weekly menu to Notion.
 *
 * The menu lives as a row in the `menus` table (drafted by the overnight chef
 * routine, edited by Mark in the app's Menu page). This endpoint converts the
 * draft's plain-text content into Notion blocks in the established weekly-menu
 * format and inserts them at the top of the shared Weekly menus page, right
 * after the fixed 📌 anchor line, then marks the row published.
 *
 * Auth: requires an `Authorization: Bearer <access_token>` header that resolves
 * to a valid user. Notion access uses NOTION_TOKEN (an internal-integration
 * token) — no LLM, no per-call AI cost.
 *
 * Content format (one item per line):
 *   - Lines starting with a Norwegian day name render bold.
 *   - Lines of only `---` render as dividers.
 *   - Lines starting with 💡 render as a quote (the swap tip).
 *   - Everything else renders as gray text (ingredient lines).
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const notionToken = process.env.NOTION_TOKEN;
const notionMenuPageId = process.env.NOTION_MENU_PAGE_ID || '37033fb2-2b5f-80f4-9855-f059b8e321e9';

const NOTION_VERSION = '2022-06-28';
const DAY_PATTERN = /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)/i;

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Notion ${options.method || 'GET'} ${path} failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  return res.json();
}

function richText(text, opts = {}) {
  return [{
    type: 'text',
    text: { content: text },
    annotations: {
      bold: Boolean(opts.bold),
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: opts.color || 'default',
    },
  }];
}

function menuContentToBlocks(menu) {
  const blocks = [];
  blocks.push({
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: richText(`Uke ${menu.week_number}`) },
  });

  const lines = (menu.content || '').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^-{3,}$/.test(line)) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    } else if (line.startsWith('\u{1F4A1}')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: richText(line) } });
    } else if (DAY_PATTERN.test(line)) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(line, { bold: true }) } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(line, { color: 'gray' }) } });
    }
  }

  blocks.push({ object: 'block', type: 'divider', divider: {} });
  return blocks;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }
  if (!notionToken) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid access token' });
  }

  const body = parseBody(req);
  const menuId = body?.menuId;
  if (!menuId) {
    return res.status(400).json({ error: 'menuId is required' });
  }

  try {
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .single();
    if (menuError || !menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    if (menu.status === 'published') {
      return res.status(409).json({ error: 'Menu is already published' });
    }

    // Find the fixed 📌 anchor at the top of the Notion page; new weeks go
    // directly after it so the newest menu always sits on top.
    const children = await notionFetch(`/blocks/${notionMenuPageId}/children?page_size=10`);
    const anchor = (children.results || []).find(block => {
      const rt = block[block.type]?.rich_text || [];
      return rt.some(t => (t.plain_text || t.text?.content || '').includes('\u{1F4CC}'));
    });
    if (!anchor) {
      return res.status(500).json({ error: 'Anchor line (📌) not found on the Notion menus page' });
    }

    await notionFetch(`/blocks/${notionMenuPageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({
        children: menuContentToBlocks(menu),
        after: anchor.id,
      }),
    });

    const { error: updateError } = await supabase
      .from('menus')
      .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', menu.id);
    if (updateError) {
      // The Notion write succeeded; report the row failure honestly.
      return res.status(500).json({ error: 'Published to Notion but failed to mark the row published', details: updateError.message });
    }

    return res.status(200).json({ success: true, week_number: menu.week_number, year: menu.year });
  } catch (error) {
    console.error('publish-menu error:', error);
    return res.status(500).json({ error: error.message || 'Publish failed' });
  }
};
