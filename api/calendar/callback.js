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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const query = parseQuery(req);
  const code = query.code;
  const state = query.state;
  const error = query.error;

  if (error) {
    console.error('[calendar/callback] OAuth error:', error);
    return res.redirect(`/?calendar_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect('/?calendar_error=missing_parameters');
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // CRITICAL: Use the EXACT same redirect URI that was used in the auth request
  // This must match exactly what's in Google Cloud Console
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    // For local dev, construct from request
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
    const host = req.headers.host || req.headers['x-forwarded-host'] || req.headers.origin?.replace(/^https?:\/\//, '') || 'your-app.vercel.app';
    redirectUri = `${protocol}://${host}/api/calendar/callback`;
  }
  
  console.log('[calendar/callback] Using redirect URI:', redirectUri);

  console.log('[calendar/callback] Configuration:', {
    hasClientId: !!googleClientId,
    hasClientSecret: !!googleClientSecret,
    redirectUri,
    hasCode: !!code,
    hasState: !!state
  });

  if (!googleClientId || !googleClientSecret) {
    console.error('[calendar/callback] Missing Google OAuth credentials');
    return res.redirect('/?calendar_error=server_config');
  }

  try {
    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    if (!userId) {
      console.error('[calendar/callback] No userId in state');
      return res.redirect('/?calendar_error=invalid_state');
    }

    console.log('[calendar/callback] Exchanging code for tokens with redirectUri:', redirectUri);

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
      console.log('[calendar/callback] Token exchange successful');
    } catch (tokenError) {
      console.error('[calendar/callback] Token exchange failed:', tokenError);
      console.error('[calendar/callback] Error details:', {
        message: tokenError.message,
        code: tokenError.code,
        response: tokenError.response?.data
      });
      
      // Return more specific error with helpful message
      const errorDescription = tokenError.response?.data?.error_description || tokenError.message || 'token_exchange_failed';
      const errorCode = tokenError.response?.data?.error || 'unknown';
      
      console.error('[calendar/callback] OAuth error details:', {
        error: errorCode,
        error_description: errorDescription,
        redirectUri: redirectUri
      });
      
      // Provide user-friendly error message
      let userMessage = errorDescription;
      if (errorCode === 'redirect_uri_mismatch' || errorDescription?.includes('redirect_uri')) {
        userMessage = `Redirect URI mismatch. Please ensure ${redirectUri} is added to Google Cloud Console OAuth settings.`;
      } else if (errorCode === 'invalid_client' || errorCode === 'unauthorized_client' || errorDescription?.includes('Unauthorized')) {
        userMessage = `OAuth client authentication failed (${errorCode}). Please verify:
1. Client ID matches: ${googleClientId?.substring(0, 30)}...
2. Client secret is correct in .env.local
3. OAuth client is enabled in Google Cloud Console
4. Application type is "Web application"
5. Redirect URI ${redirectUri} is authorized`;
      }
      
      return res.redirect(`/?calendar_error=${encodeURIComponent(userMessage)}`);
    }
    
    if (!tokens.access_token) {
      console.error('[calendar/callback] Missing access token');
      return res.redirect('/?calendar_error=token_exchange_failed');
    }

    // If Google didn't return a refresh token (e.g. user previously authorized
    // without prompt=consent), try to reuse the existing one from the database.
    let refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      console.warn('[calendar/callback] No refresh_token from Google, checking for existing one');
      const supabaseUrlCheck = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKeyCheck = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (supabaseUrlCheck && supabaseKeyCheck) {
        const sbCheck = createClient(supabaseUrlCheck, supabaseKeyCheck);
        const { data: existing } = await sbCheck
          .from('calendar_connections')
          .select('refresh_token')
          .eq('user_id', userId)
          .single();
        if (existing?.refresh_token && existing.refresh_token !== 'pending') {
          refreshToken = existing.refresh_token;
          console.log('[calendar/callback] Reusing existing refresh_token');
        }
      }
      if (!refreshToken) {
        console.error('[calendar/callback] No refresh token available');
        return res.redirect('/?calendar_error=no_refresh_token');
      }
    }

    // Get calendar info
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0];

    // Store tokens in database
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        calendar_id: primaryCalendar?.id || 'primary',
        calendar_name: primaryCalendar?.summary || 'Primary Calendar',
        enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('[calendar/callback] Database error:', dbError);
      return res.redirect('/?calendar_error=database_error');
    }

    return res.redirect('/?calendar_connected=true');
  } catch (error) {
    console.error('[calendar/callback] Error:', error);
    return res.redirect('/?calendar_error=internal_error');
  }
};

