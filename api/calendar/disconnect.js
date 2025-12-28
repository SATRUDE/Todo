const { createClient } = require('@supabase/supabase-js');

function parseBody(req) {
  if (!req.body) {
    return null;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[calendar/disconnect] Failed to parse JSON body', error);
      return null;
    }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseBody(req) || {};
  const userId = body.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete calendar connection
    const { error: connError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', userId);

    if (connError) {
      throw new Error(`Failed to delete connection: ${connError.message}`);
    }

    // Delete sync status records
    await supabase
      .from('calendar_sync_status')
      .delete()
      .eq('user_id', userId);

    return res.status(200).json({
      success: true,
      message: 'Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('[calendar/disconnect] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

