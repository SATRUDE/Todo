import { createPortal } from "react-dom";
import svgPathsToday from "../imports/svg-z2a631st9g";
import iconPaths from "../imports/svg-u66msu10qs";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
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

interface ReviewMissedDeadlinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  missedDeadlines: Todo[];
  lists: ListItem[];
  onToggleTask: (taskId: number) => void;
  onUpdateDeadline: (taskId: number, deadline: { date: Date; time: string; recurring?: string }) => void;
  onDeleteTask: (taskId: number) => void;
  onTaskClick?: (task: Todo) => void;
  onNewDeadlineClick?: (task: Todo) => void;
}

export function ReviewMissedDeadlinesModal({
  isOpen,
  onClose,
  missedDeadlines,
  lists,
  onToggleTask,
  onUpdateDeadline,
  onDeleteTask,
  onTaskClick,
  onNewDeadlineClick,
}: ReviewMissedDeadlinesModalProps) {
  const getListById = (listId?: number) => {
    if (listId === undefined) return null;
    return lists.find(l => l.id === listId);
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const formatTime = (time: string) => {
    if (!time || time.trim() === "") return "";
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  };

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
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full" data-node-id="36:383">
          {/* Handle */}
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full" data-node-id="36:384">
            <div className="h-[20px] relative shrink-0 w-[100px]" data-node-id="36:385">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="box-border content-stretch flex flex-col gap-[32px] items-center px-[20px] py-0 relative shrink-0 w-full" data-node-id="36:401">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre" data-node-id="36:402">
              Review missed deadlines
            </p>
          </div>

          {/* Tasks List */}
          <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative shrink-0 w-full" data-node-id="36:485">
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-node-id="36:495">
              {missedDeadlines.map((todo) => {
                const list = getListById(todo.listId);
                return (
                  <div key={todo.id} className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full" data-node-id="36:496">
                    {/* Task Name Row */}
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="36:497">
                      {/* Checkbox */}
                      <div
                        className="relative shrink-0 size-[24px] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(todo.id);
                        }}
                        data-node-id="36:498"
                      >
                        <svg
                          className="block size-full"
                          fill="none"
                          preserveAspectRatio="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="11.25"
                            stroke="#E1E6EE"
                            strokeWidth="1.5"
                            fill={todo.completed ? "#E1E6EE" : "none"}
                          />
                          {todo.completed && (
                            <path
                              d="M7 12L10.5 15.5L17 9"
                              stroke="#110c10"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>
                      </div>
                      <p 
                        className={`font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre ${
                          todo.completed ? "line-through text-[#5b5d62]" : "text-white"
                        }`}
                        data-node-id="36:499"
                        onClick={() => onTaskClick?.(todo)}
                        style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                      >
                        {todo.text}
                      </p>
                    </div>

                    {/* Metadata Row */}
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="36:500">
                      {/* Time */}
                      {todo.deadline?.time && todo.deadline.time.trim() !== "" && (
                        <div className="box-border content-stretch flex gap-[4px] items-center justify-center pl-[32px] pr-0 py-0 relative shrink-0" data-node-id="36:501">
                          <div className="relative shrink-0 size-[24px]" data-node-id="36:502">
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
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre" data-node-id="36:504">
                            {formatTime(todo.deadline.time)}
                          </p>
                        </div>
                      )}

                      {/* Day Due */}
                      {todo.deadline && (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0" data-node-id="36:505">
                          <div className="relative shrink-0 size-[20px]" data-node-id="36:506">
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
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre" data-node-id="36:508">
                            {getDayOfWeek(todo.deadline.date)}
                          </p>
                        </div>
                      )}

                      {/* List */}
                      {list && (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0" data-node-id="36:509">
                          <div className="relative shrink-0 size-[24px]" data-node-id="36:510">
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
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre" data-node-id="36:512">
                            {list.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="36:545">
                      {/* New Deadline Button */}
                      <div 
                        className="bg-[rgba(11,100,249,0.25)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(11,100,249,0.3)] transition-colors"
                        onClick={() => {
                          if (onNewDeadlineClick) {
                            onNewDeadlineClick(todo);
                          }
                        }}
                        style={{ backgroundColor: 'rgba(11,100,249,0.25)', borderRadius: '100px' }}
                        data-node-id="36:532"
                      >
                        <div className="relative shrink-0 size-[20px]" data-node-id="36:533">
                          <svg
                            className="block size-full"
                            fill="none"
                            preserveAspectRatio="none"
                            viewBox="0 0 20 20"
                          >
                            <g>
                              <path
                                d={iconPaths.p186add80}
                                stroke="#4b93f8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.25"
                              />
                            </g>
                          </svg>
                        </div>
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre" 
                          style={{ color: '#4b93f8' }}
                          data-node-id="36:535"
                        >
                          New deadline
                        </p>
                      </div>

                      {/* Delete Button */}
                      <div 
                        className="bg-[rgba(239,65,35,0.2)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(239,65,35,0.25)] transition-colors"
                        onClick={() => {
                          onDeleteTask(todo.id);
                        }}
                        style={{ backgroundColor: 'rgba(239,65,35,0.2)', borderRadius: '100px' }}
                        data-node-id="36:537"
                      >
                        <div className="relative shrink-0 size-[20px]" data-node-id="36:542">
                          <svg
                            className="block size-full"
                            fill="none"
                            preserveAspectRatio="none"
                            viewBox="0 0 24 24"
                          >
                            <g>
                              <path
                                d={iconPaths.pf5e3c80}
                                stroke="#ef4123"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                            </g>
                          </svg>
                        </div>
                        <p 
                          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre" 
                          style={{ color: '#ef4123' }}
                          data-node-id="36:540"
                        >
                          Delete
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

