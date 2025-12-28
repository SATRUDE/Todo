const { createClient } = require('@supabase/supabase-js');

function parseBody(req) {
  if (!req.body) {
    return null;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[push/subscribe] Failed to parse JSON body', error);
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
  const subscription = body.subscription;
  const userId = body.user_id;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ error: 'Invalid subscription keys' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log('[push/subscribe] Received subscription', subscription.endpoint, 'for user', userId);

  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[push/subscribe] Missing Supabase credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert subscription (insert or update if endpoint already exists)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[push/subscribe] Database error:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    console.log('[push/subscribe] Subscription saved successfully');
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('[push/subscribe] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
