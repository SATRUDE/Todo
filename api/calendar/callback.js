const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

function parseQuery(req) {
  if (req.query) {
    return req.query;
  }
  if (req.url) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return Object.fromEntries(url.searchParams);
  }
  return {};
}

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const query = parseQuery(req);
  const code = query.code;
  const state = query.state;
  const error = query.error;

  console.log('[calendar/callback] Request received:', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    query: Object.keys(query)
  });

  if (error) {
    console.error('[calendar/callback] OAuth error from Google:', error);
    return res.redirect(`/?calendar_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error('[calendar/callback] Missing parameters:', { hasCode: !!code, hasState: !!state });
    return res.redirect('/?calendar_error=missing_parameters');
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use environment variable first, fallback to constructing from request
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    // Construct from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || req.headers['x-forwarded-host'] || 'your-app.vercel.app';
    redirectUri = `${protocol}://${host}/api/calendar/callback`;
  }

  console.log('[calendar/callback] Configuration:', {
    hasClientId: !!googleClientId,
    hasClientSecret: !!googleClientSecret,
    redirectUri
  });

  if (!googleClientId || !googleClientSecret) {
    console.error('[calendar/callback] Missing Google OAuth credentials');
    return res.redirect('/?calendar_error=server_config');
  }

  try {
    // Decode state to get userId
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('[calendar/callback] Failed to decode state:', e);
      return res.redirect('/?calendar_error=invalid_state');
    }
    
    const userId = stateData.userId;

    if (!userId) {
      console.error('[calendar/callback] No userId in state data');
      return res.redirect('/?calendar_error=invalid_state');
    }

    console.log('[calendar/callback] Exchanging code for tokens...');

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret,
      redirectUri
    );

    let tokens;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (tokenError) {
      console.error('[calendar/callback] Token exchange failed:', tokenError);
      console.error('[calendar/callback] Token error details:', {
        message: tokenError.message,
        code: tokenError.code,
        response: tokenError.response?.data
      });
      return res.redirect('/?calendar_error=token_exchange_failed');
    }
    
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[calendar/callback] Missing tokens in response:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token
      });
      return res.redirect('/?calendar_error=token_exchange_failed');
    }

    console.log('[calendar/callback] Tokens received successfully');

    // Get calendar info
    console.log('[calendar/callback] Fetching calendar info...');
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    let primaryCalendar;
    try {
      const calendarList = await calendar.calendarList.list();
      primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0];
      console.log('[calendar/callback] Calendar info retrieved:', {
        calendarId: primaryCalendar?.id,
        calendarName: primaryCalendar?.summary
      });
    } catch (calendarError) {
      console.error('[calendar/callback] Failed to fetch calendar list:', calendarError);
      // Continue with default values
      primaryCalendar = null;
    }

    // Store tokens in database
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.redirect('/?calendar_error=server_config');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        calendar_id: primaryCalendar?.id || 'primary',
        calendar_name: primaryCalendar?.summary || 'Primary Calendar',
        enabled: true,
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('[calendar/callback] Database error:', dbError);
      return res.redirect('/?calendar_error=database_error');
    }

    console.log('[calendar/callback] Calendar connection saved successfully');
    return res.redirect('/?calendar_connected=true');
  } catch (error) {
    console.error('[calendar/callback] Unexpected error:', error);
    console.error('[calendar/callback] Error stack:', error.stack);
    return res.redirect(`/?calendar_error=${encodeURIComponent(error.message || 'internal_error')}`);
  }
};

