import { useState, KeyboardEvent } from "react";
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
  onUpdateTask: (taskId: number, text: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  onDeleteTask: (taskId: number) => void;
  lists?: ListItem[];
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdateTask, onDeleteTask, lists = [] }: TaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && taskInput.trim() !== "") {
      onUpdateTask(task.id, taskInput, selectedListId || undefined, deadline || undefined);
      onClose();
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
    onDeleteTask(task.id);
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
        onClick={onClose}
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
          <div className="relative shrink-0 w-full">
            <div className="size-full">
              <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
                {/* Input Field */}
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Task name"
                  className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
                  autoFocus
                />

                {/* Buttons */}
                <div className="content-stretch flex gap-[8px] items-start relative shrink-0 flex-wrap">
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

                  {/* Delete Button */}
                  <div 
                    className="relative shrink-0 size-[24px] cursor-pointer opacity-100 hover:opacity-70"
                    onClick={handleDelete}
                  >
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <g>
                        <path d={deleteIconPaths.pf5e3c80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
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
        currentDeadline={deadline}
      />
    </div>
  );
}
