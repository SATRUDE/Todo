import { useState, useEffect } from "react";
import { fetchCalendarEvents, suggestTasksFromEvents, CalendarEvent, getProcessedEventIds, markEventAsProcessed, filterProcessedEvents } from "../lib/calendar";

interface CalendarTaskSuggestionsProps {
  onAcceptSuggestion: (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => void;
  onDismiss?: () => void;
  onTaskClick?: (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => void;
}

export function CalendarTaskSuggestions({ onAcceptSuggestion, onDismiss, onTaskClick }: CalendarTaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Array<{
    text: string;
    description?: string;
    deadline?: {
      date: Date;
      time: string;
    };
    event: CalendarEvent;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (err) {
        console.error('Error loading calendar suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, []);

  const handleDismissEvent = async (eventId: string) => {
    try {
      console.log('[CalendarTaskSuggestions] Dismissing event:', eventId);
      await markEventAsProcessed(eventId);
      // Remove the dismissed suggestion from the list
      setSuggestions(prev => prev.filter(s => s.event.id !== eventId));
      console.log('[CalendarTaskSuggestions] Event dismissed successfully');
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
    } catch (err) {
      console.error('[CalendarTaskSuggestions] Error accepting suggestion:', err);
      console.error('[CalendarTaskSuggestions] Error details:', err);
      alert(`Failed to add task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-4">
        <p className="text-[#5b5d62] text-[16px]">Loading calendar suggestions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <p className="text-[#EF4123] text-[16px]">{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
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
    <div className="w-full flex flex-col gap-[16px]">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-[12px]">
          <div className="relative shrink-0 size-[20px]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#E1E6EE" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <p className="font-['Inter:Medium',sans-serif] font-medium text-[20px] text-white">
            Suggested Tasks from Calendar
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[#5b5d62] text-[16px] bg-transparent border-none p-0 cursor-pointer"
          >
            Dismiss All
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-[12px]">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-[16px] bg-[#1a161a] rounded-lg border border-[#2a252a]"
          >
            <div className="flex-1 flex flex-col gap-[4px] min-w-0">
              <p 
                className={`font-['Inter:Regular',sans-serif] font-normal text-[18px] min-w-0 ${
                  onTaskClick ? 'text-white cursor-pointer hover:text-[#E1E6EE] hover:underline' : 'text-white'
                }`}
                onClick={onTaskClick ? () => onTaskClick({ ...suggestion, eventId: suggestion.event.id }) : undefined}
              >
                {suggestion.text}
              </p>
              {suggestion.event.calendarName && (
                <p className="font-['Inter:Regular',sans-serif] font-normal text-[12px] text-[#5b5d62]">
                  {suggestion.event.calendarName}
                </p>
              )}
              {suggestion.deadline && (
                <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px] text-[#5b5d62]">
                  {formatDate(suggestion.deadline.date)} at {suggestion.deadline.time}
                </p>
              )}
              {suggestion.description && (
                <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px] text-[#5b5d62] mt-[4px]">
                  {suggestion.description.substring(0, 100)}{suggestion.description.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
            <div className="ml-[16px] flex items-center gap-[8px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismissEvent(suggestion.event.id);
                }}
                className="px-[12px] py-[8px] bg-transparent text-[#5b5d62] text-[16px] rounded-lg border border-[#2a252a] cursor-pointer hover:bg-[#2a252a]"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAcceptSuggestion({ ...suggestion, eventId: suggestion.event.id });
                }}
                className="px-[16px] py-[8px] bg-[#0b64f9] text-white text-[16px] rounded-lg border-none cursor-pointer hover:bg-[#0954d0] flex items-center gap-[8px]"
              >
                <span>Add</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12a6 6 0 0 1-12 0v-3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

