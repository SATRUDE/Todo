import { useState } from "react";
import svgPaths from "../imports/svg-obs7av64ch";
import { AddTaskModal } from "./AddTaskModal";
import { AddListModal } from "./AddListModal";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
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
  onAddTask: (taskText: string) => void;
  onUpdateList: (listId: number, listName: string, isShared: boolean, color: string) => void;
  onDeleteList: (listId: number) => void;
  onTaskClick?: (task: Todo) => void;
}

export function ListDetail({ listId, listName, listColor, isShared, onBack, tasks, onToggleTask, onAddTask, onUpdateList, onDeleteList, onTaskClick }: ListDetailProps) {
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  const handleAddTask = (taskText: string) => {
    onAddTask(taskText);
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

  const currentList: ListItem = {
    id: listId,
    name: listName,
    color: listColor,
    count: tasks.length,
    isShared: isShared,
  };

  return (
    <>
      <div className="relative shrink-0 w-full">
        <div className="size-full">
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
                  onClick={() => !isCompletedList && setIsEditListModalOpen(true)}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">
                    {listName}
                  </p>
                </div>
              </div>
              {!isCompletedList && (
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

            {/* Tasks */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {tasks.map((todo) => (
                <div
                  key={todo.id}
                  className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
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

                  {/* Time */}
                  {todo.time && (
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0">
                      <div className="box-border content-stretch flex gap-[4px] items-center justify-center pl-[32px] pr-0 py-0 relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            <g>
                              <path d={svgPaths.p19fddb00} stroke="#5B5D62" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            </g>
                          </svg>
                        </div>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                          {todo.time}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isCompletedList && (
        <>
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => setIsAddTaskModalOpen(false)}
            onAddTask={handleAddTask}
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
