import { useState } from "react";
import svgPaths from "../imports/svg-4ile2zv366";
import completedSvgPaths from "../imports/svg-qfhtru23ul";
import { AddListModal } from "./AddListModal";

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
}

const COMPLETED_LIST_ID = -1;

interface ListsProps {
  onSelectList: (list: ListItem) => void;
  todos: Todo[];
  lists: ListItem[];
  onAddList: (listName: string, isShared: boolean, color: string) => void;
  onUpdateList: (listId: number, listName: string, isShared: boolean, color: string) => void;
  onDeleteList: (listId: number) => void;
}

export function Lists({ onSelectList, todos, lists, onAddList, onUpdateList, onDeleteList }: ListsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListItem | null>(null);

  const handleAddList = (listName: string, isShared: boolean, color: string) => {
    onAddList(listName, isShared, color);
    setIsModalOpen(false);
  };

  const handleUpdateList = (listId: number, listName: string, isShared: boolean, color: string) => {
    onUpdateList(listId, listName, isShared, color);
    setEditingList(null);
    setIsModalOpen(false);
  };

  const handleDeleteList = (listId: number) => {
    onDeleteList(listId);
    setEditingList(null);
    setIsModalOpen(false);
  };

  const handleEditList = (list: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingList(list);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingList(null);
  };

  // Calculate task counts for each list
  const getListCount = (listId: number) => {
    return todos.filter(todo => todo.listId === listId && !todo.completed).length;
  };

  const completedCount = todos.filter(todo => todo.listId === COMPLETED_LIST_ID).length;

  // Completed tasks list
  const completedList: ListItem = {
    id: COMPLETED_LIST_ID,
    name: "Completed list",
    color: "#00C853",
    count: completedCount,
    isShared: false,
  };

  return (
    <>
    <div className="relative shrink-0 w-full">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
          {/* Header */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex flex-col items-start relative shrink-0">
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">Lists</p>
            </div>
            <div 
              className="relative shrink-0 size-[32px] cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                <g>
                  <path d="M16 6V26M26 16H6" stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </g>
              </svg>
            </div>
          </div>

          {/* List Items */}
          <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
            {lists.map((list) => {
              const taskCount = getListCount(list.id);
              return (
                <div
                  key={list.id}
                  className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                  onClick={() => onSelectList(list)}
                >
                  {/* List Name Row */}
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <div 
                      className="content-stretch flex gap-[8px] items-center relative shrink-0"
                    >
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={svgPaths.p1c6a4380} stroke={list.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                        </svg>
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">{list.name}</p>
                    </div>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{taskCount}</p>
                  </div>

                  {/* Shared Label */}
                  {list.isShared && (
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0">
                      <div className="box-border content-stretch flex gap-[4px] items-center justify-center pl-[32px] pr-0 py-0 relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            <g>
                              <path d={svgPaths.pded7080} stroke="#5B5D62" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            </g>
                          </svg>
                        </div>
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Shared</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Completed List */}
            <div
              className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
              onClick={() => onSelectList(completedList)}
            >
              {/* List Name Row */}
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                  <div className="relative shrink-0 size-[24px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <g>
                        <path d={completedSvgPaths.pcf2b720} stroke={completedList.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </g>
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">{completedList.name}</p>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{completedList.count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AddListModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onAddList={handleAddList}
      onUpdateList={handleUpdateList}
      onDeleteList={handleDeleteList}
      editingList={editingList}
    />
    </>
  );
}
