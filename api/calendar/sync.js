const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { refreshTokenIfNeeded } = require('./token-refresh');

function parseBody(req) {
  if (!req.body) {
    return null;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[calendar/sync] Failed to parse JSON body', error);
      return null;
    }
  }
  return req.body;
}

async function getCalendarClient(userId, supabase) {
  const { data: connection, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .single();

  if (error || !connection) {
    throw new Error('Calendar not connected');
  }

  const refreshedConnection = await refreshTokenIfNeeded(connection, userId, supabase);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: refreshedConnection.access_token,
    refresh_token: refreshedConnection.refresh_token
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: refreshedConnection.calendar_id
  };
}

module.exports = async function handler(req, res) {
  // Calendar sync (writing tasks to calendar) is disabled
  // Calendar connection is only used for reading events, not writing
  console.log('[calendar/sync] Calendar sync is disabled - tasks are not written to calendar');
  
  return res.status(200).json({
    success: true,
    message: 'Calendar sync is disabled. Calendar is read-only.',
    synced: 0,
    errors: 0,
    total: 0
  });
};

