import { useState, useEffect } from "react";
import { Pencil, Trash2, StickyNote } from "lucide-react";

export interface Note {
  id: number;
  content: string;
  task_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface TodoForPicker {
  id: number;
  text: string;
  completed: boolean;
}

interface NotesProps {
  onBack: () => void;
  notes: Note[];
  todos: TodoForPicker[];
  onAddNote: (content: string, taskId?: number | null) => Promise<void>;
  onUpdateNote: (id: number, content: string, taskId?: number | null) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  preselectedTaskId?: number | null;
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

export function Notes({
  onBack,
  notes,
  todos,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  preselectedTaskId,
}: NotesProps) {
  const [newContent, setNewContent] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(preselectedTaskId ?? null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedTaskId != null) {
      setSelectedTaskId(preselectedTaskId);
    }
  }, [preselectedTaskId]);

  const getTaskText = (taskId: number | null | undefined): string => {
    if (taskId == null) return "";
    const t = todos.find((x) => x.id === taskId);
    return t?.text ?? `Task #${taskId}`;
  };

  const handleAdd = async () => {
    const content = newContent.trim();
    if (!content) return;
    setIsSubmitting(true);
    try {
      await onAddNote(content, selectedTaskId ?? undefined);
      setNewContent("");
      setSelectedTaskId(preselectedTaskId ?? null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditTaskId(note.task_id ?? null);
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    setIsSubmitting(true);
    try {
      await onUpdateNote(editingId, editContent.trim(), editTaskId ?? undefined);
      setEditingId(null);
      setEditContent("");
      setEditTaskId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setEditTaskId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    setIsSubmitting(true);
    try {
      await onDeleteNote(id);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="shrink-0 text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
            Notes
          </h1>
        </header>

        {/* Content */}
        <div className="flex flex-col gap-6">
            {/* Add note card */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
              />
              {todos.length > 0 && (
                <select
                  value={selectedTaskId ?? ""}
                  onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
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
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newContent.trim() || isSubmitting}
                className="mt-3 self-end rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-card"
              >
                Add note
              </button>
            </div>

            {/* Notes list */}
            <div className="flex flex-col gap-3">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-secondary/50 py-16">
                  <div className="flex size-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                    <StickyNote className="size-7" strokeWidth={1.5} />
                  </div>
                  <p className="text-center text-base text-muted-foreground">No notes yet.</p>
                  <p className="text-center text-sm text-muted-foreground/80">Add one above to get started</p>
                </div>
              ) : (
                notes.map((note) =>
                  editingId === note.id ? (
                    <div key={note.id} className="rounded-xl bg-card p-4 shadow-sm">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                        className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
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
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim() || isSubmitting}
                          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-card"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <article
                      key={note.id}
                      className="group rounded-xl bg-card p-4 transition-all hover:bg-accent/50 hover:shadow-sm"
                    >
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {note.content}
                      </p>
                      {note.task_id != null && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Task: {getTaskText(note.task_id)}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatNoteDate(note.updated_at ?? note.created_at)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 focus:ring-offset-card"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
