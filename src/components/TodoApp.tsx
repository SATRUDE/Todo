import { useState } from "react";
import svgPaths from "../imports/svg-y4ms3lw2z2";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { Lists } from "./Lists";
import { ListDetail } from "./ListDetail";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  listId?: number; // -1 for completed, 0 for today, positive numbers for custom lists
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

type Page = "today" | "lists" | "listDetail";

const COMPLETED_LIST_ID = -1;
const TODAY_LIST_ID = 0;

const listColors = ["#0B64F9", "#00C853", "#EF4123", "#FF6D00", "#FA8072"];

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "Task name", completed: false, time: "9:00", group: "Group", listId: TODAY_LIST_ID },
    { id: 2, text: "Task name", completed: false, time: "9:00", group: "Group", listId: TODAY_LIST_ID },
    { id: 3, text: "Task name", completed: false, time: "9:00", group: "Group", listId: TODAY_LIST_ID },
  ]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("today");
  const [selectedList, setSelectedList] = useState<ListItem | null>(null);

  const handleSelectList = (list: ListItem) => {
    setSelectedList(list);
    setCurrentPage("listDetail");
  };

  const handleBackFromList = () => {
    setSelectedList(null);
    setCurrentPage("lists");
  };

  const getNextRecurringDate = (currentDate: Date, recurring: string): Date => {
    const nextDate = new Date(currentDate);
    
    switch (recurring) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "weekday":
        // Add 1 day, but skip weekends
        nextDate.setDate(nextDate.getDate() + 1);
        // If it's Saturday (6), add 2 more days to get to Monday
        if (nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() + 2);
        }
        // If it's Sunday (0), add 1 more day to get to Monday
        if (nextDate.getDay() === 0) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    
    return nextDate;
  };

  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id);
    
    if (todo && !todo.completed && todo.deadline?.recurring) {
      // Task is being completed and has recurring setting
      // Create a new recurring instance with the next deadline
      const nextDate = getNextRecurringDate(todo.deadline.date, todo.deadline.recurring);
      const newRecurringTodo: Todo = {
        id: Date.now() + 1, // Ensure unique ID
        text: todo.text,
        completed: false,
        time: todo.deadline.time,
        listId: todo.listId,
        deadline: {
          date: nextDate,
          time: todo.deadline.time,
          recurring: todo.deadline.recurring
        }
      };
      
      setTodos([
        ...todos.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              completed: true,
              listId: COMPLETED_LIST_ID
            };
          }
          return t;
        }),
        newRecurringTodo
      ]);
    } else {
      // Normal toggle behavior
      setTodos(
        todos.map((todo) => {
          if (todo.id === id) {
            const newCompleted = !todo.completed;
            return {
              ...todo,
              completed: newCompleted,
              listId: newCompleted ? COMPLETED_LIST_ID : todo.listId
            };
          }
          return todo;
        })
      );
    }
  };

  const addNewTask = (taskText: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    const newTodo: Todo = {
      id: Date.now(),
      text: taskText,
      completed: false,
      time: deadline?.time,
      group: deadline ? undefined : "Group",
      listId: listId !== undefined ? listId : TODAY_LIST_ID,
      deadline: deadline,
    };
    setTodos([...todos, newTodo]);
  };

  const addNewTaskToList = (taskText: string, listId: number) => {
    const newTodo: Todo = {
      id: Date.now(),
      text: taskText,
      completed: false,
      time: "9:00",
      listId: listId,
    };
    setTodos([...todos, newTodo]);
  };

  const addNewList = (listName: string, isShared: boolean, color: string) => {
    const newList: ListItem = {
      id: Date.now(),
      name: listName,
      color: color,
      count: 0,
      isShared: isShared,
    };
    setLists([...lists, newList]);
  };

  const updateList = (listId: number, listName: string, isShared: boolean, color: string) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          name: listName,
          isShared: isShared,
          color: color,
        };
      }
      return list;
    }));
  };

  const deleteList = (listId: number) => {
    // Remove the list
    setLists(lists.filter(list => list.id !== listId));
    // Move all tasks from this list to Today
    setTodos(todos.map(todo => {
      if (todo.listId === listId) {
        return {
          ...todo,
          listId: TODAY_LIST_ID,
        };
      }
      return todo;
    }));
  };

  const updateTask = (taskId: number, text: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    setTodos(todos.map(todo => {
      if (todo.id === taskId) {
        return {
          ...todo,
          text,
          listId: listId !== undefined ? listId : todo.listId,
          deadline: deadline,
          time: deadline?.time,
          group: deadline ? undefined : todo.group,
        };
      }
      return todo;
    }));
  };

  const deleteTask = (taskId: number) => {
    setTodos(todos.filter(todo => todo.id !== taskId));
  };

  const handleTaskClick = (task: Todo) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const getTasksForList = (listId: number) => {
    return todos.filter(todo => todo.listId === listId);
  };

  const todayTasks = todos.filter(todo => {
    if (!todo.deadline) return false;
    const today = new Date();
    const taskDate = todo.deadline.date;
    return taskDate.toDateString() === today.toDateString();
  });

  const getListById = (listId?: number) => {
    if (listId === undefined || listId === TODAY_LIST_ID || listId === COMPLETED_LIST_ID) {
      return null;
    }
    return lists.find(l => l.id === listId);
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const getFormattedDate = () => {
    const today = new Date();
    const dayOfWeek = getDayOfWeek(today);
    const day = today.getDate();
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    
    return `${dayOfWeek} ${day}${getOrdinalSuffix(day)}`;
  };

  return (
    <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-between pb-0 pt-[60px] px-0 relative size-full min-h-screen">
      {/* Main Content */}
      {currentPage === "today" ? (
        <div className="relative shrink-0 w-full">
          <div className="size-full">
            <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
              {/* Header with Today and Date */}
              <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
                <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Today</p>
                <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">{getFormattedDate()}</p>
              </div>
            
            {/* Todo List */}
            <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              {todayTasks.map((todo) => (
                <div
                  key={todo.id}
                  className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                  onClick={() => handleTaskClick(todo)}
                >
                  {/* Task Name Row */}
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                    {/* Checkbox */}
                    <div
                      className="relative shrink-0 size-[24px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTodo(todo.id);
                      }}
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
                    >
                      {todo.text}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="content-stretch flex gap-[8px] items-start relative shrink-0">
                    {/* Time */}
                    {todo.time && (
                      <div className="box-border content-stretch flex gap-[4px] items-center justify-center pl-[32px] pr-0 py-0 relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
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
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
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
                        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                          {getDayOfWeek(todo.deadline.date)}
                        </p>
                      </div>
                    )}

                    {/* List */}
                    {(() => {
                      const list = getListById(todo.listId);
                      return list ? (
                        <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
                          <div className="relative shrink-0 size-[24px]">
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
                          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                            {list.name}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      ) : currentPage === "lists" ? (
        <Lists 
          onSelectList={handleSelectList}
          todos={todos}
          lists={lists}
          onAddList={addNewList}
          onUpdateList={updateList}
          onDeleteList={deleteList}
        />
      ) : currentPage === "listDetail" && selectedList ? (
        <ListDetail 
          listId={selectedList.id}
          listName={selectedList.name}
          listColor={selectedList.color}
          isShared={selectedList.isShared}
          onBack={handleBackFromList}
          tasks={getTasksForList(selectedList.id)}
          onToggleTask={toggleTodo}
          onAddTask={(taskText) => addNewTaskToList(taskText, selectedList.id)}
          onUpdateList={updateList}
          onDeleteList={deleteList}
        />
      ) : null}

      {/* Bottom Navigation */}
      <div className="box-border content-stretch flex gap-[80px] items-center justify-center pb-[60px] pt-[20px] px-0 relative shrink-0 w-full">
        <div
          aria-hidden="true"
          className="absolute border-[1px_0px_0px] border-[rgba(225,230,238,0.1)] border-solid inset-0 pointer-events-none"
        />
        
        {/* Calendar Icon */}
        <div 
          className="relative shrink-0 size-[32px] cursor-pointer"
          onClick={() => {
            setCurrentPage("today");
            setSelectedList(null);
          }}
        >
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 32 32"
          >
            <g>
              <path
                d={svgPaths.p1378b200}
                stroke={currentPage === "today" ? "#E1E6EE" : "#5B5D62"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>

        {/* Plus Icon */}
        <div 
          className="relative shrink-0 size-[32px] cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 32 32"
          >
            <g>
              <path
                d="M16 6V26M26 16H6"
                stroke="#5B5D62"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>

        {/* List Icon */}
        <div 
          className="relative shrink-0 size-[32px] cursor-pointer"
          onClick={() => {
            setCurrentPage("lists");
            setSelectedList(null);
          }}
        >
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 32 32"
          >
            <g>
              <path
                d={svgPaths.p8560f0}
                stroke={currentPage === "lists" || currentPage === "listDetail" ? "#E1E6EE" : "#5B5D62"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTask={addNewTask}
        lists={lists}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={() => {
            setIsTaskDetailOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          lists={lists}
        />
      )}
    </div>
  );
}
