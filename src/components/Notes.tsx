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
    <div className="relative flex h-screen max-h-screen w-full shrink-0 flex-col bg-[#110c10]">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#110c10]">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-4 px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#E1E6EE] transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#110c10]"
            aria-label="Back"
          >
            <svg className="size-full" fill="none" viewBox="0 0 32 32" aria-hidden>
              <path d="M20 8L12 16L20 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
          <h1 className="shrink-0 text-2xl font-medium tracking-tight text-white sm:text-[28px]">
            Notes
          </h1>
        </header>

        {/* Content */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-5">
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto pb-5 [-webkit-overflow-scrolling:touch]">
            {/* Add note card */}
            <div className="rounded-xl border border-[#2a2b2d]/50 bg-[#1f2022] p-4 shadow-sm transition-shadow hover:shadow-md">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                className="min-h-[80px] w-full resize-none rounded-lg border border-[#3a3b3d] bg-[#2a2b2d] px-3 py-2.5 text-base text-[#E1E6EE] placeholder:text-[#5b5d62] transition-colors focus:border-[#4b4c4e] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
              />
              {todos.length > 0 && (
                <select
                  value={selectedTaskId ?? ""}
                  onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-3 w-full rounded-lg border border-[#3a3b3d] bg-[#2a2b2d] px-3 py-2.5 text-sm text-[#E1E6EE] transition-colors focus:border-[#4b4c4e] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
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
                className="mt-3 self-end rounded-lg bg-[#0B64F9] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0958e6] hover:shadow disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
              >
                Add note
              </button>
            </div>

            {/* Notes list */}
            <div className="flex flex-col gap-3">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3a3b3d]/60 bg-[#1f2022]/50 py-16">
                  <div className="flex size-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                    <StickyNote className="size-7" strokeWidth={1.5} />
                  </div>
                  <p className="text-center text-base text-[#5b5d62]">No notes yet.</p>
                  <p className="text-center text-sm text-[#5b5d62]/80">Add one above to get started</p>
                </div>
              ) : (
                notes.map((note) =>
                  editingId === note.id ? (
                    <div key={note.id} className="rounded-xl bg-[#1f2022] p-4 shadow-sm">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                        className="min-h-[80px] w-full resize-none rounded-lg border border-[#3a3b3d] bg-[#2a2b2d] px-3 py-2.5 text-base text-[#E1E6EE] transition-colors focus:border-[#4b4c4e] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
                      />
                      {todos.length > 0 && (
                        <select
                          value={editTaskId ?? ""}
                          onChange={(e) => setEditTaskId(e.target.value ? Number(e.target.value) : null)}
                          className="mt-3 w-full rounded-lg border border-[#3a3b3d] bg-[#2a2b2d] px-3 py-2.5 text-sm text-[#E1E6EE] transition-colors focus:border-[#4b4c4e] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
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
                          className="rounded-lg border border-[#3a3b3d] bg-transparent px-3 py-1.5 text-sm text-[#E1E6EE] transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim() || isSubmitting}
                          className="rounded-lg bg-[#0B64F9] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0958e6] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <article
                      key={note.id}
                      className="group rounded-xl bg-[#1f2022] p-4 transition-all hover:bg-[#252628] hover:shadow-sm"
                    >
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-[#E1E6EE]">
                        {note.content}
                      </p>
                      {note.task_id != null && (
                        <p className="mt-2 text-sm text-[#5b5d62]">
                          Task: {getTaskText(note.task_id)}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-[#5b5d62]">
                          {formatNoteDate(note.updated_at ?? note.created_at)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[#5b5d62] transition-colors hover:bg-white/10 hover:text-[#E1E6EE] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[#EF4123] transition-colors hover:bg-[#EF4123]/15 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 focus:ring-offset-[#1f2022]"
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
    </div>
  );
}
