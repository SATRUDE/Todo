import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { fetchCalendarEvents, suggestTasksFromEvents, CalendarEvent, getProcessedEventIds, markEventAsProcessed, filterProcessedEvents } from "../lib/calendar";

interface CalendarTaskSuggestionsProps {
  onAcceptSuggestion?: (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => void;
  onDismiss?: () => void;
  onTaskClick?: (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => void;
  onEventProcessed?: () => void;
}

export interface CalendarTaskSuggestionsRef {
  removeSuggestion: (eventId: string) => void;
  loadSuggestions: () => Promise<void>;
}

export const CalendarTaskSuggestions = forwardRef<CalendarTaskSuggestionsRef, CalendarTaskSuggestionsProps>(
  ({ onAcceptSuggestion, onDismiss, onTaskClick, onEventProcessed }, ref) => {
  type Suggestion = {
    text: string;
    description?: string;
    deadline?: {
      date: Date;
      time: string;
    };
    event: CalendarEvent;
  };

  // Load persisted suggestions from localStorage on mount
  const loadPersistedSuggestions = (): Suggestion[] => {
    try {
      const saved = localStorage.getItem('calendar-suggestions');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        return parsed.map((s: any) => ({
          ...s,
          deadline: s.deadline ? {
            ...s.deadline,
            date: new Date(s.deadline.date)
          } : undefined,
          event: {
            ...s.event,
            start: s.event.start,
            end: s.event.end
          }
        }));
      }
    } catch (error) {
      console.error('Error loading persisted suggestions:', error);
    }
    return [];
  };

  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => loadPersistedSuggestions());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => {
    // Check if we have persisted suggestions
    try {
      const saved = localStorage.getItem('calendar-suggestions');
      return !!saved && JSON.parse(saved).length > 0;
    } catch {
      return false;
    }
  });

  // Save suggestions to localStorage whenever they change
  useEffect(() => {
    if (suggestions.length > 0 || hasLoadedOnce) {
      try {
        localStorage.setItem('calendar-suggestions', JSON.stringify(suggestions));
      } catch (error) {
        console.error('Error saving suggestions to localStorage:', error);
      }
    }
  }, [suggestions, hasLoadedOnce]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch events and processed event IDs in parallel
      const [events, processedIds] = await Promise.all([
        fetchCalendarEvents(),
        getProcessedEventIds()
      ]);
      
      // Filter out processed events
      const unprocessedEvents = filterProcessedEvents(events, processedIds);
      const taskSuggestions = suggestTasksFromEvents(unprocessedEvents);
      
      // Map suggestions with event data
      const suggestionsWithEvents = taskSuggestions.map((suggestion, index) => ({
        ...suggestion,
        event: unprocessedEvents[index],
      }));
      
      setSuggestions(suggestionsWithEvents);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error loading calendar suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Expose removeSuggestion and loadSuggestions methods to parent via ref
  useImperativeHandle(ref, () => ({
    removeSuggestion: (eventId: string) => {
      setSuggestions(prev => {
        const updated = prev.filter(s => s.event.id !== eventId);
        // Clear localStorage if all suggestions are removed
        if (updated.length === 0) {
          localStorage.removeItem('calendar-suggestions');
        }
        return updated;
      });
    },
    loadSuggestions: loadSuggestions
  }));

  const handleDismissEvent = async (eventId: string) => {
    try {
      console.log('[CalendarTaskSuggestions] Dismissing event:', eventId);
      await markEventAsProcessed(eventId);
      // Remove the dismissed suggestion from the list
      setSuggestions(prev => prev.filter(s => s.event.id !== eventId));
      console.log('[CalendarTaskSuggestions] Event dismissed successfully');
      // Notify parent to update count
      if (onEventProcessed) {
        onEventProcessed();
      }
    } catch (err) {
      console.error('[CalendarTaskSuggestions] Error dismissing event:', err);
      alert(`Failed to dismiss event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAcceptSuggestion = async (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => {
    try {
      console.log('[CalendarTaskSuggestions] Accepting suggestion:', suggestion);
      // Mark event as processed first
      await markEventAsProcessed(suggestion.eventId);
      console.log('[CalendarTaskSuggestions] Event marked as processed');
      
      // Then call the callback to add the task (await if it's async)
      await Promise.resolve(onAcceptSuggestion(suggestion));
      console.log('[CalendarTaskSuggestions] Task added successfully');
      
      // Remove the accepted suggestion from the list
      setSuggestions(prev => prev.filter(s => s.event.id !== suggestion.eventId));
      console.log('[CalendarTaskSuggestions] Suggestion removed from list');
      // Notify parent to update count
      if (onEventProcessed) {
        onEventProcessed();
      }
    } catch (err) {
      console.error('[CalendarTaskSuggestions] Error accepting suggestion:', err);
      console.error('[CalendarTaskSuggestions] Error details:', err);
      alert(`Failed to add task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-4">
        <p className="text-muted-foreground text-base">Loading calendar suggestions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <p className="text-destructive text-base">{error}</p>
      </div>
    );
  }

  if (!hasLoadedOnce) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <svg className="size-5 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="font-medium text-xl text-foreground">
            Suggested Tasks from Calendar
          </p>
        </div>
        <div className="w-full p-6 rounded-lg border border-border bg-card flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Click the sync button to load calendar events
          </p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <svg className="size-5 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="font-medium text-xl text-foreground">
            Suggested Tasks from Calendar
          </p>
        </div>
        <div className="w-full p-6 rounded-lg border border-border bg-card flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            All calendar events have been processed or there are no upcoming events
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    return `${dayName} ${day} ${monthName}`;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <svg className="size-5 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="font-medium text-xl text-foreground">
            Suggested Tasks from Calendar
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground text-base bg-transparent border-none p-0 cursor-pointer hover:text-foreground transition-colors"
          >
            Dismiss All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start justify-between p-4 rounded-lg border border-border bg-card w-full max-w-full overflow-hidden"
          >
            <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden">
              <p
                className={`font-normal text-lg break-words overflow-wrap-anywhere ${
                  onTaskClick ? 'text-foreground cursor-pointer hover:underline' : 'text-foreground'
                }`}
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                onClick={onTaskClick ? () => onTaskClick({ ...suggestion, eventId: suggestion.event.id }) : undefined}
              >
                {suggestion.text}
              </p>
              {suggestion.event.calendarName && (
                <p className="font-normal text-xs text-muted-foreground break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {suggestion.event.calendarName}
                </p>
              )}
              {suggestion.deadline && (
                <p className="font-normal text-sm text-muted-foreground break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {formatDate(suggestion.deadline.date)} at {suggestion.deadline.time}
                </p>
              )}
              {suggestion.description && (
                <p className="font-normal text-sm text-muted-foreground mt-1 break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {suggestion.description.substring(0, 100)}{suggestion.description.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
            <div className="ml-4 flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismissEvent(suggestion.event.id);
                }}
                className="px-3 py-2 bg-transparent text-muted-foreground text-base rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTaskClick) {
                    onTaskClick({ ...suggestion, eventId: suggestion.event.id });
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-primary-foreground text-base rounded-lg border-none cursor-pointer hover:bg-blue-600 flex items-center gap-2 transition-opacity"
              >
                <span>Add</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12a6 6 0 0 1-12 0v-3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

