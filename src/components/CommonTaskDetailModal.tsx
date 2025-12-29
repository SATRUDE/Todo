import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-e51h379o38";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";
import { DeadlineModal } from "./DeadlineModal";

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

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface CommonTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CommonTask;
  onUpdateTask: (id: number, text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  onCreateTask?: (text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  onDeleteTask: (id: number) => void;
  onAddToList: (task: CommonTask, listId: number) => void;
  lists?: ListItem[];
}

export function CommonTaskDetailModal({ 
  isOpen, 
  onClose, 
  task, 
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  onAddToList,
  lists = [] 
}: CommonTaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [taskTime, setTaskTime] = useState(task.time || "");
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setTaskTime(task.time || "");
    setDeadline(task.deadline || null);
    setSelectedListId(null); // Reset list selection when modal opens
    
    // Auto-resize textareas when task changes
    setTimeout(() => {
      if (taskInputRef.current) {
        taskInputRef.current.style.height = 'auto';
        taskInputRef.current.style.height = taskInputRef.current.scrollHeight + 'px';
      }
      if (descriptionInputRef.current) {
        descriptionInputRef.current.style.height = 'auto';
        descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
      }
    }, 0);
  }, [task, isOpen]);

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

  const handleSave = () => {
    if (taskInput.trim() === "") return;
    // Only allow saving for new common tasks (temporary ID < 0)
    // For existing common tasks, we don't update them - they remain as templates
    if (task.id < 0 && onCreateTask) {
      onCreateTask(taskInput, taskDescription || null, taskTime || null, deadline === null ? null : deadline);
      onClose();
    }
    // For existing common tasks (id >= 0), the save button does nothing
    // Users should use deadline or "Add to list" to create tasks from the template
  };

  const handleAddTask = () => {
    // For existing common tasks, create a new task from the template
    // Use selectedListId if set, otherwise default to Today (0) if deadline is set, or null
    const listIdToUse = selectedListId !== null ? selectedListId : (deadline ? 0 : null);
    
    if (listIdToUse === null) {
      // No list or deadline selected, can't add
      return;
    }

    const updatedTask = {
      ...task,
      text: taskInput,
      description: taskDescription || null,
      time: taskTime || null,
      deadline: deadline || undefined,
    };
    
    onAddToList(updatedTask, listIdToUse);
    // Close the modal after creating the task (common task remains unchanged)
    onClose();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && taskInput.trim() !== "") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSelectList = (listId: number) => {
    setSelectedListId(listId);
    setIsSelectListOpen(false);
    // Just update the state - don't create the task yet
    // The plus button will create it
  };

  const handleSetDeadline = (date: Date, time: string, recurring?: string) => {
    setDeadline({ date, time, recurring });
    // Just update the state - don't create the task yet
    // The plus button will create it
  };

  const handleDelete = () => {
    // Only delete if it's an existing task (not a new one)
    if (task.id >= 0) {
      onDeleteTask(task.id);
      onClose();
    } else {
      // For new tasks, just close the modal
      onClose();
    }
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
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full">
          {/* Handle */}
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative shrink-0 w-full">
            {/* Title and Description Section */}
            <div className="content-stretch flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0 w-full">
              {/* Task Name Input */}
              <textarea
                ref={taskInputRef}
                value={taskInput}
                onChange={(e) => {
                  setTaskInput(e.target.value);
                  // Auto-resize
                  if (taskInputRef.current) {
                    taskInputRef.current.style.height = 'auto';
                    taskInputRef.current.style.height = taskInputRef.current.scrollHeight + 'px';
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Task name"
                className={`font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[42px] ${
                  taskInput.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
                }`}
                autoFocus
                rows={1}
                style={{ overflow: 'hidden' }}
              />
              {/* Description Input */}
              <textarea
                ref={descriptionInputRef}
                value={taskDescription}
                onChange={(e) => {
                  setTaskDescription(e.target.value);
                  // Auto-resize
                  if (descriptionInputRef.current) {
                    descriptionInputRef.current.style.height = 'auto';
                    descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
                  }
                }}
                placeholder="Description"
                className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] tracking-[-0.198px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[28px] ${
                  taskDescription.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
                }`}
                rows={1}
                style={{ overflow: 'hidden' }}
              />
            </div>

            {/* Buttons Container */}
            <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
              {/* Button Row */}
              <div className="content-center flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
                {/* Deadline Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={() => setIsDeadlineOpen(true)}
                >
                  <div className="relative shrink-0 size-[20px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                      <g>
                        <path d={svgPaths.p186add80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </g>
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{getDeadlineText()}</p>
                </div>

                {/* Add to List Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={() => setIsSelectListOpen(true)}
                >
                  <div className="relative shrink-0 size-[20px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                      <g>
                        <path d={svgPaths.p1dfd6800} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </g>
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                    {selectedListId !== null ? (lists.find(l => l.id === selectedListId)?.name || "List") : "List"}
                  </p>
                </div>

                {/* Trash Icon - Only show for existing tasks */}
                {task.id >= 0 && (
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
                {/* For new common tasks (id < 0), show save button */}
                {task.id < 0 ? (
                  <div 
                    className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      width: '35px',
                      height: '35px',
                      padding: '3px',
                      flexShrink: 0,
                      backgroundColor: taskInput.trim() ? '#0b64f9' : '#5b5d62'
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
                ) : (
                  /* For existing common tasks, show plus button when deadline or list is selected */
                  (deadline || selectedListId !== null) && (
                    <div 
                      className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        width: '35px',
                        height: '35px',
                        padding: '3px',
                        flexShrink: 0,
                        backgroundColor: '#0b64f9'
                      }}
                      onClick={handleAddTask}
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
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Select List Modal */}
      <SelectListModal
        isOpen={isSelectListOpen}
        onClose={() => setIsSelectListOpen(false)}
        lists={lists}
        selectedListId={selectedListId}
        onSelectList={handleSelectList}
        includeToday={true}
      />

      {/* Deadline Modal */}
      <DeadlineModal
        isOpen={isDeadlineOpen}
        onClose={() => setIsDeadlineOpen(false)}
        onSetDeadline={handleSetDeadline}
        onClearDeadline={() => setDeadline(null)}
        currentDeadline={deadline}
      />
    </div>,
    document.body
  );
}

