import { useState, useEffect } from "react";
import { fetchCalendarEvents, suggestTasksFromEvents, CalendarEvent } from "../lib/calendar";

interface CalendarTaskSuggestionsProps {
  onAcceptSuggestion: (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string } }) => void;
  onDismiss: () => void;
}

export function CalendarTaskSuggestions({ onAcceptSuggestion, onDismiss }: CalendarTaskSuggestionsProps) {
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
        const events = await fetchCalendarEvents();
        const taskSuggestions = suggestTasksFromEvents(events);
        
        // Map suggestions with event data
        const suggestionsWithEvents = taskSuggestions.map((suggestion, index) => ({
          ...suggestion,
          event: events[index],
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
    const dayName = days[date.getDay()];
    const day = date.getDate();
    return `${dayName} ${day}`;
  };

  return (
    <div className="w-full flex flex-col gap-[16px]">
      <div className="flex items-center justify-between w-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium text-[20px] text-white">
          Suggested Tasks from Calendar
        </p>
        <button
          onClick={onDismiss}
          className="text-[#5b5d62] text-[16px] bg-transparent border-none p-0 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
      
      <div className="flex flex-col gap-[12px]">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-[16px] bg-[#1a161a] rounded-lg border border-[#2a252a]"
          >
            <div className="flex-1 flex flex-col gap-[4px]">
              <p className="font-['Inter:Regular',sans-serif] font-normal text-[18px] text-white">
                {suggestion.text}
              </p>
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
            <button
              onClick={() => onAcceptSuggestion(suggestion)}
              className="ml-[16px] px-[16px] py-[8px] bg-[#0b64f9] text-white text-[16px] rounded-lg border-none cursor-pointer hover:bg-[#0954d0]"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

