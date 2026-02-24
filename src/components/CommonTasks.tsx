import React, { useState } from "react";
import { Zap, ChevronLeft, Plus, Clock, Calendar, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
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
    <div className="relative w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
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
            <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">
              Common tasks
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCreateNewTask}
            className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
            aria-label="Add common task"
          >
            <Plus className="size-6" strokeWidth={2} />
          </Button>
        </div>

        {/* Task list */}
        <div className="flex flex-col gap-4 w-full">
          {commonTasks.length === 0 ? (
            <Card className="w-full rounded-lg border border-border bg-card px-4 py-6">
              <p className="text-center text-muted-foreground text-lg">
                No common tasks yet. Tap + to add one.
              </p>
            </Card>
          ) : (
            commonTasks.map((task) => (
              <Card
                key={task.id}
                className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex gap-3 items-start min-w-0">
                  <Zap className="shrink-0 size-6 text-muted-foreground mt-0.5" strokeWidth={1.5} />
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <p className="text-lg font-normal text-foreground tracking-tight break-words">
                      {task.text}
                    </p>
                    {task.deadline && (
                      <div className="flex gap-3 items-center flex-wrap text-muted-foreground text-sm">
                        {task.deadline.time && task.deadline.time.trim() !== "" && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-4 shrink-0" />
                            {formatTime(task.deadline.time)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-4 shrink-0" />
                          {getDayOfWeek(task.deadline.date)}
                        </span>
                        {task.deadline.recurring && (
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="size-4 shrink-0" />
                            {formatRecurring(task.deadline.recurring, task.deadline.date)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
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

