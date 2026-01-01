import { useState } from "react";
import { GoalDetailModal } from "./GoalDetailModal";

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
}

interface GoalsProps {
  onBack: () => void;
  goals: Goal[];
  onUpdateGoal: (id: number, text: string, description?: string | null, is_active?: boolean) => Promise<void>;
  onCreateGoal: (text: string, description?: string | null, is_active?: boolean) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
}

export function Goals({ 
  onBack, 
  goals, 
  onUpdateGoal,
  onCreateGoal,
  onDeleteGoal
}: GoalsProps) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleCreateNewGoal = () => {
    const newGoal: Goal = {
      id: -1, // Temporary ID to indicate it's a new goal
      text: "",
      description: null,
      is_active: true,
    };
    setSelectedGoal(newGoal);
    setIsModalOpen(true);
  };

  const handleCreateGoal = async (text: string, description?: string | null, is_active?: boolean) => {
    await onCreateGoal(text, description, is_active);
    handleCloseModal();
  };

  const handleUpdateGoal = async (id: number, text: string, description?: string | null, is_active?: boolean) => {
    await onUpdateGoal(id, text, description, is_active);
    handleCloseModal();
  };


  const activeGoals = goals.filter(g => g.is_active !== false);
  const inactiveGoals = goals.filter(g => g.is_active === false);

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
              <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
                <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Goals</p>
              </div>
            </div>
            {/* Plus Button */}
            <div 
              className="relative shrink-0 size-[32px] cursor-pointer"
              onClick={handleCreateNewGoal}
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

          {/* Goals count */}
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px]">
            {activeGoals.length}/3 Goals set
          </p>

          {/* Goals List */}
          <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
            {goals.length === 0 ? (
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                No goals yet. Click the + button in the top right to add one.
              </p>
            ) : (
              <>
                {/* Active Goals */}
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => handleGoalClick(goal)}
                  >
                    {/* Trophy Icon - green for active */}
                    <div className="relative shrink-0 size-[24px]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="#00C853"
                        className="block size-full"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                        />
                      </svg>
                    </div>
                    {/* Goal Name */}
                    <div className="basis-0 content-stretch flex flex-col grow items-start min-h-px min-w-px relative shrink-0">
                      <div className="content-stretch flex items-center relative shrink-0 w-full">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px]">
                          {goal.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Inactive Goals */}
                {inactiveGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => handleGoalClick(goal)}
                  >
                    {/* Trophy Icon - gray for inactive */}
                    <div className="relative shrink-0 size-[24px]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="#5b5d62"
                        className="block size-full"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                        />
                      </svg>
                    </div>
                    {/* Goal Name */}
                    <div className="basis-0 content-stretch flex flex-col grow items-start min-h-px min-w-px relative shrink-0">
                      <div className="content-stretch flex items-center relative shrink-0 w-full">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-[#5b5d62] tracking-[-0.198px]">
                          {goal.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
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
          onCreateGoal={handleCreateGoal}
          onDeleteGoal={onDeleteGoal}
        />
      )}
    </div>
  );
}

