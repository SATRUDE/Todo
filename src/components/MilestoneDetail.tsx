import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import svgPathsToday from "../imports/svg-z2a631st9g";
import deleteIconPaths from "../imports/svg-u66msu10qs";
import { AddTaskModal } from "./AddTaskModal";
import { MilestoneModal } from "./MilestoneModal";
import { linkifyText } from "../lib/textUtils";
import { fetchMilestoneUpdates, createMilestoneUpdate, updateMilestoneUpdate, deleteMilestoneUpdate, MilestoneUpdate } from "../lib/database";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
  milestoneId?: number;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
}

interface Milestone {
  id: number;
  goal_id: number;
  name: string;
  description?: string | null;
  deadline_date?: string | null;
  completed?: boolean; // Used for "achieved" status
}

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
}

interface MilestoneDetailProps {
  milestone: Milestone;
  goal: Goal;
  onBack: () => void;
  tasks: Todo[];
  onToggleTask: (id: number) => void;
  onAddTask: (taskText: string, description?: string, deadline?: { date: Date; time: string; recurring?: string }) => void;
  onTaskClick?: (task: Todo) => void;
  onUpdateMilestone: (id: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null, achieved?: boolean) => Promise<void>;
  onToggleAchieved?: (id: number, achieved: boolean) => Promise<void>;
  onDeleteMilestone: (id: number) => Promise<void>;
  onFetchMilestones: (goalId: number) => Promise<Milestone[]>;
  onNavigateToDailyTasks?: () => void;
  onNavigateToCommonTasks?: () => void;
}

