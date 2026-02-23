import { useState, KeyboardEvent, useEffect, useRef, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import svgPaths from "../imports/svg-p3zv31caxs";
import generateSvgPaths from "../imports/svg-gf1ry58lrd";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { SelectListModal } from "./SelectListModal";
import { SelectMilestoneModal } from "./SelectMilestoneModal";
import { DeadlineModal } from "./DeadlineModal";
import { TaskTypeModal } from "./TaskTypeModal";
import { supabase } from "../lib/supabase";
import { useVoiceTask } from "../hooks/useVoiceTask";

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

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: string, description?: string, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }, type?: 'task' | 'reminder', imageUrl?: string | null) => void | Promise<number | void>;
  onUpdateTask?: (id: number, task: string, description?: string, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }, type?: 'task' | 'reminder') => Promise<void>;
  onDeleteTask?: (id: number) => Promise<void>;
  lists?: ListItem[];
  defaultListId?: number;
  milestones?: MilestoneWithGoal[];
  defaultMilestoneId?: number;
  onNavigateToDailyTasks?: () => void;
  onNavigateToCommonTasks?: () => void;
}

export function AddTaskModal({ isOpen, onClose, onAddTask, onUpdateTask, onDeleteTask, lists = [], defaultListId, milestones = [], defaultMilestoneId, onNavigateToDailyTasks, onNavigateToCommonTasks }: AddTaskModalProps) {
  const getDefaultDeadline = () => {
    const today = new Date();
    return { date: today, time: "", recurring: undefined };
  };

  const [taskInput, setTaskInput] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskType, setTaskType] = useState<'task' | 'reminder'>('task');
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isSelectMilestoneOpen, setIsSelectMilestoneOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isTaskTypeModalOpen, setIsTaskTypeModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(defaultListId || null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(defaultMilestoneId || null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(getDefaultDeadline());
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceProcessingTranscript, setVoiceProcessingTranscript] = useState("");
  const [voiceSuccessAdded, setVoiceSuccessAdded] = useState<{
    taskId: number;
    text: string;
    description?: string;
    listName?: string;
    listId?: number;
    deadline?: { date: Date; time: string; recurring?: string };
    type: 'task' | 'reminder';
  } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const voiceTask = useVoiceTask();
  const voiceJustStoppedRef = useRef(false);

  // Process voice transcript when user stops listening
  useEffect(() => {
    if (!voiceTask.isListening && voiceJustStoppedRef.current) {
      const transcript = voiceTask.transcript.trim();
      voiceJustStoppedRef.current = false;
      voiceTask.resetTranscript();
      if (!transcript) return;
      setVoiceProcessingTranscript(transcript);
      setVoiceProcessing(true);
      const processVoiceTranscript = async () => {
        try {
          const listNames = lists.map((l) => l.name);
          const clientToday = new Date();
          const clientDateStr = clientToday.getFullYear() + '-' + String(clientToday.getMonth() + 1).padStart(2, '0') + '-' + String(clientToday.getDate()).padStart(2, '0');
          const res = await fetch("/api/parse-voice-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, listNames, clientDate: clientDateStr }),
          });
          const text = await res.text();
          let data: { text?: string; description?: string; listName?: string | null; type?: string; deadline?: { date: string; time?: string; recurring?: string } | null; message?: string; error?: string };
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            throw new Error(
              res.ok
                ? "Invalid API response. Try again."
                : `Voice parsing failed (${res.status}). Run 'npm run dev:all' to start the API.`
            );
          }
          if (!res.ok) {
            throw new Error(
              data.message || data.error || `Voice parsing failed (${res.status}). Check OPENAI_API_KEY and run 'npm run dev:all'.`
            );
          }
          if (!data.text) {
            throw new Error("Voice parsing returned no task. Try again.");
          }
          const listId = data.listName
            ? lists.find((l) => l.name.toLowerCase() === data.listName.toLowerCase())?.id
            : undefined;
          const deadline = data.deadline
            ? {
                date: new Date(data.deadline.date),
                time: data.deadline.time || "",
                recurring: data.deadline.recurring,
              }
            : undefined;
          const taskId = await onAddTask(
            data.text,
            data.description,
            listId,
            undefined,
            deadline,
            data.type === "reminder" ? "reminder" : "task"
          );
          const resolvedId = typeof taskId === "number" ? taskId : 0;
          setVoiceSuccessAdded({
            taskId: resolvedId,
            text: data.text,
            description: data.description,
            listName: data.listName || undefined,
            listId,
            deadline,
            type: data.type === "reminder" ? "reminder" : "task",
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to add task from voice";
          toast.error(msg);
        } finally {
          setVoiceProcessing(false);
          setVoiceProcessingTranscript("");
        }
      };
      processVoiceTranscript();
    } else if (!voiceTask.isListening) {
      voiceJustStoppedRef.current = false;
    }
  }, [voiceTask.isListening, voiceTask.transcript]);

  // Update selectedListId and selectedMilestoneId when defaults change or modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultListId !== undefined) {
        setSelectedListId(defaultListId);
      }
      if (defaultMilestoneId !== undefined) {
        setSelectedMilestoneId(defaultMilestoneId);
      }
    } else {
      // Reset when modal closes
      setSelectedListId(defaultListId || null);
      setSelectedMilestoneId(defaultMilestoneId || null);
      setTaskInput("");
      setDeadline(getDefaultDeadline());
      setTaskDescription("");
      setTaskType('task');
      setImageUrl(null);
      setIsTaskTypeModalOpen(false);
      setVoiceSuccessAdded(null);
      setVoiceProcessing(false);
      setVoiceProcessingTranscript("");
      setEditingTaskId(null);
    }
  }, [isOpen, defaultListId, defaultMilestoneId]);

  const handleSubmit = async () => {
    if (taskInput.trim() !== "") {
      if (isBulkAddMode) {
        await handleBulkAdd();
      } else if (editingTaskId && onUpdateTask) {
        await onUpdateTask(editingTaskId, taskInput, taskDescription, selectedListId ?? undefined, selectedMilestoneId ?? undefined, deadline ?? undefined, taskType);
        setTaskInput("");
        setSelectedListId(null);
        setSelectedMilestoneId(null);
        setDeadline(getDefaultDeadline());
        setTaskDescription("");
        setTaskType('task');
        setEditingTaskId(null);
        onClose();
      } else {
        await onAddTask(taskInput, taskDescription, selectedListId || undefined, selectedMilestoneId || undefined, deadline || undefined, taskType, imageUrl);
        setTaskInput("");
        setSelectedListId(null);
        setSelectedMilestoneId(null);
        setDeadline(getDefaultDeadline());
        setTaskDescription("");
        setTaskType('task');
        setImageUrl(null);
        onClose();
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && taskInput.trim() !== "") {
      handleSubmit();
    }
  };

  const handleSelectList = (listId: number) => {
    setSelectedListId(listId);
    setIsSelectListOpen(false);
  };

  const handleSetDeadline = (date: Date, time: string, recurring?: string) => {
    setDeadline({ date, time, recurring });
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

  const getSelectedListName = () => {
    if (selectedListId === null) return "List";
    const list = lists.find(l => l.id === selectedListId);
    return list ? list.name : "List";
  };

  const formatVoiceDeadline = (d: { date: Date; time: string; recurring?: string }) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isToday = d.date.toDateString() === today.toDateString();
    const isTomorrow = d.date.toDateString() === tomorrow.toDateString();
    const dateStr = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
    const timeStr = d.time?.trim() ? ` at ${d.time}` : "";
    const recurStr = d.recurring ? ` (${d.recurring})` : "";
    return `${dateStr}${timeStr}${recurStr}`;
  };

  const getSelectedListColor = () => {
    if (selectedListId === null) return "#E1E6EE";
    const list = lists.find(l => l.id === selectedListId);
    return list ? list.color : "#E1E6EE";
  };

  const handleSelectMilestone = (milestoneId: number) => {
    setSelectedMilestoneId(milestoneId);
    setIsSelectMilestoneOpen(false);
  };

  const handleSelectTaskType = (type: "task" | "reminder" | "daily" | "common") => {
    if (type === "task" || type === "reminder") {
      setTaskType(type);
      setIsTaskTypeModalOpen(false);
    } else if (type === "daily" && onNavigateToDailyTasks) {
      onClose();
      onNavigateToDailyTasks();
    } else if (type === "common" && onNavigateToCommonTasks) {
      onClose();
      onNavigateToCommonTasks();
    }
  };

  const getSelectedMilestoneName = () => {
    if (selectedMilestoneId === null) return "Milestone";
    const milestone = milestones.find(m => m.id === selectedMilestoneId);
    return milestone ? milestone.name : "Milestone";
  };

  const handleGenerateTask = () => {
    const tasks = [
      "Do the laundry",
      "Empty the dishwasher",
      "Take out the rubbish",
      "Water the plants",
      "Vacuum the living room",
      "Clean the bathroom",
      "Change the bed sheets"
    ];
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    setTaskInput(randomTask);
  };

  const handleBulkAddToggle = () => {
    setIsBulkAddMode(!isBulkAddMode);
      setTaskInput(""); // Clear input when toggling
      setTaskDescription("");
  };

  const handleBulkAdd = async () => {
    const lines = taskInput.split('\n').filter(line => line.trim() !== "");
    
    // Add all tasks sequentially to ensure they all get added
    for (const line of lines) {
      if (line.trim()) {
        await onAddTask(line.trim(), "", selectedListId || undefined, selectedMilestoneId || undefined, deadline || undefined, taskType, null);
      }
    }
    
    setTaskInput("");
    setSelectedListId(null);
    setSelectedMilestoneId(null);
    setDeadline(getDefaultDeadline());
    setIsBulkAddMode(false);
    setTaskDescription("");
    setImageUrl(null);
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

      // Delete old image if exists
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

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
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
          <div className="flex flex-1 min-h-0 w-full flex-col gap-8 overflow-y-auto overflow-x-hidden px-5 [-webkit-overflow-scrolling:touch]">
                {/* Voice processing - loading */}
                {voiceProcessing && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 min-h-[240px] py-12">
                    <div className="size-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" aria-hidden />
                    <p className="text-muted-foreground text-lg">Creating task...</p>
                    {voiceProcessingTranscript && (
                      <p className="text-foreground text-center text-base max-w-full px-4 line-clamp-4" aria-live="polite">
                        {voiceProcessingTranscript}
                      </p>
                    )}
                  </div>
                )}

                {/* Active listening - full space */}
                {voiceTask.isListening && !voiceProcessing && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 min-h-[240px] py-12">
                    <p className="text-muted-foreground text-lg">Listening...</p>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground px-8 py-4 animate-pulse transition-opacity hover:opacity-90 cursor-pointer"
                      onClick={() => {
                        voiceJustStoppedRef.current = true;
                        voiceTask.stopListening();
                      }}
                      aria-label="Tap to stop recording"
                    >
                      <MicOff className="size-8 shrink-0" strokeWidth={2} />
                      <span className="text-lg font-medium">Tap to stop</span>
                    </button>
                  </div>
                )}

                {/* Voice success message */}
                {voiceSuccessAdded && !voiceTask.isListening && !voiceProcessing && (
                  <div className="flex flex-col gap-3 rounded-lg bg-accent/20 p-4">
                    <p className="font-medium text-accent-foreground">Task added from voice</p>
                    <div className="flex flex-col gap-1.5 text-foreground">
                      <p className="font-medium text-lg">{voiceSuccessAdded.text}</p>
                      {voiceSuccessAdded.description && (
                        <p className="text-muted-foreground text-base">{voiceSuccessAdded.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {voiceSuccessAdded.deadline && (
                          <span className="rounded-full bg-secondary px-3 py-0.5 text-sm text-secondary-foreground">
                            {formatVoiceDeadline(voiceSuccessAdded.deadline)}
                          </span>
                        )}
                        {voiceSuccessAdded.listName && (
                          <span className="rounded-full bg-secondary px-3 py-0.5 text-sm text-secondary-foreground">
                            {voiceSuccessAdded.listName}
                          </span>
                        )}
                        <span className="rounded-full bg-secondary px-3 py-0.5 text-sm text-secondary-foreground capitalize">
                          {voiceSuccessAdded.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {onUpdateTask && (
                        <button
                          type="button"
                          onClick={() => {
                            setTaskInput(voiceSuccessAdded.text);
                            setTaskDescription(voiceSuccessAdded.description ?? "");
                            setSelectedListId(voiceSuccessAdded.listId ?? null);
                            setDeadline(voiceSuccessAdded.deadline ?? getDefaultDeadline());
                            setTaskType(voiceSuccessAdded.type);
                            setEditingTaskId(voiceSuccessAdded.taskId);
                            setVoiceSuccessAdded(null);
                          }}
                          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteTask && voiceSuccessAdded.taskId > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteTask(voiceSuccessAdded.taskId);
                            setVoiceSuccessAdded(null);
                            onClose();
                          }}
                          className="rounded-full bg-destructive/20 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setVoiceSuccessAdded(null); }}
                        className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent transition-colors"
                      >
                        Add another
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Title and Description Section */}
                {!voiceSuccessAdded && !voiceTask.isListening && !voiceProcessing && (
                <>
                <div className="content-stretch flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0 w-full">
                  {isBulkAddMode ? (
                    <textarea
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder="Add task"
                      className="font-medium text-2xl leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[42px] text-foreground placeholder:text-muted-foreground"
                      autoFocus
                      rows={3}
                    />
                  ) : (
                    <>
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
                        placeholder="Add task"
                        className={`font-medium text-2xl leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[42px] placeholder:text-muted-foreground ${
                          taskInput.trim() ? 'text-foreground' : 'text-muted-foreground'
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
                        className={`font-normal text-lg leading-relaxed tracking-tight bg-transparent border-none outline-none w-full resize-none min-h-[28px] placeholder:text-muted-foreground ${
                          taskDescription.trim() ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                        rows={1}
                        style={{ overflow: 'hidden' }}
                      />
                    </>
                  )}
                </div>

                {/* Image Section - Under description */}
                {imageUrl && !isBulkAddMode && (
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    <div className="relative w-full max-w-md">
                      <img 
                        src={imageUrl} 
                        alt="Task image" 
                        className="w-full h-auto max-h-[300px] object-contain rounded-lg"
                      />
                    </div>
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

                    {/* Generate Task Button */}
                    <button
                      type="button"
                      className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                      onClick={handleGenerateTask}
                    >
                      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 20 20">
                        <path d={generateSvgPaths.p3df19b00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                      Generate task
                    </button>

                    {/* Bulk Add Button */}
                    <button
                      type="button"
                      className={`flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-1 text-lg transition-opacity hover:opacity-90 ${
                        isBulkAddMode ? 'bg-blue-500 text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent'
                      }`}
                      onClick={handleBulkAddToggle}
                    >
                      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 20 20">
                        <path d={svgPaths.p247c5b00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                      Bulk add
                    </button>

                    {/* Add Image Button */}
                    {!isBulkAddMode && (
                      <button
                        type="button"
                        className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-secondary px-4 py-1 text-lg text-foreground transition-colors hover:bg-accent"
                        onClick={() => {
                          if (!isUploadingImage && imageInputRef.current) {
                            imageInputRef.current.click();
                          }
                        }}
                      >
                        <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                        Add Image
                      </button>
                    )}

                  </div>

                  {/* Submit Button Row */}
                  <div className="flex w-full items-end justify-end gap-2.5">
                    {/* Mic Button - Add task by voice */}
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-full transition-opacity hover:opacity-90 shrink-0 ${
                        voiceTask.isListening
                          ? "bg-accent text-accent-foreground px-4 py-2 animate-pulse"
                          : "size-9 bg-secondary text-secondary-foreground"
                      } ${!voiceTask.browserSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      onClick={() => {
                        if (!voiceTask.browserSupported) {
                          toast.error("Voice input is not supported in this browser. Try Chrome or Edge.");
                          return;
                        }
                        if (voiceTask.error) {
                          toast.error(voiceTask.error);
                          return;
                        }
                        if (voiceTask.isListening) {
                          voiceJustStoppedRef.current = true;
                          voiceTask.stopListening();
                        } else {
                          voiceTask.startListening();
                        }
                      }}
                      disabled={!voiceTask.browserSupported}
                      aria-label={voiceTask.isListening ? "Tap to stop recording" : "Add task by voice"}
                    >
                      {voiceTask.isListening ? (
                        <>
                          <MicOff className="size-5 shrink-0" strokeWidth={2} />
                          <span className="text-sm font-medium">Tap to stop</span>
                        </>
                      ) : (
                        <Mic className="size-5 shrink-0" strokeWidth={2} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={`flex shrink-0 items-center justify-center gap-2 rounded-full transition-opacity hover:opacity-90 ${
                        taskInput.trim() ? 'bg-blue-500 text-primary-foreground px-4 py-2' : 'size-9 bg-muted text-muted-foreground'
                      }`}
                      onClick={handleSubmit}
                      aria-label={editingTaskId ? "Save changes" : "Add task"}
                    >
                      {editingTaskId ? (
                        <span className="text-sm font-medium">Save</span>
                      ) : (
                        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <line x1="12" y1="6" x2="12" y2="18" strokeLinecap="round" />
                          <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                </>
                )}
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

      {/* Select Milestone Modal */}
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

      <TaskTypeModal
        isOpen={isTaskTypeModalOpen}
        onClose={() => setIsTaskTypeModalOpen(false)}
        currentType={taskType}
        onSelectType={handleSelectTaskType}
      />

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
    </div>,
    document.body
  );
}
