import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Note } from "../lib/database";

interface TodoForPicker {
  id: number;
  text: string;
  completed: boolean;
}

interface NoteDetailProps {
  note: Note;
  todos: TodoForPicker[];
  onBack: () => void;
  onUpdateNote: (id: number, content: string, taskId?: number | null) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
}

function formatNoteDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export function NoteDetail({ note, todos, onBack, onUpdateNote, onDeleteNote }: NoteDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [editTaskId, setEditTaskId] = useState<number | null>(note.task_id ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getTaskText = (taskId: number | null | undefined): string => {
    if (taskId == null) return "";
    const t = todos.find((x) => x.id === taskId);
    return t?.text ?? `Task #${taskId}`;
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateNote(note.id, editContent.trim(), editTaskId ?? undefined);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setEditTaskId(note.task_id ?? null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note?")) return;
    setIsSubmitting(true);
    try {
      await onDeleteNote(note.id);
      onBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  const titlePreview = note.content.trim().slice(0, 30);
  const displayTitle = titlePreview ? (note.content.length > 30 ? `${titlePreview}…` : titlePreview) : "Note";

  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-col gap-6 px-5 pt-0 pb-[150px] w-full">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Back"
          >
            <svg className="size-5" fill="none" viewBox="0 0 32 32" aria-hidden>
              <path d="M20 8L12 16L20 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
          <h1 className="shrink-0 min-w-0 truncate text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
            {displayTitle}
          </h1>
        </header>

        {/* Content */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {isEditing ? (
            <>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                autoFocus
                className="min-h-[120px] w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
              />
              {todos.length > 0 && (
                <select
                  value={editTaskId ?? ""}
                  onChange={(e) => setEditTaskId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-3 w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                >
                  <option value="">No task</option>
                  {todos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text} {t.completed ? "(completed)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSubmitting}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-card"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground break-words">
                {note.content}
              </p>
              {note.task_id != null && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Task: {getTaskText(note.task_id)}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatNoteDate(note.updated_at ?? note.created_at)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 focus:ring-offset-card disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
