import { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";

interface NoteForTask {
  id: number;
  content: string;
  task_id?: number | null;
}

interface TaskNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  notesForTask: NoteForTask[];
  onAddNote: (taskId: number, content: string) => void | Promise<void>;
  onUpdateNote?: (id: number, content: string) => void | Promise<void>;
  onDeleteNote?: (id: number) => void | Promise<void>;
}

export function TaskNoteModal({ isOpen, onClose, taskId, notesForTask, onAddNote, onUpdateNote, onDeleteNote }: TaskNoteModalProps) {
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setNoteContent("");
      setError(null);
      setEditingId(null);
      setEditContent("");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSave = async () => {
    const content = noteContent.trim();
    if (!content) return;
    setIsSaving(true);
    setError(null);
    try {
      await onAddNote(taskId, content);
      setNoteContent("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save note";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (note: NoteForTask) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (editingId == null || !onUpdateNote) return;
    const content = editContent.trim();
    if (!content) return;
    setIsSaving(true);
    setError(null);
    try {
      await onUpdateNote(editingId, content);
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update note";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = async (id: number) => {
    if (!onDeleteNote) return;
    if (!confirm("Delete this note?")) return;
    setIsSaving(true);
    setError(null);
    try {
      await onDeleteNote(id);
      if (editingId === id) {
        setEditingId(null);
        setEditContent("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete note";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 flex animate-slide-up justify-center pointer-events-auto desktop-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[90vh] w-full flex-col items-center overflow-hidden rounded-t-xl bg-card">
          {/* Handle */}
          <div className="flex shrink-0 flex-col items-center gap-2.5 pt-5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="w-full shrink-0 px-5">
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Note
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]" style={{ maxHeight: "calc(90vh - 140px)" }}>
            <div className="flex flex-col gap-4 px-5 pt-5 pb-10">
              {/* Existing notes */}
              {notesForTask.length > 0 && (
                <div className="flex flex-col gap-3">
                  {notesForTask.map((note) =>
                    editingId === note.id ? (
                      <div
                        key={note.id}
                        className="rounded-xl bg-secondary p-4 shadow-sm"
                      >
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          autoFocus
                          className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim() || isSaving}
                            className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-card"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={note.id}
                        className="group rounded-xl bg-secondary px-4 py-3 shadow-sm transition-colors hover:bg-accent"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {note.content}
                        </p>
                        {(onUpdateNote || onDeleteNote) && (
                          <div className="mt-2 flex justify-end gap-1">
                            {onUpdateNote && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(note)}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                              >
                                <Pencil className="size-3.5" />
                                Edit
                              </button>
                            )}
                            {onDeleteNote && (
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 focus:ring-offset-card"
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="w-full rounded-lg border border-destructive/30 bg-destructive/15 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Textarea */}
              <div className="flex flex-col gap-3">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  rows={5}
                  autoFocus
                  className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:ring-offset-card"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!noteContent.trim() || isSaving}
                  className="self-end rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-card"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
