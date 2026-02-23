import { useState } from "react";
import svgPathsToday from "../imports/svg-z2a631st9g";
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
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-[30px] relative w-full h-fit" style={{ paddingBottom: '150px' }}>
          {/* Header */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex items-center gap-[16px] relative shrink-0">
              <div 
                className="relative shrink-0 size-[32px] cursor-pointer"
                onClick={onBack}
              >
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g>
                    <path 
                      d="M20 8L12 16L20 24" 
                      stroke="#E1E6EE" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                    />
                  </g>
                </svg>
              </div>
              <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
                <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Common tasks</p>
              </div>
            </div>
            {/* Plus Button */}
            <div 
              className="relative shrink-0 size-[32px] cursor-pointer"
              onClick={handleCreateNewTask}
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                <g>
                  <path
                    d="M16 6V26M26 16H6"
                    stroke="#E1E6EE"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* Common Tasks List */}
          <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
            {commonTasks.length === 0 ? (
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                No common tasks yet. Click the + button in the top right to add one.
              </p>
            ) : (
              commonTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex gap-[8px] items-center w-full min-w-0 cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Bolt Icon */}
                  <div className="relative shrink-0 size-[24px]">
                    <svg
                      className="block size-full"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 24 24"
                    >
                      <g>
                        <path
                          d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                          stroke="#E1E6EE"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </g>
                    </svg>
                  </div>
                  {/* Task Name and Deadline */}
                  <div className="basis-0 flex flex-col gap-[8px] grow items-start min-h-px min-w-0 overflow-hidden">
                    <div className="flex items-center w-full min-w-0">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[18px] text-white tracking-[-0.198px] break-words min-w-0">
                        {task.text}
                      </p>
                    </div>
                    {task.deadline && (
                      <div className="flex gap-[8px] items-start flex-wrap">
                        {/* Time */}
                        {task.deadline.time && task.deadline.time.trim() !== "" && (
                          <div className="content-stretch flex items-start relative shrink-0">
                            <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                              <div className="relative shrink-0 size-[20px]">
                                <svg
                                  className="block size-full"
                                  fill="none"
                                  preserveAspectRatio="none"
                                  viewBox="0 0 24 24"
                                >
                                  <g>
                                    <path
                                      d={svgPathsToday.p19fddb00}
                                      stroke="#5B5D62"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="1.5"
                                    />
                                  </g>
                                </svg>
                              </div>
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.176px]">
                                {formatTime(task.deadline.time)}
                              </p>
                            </div>
                          </div>
                        )}
                        {/* Day */}
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 24 24"
                            >
                              <g>
                                <path
                                  d={svgPathsToday.p31f04100}
                                  stroke="#5B5D62"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.176px]">
                            {getDayOfWeek(task.deadline.date)}
                          </p>
                        </div>
                        {/* Recurring Pattern */}
                        {task.deadline.recurring && (
                          <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                            <div className="relative shrink-0 size-[20px]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6"
                                style={{ width: '20px', height: '20px' }}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                  stroke="#5B5D62"
                                />
                              </svg>
                            </div>
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.176px]">
                              {formatRecurring(task.deadline.recurring, task.deadline.date)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
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

