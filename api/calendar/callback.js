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
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin || 'https://your-app.vercel.app'}/api/calendar/callback`;

  if (!googleClientId || !googleClientSecret) {
    console.error('[calendar/callback] Missing Google OAuth credentials');
    return res.redirect('/?calendar_error=server_config');
  }

  try {
    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    if (!userId) {
      return res.redirect('/?calendar_error=invalid_state');
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return res.redirect('/?calendar_error=token_exchange_failed');
    }

    // Get calendar info
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0];

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

    return res.redirect('/?calendar_connected=true');
  } catch (error) {
    console.error('[calendar/callback] Error:', error);
    return res.redirect('/?calendar_error=internal_error');
  }
};

