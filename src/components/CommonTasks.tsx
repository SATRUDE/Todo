import { useState } from "react";
import { Zap, ChevronLeft, Plus, Clock, Calendar, RefreshCw } from "lucide-react";
import { CommonTaskDetailModal } from "./CommonTaskDetailModal";

interface CommonTask {
  id: number;
  text: string;
  description?: string | null;
  time?: string | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface CommonTasksProps {
  onBack: () => void;
  commonTasks: CommonTask[];
  onUpdateCommonTask: (id: number, text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => Promise<void>;
  onCreateCommonTask: (text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => Promise<void>;
  onDeleteCommonTask: (id: number) => Promise<void>;
  onAddTaskToList: (task: CommonTask, listId: number) => Promise<void>;
  onSelectCommonTask?: (task: CommonTask) => void;
  lists: Array<{ id: number; name: string; color: string; count: number; isShared: boolean }>;
}

export function CommonTasks({ 
  onBack, 
  commonTasks, 
  onUpdateCommonTask,
  onCreateCommonTask,
  onDeleteCommonTask,
  onAddTaskToList,
  onSelectCommonTask,
  lists
}: CommonTasksProps) {
  const [selectedTask, setSelectedTask] = useState<CommonTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTaskClick = (task: CommonTask) => {
    if (onSelectCommonTask) {
      onSelectCommonTask(task);
    } else {
      // Fallback to modal if onSelectCommonTask is not provided
      setSelectedTask(task);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleCreateNewTask = () => {
    const newTask: CommonTask = {
      id: -1, // Temporary ID to indicate it's a new task
      text: "",
      description: null,
      time: null,
    };
    setSelectedTask(newTask);
    setIsModalOpen(true);
  };

  const handleCreateTask = async (text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    await onCreateCommonTask(text, description, time, deadline);
    handleCloseModal();
  };

  const handleUpdateTask = async (id: number, text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    await onUpdateCommonTask(id, text, description, time, deadline);
    handleCloseModal();
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const formatTime = (time: string) => {
    if (!time || time.trim() === "") return "";
    // Time is already in HH:MM format from the conversion function
    return time;
  };

  const formatRecurring = (recurring: string, date: Date) => {
    // Check if recurring contains custom days (comma-separated)
    if (recurring && recurring.includes(',')) {
      const selectedDays = recurring.split(',').map(day => day.trim().toLowerCase());
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Map selected days to their labels
      const selectedLabels = selectedDays
        .map(day => {
          const index = dayNames.indexOf(day);
          return index !== -1 ? dayLabels[index] : null;
        })
        .filter(label => label !== null);
      
      if (selectedLabels.length === 0) {
        return "";
      }
      
      // Format nicely: "Mon, Wed, Fri" or "Every Mon, Wed, Fri"
      if (selectedLabels.length === 1) {
        return `Every ${selectedLabels[0]}`;
      } else if (selectedLabels.length === 7) {
        return "Every day";
      } else {
        return selectedLabels.join(', ');
      }
    }
    
    // Handle standard recurring patterns
    switch (recurring) {
      case "daily":
        return "Every day";
      case "weekly":
        return `Every ${getDayOfWeek(date)}`;
      case "weekday":
        return "Every weekday";
      case "monthly":
        return "Every month";
      default:
        return "";
    }
  };

  const handleDeleteTask = async (id: number) => {
    await onDeleteCommonTask(id);
    handleCloseModal();
  };

  const handleAddToList = async (task: CommonTask, listId: number) => {
    await onAddTaskToList(task, listId);
    handleCloseModal();
  };

  return (
    <div className="relative shrink-0 w-full min-w-0 overflow-x-hidden">
      <div className="w-full min-w-0">
        <div className="flex flex-col gap-8 items-start px-5 pt-6 pb-[150px] w-full">
          {/* Header */}
          <header className="flex items-center justify-between w-full shrink-0">
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={onBack}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Back"
              >
                <ChevronLeft className="size-5" />
              </button>
              <h1 className="shrink-0 text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
                Common tasks
              </h1>
            </div>
            <button
              type="button"
              onClick={handleCreateNewTask}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Add common task"
            >
              <Plus className="size-5" />
            </button>
          </header>

          {/* Common Tasks List */}
          <div className="flex flex-col gap-6 items-start w-full shrink-0">
            {commonTasks.length === 0 ? (
              <p className="text-muted-foreground text-lg">
                No common tasks yet. Click the + button in the top right to add one.
              </p>
            ) : (
              commonTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex gap-2 items-center w-full min-w-0 cursor-pointer group"
                  onClick={() => handleTaskClick(task)}
                >
                  <Zap className="shrink-0 size-6 text-muted-foreground" strokeWidth={1.5} />
                  <div className="flex flex-col gap-2 grow min-w-0 overflow-hidden">
                    <p className="text-lg text-foreground break-words min-w-0">
                      {task.text}
                    </p>
                    {task.deadline && (
                      <div className="flex gap-2 items-center flex-wrap text-muted-foreground text-sm">
                        {task.deadline.time && task.deadline.time.trim() !== "" && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-4 shrink-0" />
                            {formatTime(task.deadline.time)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="size-4 shrink-0" />
                          {getDayOfWeek(task.deadline.date)}
                        </span>
                        {task.deadline.recurring && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="size-4 shrink-0" />
                            {formatRecurring(task.deadline.recurring, task.deadline.date)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Common Task Detail Modal */}
      {selectedTask && (
        <CommonTaskDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
          onUpdateTask={handleUpdateTask}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onAddToList={handleAddToList}
          lists={lists}
        />
      )}
    </div>
  );
}

