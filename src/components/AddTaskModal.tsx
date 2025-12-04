import { useState, KeyboardEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import svgPaths from "../imports/svg-p3zv31caxs";
import generateSvgPaths from "../imports/svg-gf1ry58lrd";
import { SelectListModal } from "./SelectListModal";
import { DeadlineModal } from "./DeadlineModal";

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: string, description?: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  lists?: ListItem[];
  defaultListId?: number;
}

export function AddTaskModal({ isOpen, onClose, onAddTask, lists = [], defaultListId }: AddTaskModalProps) {
  const getDefaultDeadline = () => {
    const today = new Date();
    return { date: today, time: "", recurring: undefined };
  };

  const [taskInput, setTaskInput] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(defaultListId || null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(getDefaultDeadline());
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);

  // Update selectedListId when defaultListId changes or modal opens
  useEffect(() => {
    if (isOpen && defaultListId !== undefined) {
      setSelectedListId(defaultListId);
    } else if (!isOpen) {
      // Reset when modal closes
      setSelectedListId(defaultListId || null);
      setTaskInput("");
      setDeadline(getDefaultDeadline());
      setTaskDescription("");
      setIsDescriptionExpanded(false);
    }
  }, [isOpen, defaultListId]);

  const handleSubmit = async () => {
    if (taskInput.trim() !== "") {
      if (isBulkAddMode) {
        await handleBulkAdd();
      } else {
        await onAddTask(taskInput, taskDescription, selectedListId || undefined, deadline || undefined);
        setTaskInput("");
        setSelectedListId(null);
        setDeadline(getDefaultDeadline());
        setTaskDescription("");
        setIsDescriptionExpanded(false);
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

  const getSelectedListColor = () => {
    if (selectedListId === null) return "#E1E6EE";
    const list = lists.find(l => l.id === selectedListId);
    return list ? list.color : "#E1E6EE";
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
    setIsDescriptionExpanded(false);
  };

  const handleBulkAdd = async () => {
    const lines = taskInput.split('\n').filter(line => line.trim() !== "");
    
    // Add all tasks sequentially to ensure they all get added
    for (const line of lines) {
      if (line.trim()) {
        await onAddTask(line.trim(), "", selectedListId || undefined, deadline || undefined);
      }
    }
    
    setTaskInput("");
    setSelectedListId(null);
    setDeadline(getDefaultDeadline());
    setIsBulkAddMode(false);
    setTaskDescription("");
    setIsDescriptionExpanded(false);
    onClose();
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
                {/* Input Field or Textarea */}
                <div className="flex w-full flex-col gap-[12px]">
                  {isBulkAddMode ? (
                    <textarea
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder="Add task"
                      className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[42px]"
                      autoFocus
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add task"
                      className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
                      autoFocus
                    />
                  )}

                  {!isBulkAddMode && (
                    <>
                      {(isDescriptionExpanded || taskDescription) ? (
                        <textarea
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="Task description"
                          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-white text-[14px] tracking-[-0.154px] bg-transparent border border-[rgba(225,230,238,0.1)] rounded-[16px] outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[96px] px-[16px] py-[12px]"
                          autoFocus={isDescriptionExpanded && taskDescription === ""}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsDescriptionExpanded(true)}
                          className="text-left font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[14px] tracking-[-0.154px] text-[#5b5d62] hover:text-[#e1e6ee] transition-colors"
                        >
                          Task description
                        </button>
                      )}
                    </>
                  )}
                </div>
                
                {/* Buttons Container */}
                <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                  {/* Button Row */}
                  <div className="content-center flex flex-wrap gap-[8px] items-center relative shrink-0 w-full">
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

                    {/* Generate Task Button */}
                    <div 
                      className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)]"
                      onClick={handleGenerateTask}
                    >
                      <div className="relative shrink-0 size-[20px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                          <g>
                            <path d={generateSvgPaths.p3df19b00} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                          </g>
                        </svg>
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Generate task</p>
                    </div>

                    {/* Bulk Add Button */}
                    <div 
                      className={`${isBulkAddMode ? 'bg-[#0b64f9]' : 'bg-[rgba(225,230,238,0.1)]'} box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:opacity-90`}
                      onClick={handleBulkAddToggle}
                    >
                      <div className="relative shrink-0 size-[20px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                          <g>
                            <path d={svgPaths.p247c5b00} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                          </g>
                        </svg>
                      </div>
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Bulk add</p>
                    </div>

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
                      onClick={handleSubmit}
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
        onClearDeadline={() => setDeadline(null)}
        currentDeadline={deadline}
      />
    </div>,
    document.body
  );
}
