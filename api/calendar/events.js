const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// Helper to get authenticated Google Calendar client (reused from sync.js)
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

    try {
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
    } catch (refreshError) {
      console.error('[calendar/events] Token refresh failed:', refreshError);
      // Mark connection as disabled if refresh fails
      await supabase
        .from('calendar_connections')
        .update({ enabled: false })
        .eq('user_id', userId);
      throw new Error('Token refresh failed. Please reconnect your calendar.');
    }
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

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = req.query.user_id;

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
    const calendar = await getCalendarClient(userId, supabase);

    // Fetch all calendars the user has access to
    const calendarListResponse = await calendar.calendarList.list();
    const allCalendars = calendarListResponse.data.items || [];

    // Fetch events for the next month from ALL calendars
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const allEvents = [];

    // Fetch events from each calendar
    for (const cal of allCalendars) {
      try {
        // Skip calendars the user doesn't have read access to
        if (cal.accessRole === 'freeBusyReader' || cal.accessRole === 'none') {
          continue;
        }

        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: now.toISOString(),
          timeMax: oneMonthLater.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        });

        if (response.data.items) {
          // Add calendar info to each event for context
          const eventsWithCalendar = response.data.items.map(event => ({
            ...event,
            calendarName: cal.summary || cal.id,
            calendarColor: cal.backgroundColor || '#4285f4'
          }));
          allEvents.push(...eventsWithCalendar);
        }
      } catch (calendarError) {
        // Log error but continue with other calendars
        console.error(`[calendar/events] Error fetching events from calendar ${cal.id} (${cal.summary}):`, calendarError.message);
      }
    }

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aStart = a.start?.dateTime || a.start?.date || '';
      const bStart = b.start?.dateTime || b.start?.date || '';
      return aStart.localeCompare(bStart);
    });

    // Transform events to task suggestions format
    const suggestions = allEvents.map(event => {
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;
      
      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start: start ? new Date(start).toISOString() : null,
        end: end ? new Date(end).toISOString() : null,
        location: event.location || '',
        calendarName: event.calendarName,
        calendarColor: event.calendarColor
      };
    });

    return res.status(200).json({
      success: true,
      events: suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('[calendar/events] Error:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('Unauthorized') || error.message?.includes('invalid_grant') || error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Calendar connection expired. Please reconnect your calendar.',
        requiresReconnect: true
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

