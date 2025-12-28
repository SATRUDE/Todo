const { createClient } = require('@supabase/supabase-js');

function parseBody(req) {
  if (!req.body) {
    return null;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[calendar/auth] Failed to parse JSON body', error);
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

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use environment variable first, fallback to constructing from request
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    // Construct from request headers (for Vercel)
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || req.headers['x-forwarded-host'] || req.headers.origin?.replace(/^https?:\/\//, '') || 'your-app.vercel.app';
    redirectUri = `${protocol}://${host}/api/calendar/callback`;
  }

  console.log('[calendar/auth] Configuration:', {
    hasClientId: !!googleClientId,
    hasClientSecret: !!googleClientSecret,
    redirectUri
  });

  if (!googleClientId || !googleClientSecret) {
    console.error('[calendar/auth] Missing Google OAuth credentials');
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  // Generate state parameter for CSRF protection
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

  // Store state in database temporarily (or use a more secure method)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store state with user_id for verification in callback
    // Using a simple approach - in production, use a proper session store
    await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        access_token: state, // Temporarily store state
        refresh_token: 'pending',
        token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
      }, {
        onConflict: 'user_id'
      });

    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return res.status(200).json({
      authUrl: authUrl.toString()
    });
  } catch (error) {
    console.error('[calendar/auth] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

