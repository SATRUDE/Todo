import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-e51h379o38";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";

interface DailyTask {
  id: number;
  text: string;
  description?: string | null;
  time?: string | null;
  listId?: number | null;
}

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface DailyTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask;
  onUpdateTask: (id: number, text: string, description?: string | null, time?: string | null, listId?: number | null) => void;
  onCreateTask?: (text: string, description?: string | null, time?: string | null, listId?: number | null) => void;
  onDeleteTask: (id: number) => void;
  lists?: ListItem[];
}

export function DailyTaskDetailModal({ 
  isOpen, 
  onClose, 
  task, 
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  lists = [] 
}: DailyTaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [taskTime, setTaskTime] = useState(task.time || "");
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId || null);
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setTaskTime(task.time || "");
    setSelectedListId(task.listId || null);
    
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

  const handleSave = async () => {
    if (taskInput.trim() === "") return;
    // For new daily tasks (temporary ID < 0), create them
    if (task.id < 0 && onCreateTask) {
      await onCreateTask(taskInput, taskDescription || null, taskTime || null, selectedListId);
      onClose();
    } 
    // For existing daily tasks (id >= 0), update them
    else if (task.id >= 0) {
      await onUpdateTask(task.id, taskInput, taskDescription || null, taskTime || null, selectedListId);
      onClose();
    }
  };

  const handleSelectList = (listId: number) => {
    setSelectedListId(listId);
    setIsSelectListOpen(false);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && taskInput.trim() !== "") {
      e.preventDefault();
      handleSave();
    }
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
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet">
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
        includeToday={true}
      />
    </div>,
    document.body
  );
}

