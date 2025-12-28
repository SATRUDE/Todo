import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-e51h379o38";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";
import { DeadlineModal } from "./DeadlineModal";

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  listId?: number;
  description?: string | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Todo;
  onUpdateTask: (taskId: number, text: string, description?: string | null, listId?: number, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  onDeleteTask: (taskId: number) => void;
  onCreateTask?: (text: string, description?: string | null, listId?: number, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  lists?: ListItem[];
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdateTask, onDeleteTask, onCreateTask, lists = [] }: TaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setSelectedListId(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
    setDeadline(task.deadline || null);
    
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

  const handleSave = () => {
    if (taskInput.trim() === "") return;
    // Check if this is a new task (temporary ID < 0) and we have onCreateTask
    if (task.id < 0 && onCreateTask) {
      onCreateTask(taskInput, taskDescription || null, selectedListId || undefined, deadline === null ? null : deadline);
    } else {
      onUpdateTask(task.id, taskInput, taskDescription, selectedListId || undefined, deadline === null ? null : deadline);
    }
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
  };

  const handleSetDeadline = (date: Date, time: string, recurring?: string) => {
    setDeadline({ date, time, recurring });
  };

  const handleDelete = () => {
    // Only delete if it's an existing task (not a new one from calendar suggestion)
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
    
    if (isToday) return `Today ${deadline.time}`;
    if (isTomorrow) return `Tomorrow ${deadline.time}`;
    
    const month = deadline.date.toLocaleDateString('en-US', { month: 'short' });
    const day = deadline.date.getDate();
    return `${month} ${day} ${deadline.time}`;
  };

  const getSelectedListName = () => {
    if (selectedListId === null) return "List";
    const list = lists.find(l => l.id === selectedListId);
    return list ? list.name : "List";
  };

  const getSelectedListColor = () => {
    if (selectedListId === null) return "#E1E6EE";
    const list = lists.find(l => l.id === selectedListId);
    return list ? list.color : "#E1E6EE";
  };

  const handleCopyTask = async () => {
    // Copy just the task text, similar to AddTaskModal
    const textToCopy = taskInput.trim();
    if (!textToCopy) return;
    
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Failed to copy task", error);
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
              {/* Description Input - Always visible */}
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

                {/* List Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={() => setIsSelectListOpen(true)}
                >
                  <div className="relative shrink-0 size-[20px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                      <g>
                        <path d={svgPaths.p1dfd6800} stroke={getSelectedListColor()} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </g>
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{getSelectedListName()}</p>
                </div>

                {/* Copy Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={handleCopyTask}
                >
                  <div className="relative shrink-0 size-[20px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                      <g>
                        <path d="M13.3333 10.75V14.25C13.3333 15.2165 12.5498 16 11.5833 16H5.75C4.7835 16 4 15.2165 4 14.25V8.41667C4 7.45018 4.7835 6.66667 5.75 6.66667H9.25M13.3333 10.75H10.5833C9.61683 10.75 8.83333 9.9665 8.83333 9V6.25C8.83333 5.2835 9.61683 4.5 10.5833 4.5H14.25C15.2165 4.5 16 5.2835 16 6.25V9C16 9.9665 15.2165 10.75 14.25 10.75H13.3333Z" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </g>
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Copy</p>
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
