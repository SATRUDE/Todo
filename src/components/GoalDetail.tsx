import { useState, useEffect } from "react";
import { GoalDetailModal } from "./GoalDetailModal";
import { MilestoneModal } from "./MilestoneModal";
import { linkifyText } from "../lib/textUtils";

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
  deadline_date?: string | null;
  created_at?: string;
}

interface Milestone {
  id: number;
  goal_id: number;
  name: string;
  description?: string | null;
  days?: number;
  deadline_date?: string | null;
  completed?: boolean;
}

interface Todo {
  id: number;
  completed: boolean;
  milestoneId?: number;
}

interface MilestoneUpdate {
  milestone_id: number;
  content: string;
  created_at?: string;
}

interface GoalDetailProps {
  goal: Goal;
  onBack: () => void;
  onUpdateGoal: (id: number, text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
  onFetchMilestones: (goalId: number) => Promise<Milestone[]>;
  onCreateMilestone: (goalId: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => Promise<Milestone>;
  onUpdateMilestone: (id: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => Promise<Milestone>;
  onDeleteMilestone: (id: number) => Promise<void>;
  onSelectMilestone?: (milestone: Milestone) => void;
  todos?: Todo[];
  /** When provided, used for list. */
  milestones?: Milestone[];
  tasks?: { id: number; completed: boolean; milestone_id?: number; updated_at?: string }[];
  milestoneUpdates?: MilestoneUpdate[];
  /** From DB / bulk goal-status API. Same source as today-page score. */
  goalStatus?: 'On track' | 'At risk' | 'Failing' | null;
  goalExplanation?: string | null;
}

export function GoalDetail({ 
  goal, 
  onBack,
  onUpdateGoal,
  onDeleteGoal,
  onFetchMilestones,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onSelectMilestone,
  milestones: milestonesProp,
  tasks = [],
  milestoneUpdates = [],
  goalStatus,
  goalExplanation
}: GoalDetailProps) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [milestonesLocal, setMilestonesLocal] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  const milestones = milestonesProp ?? milestonesLocal;

  useEffect(() => {
    if (milestonesProp != null) return;
    const load = async () => {
      try {
        const loaded = await onFetchMilestones(goal.id);
        setMilestonesLocal(loaded);
      } catch (e) {
        console.error('Error loading milestones:', e);
      }
    };
    load();
  }, [goal.id, onFetchMilestones, milestonesProp]);

  const handleGoalClick = () => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleUpdateGoal = async (id: number, text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => {
    await onUpdateGoal(id, text, description, is_active, deadline_date);
    handleCloseModal();
  };

  const handleDeleteGoal = async (id: number) => {
    await onDeleteGoal(id);
    handleCloseModal();
    onBack(); // Navigate back after deleting
  };

  const handleCreateNewMilestone = () => {
    const newMilestone: Milestone = {
      id: -1, // Temporary ID to indicate it's a new milestone
      goal_id: goal.id,
      name: "",
      deadline_date: null,
    };
    setSelectedMilestone(newMilestone);
    setIsMilestoneModalOpen(true);
  };

  const handleCloseMilestoneModal = () => {
    setIsMilestoneModalOpen(false);
    setSelectedMilestone(null);
  };

  const handleCreateMilestone = async (name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    const created = await onCreateMilestone(goal.id, name, description, deadline);
    if (milestonesProp == null) setMilestonesLocal((prev) => [...prev, created]);
    handleCloseMilestoneModal();
  };

  const handleUpdateMilestone = async (id: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    const updated = await onUpdateMilestone(id, name, description, deadline);
    if (milestonesProp == null) setMilestonesLocal((prev) => prev.map((m) => (m.id === id ? updated : m)));
    handleCloseMilestoneModal();
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (deadlineDate: string | null | undefined): number | null => {
    if (!deadlineDate) return null;
    
    const parsedDate = parseLocalDate(deadlineDate);
    if (!parsedDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(parsedDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Parse a YYYY-MM-DD string into a Date anchored to the local timezone.
  const parseLocalDate = (dateString: string | undefined | null): Date | undefined => {
    if (!dateString) {
      return undefined;
    }
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if ([year, month, day].some((value) => Number.isNaN(value))) {
      return undefined;
    }

    return new Date(year, month - 1, day);
  };

  const handleDeleteMilestone = async (id: number) => {
    await onDeleteMilestone(id);
    if (milestonesProp == null) setMilestonesLocal((prev) => prev.filter((m) => m.id !== id));
    handleCloseMilestoneModal();
  };

  return (
    <div className="relative shrink-0 w-full">
      <div className="w-full">
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
              <div 
                className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre cursor-pointer"
                onClick={handleGoalClick}
              >
                <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">
                  {goal.text}
                </p>
              </div>
            </div>
            {/* Plus Button */}
            <div 
              className="relative shrink-0 size-[32px] cursor-pointer"
              onClick={handleCreateNewMilestone}
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

          {/* AI score + explanation (from DB, same as today-page card; updated when recalibrated) */}
          {goal?.id && (goalStatus || goalExplanation) && (
            <div
              className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full"
              style={{ padding: '14px 16px', backgroundColor: '#1F2022', borderRadius: '10px' }}
            >
              {goalStatus && (
                <div className="content-stretch flex items-center gap-[8px] relative shrink-0">
                  <span
                    className="font-['Inter:Medium',sans-serif] font-medium text-[13px] tracking-[-0.1px]"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor:
                        goalStatus === 'On track'
                          ? 'rgba(76, 175, 80, 0.2)'
                          : goalStatus === 'At risk'
                            ? 'rgba(255, 193, 7, 0.2)'
                            : 'rgba(244, 67, 54, 0.2)',
                      color:
                        goalStatus === 'On track'
                          ? '#81c784'
                          : goalStatus === 'At risk'
                            ? '#ffca28'
                            : '#e57373',
                    }}
                  >
                    {goalStatus}
                  </span>
                </div>
              )}
              {goalExplanation && (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.45] text-[#e1e6ee] text-[15px] tracking-[-0.15px]">
                  {goalExplanation}
                </p>
              )}
            </div>
          )}

          {/* Goal Description */}
          {goal.description && goal.description.trim() !== "" && (
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                {linkifyText(goal.description)}
              </p>
            </div>
          )}

          {/* Milestones Section */}
          <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
            {/* Milestones Subheading */}
            <div className="content-stretch flex items-center relative shrink-0">
              <p 
                className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-nowrap tracking-[-0.154px]"
                style={{ fontSize: '12px' }}
              >
                MILESTONES
              </p>
            </div>

            {/* Milestones Cards */}
            {(() => {
              const activeMilestones = milestones.filter(m => !m.completed);
              const achievedMilestones = milestones.filter(m => m.completed === true);
              
              if (activeMilestones.length === 0 && achievedMilestones.length === 0) {
                return (
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                    No milestones yet. Click the + button to add one.
                  </p>
                );
              }
              
              return (
                <>
                  {/* Active Milestones */}
                  {activeMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full cursor-pointer"
                  style={{ padding: '16px', backgroundColor: '#1F2022', borderRadius: '8px' }}
                  onClick={() => {
                    if (onSelectMilestone) {
                      onSelectMilestone(milestone);
                    } else {
                      // Fallback to modal if onSelectMilestone is not provided
                      setSelectedMilestone(milestone);
                      setIsMilestoneModalOpen(true);
                    }
                  }}
                >
                  <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full">
                    <div className="content-stretch flex items-center relative shrink-0 w-full min-w-0">
                      <p className="basis-0 font-['Inter:Regular',sans-serif] font-normal grow leading-[1.5] min-h-px min-w-px not-italic relative shrink-0 text-[#e1e6ee] text-[18px] tracking-[-0.198px] break-words">
                        {milestone.name}
                      </p>
                    </div>
                    {(() => {
                      const daysUntil = getDaysUntilDeadline(milestone.deadline_date);
                      if (daysUntil === null) return null;
                      
                      return (
                        <div className="content-stretch flex gap-[10px] items-start relative shrink-0">
                          <div className="relative shrink-0 size-[24px]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="#E1E6EE"
                              className="size-6"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                              />
                            </svg>
                          </div>
                          <div className="content-stretch flex items-center relative shrink-0">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px]">
                              {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                  ))}
                  
                  {/* Achieved Milestones Section */}
                  {achievedMilestones.length > 0 && (
                    <>
                      <div className="content-stretch flex items-center relative shrink-0 w-full" style={{ marginTop: '32px' }}>
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-nowrap tracking-[-0.154px]"
                          style={{ fontSize: '12px' }}
                        >
                          ACHIEVED
                        </p>
                      </div>
                      {achievedMilestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full cursor-pointer opacity-60"
                          style={{ padding: '16px', backgroundColor: '#1F2022', borderRadius: '8px' }}
                          onClick={() => {
                            if (onSelectMilestone) {
                              onSelectMilestone(milestone);
                            } else {
                              setSelectedMilestone(milestone);
                              setIsMilestoneModalOpen(true);
                            }
                          }}
                        >
                          <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full">
                            <div className="content-stretch flex items-center relative shrink-0 w-full min-w-0">
                              <p className="basis-0 font-['Inter:Regular',sans-serif] font-normal grow leading-[1.5] min-h-px min-w-px not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px] line-through break-words">
                                {milestone.name}
                              </p>
                            </div>
                            {(() => {
                              const daysUntil = getDaysUntilDeadline(milestone.deadline_date);
                              if (daysUntil === null) return null;
                              
                              return (
                                <div className="content-stretch flex gap-[10px] items-start relative shrink-0">
                                  <div className="relative shrink-0 size-[24px]">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="#5B5D62"
                                      className="size-6"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                                      />
                                    </svg>
                                  </div>
                                  <div className="content-stretch flex items-center relative shrink-0">
                                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px]">
                                      {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </div>
          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
        </div>
      </div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          goal={selectedGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      )}

      {/* Milestone Modal */}
      {selectedMilestone && (
        <MilestoneModal
          isOpen={isMilestoneModalOpen}
          onClose={handleCloseMilestoneModal}
          milestone={selectedMilestone}
          onUpdateMilestone={handleUpdateMilestone}
          onCreateMilestone={handleCreateMilestone}
          onDeleteMilestone={handleDeleteMilestone}
        />
      )}
    </div>
  );
}

