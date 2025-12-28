import { supabase } from './supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  location: string;
  calendarName?: string;
  calendarColor?: string;
}

export interface CalendarConnection {
  id: number;
  user_id: string;
  calendar_id: string;
  calendar_name: string;
  enabled: boolean;
}

/**
 * Initiate Google Calendar OAuth flow
 */
export async function connectGoogleCalendar(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const response = await fetch('/api/calendar/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to initiate calendar connection';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch (e2) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    const text = await response.text();
    if (!text) {
      throw new Error('Empty response from server');
    }
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse response: ${e instanceof Error ? e.message : 'Unknown error'}. Make sure you're running the API server locally with 'vercel dev' or testing on the deployed version.`);
  }

  if (!data.authUrl) {
    throw new Error('No auth URL in response');
  }

  return data.authUrl;
}

/**
 * Check if user has a connected calendar
 */
export async function getCalendarConnection(): Promise<CalendarConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('id, user_id, calendar_id, calendar_name, enabled')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .limit(1);

    if (error) {
      console.error('[calendar] Error fetching connection:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const connection = data[0] as CalendarConnection;
    
    // If calendar_name is null, the connection is likely incomplete/invalid
    if (connection && !connection.calendar_name) {
      console.warn('[calendar] Connection found but calendar_name is null, connection may be invalid');
      // Return null so user can reconnect
      return null;
    }

    return connection;
  } catch (error) {
    console.error('[calendar] Unexpected error fetching connection:', error);
    return null;
  }
}

/**
 * Refresh calendar connection info from Google Calendar API
 */
export async function refreshCalendarConnection(): Promise<CalendarConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Fetch events to test the connection and trigger any token refresh
    await fetchCalendarEvents();
    
    // Re-fetch the connection to get updated info
    return await getCalendarConnection();
  } catch (error) {
    console.error('[calendar] Error refreshing connection:', error);
    // If refresh fails, the connection is likely invalid
    throw error;
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const response = await fetch('/api/calendar/disconnect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect calendar');
  }
}

/**
 * Sync a single task to Google Calendar
 */
export async function syncTaskToCalendar(task: any): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!task.deadline) {
    return; // Only sync tasks with deadlines
  }

  const response = await fetch('/api/calendar/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync task to calendar');
  }
}

/**
 * Sync all tasks to Google Calendar
 */
export async function syncAllTasksToCalendar(): Promise<{ synced: number; errors: number; total: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const response = await fetch('/api/calendar/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync tasks to calendar');
  }

  return await response.json();
}

/**
 * Fetch calendar events for task suggestions
 */
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const response = await fetch(`/api/calendar/events?user_id=${user.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 401 || error.requiresReconnect) {
      throw new Error('Unauthorized - Please reconnect your calendar');
    }
    throw new Error(error.error || error.message || 'Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.events || [];
}

/**
 * Get list of processed calendar event IDs for the current user
 */
export async function getProcessedEventIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Set();
  }

  try {
    const { data, error } = await supabase
      .from('calendar_event_processed')
      .select('calendar_event_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('[calendar] Error fetching processed events:', error);
      return new Set();
    }

    return new Set((data || []).map(item => item.calendar_event_id));
  } catch (error) {
    console.error('[calendar] Unexpected error fetching processed events:', error);
    return new Set();
  }
}

/**
 * Mark a calendar event as processed (either added as task or dismissed)
 */
export async function markEventAsProcessed(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('calendar_event_processed')
    .upsert({
      user_id: user.id,
      calendar_event_id: eventId,
      processed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,calendar_event_id'
    });

  if (error) {
    console.error('[calendar] Error marking event as processed:', error);
    throw new Error('Failed to mark event as processed');
  }
}

/**
 * Filter out processed calendar events
 */
export function filterProcessedEvents(events: CalendarEvent[], processedIds: Set<string>): CalendarEvent[] {
  return events.filter(event => !processedIds.has(event.id));
}

/**
 * Convert calendar events to task suggestions
 */
export function suggestTasksFromEvents(events: CalendarEvent[]): Array<{
  text: string;
  description?: string;
  deadline?: {
    date: Date;
    time: string;
  };
}> {
  return events.map(event => {
    const startDate = event.start ? new Date(event.start) : null;
    const time = startDate 
      ? `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
      : '09:00';

    return {
      text: event.title,
      description: event.description || undefined,
      deadline: startDate ? {
        date: startDate,
        time: time,
      } : undefined,
    };
  });
}

