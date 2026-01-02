import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { createPortal } from "react-dom";
import deleteIconPaths from "../imports/svg-u66msu10qs";

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
}

interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
  onUpdateGoal: (id: number, text: string, description?: string | null, is_active?: boolean) => void;
  onCreateGoal?: (text: string, description?: string | null, is_active?: boolean) => void;
  onDeleteGoal: (id: number) => void;
}

export function GoalDetailModal({ 
  isOpen, 
  onClose, 
  goal, 
  onUpdateGoal,
  onCreateGoal,
  onDeleteGoal
}: GoalDetailModalProps) {
  const [goalInput, setGoalInput] = useState(goal.text);
  const [goalDescription, setGoalDescription] = useState(goal.description || "");
  const [isActive, setIsActive] = useState(goal.is_active !== false);
  const goalInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setGoalInput(goal.text);
    setGoalDescription(goal.description || "");
    setIsActive(goal.is_active !== false);
    
    // Auto-resize textareas when goal changes
    setTimeout(() => {
      if (goalInputRef.current) {
        goalInputRef.current.style.height = 'auto';
        goalInputRef.current.style.height = goalInputRef.current.scrollHeight + 'px';
      }
      if (descriptionInputRef.current) {
        descriptionInputRef.current.style.height = 'auto';
        descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
      }
    }, 0);
  }, [goal, isOpen]);

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

  const handleSave = async () => {
    if (goalInput.trim() === "") return;
    
    try {
      if (goal.id < 0 && onCreateGoal) {
        // New goal - check if we can create it as active
        // The database function will enforce the 4 active goals limit
        await onCreateGoal(goalInput, goalDescription || null, isActive);
      } else {
        // Update existing goal
        await onUpdateGoal(goal.id, goalInput, goalDescription || null, isActive);
      }
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message.includes('4 active goals')) {
        alert(error.message);
      } else {
        console.error('Error saving goal:', error);
        alert('Failed to save goal. Check console for details.');
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && goalInput.trim() !== "") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDelete = () => {
    // Only delete if it's an existing goal (not a new one)
    if (goal.id >= 0) {
      onDeleteGoal(goal.id);
      onClose();
    } else {
      // For new goals, just close
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}>
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
            <div className="box-border flex flex-col gap-[40px] items-center px-0 relative w-full">
              <div className="box-border flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
                {/* Title and Description Section */}
                <div className="flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0 w-full">
                  {/* Goal Name Input */}
                  <textarea
                    ref={goalInputRef}
                    value={goalInput}
                    onChange={(e) => {
                      setGoalInput(e.target.value);
                      // Auto-resize
                      if (goalInputRef.current) {
                        goalInputRef.current.style.height = 'auto';
                        goalInputRef.current.style.height = goalInputRef.current.scrollHeight + 'px';
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Goal name"
                    className={`font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[42px] ${
                      goalInput.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
                    }`}
                    autoFocus
                    rows={1}
                    style={{ overflow: 'hidden' }}
                  />
                  {/* Description Input */}
                  <textarea
                    ref={descriptionInputRef}
                    value={goalDescription}
                    onChange={(e) => {
                      setGoalDescription(e.target.value);
                      // Auto-resize
                      if (descriptionInputRef.current) {
                        descriptionInputRef.current.style.height = 'auto';
                        descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
                      }
                    }}
                    placeholder="Description"
                    className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] tracking-[-0.198px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[28px] ${
                      goalDescription.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
                    }`}
                    rows={1}
                    style={{ overflow: 'hidden' }}
                  />
                </div>

                {/* Buttons Container */}
                <div className="flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                  {/* Button Row */}
                  <div className="flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
                    {/* Active Toggle */}
                    <div 
                      className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer inline-flex"
                      onClick={() => setIsActive(!isActive)}
                    >
                      {/* Toggle Switch */}
                      <div className="h-[24px] relative shrink-0 w-[44px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
                          <g>
                            <rect fill={isActive ? "#00C853" : "#595559"} height="24" rx="12" width="44" />
                            <circle cx={isActive ? "32" : "12"} cy="12" fill="white" r="10" />
                          </g>
                        </svg>
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Active</p>
                    </div>

                    {/* Trash Icon - Only show for existing goals */}
                    {goal.id >= 0 && (
                      <div 
                        className="relative shrink-0 size-[24px] cursor-pointer hover:opacity-70"
                        onClick={handleDelete}
                      >
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={deleteIconPaths.pf5e3c80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Submit Button Row */}
                  <div className="flex gap-[10px] items-end justify-end w-full" style={{ justifyContent: 'flex-end', width: '100%' }}>
                    <div 
                      className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        width: '35px',
                        height: '35px',
                        padding: '3px',
                        flexShrink: 0,
                        backgroundColor: goalInput.trim() ? '#0b64f9' : '#5b5d62'
                      }}
                      onClick={handleSave}
                    >
                      <div className="relative" style={{ width: '24px', height: '24px' }}>
                        <svg className="block" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                          <g>
                            <line
                              x1="12"
                              y1="6"
                              x2="12"
                              y2="18"
                              stroke="#E1E6EE"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1="6"
                              y1="12"
                              x2="18"
                              y2="12"
                              stroke="#E1E6EE"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
