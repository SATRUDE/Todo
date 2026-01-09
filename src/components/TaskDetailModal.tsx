import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-e51h379o38";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";
import { SelectMilestoneModal } from "./SelectMilestoneModal";
import { DeadlineModal } from "./DeadlineModal";
import { linkifyText } from "../lib/textUtils";

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface MilestoneWithGoal {
  id: number;
  name: string;
  goalId: number;
  goalName: string;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  listId?: number;
  milestoneId?: number;
  description?: string | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
  effort?: number;
  type?: 'task' | 'reminder';
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Todo;
  onUpdateTask: (taskId: number, text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, effort?: number, type?: 'task' | 'reminder') => void;
  onDeleteTask: (taskId: number) => void;
  onCreateTask?: (text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, effort?: number, type?: 'task' | 'reminder') => void;
  lists?: ListItem[];
  milestones?: MilestoneWithGoal[];
}

// Helper function to get all text nodes in an element
function getTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }
  
  return textNodes;
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdateTask, onDeleteTask, onCreateTask, lists = [], milestones = [] }: TaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isSelectMilestoneOpen, setIsSelectMilestoneOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(task.milestoneId || null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);
  const [effort, setEffort] = useState<number>(task.effort || 0);
  const [taskType, setTaskType] = useState<'task' | 'reminder'>(task.type || 'task');
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setSelectedListId(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
    setSelectedMilestoneId(task.milestoneId || null);
    setDeadline(task.deadline || null);
    setEffort(task.effort || 0);
    setTaskType(task.type || 'task');
    
    // Auto-resize textareas when task changes
    setTimeout(() => {
      if (taskInputRef.current) {
        taskInputRef.current.style.height = 'auto';
        taskInputRef.current.style.height = taskInputRef.current.scrollHeight + 'px';
      }
      if (descriptionInputRef.current) {
        // Update contentEditable div content
        const plainText = task.description || "";
        descriptionInputRef.current.textContent = plainText;
        // Auto-resize
        descriptionInputRef.current.style.height = 'auto';
        descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
      }
    }, 0);
  }, [task, isOpen]);

  const handleSave = () => {
    if (taskInput.trim() === "") return;
    // Check if this is a new task (temporary ID < 0) and we have onCreateTask
    if (task.id < 0 && onCreateTask) {
      onCreateTask(taskInput, taskDescription || null, selectedListId || undefined, selectedMilestoneId || undefined, deadline === null ? null : deadline, effort > 0 ? effort : undefined, taskType);
    } else {
      onUpdateTask(task.id, taskInput, taskDescription, selectedListId || undefined, selectedMilestoneId || undefined, deadline === null ? null : deadline, effort > 0 ? effort : undefined, taskType);
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

  const handleSelectMilestone = (milestoneId: number) => {
    setSelectedMilestoneId(milestoneId);
    setIsSelectMilestoneOpen(false);
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

  const getSelectedMilestoneName = () => {
    if (selectedMilestoneId === null) return "Milestone";
    const milestone = milestones.find(m => m.id === selectedMilestoneId);
    return milestone ? milestone.name : "Milestone";
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
              {/* Description Input - Always visible */}
              <div
                ref={descriptionInputRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const text = e.currentTarget.textContent || "";
                  setTaskDescription(text);
                  
                  // Preserve cursor position
                  const selection = window.getSelection();
                  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
                  const cursorOffset = range ? range.startOffset : 0;
                  
                  // Auto-resize
                  if (descriptionInputRef.current) {
                    descriptionInputRef.current.style.height = 'auto';
                    descriptionInputRef.current.style.height = descriptionInputRef.current.scrollHeight + 'px';
                  }
                  
                  // Render links in real-time if URLs are detected
                  if (text.trim() && /(https?:\/\/|www\.)/.test(text)) {
                    // URL regex pattern
                    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
                    const parts: string[] = [];
                    let lastIndex = 0;
                    let match;
                    let urlCount = 0;
                    
                    while ((match = urlRegex.exec(text)) !== null) {
                      urlCount++;
                      // Add text before URL
                      if (match.index > lastIndex) {
                        const beforeText = text.substring(lastIndex, match.index);
                        parts.push(beforeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                      }
                      
                      // Add URL as clickable link
                      let url = match[0];
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                      }
                      const escapedUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                      const escapedText = match[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                      parts.push(`<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="description-link" onclick="event.stopPropagation(); window.open('${escapedUrl}', '_blank', 'noopener,noreferrer'); return false;">${escapedText}</a>`);
                      
                      lastIndex = match.index + match[0].length;
                    }
                    
                    // Add remaining text
                    if (lastIndex < text.length) {
                      const remainingText = text.substring(lastIndex);
                      parts.push(remainingText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                    }
                    
                    // Render with links if URLs were found
                    if (urlCount > 0 && descriptionInputRef.current) {
                      const htmlToRender = parts.join('');
                      const currentHTML = descriptionInputRef.current.innerHTML;
                      
                      // Only update if HTML changed to avoid cursor jumping
                      if (currentHTML !== htmlToRender) {
                        // Set HTML with links
                        descriptionInputRef.current.innerHTML = htmlToRender;
                        
                        // Restore cursor position
                        setTimeout(() => {
                          if (descriptionInputRef.current) {
                            try {
                              const newSelection = window.getSelection();
                              if (newSelection) {
                                const textNodes = getTextNodes(descriptionInputRef.current);
                                let currentOffset = 0;
                                let targetNode: Text | null = null;
                                let targetOffset = 0;
                                
                                for (const node of textNodes) {
                                  const nodeLength = node.textContent?.length || 0;
                                  if (currentOffset + nodeLength >= cursorOffset) {
                                    targetNode = node;
                                    targetOffset = Math.min(cursorOffset - currentOffset, nodeLength);
                                    break;
                                  }
                                  currentOffset += nodeLength;
                                }
                                
                                if (targetNode) {
                                  const newRange = document.createRange();
                                  newRange.setStart(targetNode, targetOffset);
                                  newRange.setEnd(targetNode, targetOffset);
                                  newSelection.removeAllRanges();
                                  newSelection.addRange(newRange);
                                }
                              }
                            } catch (err) {
                              // If cursor restoration fails, place at end
                              const newSelection = window.getSelection();
                              if (newSelection && descriptionInputRef.current.lastChild) {
                                const newRange = document.createRange();
                                newRange.selectNodeContents(descriptionInputRef.current);
                                newRange.collapse(false);
                                newSelection.removeAllRanges();
                                newSelection.addRange(newRange);
                              }
                            }
                          }
                        }, 0);
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  // Render links when not editing
                  if (descriptionInputRef.current) {
                    const text = descriptionInputRef.current.textContent || "";
                    setTaskDescription(text);
                    
                    if (text.trim()) {
                      // URL regex pattern
                      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
                      const parts: string[] = [];
                      let lastIndex = 0;
                      let match;
                      let urlCount = 0;
                      
                    while ((match = urlRegex.exec(text)) !== null) {
                      urlCount++;
                      // Add text before URL (with proper escaping)
                        if (match.index > lastIndex) {
                          const beforeText = text.substring(lastIndex, match.index);
                          parts.push(beforeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                        }
                        
                        // Add URL as clickable link
                        let url = match[0];
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                          url = 'https://' + url;
                        }
                        const escapedUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const escapedText = match[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        parts.push(`<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="description-link" onclick="event.stopPropagation(); window.open('${escapedUrl}', '_blank', 'noopener,noreferrer'); return false;">${escapedText}</a>`);
                        
                        lastIndex = match.index + match[0].length;
                      }
                      
                      // Add remaining text
                      if (lastIndex < text.length) {
                        const remainingText = text.substring(lastIndex);
                        parts.push(remainingText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                      }
                      
                      // Update innerHTML if URLs were found, otherwise keep plain text
                      if (urlCount > 0) {
                        const htmlToRender = parts.join('');
                        // Small delay to ensure blur completes before rendering
                        setTimeout(() => {
                          if (descriptionInputRef.current && !descriptionInputRef.current.matches(':focus')) {
                            descriptionInputRef.current.innerHTML = htmlToRender;
                          }
                        }, 10);
                      } else {
                        descriptionInputRef.current.textContent = text;
                      }
                    } else {
                      descriptionInputRef.current.textContent = text;
                    }
                  }
                }}
                onFocus={(e) => {
                  // Show plain text when editing, but not if clicking on a link
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'A' && descriptionInputRef.current) {
                    const text = descriptionInputRef.current.textContent || taskDescription || "";
                    descriptionInputRef.current.textContent = text;
                  }
                }}
                onMouseDown={(e) => {
                  // Handle link clicks before focus event
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'A' || target.closest('a')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const link = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement;
                    if (link && link.href) {
                      window.open(link.href, '_blank', 'noopener,noreferrer');
                    }
                    // Prevent focus on the contentEditable
                    setTimeout(() => {
                      if (descriptionInputRef.current) {
                        descriptionInputRef.current.blur();
                      }
                    }, 0);
                    return false;
                  }
                }}
                className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] tracking-[-0.198px] bg-transparent border-none outline-none w-full resize-none min-h-[28px] ${
                  taskDescription.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
                }`}
                style={{ 
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
                data-placeholder="Description"
              />
              <style>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #5b5d62;
                  pointer-events: none;
                }
                [contenteditable] .description-link {
                  color: #5b5d62 !important;
                  text-decoration: underline !important;
                  cursor: pointer !important;
                }
                [contenteditable] .description-link:hover {
                  opacity: 0.8;
                }
                [contenteditable] a.description-link {
                  color: #5b5d62 !important;
                  text-decoration: underline !important;
                  cursor: pointer !important;
                }
              `}</style>
            </div>

            {/* Buttons Container */}
            <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
              {/* Button Row */}
              <div className="content-center flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
                {/* Task Type Toggle Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={() => setTaskType(taskType === 'task' ? 'reminder' : 'task')}
                >
                  <div className="relative shrink-0 size-[20px]">
                    {taskType === 'task' ? (
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#E1E6EE">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99" />
                      </svg>
                    ) : (
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#E1E6EE">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                      </svg>
                    )}
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                    {taskType === 'task' ? 'Task' : 'Reminder'}
                  </p>
                </div>

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

                {/* Milestone Button */}
                {milestones.length > 0 && (
                  <div 
                    className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                    onClick={() => setIsSelectMilestoneOpen(true)}
                  >
                    <div className="relative shrink-0 size-[20px]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <g>
                          <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                      </svg>
                    </div>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{getSelectedMilestoneName()}</p>
                  </div>
                )}

                {/* Effort Button */}
                <div 
                  className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                  onClick={() => {
                    if (effort < 10) {
                      setEffort(effort + 1);
                    } else {
                      setEffort(0);
                    }
                  }}
                >
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                    Effort {effort}
                  </p>
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

      <SelectMilestoneModal
        isOpen={isSelectMilestoneOpen}
        onClose={() => setIsSelectMilestoneOpen(false)}
        milestones={milestones}
        selectedMilestoneId={selectedMilestoneId}
        onSelectMilestone={handleSelectMilestone}
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