export function MilestoneDetail({ 
  milestone, 
  goal,
  onBack, 
  tasks, 
  onToggleTask, 
  onAddTask, 
  onTaskClick,
  onUpdateMilestone,
  onDeleteMilestone,
  onFetchMilestones,
  onToggleAchieved,
  onNavigateToDailyTasks,
  onNavigateToCommonTasks,
}: MilestoneDetailProps) {
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isAchieved, setIsAchieved] = useState(milestone.completed === true);
  const [updates, setUpdates] = useState<MilestoneUpdate[]>([]);
  const [isAddUpdateModalOpen, setIsAddUpdateModalOpen] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<number | null>(null);
  const [updateInputText, setUpdateInputText] = useState('');
  const updateInputRef = useRef<HTMLTextAreaElement>(null);

  const handleAddTask = (taskText: string, description?: string, _listId?: number, _milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    // onAddTask from parent expects taskText, description, and deadline, and already knows the milestoneId
    onAddTask(taskText, description, deadline);
    setIsAddTaskModalOpen(false);
  };

  const handleMilestoneClick = () => {
    setIsMilestoneModalOpen(true);
  };

  const handleCloseMilestoneModal = () => {
    setIsMilestoneModalOpen(false);
  };

  const handleUpdateMilestone = async (id: number, name: string, description?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    await onUpdateMilestone(id, name, description, deadline);
    handleCloseMilestoneModal();
  };

  const handleDeleteMilestone = async (id: number) => {
    await onDeleteMilestone(id);
    handleCloseMilestoneModal();
    onBack(); // Navigate back after deleting
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Parse deadline_date string to Date object for milestone modal
  const parseDeadlineDate = (dateString?: string | null): Date | undefined => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const milestoneDeadline = milestone.deadline_date ? parseDeadlineDate(milestone.deadline_date) : undefined;

  // Update local state when milestone prop changes
  useEffect(() => {
    setIsAchieved(milestone.completed === true);
  }, [milestone.completed]);

  // Fetch updates when component mounts or milestone changes
  useEffect(() => {
    const loadUpdates = async () => {
      try {
        const milestoneUpdates = await fetchMilestoneUpdates(milestone.id);
        setUpdates(milestoneUpdates);
      } catch (error) {
        console.error('Error fetching milestone updates:', error);
      }
    };
    loadUpdates();
  }, [milestone.id]);

  // Auto-focus update input when modal opens
  useEffect(() => {
    if (isAddUpdateModalOpen && updateInputRef.current) {
      setTimeout(() => {
        updateInputRef.current?.focus();
      }, 100);
    }
  }, [isAddUpdateModalOpen]);

  const handleToggleAchieved = async () => {
    const newAchieved = !isAchieved;
    setIsAchieved(newAchieved);
    if (onToggleAchieved) {
      await onToggleAchieved(milestone.id, newAchieved);
    } else if (onUpdateMilestone) {
      // Fallback to onUpdateMilestone if onToggleAchieved is not provided
      await onUpdateMilestone(milestone.id, milestone.name, milestone.description, milestoneDeadline ? { date: milestoneDeadline, time: '', recurring: undefined } : null, newAchieved);
    }
  };

  const handleConfirmAddUpdate = async () => {
    if (updateInputText.trim() === '') return;

    try {
      if (editingUpdateId !== null) {
        // Update existing update
        await updateMilestoneUpdate(editingUpdateId, updateInputText);
        const milestoneUpdates = await fetchMilestoneUpdates(milestone.id);
        setUpdates(milestoneUpdates);
      } else {
        // Create new update
        await createMilestoneUpdate(milestone.id, updateInputText);
        const milestoneUpdates = await fetchMilestoneUpdates(milestone.id);
        setUpdates(milestoneUpdates);
      }
      setIsAddUpdateModalOpen(false);
      setUpdateInputText('');
      setEditingUpdateId(null);
      
      // Trigger a custom event to notify parent to refresh AI statuses
      window.dispatchEvent(new CustomEvent('milestoneUpdateChanged'));
    } catch (error) {
      console.error('Error saving milestone update:', error);
      alert('Failed to save update. Please try again.');
    }
  };

  const handleEditUpdate = (update: MilestoneUpdate) => {
    setEditingUpdateId(update.id);
    setUpdateInputText(update.content);
    setIsAddUpdateModalOpen(true);
  };

  const handleDeleteUpdate = async (updateId: number) => {
    try {
      await deleteMilestoneUpdate(updateId);
      const milestoneUpdates = await fetchMilestoneUpdates(milestone.id);
      setUpdates(milestoneUpdates);
      
      // Trigger a custom event to notify parent to refresh AI statuses
      window.dispatchEvent(new CustomEvent('milestoneUpdateChanged'));
    } catch (error) {
      console.error('Error deleting milestone update:', error);
      alert('Failed to delete update. Please try again.');
    }
  };

  const formatUpdateDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
  };

  return (
    <>
      {createPortal(
        <>
          {/* Add Update Modal */}
          {isAddUpdateModalOpen && (
            <div className="fixed inset-0 z-[10003] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10003 }}>
              {/* Backdrop */}
              <div 
                className="absolute inset-0 pointer-events-auto transition-opacity duration-300"
                onClick={() => {
                  setIsAddUpdateModalOpen(false);
                  setUpdateInputText('');
                  setEditingUpdateId(null);
                }}
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
                      <textarea
                        ref={updateInputRef}
                        value={updateInputText}
                        onChange={(e) => {
                          setUpdateInputText(e.target.value);
                          // Auto-resize
                          if (updateInputRef.current) {
                            updateInputRef.current.style.height = 'auto';
                            updateInputRef.current.style.height = updateInputRef.current.scrollHeight + 'px';
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && e.ctrlKey && updateInputText.trim() !== "") {
                            e.preventDefault();
                            handleConfirmAddUpdate();
                          }
                        }}
                        placeholder={editingUpdateId !== null ? "Edit update" : "Add update"}
                        className={`font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[42px] ${
                          updateInputText.trim() ? 'text-[#e1e6ee]' : 'text-[#5b5d62]'
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
                        {editingUpdateId !== null && (
                          <div 
                            className="relative shrink-0 size-[24px] cursor-pointer hover:opacity-70"
                            onClick={async () => {
                              if (editingUpdateId !== null) {
                                try {
                                  await handleDeleteUpdate(editingUpdateId);
                                  setIsAddUpdateModalOpen(false);
                                  setUpdateInputText('');
                                  setEditingUpdateId(null);
                                } catch (error) {
                                  console.error('Error deleting update:', error);
                                }
                              }
                            }}
                          >
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                              <g>
                                <path d={deleteIconPaths.pf5e3c80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                              </g>
                            </svg>
                          </div>
                        )}
                        {/* Plus Button */}
                        <div 
                          className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                          style={{
                            width: '35px',
                            height: '35px',
                            padding: '3px',
                            flexShrink: 0,
                            backgroundColor: updateInputText.trim() ? '#0b64f9' : '#5b5d62'
                          }}
                          onClick={handleConfirmAddUpdate}
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
          )}
        </>,
        document.body
      )}
      <div className="relative w-full">
        <div className="w-full">
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
            {/* Header */}
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full gap-[16px]">
              <div className="content-stretch flex gap-[16px] items-center relative shrink-0 min-w-0 flex-1">
                <div 
                  className="relative shrink-0 size-[32px] cursor-pointer flex-shrink-0"
                  onClick={onBack}
                >
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                    <g>
                      <path 
                        d="M20 8L12 16L20 24" 
                        stroke="#E1E6EE" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                      />
                    </g>
                  </svg>
                </div>
                <div 
                  className="content-stretch flex flex-col items-start relative shrink-0 cursor-pointer min-w-0 flex-1 overflow-hidden"
                  onClick={handleMilestoneClick}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-white tracking-[-0.308px] break-words w-full">
                    {milestone.name}
                  </p>
                </div>
              </div>
              <div 
                className="relative shrink-0 size-[32px] cursor-pointer flex-shrink-0"
                onClick={() => setIsAddTaskModalOpen(true)}
                title="Add Task"
              >
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g>
                    <path d="M16 6V26M26 16H6" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Achieved Toggle */}
            <div className="mb-[12px]">
              <div 
                className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer inline-flex"
                onClick={handleToggleAchieved}
              >
                {/* Toggle Switch */}
                <div className="h-[24px] relative shrink-0 w-[44px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
                    <g>
                      <rect fill={isAchieved ? "#00C853" : "#595559"} height="24" rx="12" width="44" />
                      <circle cx={isAchieved ? "32" : "12"} cy="12" fill="white" r="10" />
                    </g>
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Achieved</p>
              </div>
            </div>

            {/* Description Section */}
            {milestone.description && milestone.description.trim() !== "" && (
              <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                {/* Description Subheading */}
                <div className="content-stretch flex items-center relative shrink-0">
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-nowrap tracking-[-0.154px]"
                    style={{ fontSize: '12px' }}
                  >
                    DESCRIPTION
                  </p>
                </div>
                {/* Description Text */}
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-white text-[18px] tracking-[-0.198px]"
                    style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                  >
                    {linkifyText(milestone.description)}
                  </p>
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {tasks.length === 0 ? (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                  No tasks yet. Click the + button to add one.
                </p>
              ) : (
                tasks.map((todo) => (
                  <div
                    key={todo.id}
                    className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => onTaskClick && onTaskClick(todo)}
                  >
                    {/* Task Name Row */}
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full min-w-0">
                      <div 
                        className="relative shrink-0 size-[24px] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(todo.id);
                        }}
                      >
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="11.625" 
                            stroke="#E1E6EE" 
                            strokeWidth="0.75"
                            fill={todo.completed ? "#E1E6EE" : "none"}
                          />
                          {todo.completed && (
                            <path
                              d="M7 12L10 15L17 8"
                              stroke="#110c10"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                      </div>
                      <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative min-w-0 flex-1 text-[18px] break-words tracking-[-0.198px] ${
                        todo.completed ? "text-[#5b5d62] line-through" : "text-white"
                      }`}>
                        {todo.text}
                      </p>
                    </div>

                    {/* Description */}
                    {todo.description && todo.description.trim() && (
                      <div 
                        className="w-full pl-[32px] overflow-hidden"
                        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                      >
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal not-italic text-[#5b5d62] text-[14px] tracking-[-0.198px]"
                          style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            width: '100%'
                          }}
                        >
                          {linkifyText(todo.description)}
                        </p>
                      </div>
                    )}

                    {/* Metadata Row */}
                    <div className="flex gap-[8px] items-start flex-wrap pl-[32px]">
                      {/* Time */}
                      {todo.time && (
                        <div className="box-border content-stretch flex gap-[4px] items-center justify-center pr-0 py-0 relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 24 24"
                            >
                              <g>
                                <path
                                  d={svgPathsToday.p19fddb00}
                                  stroke="#5B5D62"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {todo.time}
                          </p>
                        </div>
                      )}

                      {/* Day Due */}
                      {todo.deadline && (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 20 20"
                            >
                              <g>
                                <path
                                  d={svgPathsToday.p31f04100}
                                  stroke="#5B5D62"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.25"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {getDayOfWeek(todo.deadline.date)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Updates Section */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {/* Updates Header */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                <p 
                  className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-nowrap tracking-[-0.154px]"
                  style={{ fontSize: '12px' }}
                >
                  UPDATES
                </p>
                <div 
                  className="relative shrink-0 size-[24px] cursor-pointer flex-shrink-0"
                  onClick={() => setIsAddUpdateModalOpen(true)}
                  title="Add Update"
                >
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                    <g>
                      <path d="M12 5V19M19 12H5" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Updates List */}
              {updates.length === 0 ? (
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                  No updates yet. Click the + button to add one.
                </p>
              ) : (
                <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full"
                    >
                      {/* Update Content */}
                      <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" style={{ minWidth: 0 }}>
                        <div 
                          className="flex flex-col items-start relative shrink-0 cursor-pointer hover:opacity-80" 
                          style={{ flex: '1 1 0%', minWidth: 0, maxWidth: '100%' }}
                          onClick={() => handleEditUpdate(update)}
                        >
                          <p 
                            className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-white text-[18px] tracking-[-0.198px]"
                            style={{ 
                              whiteSpace: 'pre-wrap', 
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              maxWidth: '100%',
                              width: '100%'
                            }}
                          >
                            {linkifyText(update.content)}
                          </p>
                        </div>
                        {/* Delete button */}
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 flex-shrink-0">
                          <div 
                            className="relative shrink-0 size-[24px] cursor-pointer hover:opacity-70"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUpdate(update.id);
                            }}
                          >
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                              <g>
                                <path d={deleteIconPaths.pf5e3c80} stroke="#5b5d62" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* Update Date */}
                      {update.created_at && (
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] tracking-[-0.198px]"
                        >
                          {formatUpdateDate(update.created_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        defaultMilestoneId={milestone.id}
        onNavigateToDailyTasks={onNavigateToDailyTasks}
        onNavigateToCommonTasks={onNavigateToCommonTasks}
      />
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={handleCloseMilestoneModal}
        milestone={milestone}
        onUpdateMilestone={handleUpdateMilestone}
        onCreateMilestone={async () => {}}
        onDeleteMilestone={handleDeleteMilestone}
      />
    </>
  );
}

