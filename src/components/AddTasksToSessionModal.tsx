import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search } from "lucide-react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  listId?: number;
  description?: string | null;
}

interface ListItem {
  id: number;
  name: string;
  color: string;
}

interface AddTasksToSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  lists: ListItem[];
  existingTaskIds: Set<number>;
  onAddTasks: (taskIds: number[]) => void;
}

export function AddTasksToSessionModal({
  isOpen,
  onClose,
  todos,
  lists,
  existingTaskIds,
  onAddTasks,
}: AddTasksToSessionModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedIds(new Set());
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const incompleteTasks = useMemo(
    () => todos.filter((t) => !t.completed && !existingTaskIds.has(t.id)),
    [todos, existingTaskIds]
  );

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return incompleteTasks;
    const q = search.toLowerCase();
    return incompleteTasks.filter((t) => t.text.toLowerCase().includes(q));
  }, [incompleteTasks, search]);

  // Group filtered tasks by list
  // listId === 0  → Today
  // listId > 0    → named list
  // listId undefined/null/negative → Unassigned
  const tasksByList = useMemo(() => {
    const map = new Map<number | string, Todo[]>();
    filteredTasks.forEach((task) => {
      let key: number | string;
      if (task.listId && task.listId > 0) {
        key = task.listId;
      } else if (task.listId === 0) {
        key = "today";
      } else {
        key = "unassigned";
      }
      const arr = map.get(key) ?? [];
      arr.push(task);
      map.set(key, arr);
    });
    return map;
  }, [filteredTasks]);

  const getListById = (listId?: number) =>
    listId ? lists.find((l) => l.id === listId) : null;

  const toggleTask = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedIds.size === 0) return;
    onAddTasks(Array.from(selectedIds));
    onClose();
  };

  if (!isOpen) return null;

  const groups: Array<{ key: string; label: React.ReactNode; tasks: Todo[] }> = [];

  // Today first
  const todayTasks = tasksByList.get("today");
  if (todayTasks && todayTasks.length > 0) {
    groups.push({ key: "today", label: <span className="text-[#5b5d62]">Today</span>, tasks: todayTasks });
  }

  // Named lists
  lists.forEach((list) => {
    const tasks = tasksByList.get(list.id);
    if (tasks && tasks.length > 0) {
      groups.push({ key: String(list.id), label: <span style={{ color: list.color }}>{list.name}</span>, tasks });
    }
  });

  // Unassigned last
  const unassignedTasks = tasksByList.get("unassigned");
  if (unassignedTasks && unassignedTasks.length > 0) {
    groups.push({ key: "unassigned", label: <span className="text-[#5b5d62]">Unassigned</span>, tasks: unassignedTasks });
  }

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="bg-[#110c10] flex flex-col rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet" style={{ maxHeight: "85vh" }}>
          {/* Handle */}
          <div className="flex justify-center pt-5 pb-2 shrink-0">
            <div className="h-[20px] w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 shrink-0">
            <h2 className="text-xl font-medium text-white">Add tasks to session</h2>
            <button
              type="button"
              className="size-8 flex items-center justify-center text-[#e1e6ee] hover:opacity-70"
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-[rgba(225,230,238,0.08)] rounded-xl px-3 py-2">
              <Search className="size-4 text-[#5b5d62] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-[#5b5d62]"
              />
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {groups.length === 0 ? (
              <p className="text-[#5b5d62] text-base text-center py-8">No tasks available to add.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map(({ key, label, tasks }) => (
                  <div key={key} className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider">
                      {label}
                    </p>
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className="flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg hover:bg-[rgba(225,230,238,0.05)] transition-colors"
                        onClick={() => toggleTask(task.id)}
                      >
                        {/* Checkbox */}
                        <div className="shrink-0 size-5 rounded-full border border-[rgba(225,230,238,0.3)] flex items-center justify-center"
                          style={selectedIds.has(task.id) ? { backgroundColor: "#0b64f9", borderColor: "#0b64f9" } : {}}>
                          {selectedIds.has(task.id) && (
                            <svg className="size-3" fill="none" viewBox="0 0 12 12" stroke="white" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-base text-[#e1e6ee] truncate">{task.text}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <div className="px-5 pb-10 pt-3 shrink-0 border-t border-[rgba(225,230,238,0.08)]">
            <button
              type="button"
              className="w-full py-3 rounded-xl text-base font-medium transition-opacity"
              style={{
                backgroundColor: selectedIds.size > 0 ? "#0b64f9" : "#3a3a3a",
                color: "#e1e6ee",
                opacity: selectedIds.size > 0 ? 1 : 0.5,
              }}
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
            >
              {selectedIds.size > 0
                ? `Add ${selectedIds.size} task${selectedIds.size > 1 ? "s" : ""}`
                : "Select tasks to add"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
