import { CalendarTaskSuggestions } from "./CalendarTaskSuggestions";
import { markEventAsProcessed } from "../lib/calendar";

interface CalendarSyncProps {
  onBack: () => void;
  onAddTask?: (taskText: string, description?: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
}

export function CalendarSync({ onBack, onAddTask }: CalendarSyncProps) {
  const handleAcceptSuggestion = async (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => {
    if (onAddTask) {
      // Mark the event as processed before adding the task
      try {
        await markEventAsProcessed(suggestion.eventId);
      } catch (error) {
        console.error('Error marking event as processed:', error);
        // Continue anyway - don't block task creation
      }
      
      onAddTask(
        suggestion.text,
        suggestion.description,
        0, // TODAY_LIST_ID
        suggestion.deadline ? {
          date: suggestion.deadline.date,
          time: suggestion.deadline.time
        } : undefined
      );
    }
  };

  return (
    <div className="relative shrink-0 w-full">
      <div className="w-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-0 relative w-full h-fit" style={{ paddingBottom: '150px' }}>
          {/* Header */}
          <div className="content-stretch flex items-center gap-[16px] relative shrink-0 w-full">
            <div 
              className="relative shrink-0 size-[32px] cursor-pointer"
              onClick={onBack}
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                <g>
                  <path 
                    d="M20 8L12 16L20 24" 
                    stroke="#E1E6EE" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                  />
                </g>
              </svg>
            </div>
            <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
              <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Calendar sync</p>
            </div>
          </div>

          {/* Calendar Task Suggestions */}
          {onAddTask && (
            <div className="w-full">
              <CalendarTaskSuggestions
                onAcceptSuggestion={handleAcceptSuggestion}
              />
            </div>
          )}
          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
        </div>
      </div>
    </div>
  );
}

