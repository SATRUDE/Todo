import { useMemo, useState } from "react";
import { ArrowLeft, Clock3, LayoutList, Plus, Zap } from "lucide-react";
import { DailyTaskDetailModal } from "./DailyTaskDetailModal";
import { Card, CardContent } from "./ui/card";
import { linkifyText } from "../lib/textUtils";

interface DailyTask {
  id: number;
  text: string;
  description?: string | null;
  time?: string | null;
  listId?: number | null;
}

interface DailyTasksProps {
  onBack: () => void;
  dailyTasks: DailyTask[];
  onUpdateDailyTask: (id: number, text: string, description?: string | null, time?: string | null, listId?: number | null) => Promise<void>;
  onCreateDailyTask: (text: string, description?: string | null, time?: string | null, listId?: number | null) => Promise<void>;
  onDeleteDailyTask: (id: number) => Promise<void>;
  lists: Array<{ id: number; name: string; color: string; count: number; isShared: boolean }>;
}

export function DailyTasks({ 
  onBack, 
  dailyTasks, 
  onUpdateDailyTask,
  onCreateDailyTask,
  onDeleteDailyTask,
  lists
}: DailyTasksProps) {
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listLookup = useMemo(() => {
    const map = new Map<number, DailyTasksProps["lists"][number]>();
    lists.forEach((list) => map.set(list.id, list));
    return map;
  }, [lists]);

  const handleTaskClick = (task: DailyTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleCreateNewTask = () => {
    const newTask: DailyTask = {
      id: -1, // Temporary ID to indicate it's a new task
      text: "",
      description: null,
      time: null,
    };
    setSelectedTask(newTask);
    setIsModalOpen(true);
  };

  const handleCreateTask = async (text: string, description?: string | null, time?: string | null, listId?: number | null) => {
    await onCreateDailyTask(text, description, time, listId);
    handleCloseModal();
  };

  const handleUpdateTask = async (id: number, text: string, description?: string | null, time?: string | null, listId?: number | null) => {
    await onUpdateDailyTask(id, text, description, time, listId);
    handleCloseModal();
  };

  const handleDeleteTask = async (id: number) => {
    await onDeleteDailyTask(id);
    handleCloseModal();
  };

  const getListById = (listId?: number | null) => {
    if (listId === null || listId === undefined || listId <= 0) {
      return null;
    }
    return listLookup.get(listId) ?? null;
  };

  return (
    <>
      <div className="relative w-full overflow-x-hidden">
        <div className="flex flex-col gap-8 px-5 pt-8 pb-[150px]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 size-8 cursor-pointer p-1 -m-1 rounded hover:bg-accent/50 text-foreground"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="block size-full" strokeWidth={1.75} />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-medium text-foreground tracking-tight">
                  Daily
                </h1>
                <p className="text-sm text-muted-foreground">
                  Reusable tasks to generate each day
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateNewTask}
              className="shrink-0 size-8 cursor-pointer p-1 -m-1 rounded hover:bg-accent/50 text-foreground"
              aria-label="Create daily task"
            >
              <Plus className="block size-full" strokeWidth={1.75} />
            </button>
          </div>

          {/* Daily Tasks List */}
          {dailyTasks.length === 0 ? (
            <Card className="w-full border-dashed border-border bg-card/40">
              <CardContent className="p-5">
                <p className="text-base text-muted-foreground">
                  No daily tasks yet. Click the plus button to add one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {dailyTasks.map((task) => {
                const list = getListById(task.listId);
                const trimmedDescription = task.description?.trim();
                const time = task.time?.trim();
                const hasMeta = Boolean(time || list);

                return (
                  <Card
                    key={task.id}
                    className="w-full cursor-pointer border-border bg-card transition-colors hover:bg-accent/30"
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardContent className="p-4 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Zap
                          className="size-5 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                        <p className="flex-1 min-w-0 text-lg text-foreground break-words tracking-tight">
                          {task.text}
                        </p>
                      </div>

                      {trimmedDescription && (
                        <div className="pl-7 overflow-hidden">
                          <p className="text-sm text-muted-foreground break-words">
                            {linkifyText(trimmedDescription)}
                          </p>
                        </div>
                      )}

                      {hasMeta && (
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pl-7">
                          {time && (
                            <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Clock3 className="size-4 shrink-0" />
                              <span className="text-sm">{time}</span>
                            </div>
                          )}
                          {list && (
                            <div
                              className="inline-flex items-center gap-1.5"
                              style={{ color: list.color }}
                            >
                              <LayoutList className="size-4 shrink-0" />
                              <span className="text-sm">{list.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Task Detail Modal */}
      {selectedTask && (
        <DailyTaskDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
          onUpdateTask={handleUpdateTask}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          lists={lists}
        />
      )}
    </>
  );
}



