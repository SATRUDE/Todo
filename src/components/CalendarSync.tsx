import { useState } from "react";
import { CalendarTaskSuggestions } from "./CalendarTaskSuggestions";
import { TaskDetailModal } from "./TaskDetailModal";
import { markEventAsProcessed } from "../lib/calendar";

interface CalendarSyncProps {
  onBack: () => void;
  onAddTask?: (taskText: string, description?: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  lists?: Array<{ id: number; name: string; color: string; count: number; isShared: boolean }>;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  listId?: number;
  description?: string | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

export function CalendarSync({ onBack, onAddTask, lists = [] }: CalendarSyncProps) {
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string } | null>(null);
  const handleAcceptSuggestion = async (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => {
    if (onAddTask) {
      // CalendarTaskSuggestions already handles marking the event as processed
      // Just add the task here
      try {
        await onAddTask(
          suggestion.text,
          suggestion.description,
          0, // TODAY_LIST_ID
          undefined, // milestoneId - not used for calendar tasks
          suggestion.deadline ? {
            date: suggestion.deadline.date,
            time: suggestion.deadline.time
          } : undefined
        );
      } catch (error) {
        console.error('[CalendarSync] Error adding task:', error);
        throw error; // Re-throw so CalendarTaskSuggestions can handle it
      }
    }
  };

  const handleTaskClick = (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => {
    setSelectedSuggestion(suggestion);
    setIsTaskDetailOpen(true);
  };

  const handleCreateTask = async (text: string, description?: string | null, listId?: number, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    if (!onAddTask || !selectedSuggestion) return;

    try {
      // Mark the event as processed
      await markEventAsProcessed(selectedSuggestion.eventId);
      
      // Add the task
      await onAddTask(
        text,
        description || undefined,
        listId,
        deadline ? {
          date: deadline.date,
          time: deadline.time,
          recurring: deadline.recurring
        } : undefined
      );

      // Close the modal
      setIsTaskDetailOpen(false);
      setSelectedSuggestion(null);
    } catch (error) {
      console.error('[CalendarSync] Error creating task from suggestion:', error);
      alert(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getTaskFromSuggestion = (): Todo | null => {
    if (!selectedSuggestion) return null;

    return {
      id: -999, // Temporary ID to indicate it's a new task
      text: selectedSuggestion.text,
      completed: false,
      description: selectedSuggestion.description || null,
      listId: 0, // TODAY_LIST_ID
      deadline: selectedSuggestion.deadline ? {
        date: selectedSuggestion.deadline.date,
        time: selectedSuggestion.deadline.time
      } : undefined
    };
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
                onTaskClick={handleTaskClick}
              />
            </div>
          )}
          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
        </div>
      </div>

      {/* Task Detail Modal for Calendar Suggestions */}
      {selectedSuggestion && getTaskFromSuggestion() && (
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={() => {
            setIsTaskDetailOpen(false);
            setSelectedSuggestion(null);
          }}
          task={getTaskFromSuggestion()!}
          onUpdateTask={() => {}} // Not used for new tasks
          onDeleteTask={() => {}} // Not used for new tasks
          onCreateTask={handleCreateTask}
          lists={lists}
        />
      )}
    </div>
  );
}

