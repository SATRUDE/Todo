import { useState, useEffect } from "react";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { MilestoneModal } from "./MilestoneModal";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
  milestoneId?: number;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface Milestone {
  id: number;
  goal_id: number;
  name: string;
  deadline_date?: string | null;
  completed?: boolean; // Used for "achieved" status
}

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
}

interface MilestoneDetailProps {
  milestone: Milestone;
  goal: Goal;
  onBack: () => void;
  tasks: Todo[];
  onToggleTask: (id: number) => void;
  onAddTask: (taskText: string, description?: string, deadline?: { date: Date; time: string; recurring?: string }) => void;
  onTaskClick?: (task: Todo) => void;
  onUpdateMilestone: (id: number, name: string, deadline?: { date: Date; time: string; recurring?: string } | null, achieved?: boolean) => Promise<void>;
  onToggleAchieved?: (id: number, achieved: boolean) => Promise<void>;
  onDeleteMilestone: (id: number) => Promise<void>;
  onFetchMilestones: (goalId: number) => Promise<Milestone[]>;
}

export function MilestoneDetail({ 
  milestone, 
  goal,
  onBack, 
  tasks, 
  onToggleTask, 
  onAddTask, 
  onTaskClick,
  onUpdateMilestone,
  onDeleteMilestone,
  onFetchMilestones,
  onToggleAchieved
}: MilestoneDetailProps) {
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isAchieved, setIsAchieved] = useState(milestone.completed === true);

  const handleAddTask = (taskText: string, description?: string, _listId?: number, _milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    // onAddTask from parent expects taskText, description, and deadline, and already knows the milestoneId
    onAddTask(taskText, description, deadline);
    setIsAddTaskModalOpen(false);
  };

  const handleMilestoneClick = () => {
    setIsMilestoneModalOpen(true);
  };

  const handleCloseMilestoneModal = () => {
    setIsMilestoneModalOpen(false);
  };

  const handleUpdateMilestone = async (id: number, name: string, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    await onUpdateMilestone(id, name, deadline);
    handleCloseMilestoneModal();
  };

  const handleDeleteMilestone = async (id: number) => {
    await onDeleteMilestone(id);
    handleCloseMilestoneModal();
    onBack(); // Navigate back after deleting
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Parse deadline_date string to Date object for milestone modal
  const parseDeadlineDate = (dateString?: string | null): Date | undefined => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const milestoneDeadline = milestone.deadline_date ? parseDeadlineDate(milestone.deadline_date) : undefined;

  // Update local state when milestone prop changes
  useEffect(() => {
    setIsAchieved(milestone.completed === true);
  }, [milestone.completed]);

  const handleToggleAchieved = async () => {
    const newAchieved = !isAchieved;
    setIsAchieved(newAchieved);
    if (onToggleAchieved) {
      await onToggleAchieved(milestone.id, newAchieved);
    } else if (onUpdateMilestone) {
      // Fallback to onUpdateMilestone if onToggleAchieved is not provided
      await onUpdateMilestone(milestone.id, milestone.name, milestoneDeadline ? { date: milestoneDeadline, time: '', recurring: undefined } : null, newAchieved);
    }
  };

  return (
    <>
      <div className="relative w-full">
        <div className="w-full">
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
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
                  className="content-stretch flex flex-col items-start relative shrink-0 cursor-pointer"
                  onClick={handleMilestoneClick}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">
                    {milestone.name}
                  </p>
                </div>
              </div>
              <div 
                className="relative shrink-0 size-[32px] cursor-pointer"
                onClick={() => setIsAddTaskModalOpen(true)}
              >
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g>
                    <path d="M16 6V26M26 16H6" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Achieved Toggle */}
            <div className="mb-[12px]">
              <div 
                className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer inline-flex"
                onClick={handleToggleAchieved}
              >
                {/* Toggle Switch */}
                <div className="h-[24px] relative shrink-0 w-[44px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
                    <g>
                      <rect fill={isAchieved ? "#00C853" : "#595559"} height="24" rx="12" width="44" />
                      <circle cx={isAchieved ? "32" : "12"} cy="12" fill="white" r="10" />
                    </g>
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Achieved</p>
              </div>
            </div>

            {/* Tasks */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {tasks.length === 0 ? (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                  No tasks yet. Click the + button to add one.
                </p>
              ) : (
                tasks.map((todo) => (
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
                          {todo.description}
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
                            {getDayOfWeek(todo.deadline.date)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        defaultMilestoneId={milestone.id}
      />
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={handleCloseMilestoneModal}
        milestone={milestone}
        onUpdateMilestone={handleUpdateMilestone}
        onCreateMilestone={async () => {}}
        onDeleteMilestone={handleDeleteMilestone}
      />
    </>
  );
}

