const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Helper to get authenticated Google Calendar client (reused from sync.js)
async function getCalendarClient(userId, connection, supabase) {
  // Check if token needs refresh
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  if (expiresAt <= now) {
    // Refresh token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    await supabase
      .from('calendar_connections')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date 
          ? new Date(credentials.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(),
      })
      .eq('user_id', userId);

    connection.access_token = credentials.access_token;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: connection.calendar_id
  };
}

module.exports = async function handler(req, res) {
  // Only allow GET requests (for cron)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Calendar sync (writing tasks to calendar) is disabled
  // Calendar connection is only used for reading events, not writing
  console.log('[calendar/sync-cron] Calendar sync is disabled - tasks are not written to calendar');
  
  return res.status(200).json({
    success: true,
    message: 'Calendar sync is disabled. Calendar is read-only.',
    synced: 0,
    errors: 0,
    usersProcessed: 0
  });
};

