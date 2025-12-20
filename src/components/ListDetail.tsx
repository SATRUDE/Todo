import { useState } from "react";
import svgPaths from "../imports/svg-obs7av64ch";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { AddListModal } from "./AddListModal";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  description?: string | null;
  listId?: number;
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

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface ListDetailProps {
  listId: number;
  listName: string;
  listColor: string;
  isShared: boolean;
  onBack: () => void;
  tasks: Todo[];
  onToggleTask: (id: number) => void;
  onAddTask: (taskText: string, description?: string) => void;
  onUpdateList: (listId: number, listName: string, isShared: boolean, color: string) => void;
  onDeleteList: (listId: number) => void;
  onTaskClick?: (task: Todo) => void;
  lists?: ListItem[];
  dateFilter?: Date | null;
  onClearDateFilter?: () => void;
}

export function ListDetail({ listId, listName, listColor, isShared, onBack, tasks, onToggleTask, onAddTask, onUpdateList, onDeleteList, onTaskClick, lists = [], dateFilter, onClearDateFilter }: ListDetailProps) {
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  const handleAddTask = (taskText: string, description?: string, _listId?: number, _deadline?: { date: Date; time: string; recurring?: string }) => {
    // onAddTask from parent expects just taskText and already knows the listId
    // The listId from the modal will be the current list (via defaultListId)
    onAddTask(taskText, description);
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

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  return (
    <>
      {/* DEBUG: Green spacer at top */}
      <div className="h-[50px] w-full bg-green-500" style={{ position: 'relative', zIndex: 9999 }} />
      <div className="relative w-full pb-[160px]">
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

            {/* Tasks */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {tasks.map((todo) => (
                <div
                  key={todo.id}
                  className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                  onClick={() => onTaskClick && onTaskClick(todo)}
                >
                  {/* Task Name Row */}
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
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
                    <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre ${
                      todo.completed ? "text-[#5b5d62] line-through" : "text-white"
                    }`}>
                      {todo.text}
                    </p>
                  </div>

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
                  </div>
                </div>
              ))}
            </div>
            {/* Large green spacer for debugging scrolling */}
            <div className="h-[100px] w-full bg-green-500" style={{ position: 'relative', zIndex: 9999, minHeight: '100px' }} />
            {/* DEBUG: Another green spacer after */}
            <div className="h-[100px] w-full bg-green-600" style={{ position: 'relative', zIndex: 9999 }} />
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
