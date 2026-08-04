import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { AppSheet } from "./AppSheet";
import { toast } from "sonner";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { DeadlineModal } from "./DeadlineModal";

interface Milestone {
  id: number;
  goal_id: number;
  name: string;
  description?: string | null;
  days?: number;
  deadline_date?: string | null;
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone | null;
  onUpdateMilestone: (id: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  onCreateMilestone: (name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => Promise<void>;
  onDeleteMilestone: (id: number) => void;
}

export function MilestoneModal({ 
  isOpen, 
  onClose, 
  milestone,
  onUpdateMilestone,
  onCreateMilestone,
  onDeleteMilestone
}: MilestoneModalProps) {
  const [milestoneName, setMilestoneName] = useState(milestone?.name || "");
  const [milestoneDescription, setMilestoneDescription] = useState(milestone?.description || "");
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(null);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const nameInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMilestoneName(milestone?.name || "");
    setMilestoneDescription(milestone?.description || "");
    
    // Parse deadline_date if it exists
    if (milestone?.deadline_date) {
      const parsedDate = parseLocalDate(milestone.deadline_date);
      if (parsedDate) {
        setDeadline({ date: parsedDate, time: "", recurring: undefined });
      } else {
        setDeadline(null);
      }
    } else {
      setDeadline(null);
    }
    
    // Auto-resize textareas when milestone changes
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.style.height = 'auto';
        nameInputRef.current.style.height = nameInputRef.current.scrollHeight + 'px';
      }
      if (descriptionInputRef.current) {
        descriptionInputRef.current.style.height = 'auto';
        descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
      }
    }, 0);
  }, [milestone, isOpen]);

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
    if (milestoneName.trim() === "") return;
    
    
    try {
      if (milestone && milestone.id >= 0) {
        // Update existing milestone
        await onUpdateMilestone(milestone.id, milestoneName, milestoneDescription || null, deadline || null);
      } else if (milestone) {
        // Create new milestone
        await onCreateMilestone(milestoneName, milestoneDescription || null, deadline || null);
      }
      onClose();
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error('Failed to save milestone. Check console for details.');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && milestoneName.trim() !== "") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDelete = () => {
    // Only delete if it's an existing milestone (not a new one)
    if (milestone && milestone.id >= 0) {
      onDeleteMilestone(milestone.id);
      onClose();
    } else {
      // For new milestones, just close
      onClose();
    }
  };

  const handleSetDeadline = (date: Date, time: string, recurring?: string) => {
    setDeadline({ date, time, recurring });
    setIsDeadlineOpen(false);
  };

  const getDeadlineText = () => {
    if (!deadline) return "Deadline";
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = deadline.date.toDateString() === today.toDateString();
    const isTomorrow = deadline.date.toDateString() === tomorrow.toDateString();
    
    const dateText = isToday ? "Today" : isTomorrow ? "Tomorrow" : 
      `${deadline.date.toLocaleDateString('en-US', { month: 'short' })} ${deadline.date.getDate()}`;
    
    // If no time is set, just show the date
    if (!deadline.time || deadline.time.trim() === "") {
      return dateText;
    }
    
    return `${dateText} ${deadline.time}`;
  };

  if (!isOpen) return null;

  return (
    <>
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Milestone">

          {/* Content */}
          <div className="flex flex-col gap-[32px] items-start px-[20px] py-0 relative shrink-0 w-full">
            {/* Title Section */}
            <div className="flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0 w-full">
              {/* Milestone Name Input */}
              <textarea
                ref={nameInputRef}
                value={milestoneName}
                onChange={(e) => {
                  setMilestoneName(e.target.value);
                  // Auto-resize
                  if (nameInputRef.current) {
                    nameInputRef.current.style.height = 'auto';
                    nameInputRef.current.style.height = nameInputRef.current.scrollHeight + 'px';
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Milestone name"
                className={`font-medium font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-muted-foreground resize-none min-h-[42px] ${
                  milestoneName.trim() ? 'text-foreground' : 'text-muted-foreground'
                }`}
                autoFocus
                rows={1}
                style={{ overflow: 'hidden' }}
              />
              {/* Description Input - Always visible */}
              <textarea
                ref={descriptionInputRef}
                value={milestoneDescription}
                onChange={(e) => {
                  setMilestoneDescription(e.target.value);
                  // Auto-resize
                  if (descriptionInputRef.current) {
                    descriptionInputRef.current.style.height = 'auto';
                    descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
                  }
                }}
                placeholder="Description"
                className={`font-normal font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] tracking-[-0.198px] bg-transparent border-none outline-none w-full placeholder:text-muted-foreground resize-none min-h-[28px] ${
                  milestoneDescription.trim() ? 'text-foreground' : 'text-muted-foreground'
                }`}
                rows={1}
                style={{ overflow: 'hidden' }}
              />
            </div>

            {/* Buttons Container */}
            <div className="flex flex-col gap-[16px] items-start relative shrink-0 w-full">
              {/* Button Row */}
              <div className="content-center flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
                {/* Deadline Button */}
                <div 
                  className="bg-secondary flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-secondary/90"
                  onClick={() => setIsDeadlineOpen(true)}
                >
                  <div className="relative shrink-0" style={{ width: '20px', height: '20px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#E1E6EE" className="block" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <p className="font-normal font-normal leading-[1.5] not-italic relative shrink-0 text-foreground text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{getDeadlineText()}</p>
                </div>

                {/* Trash Icon - Only show for existing milestones */}
                {milestone && milestone.id >= 0 && (
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
                  className="flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    width: '35px',
                    height: '35px',
                    padding: '3px',
                    flexShrink: 0,
                    backgroundColor: milestoneName.trim() ? '#0b64f9' : '#5b5d62'
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
        
    </AppSheet>

      {/* Deadline Modal */}
      <DeadlineModal
        isOpen={isDeadlineOpen}
        onClose={() => setIsDeadlineOpen(false)}
        onSetDeadline={handleSetDeadline}
        onClearDeadline={() => setDeadline(null)}
        currentDeadline={deadline}
      />
    </>
  );
}
