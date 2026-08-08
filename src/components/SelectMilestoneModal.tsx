import { useEffect } from "react";
import { AppSheet } from "./AppSheet";

interface MilestoneWithGoal {
  id: number;
  name: string;
  goalId: number;
  goalName: string;
}

interface SelectMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: MilestoneWithGoal[];
  selectedMilestoneId: number | null;
  onSelectMilestone: (milestoneId: number) => void;
}

export function SelectMilestoneModal({ isOpen, onClose, milestones, selectedMilestoneId, onSelectMilestone }: SelectMilestoneModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Add to milestone">
          {/* Content */}
          <div className="flex flex-col pb-6 relative w-full">
            <div className="flex flex-col gap-[32px] items-start py-0 relative w-full">
              <p className="font-medium font-medium leading-[1.5] not-italic relative shrink-0 text-foreground text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">Add to milestone</p>
              
              {/* Milestone Items */}
              {milestones.length === 0 ? (
                <p className="font-normal font-normal leading-[1.5] not-italic relative shrink-0 text-muted-foreground text-[18px] tracking-[-0.198px]">
                  No milestones available
                </p>
              ) : (
                milestones.map((milestone) => (
                  <div 
                    key={milestone.id}
                    className="flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => onSelectMilestone(milestone.id)}
                  >
                    <div className="flex gap-[8px] items-center relative shrink-0 w-full">
                      {/* Radio Button */}
                      <div className="flex gap-[12px] items-center relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            {selectedMilestoneId === milestone.id ? (
                              <g>
                                <circle cx="12" cy="12" r="11.25" strokeWidth="1.5" className="fill-none stroke-foreground" />
                                <circle cx="12" cy="12" r="6" className="fill-foreground" />
                              </g>
                            ) : (
                              <circle cx="12" cy="12" r="11.25" strokeWidth="1.5" className="fill-none stroke-foreground" />
                            )}
                          </svg>
                        </div>
                      </div>
                      {/* Milestone Info */}
                      <div className="flex flex-col gap-[2px] items-start relative shrink-0">
                        <p className="font-normal font-normal leading-[1.5] not-italic relative shrink-0 text-foreground text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{milestone.name}</p>
                        <p className="font-normal font-normal leading-[1.5] not-italic relative shrink-0 text-muted-foreground text-[14px] text-nowrap tracking-[-0.154px] whitespace-pre">{milestone.goalName}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
    </AppSheet>
  );
}
