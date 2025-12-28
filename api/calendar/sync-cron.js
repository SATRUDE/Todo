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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[calendar/sync-cron] Missing Supabase credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all enabled calendar connections
    const { data: connections, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('enabled', true);

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('[calendar/sync-cron] No calendar connections found');
      return res.status(200).json({ 
        success: true, 
        message: 'No calendar connections to sync',
        synced: 0
      });
    }

    console.log(`[calendar/sync-cron] Found ${connections.length} calendar connections`);

    let totalSynced = 0;
    let totalErrors = 0;

    // Sync for each user
    for (const connection of connections) {
      try {
        const { calendar, calendarId } = await getCalendarClient(connection.user_id, connection, supabase);

        // Fetch all tasks with deadlines for this user
        const { data: tasks, error: tasksError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', connection.user_id)
          .not('deadline_date', 'is', null)
          .eq('completed', false);

        if (tasksError) {
          console.error(`[calendar/sync-cron] Error fetching tasks for user ${connection.user_id}:`, tasksError);
          totalErrors++;
          continue;
        }

        if (!tasks || tasks.length === 0) {
          continue;
        }

        // Get existing sync status
        const { data: syncStatuses } = await supabase
          .from('calendar_sync_status')
          .select('*')
          .eq('user_id', connection.user_id);

        const syncMap = new Map();
        if (syncStatuses) {
          syncStatuses.forEach(status => {
            syncMap.set(status.task_id, status.calendar_event_id);
          });
        }

        // Sync each task
        for (const task of tasks) {
          try {
            const existingEventId = syncMap.get(task.id);
            const deadlineDate = task.deadline_date;
            const deadlineTime = task.deadline_time || '09:00';
            const [hours, minutes] = deadlineTime.split(':').map(Number);

            // Create event start/end times
            const startDate = new Date(`${deadlineDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

            const event = {
              summary: task.text,
              description: task.description || '',
              start: {
                dateTime: startDate.toISOString(),
                timeZone: 'UTC',
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: 'UTC',
              },
            };

            let eventId;

            if (existingEventId) {
              // Update existing event
              await calendar.events.update({
                calendarId,
                eventId: existingEventId,
                requestBody: event,
              });
              eventId = existingEventId;
            } else {
              // Create new event
              const response = await calendar.events.insert({
                calendarId,
                requestBody: event,
              });
              eventId = response.data.id;
            }

            // Update sync status
            await supabase
              .from('calendar_sync_status')
              .upsert({
                user_id: connection.user_id,
                task_id: task.id,
                calendar_event_id: eventId,
                last_synced_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,task_id'
              });

            totalSynced++;
          } catch (error) {
            console.error(`[calendar/sync-cron] Error syncing task ${task.id} for user ${connection.user_id}:`, error);
            totalErrors++;
          }
        }

        // Remove events for completed tasks
        const { data: completedTasks } = await supabase
          .from('todos')
          .select('id')
          .eq('user_id', connection.user_id)
          .eq('completed', true);

        if (completedTasks && syncStatuses) {
          for (const status of syncStatuses) {
            if (completedTasks.some(t => t.id === status.task_id)) {
              try {
                await calendar.events.delete({
                  calendarId,
                  eventId: status.calendar_event_id,
                });
                await supabase
                  .from('calendar_sync_status')
                  .delete()
                  .eq('user_id', connection.user_id)
                  .eq('task_id', status.task_id);
              } catch (error) {
                console.error(`[calendar/sync-cron] Error deleting event for task ${status.task_id}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[calendar/sync-cron] Error processing user ${connection.user_id}:`, error);
        totalErrors++;
      }
    }

    console.log(`[calendar/sync-cron] Sync completed: ${totalSynced} tasks synced, ${totalErrors} errors`);

    return res.status(200).json({
      success: true,
      synced: totalSynced,
      errors: totalErrors,
      usersProcessed: connections.length
    });
  } catch (error) {
    console.error('[calendar/sync-cron] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

