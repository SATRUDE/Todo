import { supabase } from './supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  location: string;
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

  try {
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
      const errorText = await response.text();
      let errorMessage = 'Failed to initiate calendar connection';
      
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('[calendar] API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.authUrl) {
      throw new Error('No auth URL returned from server');
    }
    
    return data.authUrl;
  } catch (error) {
    if (error instanceof Error) {
      console.error('[calendar] Connection error:', error.message);
      throw error;
    }
    throw new Error('Unknown error connecting to calendar');
  }
}

/**
 * Check if user has a connected calendar
 */
export async function getCalendarConnection(): Promise<CalendarConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('id, user_id, calendar_id, calendar_name, enabled')
    .eq('user_id', user.id)
    .eq('enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CalendarConnection;
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
    throw new Error(error.error || 'Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.events || [];
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

