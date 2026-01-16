import { useState } from "react";
import svgPaths from "../imports/svg-obs7av64ch";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { AddListModal } from "./AddListModal";
import { linkifyText } from "../lib/textUtils";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
  milestoneId?: number;
  parentTaskId?: number | null;
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
  type?: 'task' | 'reminder';
}

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

interface ListDetailProps {
  listId: number;
  listName: string;
  listColor: string;
  isShared: boolean;
  onBack: () => void;
  tasks: Todo[];
  onToggleTask: (id: number) => void;
  onAddTask: (taskText: string, description?: string, type?: 'task' | 'reminder') => void;
  onUpdateList: (listId: number, listName: string, isShared: boolean, color: string) => void;
  onDeleteList: (listId: number) => void;
  onTaskClick?: (task: Todo) => void;
  lists?: ListItem[];
  milestones?: MilestoneWithGoal[];
  dateFilter?: Date | null;
  timeRangeFilter?: "today" | "week" | "month" | null;
  onClearDateFilter?: () => void;
}

export function ListDetail({ listId, listName, listColor, isShared, onBack, tasks, onToggleTask, onAddTask, onUpdateList, onDeleteList, onTaskClick, lists = [], milestones = [], dateFilter, timeRangeFilter, onClearDateFilter }: ListDetailProps) {
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);
  const [isRemindersExpanded, setIsRemindersExpanded] = useState(true);
  
  // Filter tasks into reminders and regular tasks
  const reminders = tasks.filter(todo => todo.type === 'reminder');
  const regularTasks = tasks.filter(todo => todo.type !== 'reminder');

  const handleAddTask = (taskText: string, description?: string, _listId?: number, _deadline?: { date: Date; time: string; recurring?: string }, _effort?: number, type?: 'task' | 'reminder') => {
    // onAddTask from parent expects just taskText and already knows the listId
    // The listId from the modal will be the current list (via defaultListId)
    onAddTask(taskText, description, type);
    setIsAddTaskModalOpen(false);
  };

  const handleUpdateList = (listIdParam: number, listNameParam: string, isSharedParam: boolean, color: string) => {
    onUpdateList(listIdParam, listNameParam, isSharedParam, color);
    setIsEditListModalOpen(false);
  };

  const handleDeleteList = (listIdParam: number) => {
    onDeleteList(listIdParam);
    setIsEditListModalOpen(false);
    onBack();
  };

  const isCompletedList = listId === -1;
  const isAllTasksList = listId === -2;

  const currentList: ListItem = {
    id: listId,
    name: listName,
    color: listColor,
    count: tasks.length,
    isShared: isShared,
  };

  const getListById = (taskListId?: number) => {
    if (taskListId === undefined || taskListId === 0 || taskListId === -1) {
      return null;
    }
    return lists.find(l => l.id === taskListId);
  };

  const getSubtaskCount = (taskId: number): number => {
    return tasks.filter(todo => todo.parentTaskId === taskId).length;
  };

  const getMilestoneById = (taskMilestoneId?: number) => {
    if (taskMilestoneId === undefined) {
      return null;
    }
    return milestones.find(m => m.id === taskMilestoneId);
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  return (
    <>
      <div className="relative w-full">
        <div className="w-full">
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
            {/* Header */}
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
              <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
                <div 
                  className="relative shrink-0 size-[32px] cursor-pointer"
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
                  className="content-stretch flex flex-col items-start relative shrink-0 cursor-pointer"
                  onClick={() => !isCompletedList && !isAllTasksList && setIsEditListModalOpen(true)}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">
                    {listName}
                  </p>
                </div>
              </div>
              {!isCompletedList && !isAllTasksList && (
                <div 
                  className="relative shrink-0 size-[32px] cursor-pointer"
                  onClick={() => setIsAddTaskModalOpen(true)}
                >
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                    <g>
                      <path d="M16 6V26M26 16H6" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
              )}
            </div>

            {/* Date Filter Pill */}
            {dateFilter && isCompletedList && onClearDateFilter && (
              <div 
                className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer w-fit"
                onClick={onClearDateFilter}
              >
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[16px] text-nowrap tracking-[-0.198px] whitespace-pre">
                  Today
                </p>
                <div className="relative shrink-0 size-[20px]">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="1.5" 
                    stroke="currentColor" 
                    className="size-6"
                    style={{ width: '20px', height: '20px', color: '#e1e6ee' }}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M6 18 18 6M6 6l12 12" 
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Time Range Filter Tag */}
            {timeRangeFilter && isCompletedList && onClearDateFilter && (
              (() => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListDetail.tsx:TimeRangeTag:render',message:'Rendering time range tag',data:{timeRangeFilter,listId,isCompletedList},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                const getTimeRangeLabel = () => {
                  switch (timeRangeFilter) {
                    case "today": return "Today";
                    case "week": return "Week";
                    case "month": return "Month";
                    default: return "";
                  }
                };

                return (
                  <div 
                    className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer w-fit"
                    onClick={onClearDateFilter}
                  >
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[16px] text-nowrap tracking-[-0.198px] whitespace-pre">
                      {getTimeRangeLabel()}
                    </p>
                    <div className="relative shrink-0 size-[20px]">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth="1.5" 
                        stroke="currentColor" 
                        className="size-6"
                        style={{ width: '20px', height: '20px', color: '#e1e6ee' }}
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M6 18 18 6M6 6l12 12" 
                        />
                      </svg>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Reminders Box */}
            {reminders.length > 0 && (
              <div 
                className="content-stretch flex flex-col gap-[10px] items-start px-[16px] relative mb-[24px]"
                style={{ 
                  backgroundColor: '#1f2022',
                  paddingTop: '16px',
                  paddingBottom: '16px',
                  borderRadius: '8px',
                  marginLeft: '20px',
                  marginRight: '20px',
                  width: 'calc(100% - 40px)'
                }}
                ref={(el) => {
                  // #region agent log
                  if (el) {
                    const computedStyle = window.getComputedStyle(el);
                    const parentStyle = el.parentElement ? window.getComputedStyle(el.parentElement) : null;
                    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListDetail.tsx:RemindersBox:render',message:'Reminders box rendered in ListDetail',data:{remindersCount:reminders.length,className:el.className,inlineStyle:el.getAttribute('style'),paddingTop:computedStyle.paddingTop,paddingBottom:computedStyle.paddingBottom,paddingLeft:computedStyle.paddingLeft,paddingRight:computedStyle.paddingRight,backgroundColor:computedStyle.backgroundColor,marginLeft:computedStyle.marginLeft,marginRight:computedStyle.marginRight,borderRadius:computedStyle.borderRadius,width:computedStyle.width,parentPaddingLeft:parentStyle?.paddingLeft,parentPaddingRight:parentStyle?.paddingRight},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                  }
                  // #endregion
                }}
              >
                {/* Header */}
                <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
                  <div className="content-stretch flex items-center relative shrink-0">
                    <p 
                      className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-nowrap tracking-[-0.154px]"
                      style={{ fontSize: '12px' }}
                      ref={(el) => {
                        // #region agent log
                        if (el) {
                          const computedStyle = window.getComputedStyle(el);
                          fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListDetail.tsx:RemindersTitle:render',message:'Reminders title rendered in ListDetail',data:{className:el.className,inlineStyle:el.getAttribute('style'),fontSize:computedStyle.fontSize,textContent:el.textContent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
                        }
                        // #endregion
                      }}
                    >
                      REMINDERS
                    </p>
                  </div>
                  <div 
                    className="content-stretch flex gap-[16px] items-start justify-end relative shrink-0 cursor-pointer"
                    onClick={() => setIsRemindersExpanded(!isRemindersExpanded)}
                  >
                    <div className="content-stretch flex items-center relative shrink-0">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-nowrap tracking-[-0.154px]" style={{ fontSize: '12px' }}>
                        {reminders.length}
                      </p>
                    </div>
                    <div className="flex items-center justify-center relative shrink-0">
                      <div className={`flex-none ${isRemindersExpanded ? 'rotate-[180deg]' : ''} transition-transform`}>
                        <div className="relative size-[20px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            <path
                              d="M6 9L12 15L18 9"
                              stroke="#E1E6EE"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reminders List */}
                {isRemindersExpanded && (
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    {reminders.map((todo) => (
                      <div
                        key={todo.id}
                        className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full cursor-pointer"
                        onClick={() => onTaskClick && onTaskClick(todo)}
                      >
                        {/* Reminder Row */}
                        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full min-w-0">
                          {/* Bell Icon */}
                          <div className="relative shrink-0 size-[24px]">
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#E1E6EE">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                            </svg>
                          </div>
                          <div className="basis-0 content-stretch flex flex-col grow items-start min-h-px min-w-px relative shrink-0">
                            <div className="content-stretch flex items-center relative shrink-0 w-full">
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px]">
                                {todo.text}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Time */}
                        {(todo.deadline?.time || todo.time) && (
                          <div className="content-stretch flex items-start relative shrink-0">
                            <div className="content-stretch flex gap-[4px] items-center justify-center pl-[32px] pr-0 py-0 relative shrink-0">
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
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[16px] text-nowrap tracking-[-0.176px]">
                                {todo.deadline?.time || todo.time}
                              </p>
                            </div>
                          </div>
                        )}
                        
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {regularTasks.map((todo) => (
                <div
                  key={todo.id}
                  className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                  onClick={() => onTaskClick && onTaskClick(todo)}
                >
                  {/* Task Name Row */}
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full min-w-0">
                    {/* Only show checkbox for tasks, not reminders */}
                    {todo.type !== 'reminder' && (
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
                    )}
                    <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative min-w-0 flex-1 text-[18px] truncate tracking-[-0.198px] ${
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
                  <div className="content-stretch flex gap-[8px] items-start relative shrink-0 pl-[32px]">
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

                    {/* List */}
                    {(() => {
                      const list = getListById(todo.listId);
                      return list ? (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 24 24"
                            >
                              <g>
                                <path
                                  d={svgPathsToday.p1c6a4380}
                                  stroke={list.color}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {list.name}
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* Milestone */}
                    {(() => {
                      const milestone = getMilestoneById(todo.milestoneId);
                      return milestone ? (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 24 24"
                            >
                              <g>
                                <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" stroke="#5B5D62" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {milestone.name}
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* Subtasks */}
                    {(() => {
                      const subtaskCount = getSubtaskCount(todo.id);
                      return subtaskCount > 0 ? (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[20px]">
                            <svg
                              className="block size-full"
                              fill="none"
                              preserveAspectRatio="none"
                              viewBox="0 0 24 24"
                            >
                              <g>
                                <path
                                  d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
                                  stroke="#5B5D62"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </g>
                            </svg>
                          </div>
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {subtaskCount}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
            {/* Spacer to prevent bottom nav from covering content */}
            <div className="w-full" style={{ height: '20px' }} />
          </div>
        </div>
      </div>
      {!isCompletedList && !isAllTasksList && (
        <>
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => setIsAddTaskModalOpen(false)}
            onAddTask={handleAddTask}
            defaultListId={listId}
            lists={lists}
          />
          <AddListModal
            isOpen={isEditListModalOpen}
            onClose={() => setIsEditListModalOpen(false)}
            onAddList={() => {}}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            editingList={currentList}
          />
        </>
      )}
    </>
  );
}
