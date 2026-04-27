import { useState } from "react";
import { ChevronLeft, Plus, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  is_open?: boolean;
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
  onCloseSession?: (id: number) => void;
  onReorderTasks: (sessionId: number, orderedTaskIds: number[]) => void;
}

function SortableTaskRow({
  taskId,
  todo,
  list,
  onToggle,
  onClick,
  onRemove,
}: {
  taskId: number;
  todo: Todo;
  list: ListItem | null;
  onToggle: (id: number) => void;
  onClick: (todo: Todo) => void;
  onRemove: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: taskId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 w-full"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="shrink-0 size-5 text-muted-foreground/40 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-full" strokeWidth={1.5} />
      </button>

      {/* Checkbox */}
      <button
        type="button"
        className="shrink-0 size-6 text-foreground focus:outline-none"
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      >
        <svg className="block size-full" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11.625" stroke="currentColor" strokeWidth="0.75" fill={todo.completed ? "currentColor" : "none"} />
          {todo.completed && (
            <path d="M7 12L10 15L17 8" stroke="var(--card)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>

      {/* Task text + list badge */}
      <button type="button" className="flex-1 min-w-0 text-left" onClick={() => onClick(todo)}>
        <p className={`text-base text-foreground truncate ${todo.completed ? "line-through opacity-50" : ""}`}>
          {todo.text}
        </p>
        {list && (
          <span className="text-xs font-medium mt-0.5 inline-block" style={{ color: list.color }}>
            {list.name}
          </span>
        )}
      </button>

      {/* Remove */}
      <button
        type="button"
        className="shrink-0 size-5 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onRemove(todo.id)}
        aria-label="Remove from session"
      >
        <X className="size-full" strokeWidth={1.5} />
      </button>
    </div>
  );
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
  onCloseSession,
  onReorderTasks,
}: FocusSessionDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddTasksModalOpen, setIsAddTasksModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sessionTasks.findIndex((st) => st.task_id === active.id);
    const newIndex = sessionTasks.findIndex((st) => st.task_id === over.id);
    const reordered = arrayMove(sessionTasks, oldIndex, newIndex);
    onReorderTasks(session.id, reordered.map((st) => st.task_id));
  };

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sessionTasks.map((st) => st.task_id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 w-full">
                  {sessionTasks.map(({ todo, task_id }) => (
                    <SortableTaskRow
                      key={task_id}
                      taskId={task_id}
                      todo={todo}
                      list={getListById(todo.listId)}
                      onToggle={onToggleTask}
                      onClick={onTaskClick}
                      onRemove={onRemoveTaskFromSession}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {/* Close session button */}
          {session.is_open && onCloseSession && (
            <Button
              type="button"
              variant="outline"
              className="w-full text-muted-foreground"
              onClick={() => onCloseSession(session.id)}
            >
              Close session
            </Button>
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
