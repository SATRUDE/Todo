import { useState } from "react";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { DailyTaskDetailModal } from "./DailyTaskDetailModal";
import { linkifyText } from "../lib/textUtils";

interface DailyTask {
  id: number;
  text: string;
  description?: string | null;
  time?: string | null;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface DailyTaskDetailProps {
  dailyTask: DailyTask;
  onBack: () => void;
  tasks: Todo[];
  onToggleTask: (id: number) => void;
  onTaskClick?: (task: Todo) => void;
  onUpdateDailyTask: (id: number, text: string, description?: string | null, time?: string | null) => Promise<void>;
  onDeleteDailyTask: (id: number) => Promise<void>;
  lists: ListItem[];
}

export function DailyTaskDetail({
  dailyTask,
  onBack,
  tasks,
  onToggleTask,
  onTaskClick,
  onUpdateDailyTask,
  onDeleteDailyTask,
  lists
}: DailyTaskDetailProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Safety check - if dailyTask is not properly initialized, show error
  if (!dailyTask || !dailyTask.text) {
    console.error('DailyTaskDetail: dailyTask is missing or invalid', dailyTask);
    return (
      <div className="relative shrink-0 w-full">
        <div className="w-full">
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-[30px] relative w-full">
            <div className="content-stretch flex items-center gap-[16px] relative shrink-0 w-full">
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
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px]">
                Error: Common task not found
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter tasks that match this common task by text and description, excluding completed tasks
  const matchingTasks = tasks.filter(task => {
    try {
      // Exclude completed tasks
      if (task.completed) {
        return false;
      }
      const textMatches = task.text === dailyTask.text;
      const descriptionMatches = (task.description || null) === (dailyTask.description || null);
      return textMatches && descriptionMatches;
    } catch (error) {
      console.error('Error filtering tasks:', error);
      return false;
    }
  }).sort((a, b) => {
    // Sort by deadline date (ascending - earliest first)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1; // Tasks without deadlines go to the end
    if (!b.deadline) return -1;
    
    const dateA = new Date(a.deadline.date).getTime();
    const dateB = new Date(b.deadline.date).getTime();
    return dateA - dateB;
  });

  const handleTitleClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleUpdateTask = async (id: number, text: string, description?: string | null, time?: string | null) => {
    await onUpdateDailyTask(id, text, description, time);
    handleCloseModal();
  };

  const handleDeleteTask = async (id: number) => {
    await onDeleteDailyTask(id);
    handleCloseModal();
    onBack(); // Navigate back after deletion
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[date.getDay()];
    const dayNumber = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${dayNumber} ${month}`;
  };

  const getListById = (taskListId?: number) => {
    if (taskListId === undefined || taskListId === 0 || taskListId === -1) {
      return null;
    }
    return lists.find(l => l.id === taskListId);
  };

  return (
    <>
      <div className="relative shrink-0 w-full">
        <div className="w-full">
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-[30px] relative w-full h-fit" style={{ paddingBottom: '150px' }}>
            {/* Header */}
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
              <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
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
                <div 
                  className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre cursor-pointer"
                  onClick={handleTitleClick}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">
                    {dailyTask.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {matchingTasks.length === 0 ? (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                  No tasks created from this common task yet.
                </p>
              ) : (
                matchingTasks.map((todo) => (
                  <div
                    key={todo.id}
                    className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => onTaskClick && onTaskClick(todo)}
                  >
                    {/* Task Name Row */}
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full min-w-0">
                      <div 
                        className="relative shrink-0 size-[24px] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(todo.id);
                        }}
                      >
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="11.625" 
                            stroke="#E1E6EE" 
                            strokeWidth="0.75"
                            fill={todo.completed ? "#E1E6EE" : "none"}
                          />
                          {todo.completed && (
                            <path
                              d="M7 12L10 15L17 8"
                              stroke="#110c10"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                      </div>
                      <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative min-w-0 flex-1 text-[18px] truncate tracking-[-0.198px] ${
                        todo.completed ? "text-[#5b5d62] line-through" : "text-white"
                      }`}>
                        {todo.text}
                      </p>
                    </div>

                    {/* Description */}
                    {todo.description && todo.description.trim() && (
                      <div 
                        className="w-full pl-[32px] overflow-hidden"
                        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                      >
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal not-italic text-[#5b5d62] text-[14px] tracking-[-0.198px]"
                          style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            width: '100%'
                          }}
                        >
                          {linkifyText(todo.description)}
                        </p>
                      </div>
                    )}

                    {/* Metadata Row */}
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 pl-[32px]">
                      {/* Time */}
                      {todo.time && (
                        <div className="box-border content-stretch flex gap-[4px] items-center justify-center pr-0 py-0 relative shrink-0">
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
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {todo.time}
                          </p>
                        </div>
                      )}

                      {/* Day Due */}
                      {todo.deadline && (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 20 20"
                            >
                              <g>
                                <path
                                  d={svgPathsToday.p31f04100}
                                  stroke="#5B5D62"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.25"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {formatDate(todo.deadline.date)}
                          </p>
                        </div>
                      )}

                      {/* List */}
                      {(() => {
                        const list = getListById(todo.listId);
                        return list ? (
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
                                    d={svgPathsToday.p1c6a4380}
                                    stroke={list.color}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                  />
                                </g>
                              </svg>
                            </div>
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                              {list.name}
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Spacer to prevent bottom cutoff */}
            <div className="w-full" style={{ height: '20px' }} />
          </div>
        </div>
      </div>

      {/* Daily Task Detail Modal */}
      {dailyTask && (
        <DailyTaskDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={dailyTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          lists={lists}
        />
      )}
    </>
  );
}

