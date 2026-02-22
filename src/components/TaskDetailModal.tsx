import { useState, useEffect, KeyboardEvent, useRef, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-e51h379o38";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";
import { SelectMilestoneModal } from "./SelectMilestoneModal";
import { DeadlineModal } from "./DeadlineModal";
import { TaskNoteModal } from "./TaskNoteModal";
import { TaskTypeModal } from "./TaskTypeModal";
import { linkifyText } from "../lib/textUtils";
import { supabase } from "../lib/supabase";

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
  parentTaskId?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
  type?: 'task' | 'reminder';
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Todo;
  onUpdateTask: (taskId: number, text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, type?: 'task' | 'reminder', imageUrl?: string | null) => void;
  onDeleteTask: (taskId: number) => void;
  onCreateTask?: (text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, type?: 'task' | 'reminder', imageUrl?: string | null) => void;
  lists?: ListItem[];
  milestones?: MilestoneWithGoal[];
  onFetchSubtasks?: (parentTaskId: number) => Promise<Todo[]>;
  onCreateSubtask?: (parentTaskId: number, text: string) => Promise<Todo>;
  onUpdateSubtask?: (subtaskId: number, text: string, completed: boolean) => Promise<void>;
  onDeleteSubtask?: (subtaskId: number) => Promise<void>;
  onToggleSubtask?: (subtaskId: number) => Promise<void>;
  notesForTask?: Array<{ id: number; content: string; task_id?: number | null }>;
  onAddNote?: (taskId: number, content: string) => void | Promise<void>;
  onUpdateNote?: (id: number, content: string) => void | Promise<void>;
  onDeleteNote?: (id: number) => void | Promise<void>;
  onNavigateToDailyTasks?: () => void;
  onNavigateToCommonTasks?: () => void;
  onConvertToDailyTask?: (taskId: number) => void | Promise<void>;
  onConvertToCommonTask?: (taskId: number) => void | Promise<void>;
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

export function TaskDetailModal({ isOpen, onClose, task, onUpdateTask, onDeleteTask, onCreateTask, lists = [], milestones = [], onFetchSubtasks, onCreateSubtask, onUpdateSubtask, onDeleteSubtask, onToggleSubtask, notesForTask = [], onAddNote, onUpdateNote, onDeleteNote, onNavigateToDailyTasks, onNavigateToCommonTasks, onConvertToDailyTask, onConvertToCommonTask }: TaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [imageUrl, setImageUrl] = useState<string | null>(task.imageUrl || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isSelectMilestoneOpen, setIsSelectMilestoneOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(task.milestoneId || null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);
  const [taskType, setTaskType] = useState<'task' | 'reminder'>(task.type || 'task');
  const [subtasks, setSubtasks] = useState<Todo[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [subtaskInputText, setSubtaskInputText] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskTypeModalOpen, setIsTaskTypeModalOpen] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLDivElement>(null);
  const subtaskInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsAddSubtaskModalOpen(false);
      setSubtaskInputText('');
      setEditingSubtaskId(null);
      setIsNoteModalOpen(false);
      setIsTaskTypeModalOpen(false);
      return;
    }
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setImageUrl(task.imageUrl || null);
    setSelectedListId(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
    setSelectedMilestoneId(task.milestoneId || null);
    setDeadline(task.deadline || null);
    setTaskType(task.type || 'task');
    
    // Load subtasks when modal opens
    if (onFetchSubtasks && task.id) {
      setIsLoadingSubtasks(true);
      onFetchSubtasks(task.id)
        .then(loadedSubtasks => {
          setSubtasks(loadedSubtasks);
          setIsLoadingSubtasks(false);
        })
        .catch(error => {
          console.error('Error loading subtasks:', error);
          setIsLoadingSubtasks(false);
        });
    } else {
      setSubtasks([]);
      setIsLoadingSubtasks(false);
    }
    
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
  }, [task, isOpen, onFetchSubtasks]);

  // Auto-focus subtask input when modal opens
  useEffect(() => {
    if (isAddSubtaskModalOpen && subtaskInputRef.current) {
      setTimeout(() => {
        subtaskInputRef.current?.focus();
      }, 100);
    }
  }, [isAddSubtaskModalOpen]);

  const handleSave = () => {
    if (taskInput.trim() === "") return;
    // Check if this is a new task (temporary ID < 0) and we have onCreateTask
    if (task.id < 0 && onCreateTask) {
      onCreateTask(taskInput, taskDescription || null, selectedListId || undefined, selectedMilestoneId || undefined, deadline === null ? null : deadline, taskType, imageUrl);
    } else {
      onUpdateTask(task.id, taskInput, taskDescription, selectedListId || undefined, selectedMilestoneId || undefined, deadline === null ? null : deadline, taskType, imageUrl);
    }
    onClose();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete old image if it exists
      if (imageUrl) {
        try {
          const oldImagePath = imageUrl.split('/').slice(-2).join('/'); // Extract path from URL
          await supabase.storage.from('task-images').remove([oldImagePath]);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue even if deletion fails
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(uploadError.message || 'Upload failed');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to upload image: ${errorMessage}. Please check that the Supabase Storage bucket 'task-images' is set up correctly.`);
    } finally {
      setIsUploadingImage(false);
      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!imageUrl) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Extract path from URL
      const imagePath = imageUrl.split('/').slice(-2).join('/');

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('task-images')
        .remove([imagePath]);

      if (error) {
        throw error;
      }

      setImageUrl(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
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

  const handleAddSubtask = () => {
    setEditingSubtaskId(null);
    setSubtaskInputText('');
    setIsAddSubtaskModalOpen(true);
  };

  const handleEditSubtask = (subtaskId: number) => {
    const subtask = subtasks.find(s => s.id === subtaskId);
    if (subtask) {
      setEditingSubtaskId(subtaskId);
      setSubtaskInputText(subtask.text);
      setIsAddSubtaskModalOpen(true);
    }
  };

  const handleConfirmAddSubtask = async () => {
    if (!subtaskInputText.trim()) return;
    
    try {
      if (editingSubtaskId !== null) {
        // Update existing subtask
        if (!onUpdateSubtask) return;
        const subtask = subtasks.find(s => s.id === editingSubtaskId);
        if (subtask) {
          await onUpdateSubtask(editingSubtaskId, subtaskInputText.trim(), subtask.completed);
          // Refresh subtasks
          if (onFetchSubtasks) {
            const updated = await onFetchSubtasks(task.id);
            setSubtasks(updated);
          }
        }
      } else {
        // Create new subtask
        if (!onCreateSubtask) return;
        const newSubtask = await onCreateSubtask(task.id, subtaskInputText.trim());
        setSubtasks([...subtasks, newSubtask]);
      }
      setIsAddSubtaskModalOpen(false);
      setSubtaskInputText('');
      setEditingSubtaskId(null);
    } catch (error) {
      console.error('Error saving subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: number) => {
    if (!onToggleSubtask) return;
    try {
      await onToggleSubtask(subtaskId);
      // Refresh subtasks
      if (onFetchSubtasks) {
        const updated = await onFetchSubtasks(task.id);
        setSubtasks(updated);
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtaskId: number, text: string) => {
    if (!onUpdateSubtask) return;
    try {
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (!subtask) return;
      await onUpdateSubtask(subtaskId, text, subtask.completed);
      // Refresh subtasks
      if (onFetchSubtasks) {
        const updated = await onFetchSubtasks(task.id);
        setSubtasks(updated);
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!onDeleteSubtask) return;
    try {
      await onDeleteSubtask(subtaskId);
      // Refresh subtasks
      if (onFetchSubtasks) {
        const updated = await onFetchSubtasks(task.id);
        setSubtasks(updated);
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
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

  const handleSelectTaskType = async (type: "task" | "reminder" | "daily" | "common") => {
    if (type === "task" || type === "reminder") {
      setTaskType(type);
      setIsTaskTypeModalOpen(false);
    } else if (type === "daily") {
      if (task.id >= 0 && onConvertToDailyTask) {
        await onConvertToDailyTask(task.id);
        setIsTaskTypeModalOpen(false);
        onClose();
        onNavigateToDailyTasks?.();
      } else if (onNavigateToDailyTasks) {
        onClose();
        onNavigateToDailyTasks();
      }
    } else if (type === "common") {
      if (task.id >= 0 && onConvertToCommonTask) {
        await onConvertToCommonTask(task.id);
        setIsTaskTypeModalOpen(false);
        onClose();
        onNavigateToCommonTasks?.();
      } else if (onNavigateToCommonTasks) {
        onClose();
        onNavigateToCommonTasks();
      }
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

  // SubtaskItem component
  function SubtaskItem({ subtask, onToggle, onDelete, onEdit }: {
    subtask: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (id: number) => void;
  }) {
    return (
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full cursor-pointer">
        {/* Task Name Row */}
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full min-w-0">
          {/* Checkbox */}
          <div 
            className="relative shrink-0 size-6 cursor-pointer text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(subtask.id);
            }}
          >
            <svg className="block size-full" fill="none" viewBox="0 0 24 24">
              <circle 
                cx="12" 
                cy="12" 
                r="11.625" 
                stroke="currentColor" 
                strokeWidth="0.75"
                fill={subtask.completed ? "currentColor" : "none"}
              />
              {subtask.completed && (
                <path
                  d="M7 12L10 15L17 8"
                  stroke="var(--card)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
          <p 
            className={`font-normal leading-relaxed relative min-w-0 flex-1 truncate text-lg tracking-tight cursor-pointer ${
              subtask.completed ? "text-muted-foreground line-through" : "text-foreground"
            }`}
            onClick={() => onEdit(subtask.id)}
          >
            {subtask.text}
          </p>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div 
          className="bg-card box-border flex max-h-[90vh] flex-col gap-10 overflow-hidden rounded-t-xl pb-[60px] pt-5 w-full desktop-bottom-sheet"
        >
          {/* Handle */}
          <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex min-h-0 shrink-0 w-full flex-col gap-8 overflow-x-hidden overflow-y-auto px-5 [-webkit-overflow-scrolling:touch]"
            style={{ maxHeight: 'calc(90vh - 120px)' }}
          >
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
                className={`font-medium text-2xl leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[42px] placeholder:text-muted-foreground ${
                  taskInput.trim() ? 'text-foreground' : 'text-muted-foreground'
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
                className={`font-normal text-lg leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[28px] ${
                  taskDescription.trim() ? 'text-foreground' : 'text-muted-foreground'
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
                  color: var(--muted-foreground);
                  pointer-events: none;
                }
                [contenteditable] .description-link {
                  color: var(--muted-foreground) !important;
                  text-decoration: underline !important;
                  cursor: pointer !important;
                }
                [contenteditable] .description-link:hover {
                  opacity: 0.8;
                }
              `}</style>
            </div>

            {/* Notes Section - Below description, click opens notes bottom sheet */}
            {onAddNote && (
              <div
                className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full cursor-pointer"
                onClick={() => setIsNoteModalOpen(true)}
              >
                {notesForTask.length > 0 ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    {notesForTask.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl bg-secondary px-4 py-3 w-full text-left transition-colors hover:bg-accent"
                      >
                        <p className="text-sm leading-relaxed text-foreground line-clamp-2 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-secondary px-4 py-3 w-full">
                    <p className="text-sm text-muted-foreground">
                      No notes yet. Tap to add one.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input for image upload */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="image-upload-input"
              disabled={isUploadingImage}
              style={{ display: 'none' }}
            />

            {/* Image Section - Under description */}
            {imageUrl && (
              <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                <div className="relative w-full max-w-md">
                  <img 
                    src={imageUrl} 
                    alt="Task image" 
                    className="w-full rounded-lg object-cover max-h-[300px]"
                  />
                </div>
                {/* Delete Image Button */}
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-destructive/20 px-4 py-1 text-lg font-normal text-destructive transition-colors hover:bg-destructive/25"
                  onClick={handleDeleteImage}
                >
                  <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <path d={deleteIconPaths.pf5e3c80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                  Delete Image
                </button>
              </div>
            )}

            {/* Subtasks Section - Only show when subtasks exist */}
            {subtasks.length > 0 && (
              <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full px-0 py-0">
                <div className="flex items-center justify-between w-full">
                  <label className="font-normal leading-relaxed text-foreground text-lg tracking-tight">
                    Subtasks
                  </label>
                  {onCreateSubtask && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSubtask();
                      }}
                      className="text-base font-medium cursor-pointer text-blue-500 hover:opacity-80"
                    >
                      + Add Subtask
                    </button>
                  )}
                </div>

                {isLoadingSubtasks ? (
                  <div className="text-sm text-foreground">Loading subtasks...</div>
                ) : (
                  <div className="flex flex-col gap-[8px] w-full">
                    {subtasks.map(subtask => (
                      <SubtaskItem
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={handleToggleSubtask}
                        onDelete={handleDeleteSubtask}
                        onEdit={handleEditSubtask}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons Container */}
            <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
              {/* Button Row */}
              <div className="content-center flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
                {/* Task Type Button - opens modal to select type */}
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                  onClick={() => setIsTaskTypeModalOpen(true)}
                >
                  {taskType === 'task' ? (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99" />
                    </svg>
                  ) : (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  )}
                  {taskType === 'task' ? 'Task' : 'Reminder'}
                </button>

                {/* Deadline Button */}
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                  onClick={() => setIsDeadlineOpen(true)}
                >
                  <svg className="size-5 shrink-0" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p186add80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                  </svg>
                  {getDeadlineText()}
                </button>

                {/* List Button */}
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                  onClick={() => setIsSelectListOpen(true)}
                >
                  <svg className="size-5 shrink-0" fill="none" viewBox="0 0 20 20" style={{ color: getSelectedListColor() }}>
                    <path d={svgPaths.p1dfd6800} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                  </svg>
                  {getSelectedListName()}
                </button>

                {/* Note Button */}
                {onAddNote && (
                  <button
                    type="button"
                    className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                    onClick={() => setIsNoteModalOpen(true)}
                  >
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Note
                  </button>
                )}

                {/* Add Image Button */}
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                  onClick={() => !isUploadingImage && imageInputRef.current?.click()}
                >
                  <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  Add Image
                </button>

                {/* Add Subtask Button */}
                {onCreateSubtask && (
                  <button
                    type="button"
                    className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                    onClick={() => handleAddSubtask()}
                  >
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />
                    </svg>
                    Add Subtask
                  </button>
                )}

                {/* Milestone Button */}
                {milestones.length > 0 && (
                  <button
                    type="button"
                    className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                    onClick={() => setIsSelectMilestoneOpen(true)}
                  >
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {getSelectedMilestoneName()}
                  </button>
                )}

                {/* Trash Icon - Only show for existing tasks */}
                {task.id >= 0 && (
                  <button
                    type="button"
                    className="shrink-0 size-6 cursor-pointer text-foreground hover:opacity-70"
                    onClick={handleDelete}
                    aria-label="Delete task"
                  >
                    <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                      <path d={deleteIconPaths.pf5e3c80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Submit Button Row */}
              <div className="flex w-full items-end justify-end gap-2.5">
                <button
                  type="button"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 ${
                    taskInput.trim() ? 'bg-blue-500 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={handleSave}
                  aria-label="Save"
                >
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <line x1="12" y1="6" x2="12" y2="18" strokeLinecap="round" />
                    <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" />
                  </svg>
                </button>
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

      {onAddNote && (
        <TaskNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          taskId={task.id}
          notesForTask={notesForTask}
          onAddNote={onAddNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
        />
      )}

      <TaskTypeModal
        isOpen={isTaskTypeModalOpen}
        onClose={() => setIsTaskTypeModalOpen(false)}
        currentType={taskType}
        onSelectType={handleSelectTaskType}
      />

      {/* Add Subtask Modal */}
      {isAddSubtaskModalOpen && (
        <div className="fixed inset-0 z-[10003] pointer-events-none">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => {
              setIsAddSubtaskModalOpen(false);
              setSubtaskInputText('');
              setEditingSubtaskId(null);
            }}
          />
          
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
            <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl bg-card pb-[60px] pt-5 desktop-bottom-sheet">
              {/* Handle */}
              <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
                <div className="h-5 w-24 shrink-0 text-muted-foreground">
                  <svg className="block size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                    <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="flex shrink-0 w-full flex-col gap-8 px-5">
                {/* Title and Description Section */}
                <div className="content-stretch flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0 w-full">
                  <textarea
                    ref={subtaskInputRef}
                    value={subtaskInputText}
                    onChange={(e) => {
                      setSubtaskInputText(e.target.value);
                      // Auto-resize
                      if (subtaskInputRef.current) {
                        subtaskInputRef.current.style.height = 'auto';
                        subtaskInputRef.current.style.height = subtaskInputRef.current.scrollHeight + 'px';
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && e.ctrlKey && subtaskInputText.trim() !== "") {
                        e.preventDefault();
                        handleConfirmAddSubtask();
                      }
                    }}
                    placeholder={editingSubtaskId !== null ? "Edit subtask" : "Add subtask"}
                    className={`font-medium text-2xl leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[42px] placeholder:text-muted-foreground ${
                      subtaskInputText.trim() ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    autoFocus
                    rows={1}
                    style={{ overflow: 'hidden' }}
                  />
                </div>
                
                {/* Buttons Container */}
                <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                  {/* Submit Button Row */}
                  <div className="flex gap-[10px] items-end justify-end w-full" style={{ justifyContent: 'flex-end', width: '100%' }}>
                    {/* Delete Button (only when editing) */}
                    {editingSubtaskId !== null && onDeleteSubtask && (
                      <button
                        type="button"
                        className="shrink-0 size-6 cursor-pointer text-foreground hover:opacity-70"
                        onClick={async () => {
                          if (onDeleteSubtask && editingSubtaskId !== null) {
                            try {
                              await onDeleteSubtask(editingSubtaskId);
                              // Refresh subtasks
                              if (onFetchSubtasks) {
                                const updated = await onFetchSubtasks(task.id);
                                setSubtasks(updated);
                              }
                              setIsAddSubtaskModalOpen(false);
                              setSubtaskInputText('');
                              setEditingSubtaskId(null);
                            } catch (error) {
                              console.error('Error deleting subtask:', error);
                            }
                          }
                        }}
                        aria-label="Delete subtask"
                      >
                        <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                          <path d={deleteIconPaths.pf5e3c80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                      </button>
                    )}
                    {/* Plus Button */}
                    <button
                      type="button"
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 ${
                        subtaskInputText.trim() ? 'bg-blue-500 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                      onClick={handleConfirmAddSubtask}
                      aria-label="Save subtask"
                    >
                      <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <line x1="12" y1="6" x2="12" y2="18" strokeLinecap="round" />
                        <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
