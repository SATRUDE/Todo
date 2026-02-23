import { useState, useMemo } from "react";
import { Search, StickyNote, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

interface SearchTodo {
  id: number;
  text: string;
  completed: boolean;
  description?: string | null;
  listId?: number;
  parentTaskId?: number | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface SearchNote {
  id: number;
  content: string;
  task_id?: number | null;
}

interface ListItem {
  id: number;
  name: string;
  color: string;
}

interface SearchPageProps {
  todos: SearchTodo[];
  notes: SearchNote[];
  lists: ListItem[];
  getListById: (listId?: number) => ListItem | null;
  onTaskClick: (task: SearchTodo) => void;
  onBack: () => void;
  onNavigateToNotes: () => void;
  onNoteClick?: (note: SearchNote) => void;
}

export function SearchPage({
  todos,
  notes,
  lists,
  getListById,
  onTaskClick,
  onBack,
  onNavigateToNotes,
  onNoteClick,
}: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "notes">("tasks");

  const q = query.trim().toLowerCase();

  const matchingTasks = useMemo(() => {
    if (!q) return [];
    const mainTasks = todos.filter((t) => !t.parentTaskId);
    return mainTasks.filter((t) => {
      const textMatch = t.text?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      return textMatch || descMatch;
    });
  }, [todos, q]);

  const matchingNotes = useMemo(() => {
    if (!q) return [];
    return notes.filter((n) => {
      const contentMatch = n.content?.toLowerCase().includes(q);
      if (contentMatch) return true;
      if (n.task_id != null) {
        const taskText = todos.find((t) => t.id === n.task_id)?.text ?? "";
        return taskText.toLowerCase().includes(q);
      }
      return false;
    });
  }, [notes, todos, q]);

  const getTaskText = (taskId: number | null | undefined): string => {
    if (taskId == null) return "";
    const t = todos.find((x) => x.id === taskId);
    return t?.text ?? `Task #${taskId}`;
  };

  const formatDeadline = (d: SearchTodo["deadline"]): string => {
    if (!d) return "";
    const dateStr = d.date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return d.time ? `${dateStr} at ${d.time}` : dateStr;
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-6 px-5 pt-0 pb-[150px] w-full">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Back"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 32 32"
              aria-hidden
            >
              <path
                d="M20 8L12 16L20 24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
          <h1 className="shrink-0 text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
            Search
          </h1>
        </header>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tasks and notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 !bg-white !border-border !text-gray-900 placeholder:!text-muted-foreground focus-visible:ring-violet-500/30 dark:!bg-input dark:!text-foreground dark:placeholder:!text-muted-foreground"
            autoFocus
          />
        </div>

        {/* Tabs and results */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "tasks" | "notes")}
          className="flex flex-col gap-4"
        >
          <TabsList className="w-fit">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {!q ? (
            <p className="text-muted-foreground text-sm py-8">
              Enter a search term
            </p>
          ) : (
            <>
              <TabsContent value="tasks" className="mt-0 flex flex-col gap-2">
                {matchingTasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8">
                    No matching tasks
                  </p>
                ) : (
                  matchingTasks.map((task) => {
                    const list = getListById(task.listId);
                    return (
                      <Card
                        key={task.id}
                        className="cursor-pointer border-border hover:bg-accent/30 transition-colors"
                        onClick={() => onTaskClick(task)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-base text-foreground break-words ${
                                task.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {task.text}
                            </p>
                            {(list || task.deadline) && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {[list?.name, formatDeadline(task.deadline)]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-0 flex flex-col gap-2">
                {matchingNotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8">
                    No matching notes
                  </p>
                ) : (
                  matchingNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="cursor-pointer border-border hover:bg-accent/30 transition-colors"
                      onClick={() => (onNoteClick ? onNoteClick(note) : onNavigateToNotes())}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <StickyNote className="size-5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-base text-foreground break-words line-clamp-2">
                            {note.content}
                          </p>
                          {note.task_id && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Linked to: {getTaskText(note.task_id)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
