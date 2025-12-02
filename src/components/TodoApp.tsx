import { useState, useEffect, useRef, useCallback } from "react";
import svgPaths from "../imports/svg-y4ms3lw2z2";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { Lists } from "./Lists";
import { ListDetail } from "./ListDetail";
import { 
  fetchTasks, 
  createTask, 
  updateTask as updateTaskDb, 
  deleteTask as deleteTaskDb,
  fetchLists,
  createList,
  updateList as updateListDb,
  deleteList as deleteListDb,
  dbTodoToDisplayTodo
} from "../lib/database";
import { 
  requestNotificationPermission, 
  subscribeToPushNotifications,
  sendSubscriptionToServer,
  getPushSubscription,
  sendTestPushNotification
} from "../lib/notifications";

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
const ALL_TASKS_LIST_ID = -2;

const listColors = ["#0B64F9", "#00C853", "#EF4123", "#FF6D00", "#FA8072"];

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("today");
  const [selectedList, setSelectedList] = useState<ListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<number>>(new Set());
  const completionTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const notificationTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setConnectionError(null);
        
        // Check if Supabase is configured
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
        const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
          setConnectionError('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings.');
          setLoading(false);
          return;
        }
        
        // Validate URL format
        try {
          const url = new URL(supabaseUrl);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid protocol');
          }
        } catch {
          setConnectionError(`Invalid Supabase URL format. URL must start with http:// or https://. Current value: "${supabaseUrl || '(empty)'}"`);
          setLoading(false);
          return;
        }
        
        const [tasksData, listsData] = await Promise.all([
          fetchTasks(),
          fetchLists()
        ]);
        
        // Convert database format to app format
        const appTodos = tasksData.map(dbTodoToDisplayTodo);
        const appLists = listsData.map(list => ({
          id: list.id,
          name: list.name,
          color: list.color,
          count: 0, // Will be calculated
          isShared: list.is_shared,
        }));
        
        setTodos(appTodos);
        setLists(appLists);
      } catch (error: any) {
        console.error('Error loading data:', error);
        
        if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
          setConnectionError('Invalid Supabase credentials. Please check your .env file.');
        } else if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setConnectionError('Connected to Supabase, but tables not found. Please run the SQL schema from supabase-schema.sql in your Supabase SQL Editor.');
        } else {
          setConnectionError(`Connection error: ${error.message || 'Failed to connect to Supabase'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      completionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      completionTimeouts.current.clear();
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts.current.clear();
    };
  }, []);

  // Initialize notification permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Handle enabling notifications
  const handleEnableNotifications = useCallback(async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        const subscription = await subscribeToPushNotifications();
        if (subscription) {
          console.log('📱 Push subscription created, sending to server...');
          const success = await sendSubscriptionToServer(subscription);
          if (success) {
            console.log('✅ Subscription saved to server successfully');
            alert('Notifications enabled! You will receive reminders for due todos.');
          } else {
            console.error('❌ Failed to save subscription to server');
            alert('Notifications enabled locally, but failed to save to server. Check console for details.');
          }
        } else {
          console.error('❌ Failed to create push subscription');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Error enabling notifications: ' + (error as Error).message);
    }
  }, []);

  // Handle test notification
  const handleTestNotification = useCallback(async () => {
    if (notificationPermission !== 'granted') {
      alert('Notification permission not granted. Please enable notifications first.');
      return;
    }

    try {
      let subscription = await getPushSubscription();
      if (!subscription) {
        subscription = await subscribeToPushNotifications();
      }

      if (subscription) {
        const pushTriggered = await sendTestPushNotification(subscription);
        if (pushTriggered) {
          alert('Push notification triggered! It may take a few seconds to arrive.');
          return;
        }
      } else {
        console.warn('Unable to trigger push notification because no subscription was found.');
      }

      // Fallback to showing a notification directly if the push request failed
      if ('Notification' in window) {
        try {
          const notification = new Notification('Test Notification', {
            body: 'This is a test notification from your Todo app!',
            icon: '/icon-192.png',
            tag: 'test-notification',
          });
          console.log('Test notification shown via Notification API');
          return;
        } catch (directError) {
          console.warn('Direct Notification API failed:', directError);
        }
      }
      
      if ('serviceWorker' in navigator) {
        try {
          const readyPromise = navigator.serviceWorker.ready;
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service worker ready timeout')), 5000)
          );
          
          await Promise.race([readyPromise, timeoutPromise]);
          
          const registration = await navigator.serviceWorker.getRegistration();
          
          if (!registration) {
            throw new Error('Service worker not registered');
          }
          
          await registration.showNotification('Test Notification', {
            body: 'This is a test notification from your Todo app!',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-notification',
            requireInteraction: false,
          });
          console.log('Test notification shown via service worker');
          return;
        } catch (swError) {
          console.error('Service worker notification failed:', swError);
          alert('Failed to show notification via service worker. Check console for details.');
        }
      }
      
      console.error('Neither service worker nor Notification API is available');
      alert('Notifications are not supported in this browser.');
    } catch (error) {
      console.error('Error showing test notification:', error);
      alert('Failed to show notification. Check console for details.');
    }
  }, [notificationPermission]);

  // Schedule deadline notifications
  useEffect(() => {
    // Clear existing notification timeouts
    notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    notificationTimeouts.current.clear();

    if (notificationPermission !== 'granted') {
      return;
    }

    const now = new Date();
    const scheduleNotification = async (todo: Todo) => {
      // Only schedule for tasks with deadline, time, and not completed
      if (!todo.deadline || !todo.deadline.time || todo.deadline.time.trim() === '' || todo.completed) {
        return;
      }

      try {
        const deadlineDate = new Date(todo.deadline.date);
        const [hours, minutes] = todo.deadline.time.split(':').map(Number);
        
        // Validate time format
        if (isNaN(hours) || isNaN(minutes)) {
          return;
        }
        
        deadlineDate.setHours(hours, minutes, 0, 0);

        // Only schedule if the deadline is in the future
        if (deadlineDate <= now) {
          return;
        }

        const delay = deadlineDate.getTime() - now.getTime();
        
        // Don't schedule if delay is too large (more than 24 hours)
        // This prevents issues with very far future dates
        if (delay > 24 * 60 * 60 * 1000) {
          return;
        }

        const timeout = setTimeout(async () => {
          try {
            // Check if task is still not completed
            const currentTodo = todos.find(t => t.id === todo.id);
            if (currentTodo && currentTodo.completed) {
              return;
            }

            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('Task Reminder', {
                body: `${todo.text} - ${todo.deadline.time}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `task-${todo.id}`,
              });
            } else if ('Notification' in window) {
              new Notification('Task Reminder', {
                body: `${todo.text} - ${todo.deadline.time}`,
                icon: '/icon-192.png',
                tag: `task-${todo.id}`,
              });
            }
          } catch (error) {
            console.error('Error showing deadline notification:', error);
          }
          notificationTimeouts.current.delete(todo.id);
        }, delay);

        notificationTimeouts.current.set(todo.id, timeout);
      } catch (error) {
        console.error('Error scheduling notification for task:', todo.id, error);
      }
    };

    // Schedule notifications for all tasks with deadlines
    todos.forEach(todo => {
      if (todo.deadline && todo.deadline.time && todo.deadline.time.trim() !== '' && !todo.completed) {
        scheduleNotification(todo);
      }
    });

    // Cleanup function
    return () => {
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts.current.clear();
    };
  }, [todos, notificationPermission]);

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

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    // Check if this is a today task being completed
    const isTodayTask = todo.deadline && 
      new Date(todo.deadline.date).toDateString() === new Date().toDateString();
    const isCompleting = !todo.completed;
    
    if (!todo.completed && todo.deadline?.recurring) {
      // Task is being completed and has recurring setting
      // Create a new recurring instance with the next deadline
      const nextDate = getNextRecurringDate(todo.deadline.date, todo.deadline.recurring);
      const newRecurringTodo: Todo = {
        id: Date.now() + 1, // Temporary ID, will be replaced by database
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
      
      try {
        // Update current task to completed
        const updatedTodo = await updateTaskDb(id, {
          ...todo,
          completed: true,
          listId: COMPLETED_LIST_ID
        });
        
        // Create new recurring task
        const newTask = await createTask(newRecurringTodo);
        const newAppTodo = dbTodoToDisplayTodo(newTask);
        
        const updatedTodos = [
          ...todos.map((t) => {
            if (t.id === id) {
              return dbTodoToDisplayTodo(updatedTodo);
            }
            return t;
          }),
          newAppTodo
        ];
        
        setTodos(updatedTodos);
        
        // If it's a today task, show it as completed for 1 second
        if (isTodayTask && isCompleting) {
          setRecentlyCompleted(prev => new Set(prev).add(id));
          const timeout = setTimeout(() => {
            setRecentlyCompleted(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            completionTimeouts.current.delete(id);
          }, 1000);
          completionTimeouts.current.set(id, timeout);
        }
      } catch (error) {
        console.error('Error toggling recurring task:', error);
      }
    } else {
      // Normal toggle behavior
      try {
        const newCompleted = !todo.completed;
        const updatedTodo = await updateTaskDb(id, {
          ...todo,
          completed: newCompleted,
          listId: newCompleted ? COMPLETED_LIST_ID : todo.listId
        });
        
        setTodos(
          todos.map((t) => {
            if (t.id === id) {
              return dbTodoToDisplayTodo(updatedTodo);
            }
            return t;
          })
        );
        
        // If it's a today task being completed, show it as completed for 1 second
        if (isTodayTask && isCompleting) {
          setRecentlyCompleted(prev => new Set(prev).add(id));
          const timeout = setTimeout(() => {
            setRecentlyCompleted(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            completionTimeouts.current.delete(id);
          }, 1000);
          completionTimeouts.current.set(id, timeout);
        } else if (isTodayTask && !isCompleting) {
          // If uncompleting, remove from recently completed immediately
          setRecentlyCompleted(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          const timeout = completionTimeouts.current.get(id);
          if (timeout) {
            clearTimeout(timeout);
            completionTimeouts.current.delete(id);
          }
        }
      } catch (error) {
        console.error('Error toggling task:', error);
      }
    }
  };

  const addNewTask = async (taskText: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    const newTodo: Todo = {
      id: Date.now(), // Temporary ID
      text: taskText,
      completed: false,
      time: deadline?.time,
      group: deadline ? undefined : "Group",
      listId: listId !== undefined ? listId : TODAY_LIST_ID,
      deadline: deadline,
    };
    
    try {
      const createdTask = await createTask(newTodo);
      const appTodo = dbTodoToDisplayTodo(createdTask);
      // Use functional update to ensure we get the latest state
      setTodos(prevTodos => [...prevTodos, appTodo]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const addNewTaskToList = async (taskText: string, listId: number) => {
    const newTodo: Todo = {
      id: Date.now(), // Temporary ID
      text: taskText,
      completed: false,
      listId: listId,
    };
    
    try {
      const createdTask = await createTask(newTodo);
      const appTodo = dbTodoToDisplayTodo(createdTask);
      setTodos([...todos, appTodo]);
    } catch (error) {
      console.error('Error adding task to list:', error);
    }
  };

  const addNewList = async (listName: string, isShared: boolean, color: string) => {
    try {
      const createdList = await createList({ name: listName, color, isShared });
      const appList: ListItem = {
        id: createdList.id,
        name: createdList.name,
        color: createdList.color,
        count: 0,
        isShared: createdList.is_shared,
      };
      setLists([...lists, appList]);
    } catch (error) {
      console.error('Error adding list:', error);
    }
  };

  const updateList = async (listId: number, listName: string, isShared: boolean, color: string) => {
    try {
      const updatedList = await updateListDb(listId, { name: listName, color, isShared });
      setLists(lists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            name: updatedList.name,
            isShared: updatedList.is_shared,
            color: updatedList.color,
          };
        }
        return list;
      }));
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const deleteList = async (listId: number) => {
    try {
      await deleteListDb(listId);
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
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const updateTask = async (taskId: number, text: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    try {
      const todo = todos.find(t => t.id === taskId);
      if (!todo) return;
      
      const updateData: any = {
        ...todo,
        text,
        listId: listId !== undefined ? listId : todo.listId,
      };
      
      if (deadline !== undefined) {
        updateData.deadline = deadline;
        updateData.time = deadline?.time;
        updateData.group = deadline ? undefined : todo.group;
      }
      
      const updatedTodo = await updateTaskDb(taskId, updateData);
      
      setTodos(todos.map(t => {
        if (t.id === taskId) {
          return dbTodoToDisplayTodo(updatedTodo);
        }
        return t;
      }));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await deleteTaskDb(taskId);
      setTodos(todos.filter(todo => todo.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTaskClick = (task: Todo) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const getTasksForList = (listId: number) => {
    if (listId === ALL_TASKS_LIST_ID) {
      // Return all tasks (excluding completed ones that are in the completed list)
      return todos.filter(todo => todo.listId !== COMPLETED_LIST_ID);
    }
    return todos.filter(todo => todo.listId === listId);
  };

  const todayTasks = todos.filter(todo => {
    if (!todo.deadline) return false;
    const today = new Date();
    const taskDate = todo.deadline.date;
    const isToday = taskDate.toDateString() === today.toDateString();
    
    if (!isToday) return false;
    
    // Show task if:
    // 1. It's not completed, OR
    // 2. It was recently completed (within 1 second)
    return !todo.completed || recentlyCompleted.has(todo.id);
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

  if (loading) {
    return (
      <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-0 relative size-full min-h-screen">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-0 relative size-full min-h-screen">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-[#EF4123] text-white p-6 rounded-lg mb-4">
            <h2 className="text-xl font-semibold mb-2">⚠️ Connection Error</h2>
            <p className="text-sm mb-4">{connectionError}</p>
            <div className="text-sm space-y-2">
              <p><strong>To fix this:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Create a <code className="bg-black/20 px-1 rounded">.env</code> file in the project root</li>
                <li>Add your Supabase credentials:
                  <pre className="bg-black/20 p-2 rounded mt-2 text-xs overflow-x-auto">
VITE_SUPABASE_URL=your_project_url{'\n'}VITE_SUPABASE_ANON_KEY=your_anon_key
                  </pre>
                </li>
                <li>Run the SQL from <code className="bg-black/20 px-1 rounded">supabase-schema.sql</code> in Supabase SQL Editor</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-[#0B64F9] text-white py-2 px-4 rounded hover:bg-[#0954d0]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#110c10] box-border content-stretch flex flex-col items-center justify-between pb-[120px] pt-[60px] px-0 relative size-full min-h-screen">
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
              {todayTasks.map((todo) => {
                const isRecentlyCompleted = recentlyCompleted.has(todo.id);
                return (
                <div
                  key={todo.id}
                  className={`content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer transition-opacity duration-1000 ${
                    isRecentlyCompleted ? 'opacity-100' : 'opacity-100'
                  }`}
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
                );
              })}
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
          onBack={() => setCurrentPage("today")}
          onEnableNotifications={handleEnableNotifications}
          notificationPermission={notificationPermission}
          onTestNotification={handleTestNotification}
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
          onAddTask={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : (taskText) => addNewTaskToList(taskText, selectedList.id)}
          onUpdateList={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : updateList}
          onDeleteList={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : deleteList}
          onTaskClick={handleTaskClick}
          lists={lists}
        />
      ) : null}

      {/* Bottom Navigation */}
      <div className="box-border content-stretch flex gap-[80px] items-center justify-center pb-[60px] pt-[20px] px-0 fixed bottom-0 left-0 right-0 w-full bg-[#110c10] z-[1000]">
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
