import { useEffect } from "react";

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
    <div className="fixed inset-0 z-[10002] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto">
        <div 
          className="bg-[#110c10] box-border flex flex-col rounded-tl-[32px] rounded-tr-[32px] w-full" 
          style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
        >
          {/* Handle */}
          <div className="flex flex-col gap-[10px] items-center relative shrink-0 w-full pt-[20px] pb-[10px]">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex flex-col pb-[60px] px-0 relative w-full"
            style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: 'calc(90vh - 80px)', height: 'calc(90vh - 80px)', minHeight: 0, overflowX: 'hidden' }}
          >
            {/* Content */}
            <div className="box-border flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">Add to milestone</p>
              
              {/* Milestone Items */}
              {milestones.length === 0 ? (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                  No milestones available
                </p>
              ) : (
                milestones.map((milestone) => (
                  <div 
                    key={milestone.id}
                    className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => onSelectMilestone(milestone.id)}
                  >
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                      {/* Radio Button */}
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            {selectedMilestoneId === milestone.id ? (
                              <g>
                                <circle cx="12" cy="12" fill="#110C10" r="11.25" stroke="#E1E6EE" strokeWidth="1.5" />
                                <circle cx="12" cy="12" fill="#E1E6EE" r="6" />
                              </g>
                            ) : (
                              <circle cx="12" cy="12" fill="#110C10" r="11.25" stroke="#E1E6EE" strokeWidth="1.5" />
                            )}
                          </svg>
                        </div>
                      </div>
                      {/* Milestone Info */}
                      <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0">
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{milestone.name}</p>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.154px] whitespace-pre">{milestone.goalName}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
