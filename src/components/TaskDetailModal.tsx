import { useState, useEffect, KeyboardEvent } from "react";
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
  description?: string | null;
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
  onUpdateTask: (taskId: number, text: string, description?: string | null, listId?: number, deadline?: { date: Date; time: string; recurring?: string } | null) => void;
  onDeleteTask: (taskId: number) => void;
  lists?: ListItem[];
}

export function TaskDetailModal({ isOpen, onClose, task, onUpdateTask, onDeleteTask, lists = [] }: TaskDetailModalProps) {
  const [taskInput, setTaskInput] = useState(task.text);
  const [taskDescription, setTaskDescription] = useState(task.description || "");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(Boolean(task.description));
  const [isSelectListOpen, setIsSelectListOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
  const [deadline, setDeadline] = useState<{ date: Date; time: string; recurring?: string } | null>(task.deadline || null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (!isOpen) return;
    setTaskInput(task.text);
    setTaskDescription(task.description || "");
    setIsDescriptionExpanded(Boolean(task.description));
    setSelectedListId(task.listId !== undefined && task.listId !== 0 && task.listId !== -1 ? task.listId : null);
    setDeadline(task.deadline || null);
    setCopyStatus("idle");
  }, [task, isOpen]);

  const handleSave = () => {
    if (taskInput.trim() === "") return;
    onUpdateTask(task.id, taskInput, taskDescription, selectedListId || undefined, deadline === null ? null : deadline);
    onClose();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && taskInput.trim() !== "") {
      e.preventDefault();
      handleSave();
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

  const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document === "undefined") {
      throw new Error("Clipboard API is not available");
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const buildChatGptPrompt = () => {
    const listName = getSelectedListName();
    const taskLines = [
      `Task: ${taskInput.trim() || "Untitled task"}`,
      taskDescription.trim() ? `Description: ${taskDescription.trim()}` : null,
      selectedListId !== null ? `List: ${listName}` : null,
      `Status: ${task.completed ? "Completed" : "Pending"}`,
    ].filter(Boolean) as string[];

    return [
      "You are ChatGPT, an assistant that solves tasks end-to-end.",
      "Produce a clear, actionable solution for the task described below.",
      "",
      ...taskLines,
    ].join("\n");
  };

  const handleCopyDetails = async () => {
    const payload = buildChatGptPrompt();

    try {
      await copyTextToClipboard(payload);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      setCopyStatus("error");
      console.error("Failed to copy task details", error);
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] pointer-events-none">
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
                <div className="flex w-full flex-col gap-[12px]">
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Task name"
                    className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
                    autoFocus
                  />

                  {(isDescriptionExpanded || taskDescription) ? (
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Task description"
                      autoFocus={isDescriptionExpanded && taskDescription === ""}
                      className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-white text-[14px] tracking-[-0.154px] bg-transparent border border-[rgba(225,230,238,0.1)] rounded-[16px] outline-none w-full placeholder:text-[#5b5d62] resize-none min-h-[96px] px-[16px] py-[12px]"
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
                </div>

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

                  {/* Copy Details Button */}
                  <button
                    type="button"
                    onClick={handleCopyDetails}
                    className="bg-[rgba(225,230,238,0.1)] hover:bg-[rgba(225,230,238,0.15)] box-border content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer transition-colors text-[#e1e6ee] text-[16px] tracking-[-0.176px]"
                  >
                    {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Retry copy" : "Copy details"}
                  </button>

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

                {/* Save Button */}
                <div className="flex w-full justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={taskInput.trim() === ""}
                    className="bg-[#0b64f9] hover:bg-[#0a58d8] disabled:opacity-50 disabled:cursor-not-allowed box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer transition-opacity px-[24px] py-[10px] font-['Inter:Medium',sans-serif] font-medium leading-[1.5] text-white text-[16px] tracking-[-0.176px]"
                  >
                    Save
                  </button>
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
    </div>
  );
}
