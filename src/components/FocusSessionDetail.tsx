import { useState } from "react";
import { ChevronLeft, Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { CreateSessionModal } from "./CreateSessionModal";
import { AddTasksToSessionModal } from "./AddTasksToSessionModal";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  listId?: number;
  description?: string | null;
  deadline?: { date: Date; time: string; recurring?: string };
  type?: "task" | "reminder";
}

interface ListItem {
  id: number;
  name: string;
  color: string;
}

interface FocusSession {
  id: number;
  name: string;
  color: string;
  notes?: string | null;
}

interface SessionTaskWithTodo {
  id: number;
  session_id: number;
  task_id: number;
  sort_order: number;
  todo: Todo;
}

interface FocusSessionDetailProps {
  session: FocusSession;
  sessionTasks: SessionTaskWithTodo[];
  allTodos: Todo[];
  lists: ListItem[];
  onBack: () => void;
  onToggleTask: (taskId: number) => void;
  onTaskClick: (task: Todo) => void;
  onUpdateSession: (id: number, name: string, color: string) => void;
  onDeleteSession: (id: number) => void;
  onAddTasksToSession: (taskIds: number[]) => void;
  onRemoveTaskFromSession: (taskId: number) => void;
}

export function FocusSessionDetail({
  session,
  sessionTasks,
  allTodos,
  lists,
  onBack,
  onToggleTask,
  onTaskClick,
  onUpdateSession,
  onDeleteSession,
  onAddTasksToSession,
  onRemoveTaskFromSession,
}: FocusSessionDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddTasksModalOpen, setIsAddTasksModalOpen] = useState(false);

  const completedCount = sessionTasks.filter((st) => st.todo.completed).length;
  const totalCount = sessionTasks.length;

  const existingTaskIds = new Set(sessionTasks.map((st) => st.task_id));

  const getListById = (listId?: number) => {
    if (!listId || listId <= 0) return null;
    return lists.find((l) => l.id === listId) ?? null;
  };

  const handleDeleteSession = (id: number) => {
    onDeleteSession(id);
    onBack();
  };

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <>
      <div className="relative w-full min-w-0 overflow-x-hidden">
        <div className="flex flex-col gap-6 px-5 pt-0 pb-[150px] w-full">
          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-4 items-center min-w-0 flex-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
                aria-label="Back"
              >
                <ChevronLeft className="size-6" strokeWidth={2} />
              </Button>
              <button
                type="button"
                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                onClick={() => setIsEditModalOpen(true)}
              >
                <div
                  className="shrink-0 size-3 rounded-full"
                  style={{ backgroundColor: session.color }}
                />
                <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">
                  {session.name}
                </h1>
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsAddTasksModalOpen(true)}
              className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
              aria-label="Add tasks"
            >
              <Plus className="size-6" strokeWidth={2} />
            </Button>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{completedCount} of {totalCount} done</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%`, backgroundColor: session.color }}
                />
              </div>
            </div>
          )}

          {/* Tasks */}
          {sessionTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-lg font-medium text-foreground">No tasks yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the + button to add tasks from your lists.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {sessionTasks.map(({ todo, task_id }) => {
                const list = getListById(todo.listId);
                return (
                  <div
                    key={task_id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 w-full"
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      className="shrink-0 size-6 text-foreground focus:outline-none"
                      onClick={() => onToggleTask(todo.id)}
                      aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="11.625"
                          stroke="currentColor"
                          strokeWidth="0.75"
                          fill={todo.completed ? "currentColor" : "none"}
                        />
                        {todo.completed && (
                          <path
                            d="M7 12L10 15L17 8"
                            stroke="var(--card)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </button>

                    {/* Task text + list badge */}
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => onTaskClick(todo)}
                    >
                      <p
                        className={`text-base text-foreground truncate ${
                          todo.completed ? "line-through opacity-50" : ""
                        }`}
                      >
                        {todo.text}
                      </p>
                      {list && (
                        <span
                          className="text-xs font-medium mt-0.5 inline-block"
                          style={{ color: list.color }}
                        >
                          {list.name}
                        </span>
                      )}
                    </button>

                    {/* Remove from session */}
                    <button
                      type="button"
                      className="shrink-0 size-5 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => onRemoveTaskFromSession(todo.id)}
                      aria-label="Remove from session"
                    >
                      <X className="size-full" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateSessionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onCreateSession={() => {}}
        onUpdateSession={(id, name, color) => {
          onUpdateSession(id, name, color);
          setIsEditModalOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        editingSession={session}
      />

      <AddTasksToSessionModal
        isOpen={isAddTasksModalOpen}
        onClose={() => setIsAddTasksModalOpen(false)}
        todos={allTodos}
        lists={lists}
        existingTaskIds={existingTaskIds}
        onAddTasks={(ids) => {
          onAddTasksToSession(ids);
          setIsAddTasksModalOpen(false);
        }}
      />
    </>
  );
}
