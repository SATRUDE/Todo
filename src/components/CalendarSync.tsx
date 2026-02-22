import { useState, useRef } from "react";
import { CalendarTaskSuggestions, CalendarTaskSuggestionsRef } from "./CalendarTaskSuggestions";
import { TaskDetailModal } from "./TaskDetailModal";
import { markEventAsProcessed } from "../lib/calendar";

interface CalendarSyncProps {
  onBack: () => void;
  onAddTask?: (taskText: string, description?: string, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  lists?: Array<{ id: number; name: string; color: string; count: number; isShared: boolean }>;
  onSync?: () => Promise<void>;
  isSyncing?: boolean;
  onEventProcessed?: () => void;
  onNavigateToDailyTasks?: () => void;
  onNavigateToCommonTasks?: () => void;
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

export function CalendarSync({ onBack, onAddTask, lists = [], onSync, isSyncing = false, onEventProcessed, onNavigateToDailyTasks, onNavigateToCommonTasks }: CalendarSyncProps) {
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string } | null>(null);
  const suggestionsRef = useRef<CalendarTaskSuggestionsRef>(null);

  const handleTaskClick = (suggestion: { text: string; description?: string; deadline?: { date: Date; time: string }; eventId: string }) => {
    setSelectedSuggestion(suggestion);
    setIsTaskDetailOpen(true);
  };

  const handleSync = async () => {
    if (!onSync || isSyncing) return;
    
    try {
      // Call the parent sync function
      await onSync();
      
      // After sync completes, reload the suggestions
      if (suggestionsRef.current) {
        await suggestionsRef.current.loadSuggestions();
      }
    } catch (error) {
      console.error('[CalendarSync] Error syncing:', error);
    }
  };

  const handleCreateTask = async (text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, type?: 'task' | 'reminder') => {
    if (!onAddTask || !selectedSuggestion) return;

    const eventId = selectedSuggestion.eventId;

    try {
      // Mark the event as processed
      await markEventAsProcessed(eventId);
      
      // Add the task
      await onAddTask(
        text,
        description || undefined,
        listId,
        milestoneId,
        deadline ? {
          date: deadline.date,
          time: deadline.time,
          recurring: deadline.recurring
        } : undefined
      );

      // Remove the suggestion from the list
      if (suggestionsRef.current) {
        suggestionsRef.current.removeSuggestion(eventId);
      }

      // Notify parent to update count
      if (onEventProcessed) {
        onEventProcessed();
      }

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
            <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative flex-1 min-w-0 text-nowrap whitespace-pre">
              <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Calendar sync</p>
            </div>
            {/* Sync Button */}
            {onSync && (
              <div 
                className={`relative shrink-0 size-[32px] cursor-pointer ${isSyncing ? '' : ''}`}
                onClick={handleSync}
                title="Sync calendar"
              >
                <style>{`
                  @keyframes spin {
                    from {
                      transform: rotate(0deg);
                    }
                    to {
                      transform: rotate(360deg);
                    }
                  }
                  .sync-spinning {
                    animation: spin 1s linear infinite;
                  }
                `}</style>
                <svg 
                  className={`block size-full ${isSyncing ? 'sync-spinning' : ''}`}
                  fill="none" 
                  preserveAspectRatio="none" 
                  viewBox="0 0 24 24" 
                  style={{ width: '32px', height: '32px', transformOrigin: 'center' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    stroke="#E1E6EE"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Calendar Task Suggestions */}
          {onAddTask && (
            <div className="w-full">
              <CalendarTaskSuggestions
                ref={suggestionsRef}
                onTaskClick={handleTaskClick}
                onEventProcessed={onEventProcessed}
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
          onNavigateToDailyTasks={onNavigateToDailyTasks ? () => { setIsTaskDetailOpen(false); setSelectedSuggestion(null); onNavigateToDailyTasks(); } : undefined}
          onNavigateToCommonTasks={onNavigateToCommonTasks ? () => { setIsTaskDetailOpen(false); setSelectedSuggestion(null); onNavigateToCommonTasks(); } : undefined}
        />
      )}
    </div>
  );
}

