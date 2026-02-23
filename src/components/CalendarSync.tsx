import { useState, useRef, useEffect } from "react";
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
  /** When true, syncs and loads suggestions on mount (e.g. when arriving via "X calendar events ready to sync" banner) */
  autoLoadOnMount?: boolean;
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

export function CalendarSync({ onBack, onAddTask, lists = [], onSync, isSyncing = false, onEventProcessed, onNavigateToDailyTasks, onNavigateToCommonTasks, autoLoadOnMount = false }: CalendarSyncProps) {
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

  // When arriving via "X calendar events ready to sync" banner, auto-load so user doesn't have to tap sync again
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoadOnMount || hasAutoLoaded.current || !onSync) return;
    hasAutoLoaded.current = true;
    void handleSync();
  }, [autoLoadOnMount]);

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
      <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
        {/* Header */}
        <div className="flex items-center gap-4 w-full">
          <button
            type="button"
            onClick={onBack}
            className="size-8 shrink-0 cursor-pointer rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Back"
          >
            <svg className="block size-5" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <path d="M20 8L12 16L20 24" />
            </svg>
          </button>
          <h1 className="flex-1 text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
            Calendar sync
          </h1>
          {onSync && (
            <button
              type="button"
              className={`size-8 shrink-0 cursor-pointer rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background ${isSyncing ? 'animate-spin' : ''}`}
              onClick={handleSync}
              title="Sync calendar"
              aria-label="Sync calendar"
            >
              <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
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

