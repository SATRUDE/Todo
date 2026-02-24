import { useState, useEffect, useRef, useCallback } from "react";
import svgPaths from "../imports/svg-y4ms3lw2z2";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { AddTaskModal } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { Lists } from "./Lists";
import { ListDetail } from "./ListDetail";
import { Settings } from "./Settings";
import { Dashboard } from "./Dashboard";
import { CalendarSync } from "./CalendarSync";
import { CommonTasks } from "./CommonTasks";
import { CommonTaskDetail } from "./CommonTaskDetail";
import { DailyTasks } from "./DailyTasks";
import { Goals } from "./Goals";
import { GoalDetail } from "./GoalDetail";
import { MilestoneDetail } from "./MilestoneDetail";
import { ReviewMissedDeadlinesBox } from "./ReviewMissedDeadlinesBox";
import { ReviewMissedDeadlinesModal } from "./ReviewMissedDeadlinesModal";
import { DeadlineModal } from "./DeadlineModal";
import { CompletedTasksBox } from "./CompletedTasksBox";
import { FilterListsModal } from "./FilterListsModal";
import { CalendarTaskSuggestions } from "./CalendarTaskSuggestions";
import { SignIn } from "./SignIn";
import { ResetPassword } from "./ResetPassword";
import { Workshop } from "./Workshop";
import { Notes } from "./Notes";
import { NoteDetail } from "./NoteDetail";
import { TasksPage } from "./TasksPage";
import { SearchPage } from "./SearchPage";
import { APP_VERSION } from "../lib/version";
import { supabase } from "../lib/supabase";
import { linkifyText } from "../lib/textUtils";
import { 
  fetchTasks, 
  createTask, 
  updateTask as updateTaskDb, 
  deleteTask as deleteTaskDb,
  fetchLists,
  fetchListFolders,
  createList,
  createListFolder,
  updateList as updateListDb,
  updateListFolder as updateListFolderDb,
  deleteList as deleteListDb,
  deleteListFolder as deleteListFolderDb,
  dbTodoToDisplayTodo,
  type ListFolder,
  fetchCommonTasks,
  createCommonTask,
  updateCommonTask,
  deleteCommonTask,
  CommonTask,
  dbCommonTaskToDisplayCommonTask,
  fetchDailyTasks,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  DailyTask,
  dbDailyTaskToDisplayDailyTask,
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  Goal,
  dbGoalToDisplayGoal,
  fetchMilestones,
  fetchAllMilestones,
  fetchSubtasks,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  Milestone,
  fetchMilestoneUpdatesForMilestones,
  MilestoneUpdate,
  fetchGoalStatuses,
  upsertGoalStatuses,
  type GoalStatus,
  type GoalStatusInfo,
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  type Note
} from "../lib/database";
import { 
  requestNotificationPermission, 
  subscribeToPushNotifications,
  sendSubscriptionToServer,
  getPushSubscription,
  sendTestPushNotification
} from "../lib/notifications";
import { 
  fetchCalendarEvents, 
  getProcessedEventIds, 
  filterProcessedEvents,
  getCalendarConnection,
  connectGoogleCalendar
} from "../lib/calendar";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  description?: string | null;
  imageUrl?: string | null;
  listId?: number; // -1 for completed, 0 for today, positive numbers for custom lists
  milestoneId?: number; // Foreign key to milestones table
  dailyTaskId?: number | null; // Foreign key to daily_tasks table
  parentTaskId?: number | null; // Foreign key to parent task (for subtasks)
  deadline?: {
    date: Date;
    time: string;
    recurring?: string;
  };
  type?: 'task' | 'reminder'; // Task type: 'task' or 'reminder'
  updatedAt?: string; // ISO timestamp string
}

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
  folderId?: number | null;
}

type Page = "today" | "dashboard" | "lists" | "listDetail" | "settings" | "calendarSync" | "commonTasks" | "commonTaskDetail" | "dailyTasks" | "goals" | "goalDetail" | "milestoneDetail" | "resetPassword" | "workshop" | "notes" | "noteDetail" | "search";

const COMPLETED_LIST_ID = -1;
const TODAY_LIST_ID = 0;
const ALL_TASKS_LIST_ID = -2;

const listColors = ["#0B64F9", "#00C853", "#EF4123", "#FF6D00", "#FA8072"];

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [listFolders, setListFolders] = useState<ListFolder[]>([]);
  const [commonTasks, setCommonTasks] = useState<CommonTask[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesPreselectedTaskId, setNotesPreselectedTaskId] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteDetailReturnPage, setNoteDetailReturnPage] = useState<"notes" | "search" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isReviewMissedDeadlinesOpen, setIsReviewMissedDeadlinesOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [taskForDeadlineUpdate, setTaskForDeadlineUpdate] = useState<Todo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("today");
  const [selectedList, setSelectedList] = useState<ListItem | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  // selectedCommonTask uses display format (with deadline object), not database format
  const [selectedCommonTask, setSelectedCommonTask] = useState<{ id: number; text: string; description?: string | null; time?: string | null; deadline?: { date: Date; time: string; recurring?: string } } | null>(null);
  const [allMilestonesWithGoals, setAllMilestonesWithGoals] = useState<Array<{ id: number; name: string; goalId: number; goalName: string }>>([]);
  const [goalMilestones, setGoalMilestones] = useState<Record<number, Milestone[]>>(() => {
    // Load saved goal milestones from localStorage on mount
    try {
      const saved = localStorage.getItem('goal-milestones');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved goal milestones:', error);
    }
    return {};
  });
  const [goalTasks, setGoalTasks] = useState<Record<number, any[]>>(() => {
    // Load saved goal tasks from localStorage on mount
    try {
      const saved = localStorage.getItem('goal-tasks');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved goal tasks:', error);
    }
    return {};
  });
  const [milestoneUpdates, setMilestoneUpdates] = useState<MilestoneUpdate[]>(() => {
    // Load saved milestone updates from localStorage on mount
    try {
      const saved = localStorage.getItem('milestone-updates');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved milestone updates:', error);
    }
    return [];
  });
  const [aiGoalStatuses, setAiGoalStatuses] = useState<Record<number, GoalStatusInfo>>(() => {
    try {
      const saved = localStorage.getItem('goal-statuses');
      if (saved) {
        const raw = JSON.parse(saved) as Record<string, unknown>;
        const out: Record<number, GoalStatusInfo> = {};
        for (const [k, v] of Object.entries(raw)) {
          const id = parseInt(k, 10);
          if (Number.isNaN(id)) continue;
          if (v && typeof v === 'object' && 'status' in v && typeof (v as { status: string }).status === 'string') {
            const s = (v as { status: string; explanation?: string | null }).status;
            if (s === 'On track' || s === 'At risk' || s === 'Failing') {
              out[id] = { status: s, explanation: (v as { explanation?: string | null }).explanation ?? null };
            }
          } else if (v === 'On track' || v === 'At risk' || v === 'Failing') {
            out[id] = { status: v, explanation: null };
          }
        }
        return out;
      }
    } catch (error) {
      console.error('Error loading saved goal statuses:', error);
    }
    return {};
  });
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [timeRangeFilter, setTimeRangeFilter] = useState<"today" | "week" | "month" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [isSecondaryDataLoading, setIsSecondaryDataLoading] = useState(false);
  const isGeneratingDailyTasksRef = useRef(false);
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<number>>(new Set());
  const completionTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"today" | "tomorrow" | "week" | "month" | "allTime">("today");
  const [selectedListFilterIds, setSelectedListFilterIds] = useState<Set<number>>(new Set());
  const [isFilterListsModalOpen, setIsFilterListsModalOpen] = useState(false);
  const [isScheduledExpanded, setIsScheduledExpanded] = useState(true);
  const [calendarPendingEventsCount, setCalendarPendingEventsCount] = useState<number>(0);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean | null>(null);
  
  // Check if we're on the reset password route
  useEffect(() => {
    const checkResetPassword = async () => {
      // Check if pathname is /reset-password
      const isResetPasswordPath = window.location.pathname === '/reset-password' || window.location.pathname.endsWith('/reset-password');
      
      if (isResetPasswordPath) {
        // Check if user has a session (Supabase auto-authenticates on password recovery)
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Reset password route check:', { 
          pathname: window.location.pathname,
          hash: window.location.hash.substring(0, 100),
          search: window.location.search,
          hasSession: !!session
        });
        
        if (session) {
          // User is authenticated via password recovery link
          setCurrentPage('resetPassword');
        } else {
          // Check hash/query params for recovery token
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const queryParams = new URLSearchParams(window.location.search);
          const type = hashParams.get('type') || queryParams.get('type');
          
          if (type === 'recovery') {
            setCurrentPage('resetPassword');
          }
        }
      }
    };
    
    // Check immediately
    checkResetPassword();
    
    // Also listen for hash changes (in case Supabase processes it)
    const handleHashChange = () => {
      checkResetPassword();
    };
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      
      // Check if this is a password recovery flow
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        // Check if we're on the reset password route
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        const type = hashParams.get('type') || queryParams.get('type');
        
        if (type === 'recovery' || window.location.pathname === '/reset-password') {
          setCurrentPage('resetPassword');
          return; // Don't set authenticated yet, wait for password to be set
        }
      }
      
      if (event === 'SIGNED_OUT') {
        // Clear all data on sign out
        setTodos([]);
        setLists([]);
        setCommonTasks([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = () => {
    setIsAuthenticated(true);
    setIsCheckingAuth(false);
  };

  // Update current time every minute to check for overdue tasks
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Validate Supabase configuration
  const validateSupabaseConfig = (): { valid: boolean; error?: string } => {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseKey) {
      return { valid: false, error: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings.' };
    }
    
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { valid: false, error: 'Invalid protocol' };
      }
    } catch {
      return { valid: false, error: `Invalid Supabase URL format. URL must start with http:// or https://. Current value: "${supabaseUrl || '(empty)'}"` };
    }
    
    return { valid: true };
  };

  // Stage 1: Critical data (tasks + lists + list folders) - loads immediately
  const loadCriticalData = async () => {
    const [tasksData, listsData, foldersData] = await Promise.allSettled([
      fetchTasks(),
      fetchLists(),
      fetchListFolders()
    ]);
    
    const tasksResult = tasksData.status === 'fulfilled' ? tasksData.value : [];
    const listsResult = listsData.status === 'fulfilled' ? listsData.value : [];
    const foldersResult = foldersData.status === 'fulfilled' ? foldersData.value : [];
    
    if (tasksData.status === 'rejected') {
      console.error('Error fetching tasks:', tasksData.reason);
    }
    if (listsData.status === 'rejected') {
      console.error('Error fetching lists:', listsData.reason);
    }
    if (foldersData.status === 'rejected') {
      console.error('Error fetching list folders:', foldersData.reason);
    }
    
    // Convert database format to app format
    const appTodos = tasksResult.map(dbTodoToDisplayTodo);
    const appLists = listsResult.map((list: { id: number; name: string; color: string; is_shared: boolean; folder_id?: number | null }) => ({
      id: list.id,
      name: list.name,
      color: list.color,
      count: 0, // Will be calculated
      isShared: list.is_shared,
      folderId: list.folder_id ?? null,
    }));
    
    setTodos(appTodos);
    setLists(appLists);
    setListFolders(foldersResult);
    setIsInitialLoad(true);
  };

  // Stage 2: Secondary data (common tasks, daily tasks, goals) - loads in background
  const loadSecondaryData = async () => {
    setIsSecondaryDataLoading(true);
    
    try {
      const [commonTasksData, dailyTasksData, goalsData, notesData] = await Promise.allSettled([
        fetchCommonTasks(),
        fetchDailyTasks(),
        fetchGoals(),
        fetchNotes()
      ]);
      
      const commonTasksResult = commonTasksData.status === 'fulfilled' ? commonTasksData.value : [];
      const dailyTasksResult = dailyTasksData.status === 'fulfilled' ? dailyTasksData.value : [];
      const goalsResult = goalsData.status === 'fulfilled' ? goalsData.value : [];
      const notesResult = notesData.status === 'fulfilled' ? notesData.value : [];

      if (commonTasksData.status === 'rejected') {
        console.error('Error fetching common tasks:', commonTasksData.reason);
      }
      if (dailyTasksData.status === 'rejected') {
        console.error('Error fetching daily tasks:', dailyTasksData.reason);
      }
      if (goalsData.status === 'rejected') {
        console.error('Error fetching goals:', goalsData.reason);
      }
      if (notesData.status === 'rejected') {
        console.error('Error fetching notes:', notesData.reason);
      }

      // Convert common tasks from database format to display format
      const displayCommonTasks = commonTasksResult.map(dbCommonTaskToDisplayCommonTask);
      setCommonTasks(displayCommonTasks);
      // Convert daily tasks from database format to display format
      const displayDailyTasks = dailyTasksResult.map(dbDailyTaskToDisplayDailyTask);
      setDailyTasks(displayDailyTasks);
      // Convert goals from database format to display format
      const displayGoals = goalsResult.map(dbGoalToDisplayGoal);
      setGoals(displayGoals);
      setNotes(notesResult);

      // Generate tasks from daily tasks for today (if not already generated)
      if (displayDailyTasks.length > 0) {
        // generateTasksFromDailyTasks will fetch fresh todos itself, so we don't need to pass existingTodos
        await generateTasksFromDailyTasks(displayDailyTasks);
      }
    } catch (error) {
      console.error('Error loading secondary data:', error);
    } finally {
      setIsSecondaryDataLoading(false);
    }
  };

  // Stage 3: Milestones (on-demand) - loads only when Goals page is visited
  const loadMilestones = async () => {
    if (milestonesLoaded || goals.length === 0) return;
    
    try {
      const goalIds = goals.map(g => g.id);
      const allMilestones = await fetchAllMilestones(goalIds);
      setAllMilestonesWithGoals(allMilestones);
      setMilestonesLoaded(true);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  // Load goal milestones and tasks for status calculation
  useEffect(() => {
    const loadGoalData = async () => {
      if (goals.length === 0) return;
      
      const milestonesMap: Record<number, Milestone[]> = {};
      const tasksMap: Record<number, any[]> = {};

      for (const goal of goals) {
        try {
          // Fetch milestones for this goal
          const milestones = await fetchMilestones(goal.id);
          milestonesMap[goal.id] = milestones || [];

          // Fetch tasks linked to these milestones
          if (milestones && milestones.length > 0) {
            const milestoneIds = milestones.map(m => m.id);
            const { data: tasksData } = await supabase
              .from('todos')
              .select('id, text, completed, milestone_id, updated_at')
              .in('milestone_id', milestoneIds);
            
            tasksMap[goal.id] = tasksData || [];
          } else {
            tasksMap[goal.id] = [];
          }
        } catch (error) {
          console.error(`Error loading data for goal ${goal.id}:`, error);
          milestonesMap[goal.id] = [];
          tasksMap[goal.id] = [];
        }
      }

      setGoalMilestones(milestonesMap);
      setGoalTasks(tasksMap);
    };

    loadGoalData();
  }, [goals]);

  // Fetch milestone updates when milestones change
  useEffect(() => {
    const loadMilestoneUpdates = async () => {
      if (Object.keys(goalMilestones).length === 0) return;
      
      // Collect all milestone IDs
      const allMilestoneIds: number[] = [];
      Object.values(goalMilestones).forEach(milestones => {
        milestones.forEach(m => {
          allMilestoneIds.push(m.id);
        });
      });
      
      if (allMilestoneIds.length === 0) return;
      
      try {
        const updates = await fetchMilestoneUpdatesForMilestones(allMilestoneIds);
        setMilestoneUpdates(updates);
      } catch (error) {
        console.error('Error fetching milestone updates:', error);
      }
    };
    
    loadMilestoneUpdates();
  }, [goalMilestones]);

  // Sync goal statuses + explanations from DB on load (source of truth). Instant load from localStorage above.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchGoalStatuses()
      .then((info) => {
        if (cancelled) return;
        setAiGoalStatuses(info);
        try {
          localStorage.setItem('goal-statuses', JSON.stringify(info));
        } catch (e) {
          console.error('Error saving goal statuses to localStorage:', e);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Error fetching goal statuses from DB:', err);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Fetch AI-determined goal statuses (and persist to DB so they match across devices)
  useEffect(() => {
    const fetchAiGoalStatuses = async () => {
      if (goals.length === 0 || Object.keys(goalMilestones).length === 0) return;
      
      const allMilestones: Milestone[] = [];
      const allTasks: any[] = [];
      goals.forEach(goal => {
        const milestones = goalMilestones[goal.id] || [];
        const tasks = goalTasks[goal.id] || [];
        allMilestones.push(...milestones);
        allTasks.push(...tasks);
      });

      const goalsToAnalyze = goals.filter(goal => {
        if (goal.is_active === false) return false;
        if (goal.deadline_date) return true;
        const milestones = goalMilestones[goal.id] || [];
        return milestones.some(m => m.deadline_date);
      });
      if (goalsToAnalyze.length === 0) return;

      try {
        const response = await fetch('/api/goal-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goals: goalsToAnalyze,
            milestones: allMilestones,
            tasks: allTasks,
            milestoneUpdates: milestoneUpdates,
          }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (!data.success || !data.statuses) return;

        const statuses: Record<number, GoalStatus> = {};
        const explanations: Record<number, string> = {};
        Object.entries(data.statuses).forEach(([goalId, status]) => {
          const id = parseInt(goalId);
          statuses[id] = status as GoalStatus;
          const expl = data.explanations?.[goalId];
          if (typeof expl === 'string' && expl.trim()) explanations[id] = expl.trim();
        });
        const info: Record<number, GoalStatusInfo> = {};
        Object.entries(statuses).forEach(([goalId, status]) => {
          info[parseInt(goalId)] = { status, explanation: explanations[parseInt(goalId)] ?? null };
        });
        setAiGoalStatuses(prev => ({ ...prev, ...info }));
        try {
          await upsertGoalStatuses(statuses, explanations);
          try {
            const prev = JSON.parse(localStorage.getItem('goal-statuses') || '{}') as Record<number, GoalStatusInfo>;
            const merged = { ...prev, ...info };
            localStorage.setItem('goal-statuses', JSON.stringify(merged));
          } catch (_) {
            localStorage.setItem('goal-statuses', JSON.stringify(info));
          }
        } catch (e) {
          console.error('Error persisting goal statuses:', e);
        }
      } catch (error) {
        console.error('Error fetching AI goal statuses:', error);
      }
    };

    fetchAiGoalStatuses();
  }, [goals, goalMilestones, goalTasks, milestoneUpdates]);

  // Listen for milestone update changes
  useEffect(() => {
    const handleMilestoneUpdateChanged = () => {
      // Reload milestone updates and refresh AI statuses
      if (Object.keys(goalMilestones).length > 0) {
        const allMilestoneIds: number[] = [];
        Object.values(goalMilestones).forEach(milestones => {
          milestones.forEach(m => {
            allMilestoneIds.push(m.id);
          });
        });
        
        if (allMilestoneIds.length > 0) {
          fetchMilestoneUpdatesForMilestones(allMilestoneIds)
            .then(updates => {
              setMilestoneUpdates(updates);
              
              // Save to localStorage for instant loading on next page load
              try {
                localStorage.setItem('milestone-updates', JSON.stringify(updates));
              } catch (error) {
                console.error('Error saving milestone updates to localStorage:', error);
              }
              
              setTimeout(() => refreshAiGoalStatuses(), 500);
            })
            .catch(error => {
              console.error('Error fetching milestone updates:', error);
            });
        }
      }
    };

    window.addEventListener('milestoneUpdateChanged', handleMilestoneUpdateChanged);
    return () => {
      window.removeEventListener('milestoneUpdateChanged', handleMilestoneUpdateChanged);
    };
  }, [goalMilestones]);

  // Function to manually refresh AI goal statuses (called after changes)
  const refreshAiGoalStatuses = async () => {
    // Reload milestone updates first
    if (Object.keys(goalMilestones).length > 0) {
      const allMilestoneIds: number[] = [];
      Object.values(goalMilestones).forEach(milestones => {
        milestones.forEach(m => {
          allMilestoneIds.push(m.id);
        });
      });
      
      if (allMilestoneIds.length > 0) {
        try {
          const updates = await fetchMilestoneUpdatesForMilestones(allMilestoneIds);
          setMilestoneUpdates(updates);
          
          // Save to localStorage for instant loading on next page load
          try {
            localStorage.setItem('milestone-updates', JSON.stringify(updates));
          } catch (error) {
            console.error('Error saving milestone updates to localStorage:', error);
          }
        } catch (error) {
          console.error('Error fetching milestone updates:', error);
        }
      }
    }
    
    // Then trigger the useEffect to fetch statuses
    // We'll do this by temporarily updating a dependency or calling the fetch directly
    if (goals.length === 0 || Object.keys(goalMilestones).length === 0) return;
    
    // Collect all milestones and tasks
    const allMilestones: Milestone[] = [];
    const allTasks: any[] = [];
    
    goals.forEach(goal => {
      const milestones = goalMilestones[goal.id] || [];
      const tasks = goalTasks[goal.id] || [];
      allMilestones.push(...milestones);
      allTasks.push(...tasks);
    });

    // Filter to only active goals with deadlines or milestones
    const goalsToAnalyze = goals.filter(goal => {
      if (goal.is_active === false) return false;
      if (goal.deadline_date) return true;
      const milestones = goalMilestones[goal.id] || [];
      return milestones.some(m => m.deadline_date);
    });
    if (goalsToAnalyze.length === 0) return;

    try {
      // Get latest milestone updates
      const allMilestoneIds: number[] = [];
      Object.values(goalMilestones).forEach(milestones => {
        milestones.forEach(m => {
          allMilestoneIds.push(m.id);
        });
      });
      const latestUpdates = allMilestoneIds.length > 0 
        ? await fetchMilestoneUpdatesForMilestones(allMilestoneIds)
        : [];

      const response = await fetch('/api/goal-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goals: goalsToAnalyze,
          milestones: allMilestones,
          tasks: allTasks,
          milestoneUpdates: latestUpdates,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.statuses) {
        const statuses: Record<number, GoalStatus> = {};
        const explanations: Record<number, string> = {};
        Object.entries(data.statuses).forEach(([goalId, status]) => {
          const id = parseInt(goalId);
          statuses[id] = status as GoalStatus;
          const expl = data.explanations?.[goalId];
          if (typeof expl === 'string' && expl.trim()) explanations[id] = expl.trim();
        });
        const info: Record<number, GoalStatusInfo> = {};
        Object.entries(statuses).forEach(([goalId, status]) => {
          info[parseInt(goalId)] = { status, explanation: explanations[parseInt(goalId)] ?? null };
        });
        setAiGoalStatuses(prev => ({ ...prev, ...info }));
        try {
          await upsertGoalStatuses(statuses, explanations);
          try {
            const prev = JSON.parse(localStorage.getItem('goal-statuses') || '{}') as Record<number, GoalStatusInfo>;
            const merged = { ...prev, ...info };
            localStorage.setItem('goal-statuses', JSON.stringify(merged));
          } catch (_) {
            localStorage.setItem('goal-statuses', JSON.stringify(info));
          }
        } catch (e) {
          console.error('Error persisting goal statuses:', e);
        }
      }
    } catch (error) {
      console.error('Error refreshing AI goal statuses:', error);
    }
  };

  // Load data from Supabase on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }
    
    const initialize = async () => {
      try {
        setLoading(true);
        setConnectionError(null);
        
        // Validate Supabase configuration
        const configCheck = validateSupabaseConfig();
        if (!configCheck.valid) {
          setConnectionError(configCheck.error || 'Invalid Supabase configuration');
          setLoading(false);
          return;
        }
        
        // Stage 1: Load critical data
        await loadCriticalData();
        setLoading(false); // UI can render now
        
        // Stage 2: Load secondary data in background (don't block)
        loadSecondaryData().catch(err => {
          console.error('Error loading secondary data:', err);
        });
      } catch (error: any) {
        console.error('Error loading data:', error);
        
        if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
          setConnectionError('Invalid Supabase credentials. Please check your .env file.');
        } else if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setConnectionError('Connected to Supabase, but tables not found. Please run the SQL schema from supabase-schema.sql in your Supabase SQL Editor.');
        } else {
          setConnectionError(`Connection error: ${error.message || 'Failed to connect to Supabase'}`);
        }
        setLoading(false);
      }
    };

    initialize();
  }, [isAuthenticated]);

  // Load milestones when navigating to goals-related pages
  useEffect(() => {
    if (currentPage === 'goals' || currentPage === 'goalDetail' || currentPage === 'milestoneDetail') {
      if (goals.length > 0 && !milestonesLoaded && !isSecondaryDataLoading) {
        loadMilestones().catch(err => {
          console.error('Error loading milestones:', err);
        });
      }
    }
  }, [currentPage, goals.length, milestonesLoaded, isSecondaryDataLoading]);

  // Auto-sync function to refresh data from database (called automatically every minute)
  const autoSync = async () => {
    if (!isAuthenticated) return;
    
    try {
      // Validate Supabase configuration
      const configCheck = validateSupabaseConfig();
      if (!configCheck.valid) {
        // Don't set connection error on auto-sync failures to avoid disrupting user
        return;
      }
      
      // Stage 1: Load critical data first
      await loadCriticalData();
      
      // Stage 2: Load secondary data
      await loadSecondaryData();
      
      // Stage 3: Reload milestones if they were already loaded
      if (milestonesLoaded && goals.length > 0) {
        setMilestonesLoaded(false); // Reset to force reload
        await loadMilestones();
      }
    } catch (error: any) {
      // Silently log errors during auto-sync to avoid disrupting user
      console.error('Error during auto-sync:', error);
    }
  };

  // Check for unprocessed calendar events
  const checkCalendarEvents = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const connection = await getCalendarConnection();
      if (!connection) {
        setCalendarPendingEventsCount(0);
        return;
      }

      const [events, processedIds] = await Promise.all([
        fetchCalendarEvents(),
        getProcessedEventIds()
      ]);
      
      const unprocessedEvents = filterProcessedEvents(events, processedIds);
      setCalendarPendingEventsCount(unprocessedEvents.length);
    } catch (error) {
      // Silently handle errors (calendar might not be connected)
      console.error('Error checking calendar events:', error);
      setCalendarPendingEventsCount(0);
    }
  }, [isAuthenticated]);

  // Sync calendar events (fetch and check for unprocessed)
  const syncCalendar = useCallback(async () => {
    if (!isAuthenticated || isCalendarSyncing) return;
    
    try {
      setIsCalendarSyncing(true);
      await checkCalendarEvents();
      
      // Store last sync date in localStorage
      localStorage.setItem('calendar-last-sync', new Date().toISOString());
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setIsCalendarSyncing(false);
    }
  }, [isAuthenticated, isCalendarSyncing, checkCalendarEvents]);

  // Calendar sync is now only triggered by:
  // 1. Manual sync button click
  // 2. Server-side cron job (api/calendar/sync-cron.js)
  // No automatic client-side syncing
  
  // Check calendar event count on mount (to show banner if there are events, but don't sync)
  useEffect(() => {
    if (!isAuthenticated) return;
    checkCalendarEvents();
  }, [isAuthenticated, checkCalendarEvents]);

  // Check calendar connection when on Today page (to show "connect calendar" message if not connected)
  useEffect(() => {
    if (currentPage !== "today" || !isAuthenticated) {
      if (currentPage !== "today") setIsCalendarConnected(null);
      return;
    }
    let cancelled = false;
    getCalendarConnection()
      .then((connection) => {
        if (!cancelled) setIsCalendarConnected(!!connection);
      })
      .catch(() => {
        if (!cancelled) setIsCalendarConnected(false);
      });
    return () => { cancelled = true; };
  }, [currentPage, isAuthenticated]);

  // Start Google Calendar OAuth flow (same as Settings "Connect Google Calendar" button)
  const handleConnectCalendarFromBanner = async () => {
    try {
      const authUrl = await connectGoogleCalendar();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
    }
  };

  // Auto-sync every minute (initial load is handled by the initialize effect above)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Set up interval to sync every minute
    const intervalId = setInterval(() => {
      autoSync();
    }, 60000); // 60 seconds = 1 minute
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      completionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      completionTimeouts.current.clear();
    };
  }, []);

  // Initialize notification permission status
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:useEffect:notificationPermission',message:'Initializing notification permission check',data:{hasWindow:typeof window !== 'undefined',hasNotification:'Notification' in window,permission:typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
    // #endregion
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:useEffect:notificationPermission:set',message:'Notification permission set',data:{permission:Notification.permission},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
      // #endregion
    }
  }, []);

  // Handle enabling notifications
  const handleEnableNotifications = useCallback(async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleEnableNotifications:permissionGranted',message:'Permission granted, subscribing to push',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
        // #endregion
        const subscription = await subscribeToPushNotifications();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleEnableNotifications:subscriptionResult',message:'Push subscription result',data:{hasSubscription:!!subscription,subscriptionEndpoint:subscription?.endpoint?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
        // #endregion
        if (subscription) {
          console.log('📱 Push subscription created, sending to server...');
          const success = await sendSubscriptionToServer(subscription);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleEnableNotifications:subscriptionSaved',message:'Subscription save result',data:{success},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
          // #endregion
          if (success) {
            console.log('✅ Subscription saved to server successfully');
            alert('Notifications enabled! You will receive reminders for due todos.');
          } else {
            console.error('❌ Failed to save subscription to server');
            alert('Notifications enabled locally, but failed to save to server. Check console for details.');
          }
        } else {
          console.error('❌ Failed to create push subscription');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleEnableNotifications:subscriptionFailed',message:'Failed to create push subscription',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
          // #endregion
        }
      } else if (permission === 'denied') {
        alert('Notification permission was previously denied. Please enable notifications in your browser settings to receive reminders.');
      } else {
        // Permission is 'default' - user dismissed the prompt
        console.log('Notification permission prompt was dismissed');
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

  // Note: Deadline notifications are handled by the backend cron job (/api/reminders)
  // which runs every minute and sends push notifications via the service worker.
  // This ensures notifications work even when the app is closed.

  // Check for service worker updates
  const checkForUpdates = useCallback(async (showChecking = false) => {
    console.log('🔍 Checking for updates...', { showChecking });
    
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      if (showChecking) {
        alert('Service workers are not supported in this browser.');
      }
      return;
    }

    if (showChecking) {
      setIsCheckingUpdate(true);
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('No service worker registration found');
        if (showChecking) {
          setIsCheckingUpdate(false);
          alert('No service worker found. The app may not be installed as a PWA.');
        }
        return;
      }

      swRegistrationRef.current = registration;

      // Check for version mismatch
      const cachedVersion = localStorage.getItem('app_version');
      if (cachedVersion && cachedVersion !== APP_VERSION) {
        console.log(`✅ Update available: cached version ${cachedVersion}, current version ${APP_VERSION}`);
        setUpdateAvailable(true);
        if (showChecking) {
          setIsCheckingUpdate(false);
          alert('Update available! Click "Check for update" again to reload and apply the update.');
        }
        return;
      }

      console.log('Checking service worker for updates...');
      // Check for service worker update
      await registration.update();
      console.log('Service worker update check completed');

      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('🆕 New service worker found, waiting for it to install...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // New service worker is installed but waiting
            if (navigator.serviceWorker.controller) {
              // There's a new service worker available
              console.log('✅ New service worker installed and waiting');
              setUpdateAvailable(true);
              if (showChecking) {
                setIsCheckingUpdate(false);
                alert('Update available! Click "Check for update" again to reload and apply the update.');
              }
            }
          }
        });
      });

      // Listen for controller change (service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed, reloading...');
        // Update version in localStorage
        localStorage.setItem('app_version', APP_VERSION);
        setUpdateAvailable(false);
      });

      // If we're manually checking and no update was found, show feedback
      if (showChecking) {
        // Wait a moment to see if an update is found
        setTimeout(() => {
          setIsCheckingUpdate(false);
          // Check if update became available during the check
          const currentUpdateAvailable = localStorage.getItem('app_version') !== APP_VERSION;
          if (!currentUpdateAvailable) {
            console.log('✅ App is up to date');
            alert('You are using the latest version of the app.');
          }
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      if (showChecking) {
        setIsCheckingUpdate(false);
        alert('Error checking for updates: ' + (error as Error).message);
      }
    }
  }, []);

  // Manual check for update (from Settings page)
  const handleCheckForUpdate = useCallback(() => {
    checkForUpdates(true);
  }, [checkForUpdates]);

  // Check for updates on mount and periodically
  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Check every 5 minutes
    updateCheckIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    // Check when app becomes visible (iOS-specific)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Store current version
    const currentVersion = localStorage.getItem('app_version');
    if (!currentVersion || currentVersion !== APP_VERSION) {
      // Version changed, update available
      if (currentVersion) {
        setUpdateAvailable(true);
      }
      localStorage.setItem('app_version', APP_VERSION);
    }

    return () => {
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  // Handle reload to apply update
  const handleReload = useCallback(async () => {
    if (!swRegistrationRef.current) {
      window.location.reload();
      return;
    }

    try {
      // Send skipWaiting message to service worker
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        controller.postMessage({ type: 'SKIP_WAITING' });
      }

      // Force update
      await swRegistrationRef.current.update();

      // Wait a bit for service worker to activate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error reloading for update:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  }, []);

  const handleSelectList = (list: ListItem, filterDate?: Date) => {
    setSelectedList(list);
    setDateFilter(filterDate || null);
    setCurrentPage("listDetail");
  };

  const handleBackFromList = () => {
    setSelectedList(null);
    setDateFilter(null);
    setTimeRangeFilter(null);
    setCurrentPage("lists");
  };

  const getNextRecurringDate = (currentDate: Date, recurring: string): Date => {
    const nextDate = new Date(currentDate);
    
    // Check if recurring contains custom days (comma-separated)
    if (recurring && recurring.includes(',')) {
      const selectedDays = recurring.split(',').map(day => day.trim().toLowerCase());
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Find the day index for each selected day
      const selectedDayIndices = selectedDays.map(day => dayNames.indexOf(day)).filter(idx => idx !== -1);
      
      if (selectedDayIndices.length === 0) {
        // Fallback: if no valid days, just add 7 days
        nextDate.setDate(nextDate.getDate() + 7);
        return nextDate;
      }
      
      const currentDayIndex = currentDate.getDay();
      
      // Find the next selected day in the current week
      const nextDayInWeek = selectedDayIndices.find(dayIdx => dayIdx > currentDayIndex);
      
      if (nextDayInWeek !== undefined) {
        // Next occurrence is in the current week
        const daysToAdd = nextDayInWeek - currentDayIndex;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        // Next occurrence is in the next week (first selected day)
        const firstDayIndex = selectedDayIndices[0];
        const daysToAdd = 7 - currentDayIndex + firstDayIndex;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      
      return nextDate;
    }
    
    // Handle standard recurring patterns
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:toggleTodo:entry',message:'Toggle todo called',data:{taskId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:toggleTodo:notFound',message:'Todo not found',data:{taskId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:toggleTodo:found',message:'Todo found',data:{taskId:id,completed:todo.completed,hasRecurring:!!todo.deadline?.recurring},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Check if this is a today task being completed
    const isTodayTask = todo.deadline && 
      new Date(todo.deadline.date).toDateString() === new Date().toDateString();
    const isCompleting = !todo.completed;
    
    // Build update object
    const updateData: any = {
      text: todo.text,
      completed: !todo.completed,
      listId: !todo.completed ? COMPLETED_LIST_ID : (todo.listId !== undefined ? todo.listId : TODAY_LIST_ID),
      time: todo.time || null,
      group: todo.group || null,
    };
    if (todo.description !== undefined) {
      updateData.description = todo.description;
    }
    if (todo.deadline) {
      updateData.deadline = todo.deadline;
    }
    
    // Note: Task generation for recurring tasks is now handled by the daily cron job
    // We simply mark the task as completed/uncompleted without creating the next occurrence
    
    try {
      const updatedTodo = await updateTaskDb(id, updateData);
      const updatedAppTodo = dbTodoToDisplayTodo(updatedTodo);
      
      const updatedTodos = todos.map((t) => {
        if (t.id === id) {
          return updatedAppTodo;
        }
        return t;
      });
      
      setTodos(updatedTodos);
      
      // Refresh AI goal statuses if this task is associated with a milestone
      if (todo.milestoneId) {
        // Reload goal tasks to get updated task data
        const goalId = Object.keys(goalMilestones).find(gId => {
          const milestones = goalMilestones[parseInt(gId)] || [];
          return milestones.some(m => m.id === todo.milestoneId);
        });
        if (goalId) {
          const milestones = goalMilestones[parseInt(goalId)] || [];
          const milestoneTasks = updatedTodos.filter(t => 
            t.milestoneId && milestones.some(m => m.id === t.milestoneId)
          );
          setGoalTasks(prev => {
            const updated = {
              ...prev,
              [parseInt(goalId)]: milestoneTasks
            };
            
            // Save to localStorage for instant loading
            try {
              localStorage.setItem('goal-tasks', JSON.stringify(updated));
            } catch (error) {
              console.error('Error saving goal tasks to localStorage:', error);
            }
            
            return updated;
          });
          // Refresh AI statuses
          setTimeout(() => refreshAiGoalStatuses(), 500);
        }
      }
      
      // Note: Calendar sync is manual only - users must explicitly sync from the calendar sync page
      
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
  };

  const addNewTask = async (taskText: string, description?: string, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string }, type?: 'task' | 'reminder', imageUrl?: string | null) => {
    const newTodo: Todo = {
      id: Date.now(), // Temporary ID
      text: taskText,
      completed: false,
      time: deadline?.time,
      group: deadline ? undefined : "Group",
      listId: listId !== undefined ? listId : TODAY_LIST_ID,
      milestoneId: milestoneId,
      deadline: deadline,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      type: type || 'task',
    };
    
    try {
      console.log('Adding new task:', { taskText, description, listId, deadline });
      const createdTask = await createTask(newTodo);
      console.log('Task created successfully');
      // Reload all tasks to ensure consistency and immediate visibility
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
      return createdTask.id;
      // Note: Calendar sync is manual only - users must explicitly sync from the calendar sync page
      // Tasks are NOT automatically added to calendar when created
    } catch (error) {
      console.error('Error adding task:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addNewTaskToList = async (taskText: string, description: string | undefined, listId: number, type?: 'task' | 'reminder') => {
    const newTodo: Todo = {
      id: Date.now(), // Temporary ID
      text: taskText,
      completed: false,
      listId: listId,
      description: description ?? null,
      type: type || 'task',
    };
    
    try {
      console.log('Adding new task to list:', { taskText, description, listId });
      const createdTask = await createTask(newTodo);
      console.log('Task created successfully:', createdTask);
      const displayTodo = dbTodoToDisplayTodo(createdTask);
      console.log('Converted to display format:', displayTodo);
      // Reload all tasks to ensure consistency
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
    } catch (error) {
      console.error('Error adding task to list:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addNewTaskToMilestone = async (taskText: string, description: string | undefined, milestoneId: number, deadline?: { date: Date; time: string; recurring?: string }) => {
    const newTodo: Todo = {
      id: Date.now(), // Temporary ID
      text: taskText,
      completed: false,
      milestoneId: milestoneId,
      deadline: deadline,
      description: description ?? null,
    };
    
    try {
      console.log('Adding new task to milestone:', { taskText, description, milestoneId });
      const createdTask = await createTask(newTodo);
      console.log('Task created successfully:', createdTask);
      const displayTodo = dbTodoToDisplayTodo(createdTask);
      console.log('Converted to display format:', displayTodo);
      // Reload all tasks to ensure consistency
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
    } catch (error) {
      console.error('Error adding task to milestone:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addNewList = async (listName: string, isShared: boolean, color: string, folderId?: number | null) => {
    try {
      const createdList = await createList({ name: listName, color, isShared, folderId: folderId ?? undefined });
      const appList: ListItem = {
        id: createdList.id,
        name: createdList.name,
        color: createdList.color,
        count: 0,
        isShared: createdList.is_shared,
        folderId: createdList.folder_id ?? null,
      };
      setLists([...lists, appList]);
    } catch (error) {
      console.error('Error adding list:', error);
    }
  };

  const updateList = async (listId: number, listName: string, isShared: boolean, color: string, folderId?: number | null) => {
    try {
      const updatedList = await updateListDb(listId, { name: listName, color, isShared, folderId: folderId ?? undefined });
      setLists(lists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            name: updatedList.name,
            isShared: updatedList.is_shared,
            color: updatedList.color,
            folderId: updatedList.folder_id ?? null,
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

  const addNewFolder = async (folderName: string) => {
    try {
      const created = await createListFolder({ name: folderName });
      setListFolders([...listFolders, created]);
      return created.id;
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  const updateFolder = async (folderId: number, folderName: string) => {
    try {
      const updated = await updateListFolderDb(folderId, { name: folderName });
      setListFolders(listFolders.map(f => f.id === folderId ? updated : f));
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

  const deleteFolder = async (folderId: number) => {
    try {
      await deleteListFolderDb(folderId);
      setListFolders(listFolders.filter(f => f.id !== folderId));
      setLists(lists.map(list => list.folderId === folderId ? { ...list, folderId: null } : list));
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  // Common Tasks handlers
  const handleUpdateCommonTask = async (id: number, text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    try {
      const updatedTask = await updateCommonTask(id, { text, description, time, deadline: deadline || undefined });
      const displayTask = dbCommonTaskToDisplayCommonTask(updatedTask);
      const updatedCommonTasks = commonTasks.map(task => task.id === id ? displayTask : task);
      setCommonTasks(updatedCommonTasks);
      
      // Don't generate tasks on update - task generation happens on app load and when maintaining buffer
      // This prevents creating duplicate tasks when just updating the common task details
    } catch (error) {
      console.error('Error updating common task:', error);
      alert(`Failed to update common task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCommonTask = async (id: number) => {
    try {
      await deleteCommonTask(id);
      setCommonTasks(commonTasks.filter(task => task.id !== id));
      
      // Reload todos to reflect the deletion of related tasks
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
    } catch (error) {
      console.error('Error deleting common task:', error);
      alert(`Failed to delete common task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateCommonTask = async (text: string, description?: string | null, time?: string | null, deadline?: { date: Date; time: string; recurring?: string } | null) => {
    try {
      const createdTask = await createCommonTask({ text, description, time, deadline: deadline || undefined });
      const displayTask = dbCommonTaskToDisplayCommonTask(createdTask);
      const updatedCommonTasks = [...commonTasks, displayTask];
      setCommonTasks(updatedCommonTasks);
      
      // Task generation is now handled by the daily cron job at midnight
    } catch (error) {
      console.error('Error creating common task:', error);
      alert(`Failed to create common task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddCommonTaskToList = async (task: CommonTask, listId: number) => {
    try {
      // Create a new task from the common task template
      const newTodo: Todo = {
        id: Date.now(), // Temporary ID
        text: task.text,
        completed: false,
        listId: listId,
        description: task.description ?? null,
        time: task.time ?? undefined,
        deadline: task.deadline,
      };
      
      const createdTask = await createTask(newTodo);
      const displayTodo = dbTodoToDisplayTodo(createdTask);
      
      // Reload all tasks to ensure consistency
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
    } catch (error) {
      console.error('Error adding common task to list:', error);
      alert(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate tasks from daily tasks for today
  const generateTasksFromDailyTasks = async (dailyTasksToCheck: any[], existingTodos?: Todo[]) => {
    // Prevent concurrent execution
    if (isGeneratingDailyTasksRef.current) {
      return;
    }
    
    isGeneratingDailyTasksRef.current = true;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Always fetch fresh todos from database to avoid stale state
      const freshTodos = await fetchTasks();
      const todosToCheck = freshTodos.map(dbTodoToDisplayTodo);
      
      // Clean up old daily tasks from previous days (delete and replace behavior)
      // Find all daily tasks that are from previous days
      const oldDailyTasks = todosToCheck.filter(todo => {
        if (!todo.dailyTaskId) return false;
        if (!todo.deadline) return false;
        const deadlineDate = new Date(todo.deadline.date);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate.getTime() < today.getTime();
      });
      
      // Delete old daily tasks
      for (const oldTask of oldDailyTasks) {
        try {
          await deleteTaskDb(oldTask.id);
        } catch (error) {
          console.error(`Error deleting old daily task ${oldTask.id}:`, error);
        }
      }
      
      // Reload todos after cleanup to get fresh state
      const todosAfterCleanup = await fetchTasks();
      const todosToCheckAfterCleanup = todosAfterCleanup.map(dbTodoToDisplayTodo);
      
      let tasksCreated = 0;
      let tasksSkipped = 0;
      
      for (const dailyTask of dailyTasksToCheck) {
        // Use the assigned list, or default to Today (0) if no list is assigned
        const targetListId = dailyTask.listId !== undefined && dailyTask.listId !== null ? dailyTask.listId : 0;
        
        // Check if a task already exists for today from this daily task template
        // Include completed tasks in the check - if a task was already created for today (even if completed),
        // we shouldn't create a new one
        const existingTask = todosToCheckAfterCleanup.find(todo => {
          // Check if this task was created from the same daily task template
          if (todo.dailyTaskId === dailyTask.id) {
            // Check if it has today's date as deadline (for tasks with deadlines)
            if (todo.deadline) {
              const deadlineDate = new Date(todo.deadline.date);
              deadlineDate.setHours(0, 0, 0, 0);
              if (deadlineDate.getTime() === today.getTime()) {
                return true;
              }
            }
            // If no deadline but same dailyTaskId and in target list, it's a match
            if (todo.listId === targetListId) {
              return true;
            }
          }
          return false;
        });
        
        // Find all matching tasks to check for duplicates
        const matchingTasks = todosToCheckAfterCleanup.filter(todo => {
          if (todo.completed) return false;
          if (todo.dailyTaskId === dailyTask.id) {
            if (todo.deadline) {
              const deadlineDate = new Date(todo.deadline.date);
              deadlineDate.setHours(0, 0, 0, 0);
              return deadlineDate.getTime() === today.getTime();
            }
            return todo.listId === targetListId;
          }
          return false;
        });
        
        // Clean up duplicates: if there are multiple tasks for today, keep only the first one
        if (matchingTasks.length > 1) {
          // Keep the first task (oldest), delete the rest
          const tasksToDelete = matchingTasks.slice(1);
          for (const duplicateTask of tasksToDelete) {
            try {
              await deleteTaskDb(duplicateTask.id);
            } catch (error) {
              console.error(`Error deleting duplicate task ${duplicateTask.id}:`, error);
            }
          }
        }
        
        // If no task exists for today, create one
        if (!existingTask) {
          const newTodo: Todo = {
            id: Date.now(), // Temporary ID
            text: dailyTask.text,
            completed: false,
            listId: targetListId,
            description: dailyTask.description ?? null,
            time: dailyTask.time ?? undefined,
            dailyTaskId: dailyTask.id, // Link to the daily task template
            deadline: {
              date: new Date(today),
              time: dailyTask.time || '',
              recurring: 'daily',
            },
          };
          
          try {
            await createTask(newTodo);
            tasksCreated++;
          } catch (error) {
            console.error(`Error creating task from daily task ${dailyTask.id}:`, error);
          }
        } else {
          tasksSkipped++;
        }
      }
      
      // Reload tasks after generation
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
    } catch (error) {
      console.error('Error generating tasks from daily tasks:', error);
    } finally {
      isGeneratingDailyTasksRef.current = false;
    }
  };

  // Daily Tasks handlers
  const handleUpdateDailyTask = async (id: number, text: string, description?: string | null, time?: string | null, listId?: number | null) => {
    try {
      const updatedTask = await updateDailyTask(id, { text, description, time, listId });
      const displayTask = dbDailyTaskToDisplayDailyTask(updatedTask);
      const updatedDailyTasks = dailyTasks.map(task => task.id === id ? displayTask : task);
      setDailyTasks(updatedDailyTasks);
    } catch (error) {
      console.error('Error updating daily task:', error);
      alert(`Failed to update daily task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteDailyTask = async (id: number) => {
    try {
      await deleteDailyTask(id);
      setDailyTasks(dailyTasks.filter(task => task.id !== id));
    } catch (error) {
      console.error('Error deleting daily task:', error);
      alert(`Failed to delete daily task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateDailyTask = async (text: string, description?: string | null, time?: string | null, listId?: number | null) => {
    try {
      const createdTask = await createDailyTask({ text, description, time, listId });
      const displayTask = dbDailyTaskToDisplayDailyTask(createdTask);
      const updatedDailyTasks = [...dailyTasks, displayTask];
      setDailyTasks(updatedDailyTasks);
      
      // Task generation is now handled by the daily cron job at midnight
    } catch (error) {
      console.error('Error creating daily task:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create daily task: ${errorMessage}`);
    }
  };

  // Notes handlers
  const handleAddNote = async (content: string, taskId?: number | null) => {
    const created = await createNote({ content, taskId });
    setNotes((prev) => [created, ...prev]);
  };

  const handleUpdateNote = async (id: number, content: string, taskId?: number | null) => {
    try {
      const updated = await updateNote(id, { content, taskId });
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (error) {
      console.error('Error updating note:', error);
      alert(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Reset common tasks: remove all related tasks and regenerate them
  const resetCommonTasks = async (commonTasksToReset: any[]) => {
    try {
      // Get all common tasks with deadlines
      const commonTasksWithDeadlines = commonTasksToReset.filter(ct => ct.deadline);
      
      if (commonTasksWithDeadlines.length === 0) {
        console.log('No common tasks with deadlines to reset');
        return;
      }

      // Fetch all current tasks
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);

      // Find and delete all tasks that match common tasks
      const tasksToDelete: number[] = [];
      
      for (const commonTask of commonTasksWithDeadlines) {
        if (!commonTask.deadline) continue;

        // Find all tasks that match this common task
        // Match by text and recurring pattern (if recurring)
        const matchingTasks = displayTasks.filter(todo => {
          if (todo.text !== commonTask.text) return false;
          
          // If common task has recurring, task must have the same recurring pattern
          if (commonTask.deadline.recurring) {
            return todo.deadline?.recurring === commonTask.deadline.recurring;
          } else {
            // For non-recurring, just match by text (and it should have a deadline)
            return todo.deadline !== undefined;
          }
        });

        // Collect task IDs to delete
        matchingTasks.forEach(task => {
          tasksToDelete.push(task.id);
        });
      }

      // Delete all matching tasks
      for (const taskId of tasksToDelete) {
        try {
          await deleteTaskDb(taskId);
        } catch (error) {
          console.error(`Error deleting task ${taskId}:`, error);
        }
      }

      // Reload tasks after deletion
      const remainingTasks = await fetchTasks();
      const remainingDisplayTasks = remainingTasks.map(dbTodoToDisplayTodo);
      setTodos(remainingDisplayTasks);

      // Task generation is now handled by the daily cron job at midnight

      console.log(`Reset common tasks: deleted ${tasksToDelete.length} tasks and regenerated`);
    } catch (error) {
      console.error('Error resetting common tasks:', error);
      alert(`Failed to reset common tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate tasks from common tasks based on deadlines
  const generateTasksFromCommonTasks = async (commonTasksToCheck: CommonTask[], existingTodos?: Todo[]) => {
    try {
      const commonTasksWithDeadlines = commonTasksToCheck.filter(ct => ct.deadline);
      
      if (commonTasksWithDeadlines.length === 0) return; // No common tasks with deadlines
      
      // Use provided existingTodos if available, otherwise fetch fresh from database
      let displayExistingTasks: Todo[];
      if (existingTodos !== undefined) {
        // Use the provided todos list (e.g., from toggleTodo with updatedTodos)
        displayExistingTasks = existingTodos;
      } else {
        // Fetch fresh tasks from database to prevent duplicates from stale state
        const allExistingTasks = await fetchTasks();
        displayExistingTasks = allExistingTasks.map(dbTodoToDisplayTodo);
      }
      
      let tasksGenerated = false;
      
      for (const commonTask of commonTasksWithDeadlines) {
        if (!commonTask.deadline) continue;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let datesToGenerate: Date[] = [];
        
        if (commonTask.deadline.recurring) {
          // For recurring tasks, generate tasks for the next few occurrences
          const recurring = commonTask.deadline.recurring;
          
          // Check if this is custom days (comma-separated)
          if (recurring.includes(',')) {
            // Handle custom weekly days
            const selectedDays = recurring.split(',').map(day => day.trim().toLowerCase());
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayIndices = selectedDays.map(day => dayNames.indexOf(day)).filter(idx => idx !== -1);
            
            if (selectedDayIndices.length > 0) {
              // Generate tasks for each selected day within the next 30 days
              const maxDate = new Date(today);
              maxDate.setDate(maxDate.getDate() + 30);
              
              let checkDate = new Date(today);
              while (checkDate <= maxDate) {
                const dayIndex = checkDate.getDay();
                if (selectedDayIndices.includes(dayIndex)) {
                  datesToGenerate.push(new Date(checkDate));
                }
                checkDate.setDate(checkDate.getDate() + 1);
              }
              
              // Limit to first 12 occurrences to avoid too many tasks
              datesToGenerate = datesToGenerate.slice(0, 12);
            }
          } else {
            // Handle standard recurring patterns
            let currentDate = new Date(commonTask.deadline.date);
            currentDate.setHours(0, 0, 0, 0);
            
            // If the initial date is in the past, calculate the next occurrence
            while (currentDate < today) {
              currentDate = getNextRecurringDate(currentDate, recurring);
            }
            
            // Generate tasks for the next 4 occurrences (or until we're 30 days out)
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 30);
            
            let checkDate = new Date(currentDate);
            let count = 0;
            while (checkDate <= maxDate && count < 4) {
              datesToGenerate.push(new Date(checkDate));
              checkDate = getNextRecurringDate(checkDate, recurring);
              count++;
            }
          }
        } else {
          // For one-time deadlines, only generate if deadline is today or in the future
          const deadlineDate = new Date(commonTask.deadline.date);
          deadlineDate.setHours(0, 0, 0, 0);
          
          if (deadlineDate >= today) {
            datesToGenerate.push(deadlineDate);
          }
        }
        
        // Check if tasks already exist for these dates and generate missing ones
        for (const targetDate of datesToGenerate) {
          // Check if a task with the same text and deadline date already exists (check against fresh DB data)
          const existingTask = displayExistingTasks.find(todo => {
            if (todo.text !== commonTask.text) return false;
            if (!todo.deadline) return false;
            const todoDate = new Date(todo.deadline.date);
            todoDate.setHours(0, 0, 0, 0);
            const targetDateNormalized = new Date(targetDate);
            targetDateNormalized.setHours(0, 0, 0, 0);
            return todoDate.getTime() === targetDateNormalized.getTime();
          });
          
          if (!existingTask) {
            // Generate the task
            const newTodo: Todo = {
              id: Date.now() + Math.random(), // Temporary ID
              text: commonTask.text,
              completed: false,
              listId: TODAY_LIST_ID, // Default to today list
              description: commonTask.description ?? null,
              time: commonTask.time ?? undefined,
              deadline: {
                date: targetDate,
                time: commonTask.deadline.time,
                recurring: commonTask.deadline.recurring,
              },
            };
            
            try {
              await createTask(newTodo);
              tasksGenerated = true;
              // Immediately add to tracking list to prevent duplicates in this run
              const targetDateNormalized = new Date(targetDate);
              targetDateNormalized.setHours(0, 0, 0, 0);
              displayExistingTasks.push({
                ...newTodo,
                deadline: {
                  date: targetDate,
                  time: commonTask.deadline.time,
                  recurring: commonTask.deadline.recurring,
                }
              });
            } catch (error) {
              console.error(`Error generating task from common task ${commonTask.id}:`, error);
              // Continue with other tasks even if one fails
            }
          }
        }
      }
      
      // Reload tasks after generation if any were created
      if (tasksGenerated) {
        const allTasks = await fetchTasks();
        const displayTasks = allTasks.map(dbTodoToDisplayTodo);
        setTodos(displayTasks);
      }
    } catch (error) {
      console.error('Error generating tasks from common tasks:', error);
    }
  };

  // Goals handlers
  const handleUpdateGoal = async (id: number, text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => {
    try {
      const updatedGoal = await updateGoal(id, { text, description, is_active, deadline_date });
      const displayGoal = dbGoalToDisplayGoal(updatedGoal);
      setGoals(goals.map(goal => goal.id === id ? displayGoal : goal));
      // Update selectedGoal if it's the one being updated
      if (selectedGoal && selectedGoal.id === id) {
        setSelectedGoal(displayGoal);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      alert(`Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      await deleteGoal(id);
      setGoals(goals.filter(goal => goal.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert(`Failed to delete goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateGoal = async (text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => {
    try {
      const createdGoal = await createGoal({ text, description, is_active, deadline_date });
      const displayGoal = dbGoalToDisplayGoal(createdGoal);
      setGoals([...goals, displayGoal]);
    } catch (error) {
      console.error('Error creating goal:', error);
      alert(`Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Subtask handlers
  const handleFetchSubtasks = async (parentTaskId: number): Promise<Todo[]> => {
    const subtasks = await fetchSubtasks(parentTaskId);
    return subtasks.map(dbTodoToDisplayTodo);
  };

  const handleCreateSubtask = async (parentTaskId: number, text: string): Promise<Todo> => {
    const newSubtask: Todo = {
      id: Date.now(),
      text,
      completed: false,
      listId: undefined, // Subtasks don't belong to lists
      parentTaskId: parentTaskId,
    };
    const created = await createTask(newSubtask);
    return dbTodoToDisplayTodo(created);
  };

  const handleUpdateSubtask = async (subtaskId: number, text: string, completed: boolean): Promise<void> => {
    const subtask = todos.find(t => t.id === subtaskId);
    if (!subtask) return;
    await updateTaskDb(subtaskId, {
      ...subtask,
      text,
      completed,
    });
    // Refresh tasks
    const allTasks = await fetchTasks();
    const displayTasks = allTasks.map(dbTodoToDisplayTodo);
    setTodos(displayTasks);
  };

  const handleToggleSubtask = async (subtaskId: number): Promise<void> => {
    const subtask = todos.find(t => t.id === subtaskId);
    if (!subtask) return;
    await updateTaskDb(subtaskId, {
      ...subtask,
      completed: !subtask.completed,
    });
    // Refresh tasks
    const allTasks = await fetchTasks();
    const displayTasks = allTasks.map(dbTodoToDisplayTodo);
    setTodos(displayTasks);
  };

  const handleDeleteSubtask = async (subtaskId: number): Promise<void> => {
    await deleteTaskDb(subtaskId);
    // Refresh tasks
    const allTasks = await fetchTasks();
    const displayTasks = allTasks.map(dbTodoToDisplayTodo);
    setTodos(displayTasks);
  };

  const updateTask = async (taskId: number, text: string, description?: string | null, listId?: number, milestoneId?: number, deadline?: { date: Date; time: string; recurring?: string } | null, type?: 'task' | 'reminder', imageUrl?: string | null, dailyTaskId?: number | null) => {
    try {
      const todo = todos.find(t => t.id === taskId);
      if (!todo) return;
      
      // Build update data with only the fields that should be updated
      // Don't include id, created_at, updated_at, or other database-only fields
      const updateData: any = {
        text,
        completed: todo.completed,
        listId: listId !== undefined ? listId : todo.listId,
        milestoneId: milestoneId !== undefined ? milestoneId : todo.milestoneId,
        time: deadline?.time || todo.time || null,
        group: deadline ? undefined : (todo.group || null),
      };
      
      // Always include type - use the passed type if provided, otherwise use existing type, default to 'task'
      if (type !== undefined) {
        updateData.type = type;
      } else if (todo.type !== undefined && todo.type !== null) {
        updateData.type = todo.type;
      } else {
        updateData.type = 'task';
      }

      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (imageUrl !== undefined) {
        updateData.imageUrl = imageUrl;
      }
      
      if (dailyTaskId !== undefined) {
        updateData.dailyTaskId = dailyTaskId;
      }
      
      if (deadline !== undefined) {
        updateData.deadline = deadline ?? null;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:updateTask:beforeDbUpdate',message:'Before database update',data:{taskId,updateData,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      await updateTaskDb(taskId, updateData);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:updateTask:afterDbUpdate',message:'Database update successful',data:{taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // Reload all tasks to ensure consistency
      const allTasks = await fetchTasks();
      const displayTasks = allTasks.map(dbTodoToDisplayTodo);
      setTodos(displayTasks);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:updateTask:stateUpdated',message:'State updated successfully',data:{taskId,tasksCount:displayTasks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // Note: Calendar sync is manual only - users must explicitly sync from the calendar sync page
      // Tasks are NOT automatically synced when deadlines are updated
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:updateTask:error',message:'Error updating task',data:{taskId,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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

  const convertTaskToDaily = async (taskId: number) => {
    const todo = todos.find(t => t.id === taskId);
    if (!todo) return;
    const dailyTask = await createDailyTask({
      text: todo.text,
      description: todo.description ?? null,
      listId: todo.listId ?? null,
    });
    await updateTask(taskId, todo.text, todo.description, todo.listId, todo.milestoneId, todo.deadline ?? undefined, todo.type, todo.imageUrl ?? undefined, dailyTask.id);
    setDailyTasks(prev => [dbDailyTaskToDisplayDailyTask(dailyTask), ...prev]);
  };

  const convertTaskToCommon = async (taskId: number) => {
    const todo = todos.find(t => t.id === taskId);
    if (!todo) return;
    await createCommonTask({
      text: todo.text,
      description: todo.description ?? null,
      deadline: todo.deadline ?? undefined,
    });
    const commonTasksResult = await fetchCommonTasks();
    setCommonTasks(commonTasksResult);
  };

  const handleUpdateDeadline = async (taskId: number, deadline: { date: Date; time: string; recurring?: string }) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:entry',message:'Handle update deadline called',data:{taskId,deadlineDate:deadline.date.toISOString(),deadlineTime:deadline.time},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const todo = todos.find(t => t.id === taskId);
    if (!todo) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:notFound',message:'Todo not found',data:{taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:beforeUpdate',message:'Calling updateTask',data:{taskId,todoText:todo.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      await updateTask(taskId, todo.text, todo.description, todo.listId, todo.milestoneId, deadline, todo.type);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:afterUpdate',message:'UpdateTask completed successfully',data:{taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      setIsDeadlineModalOpen(false);
      setTaskForDeadlineUpdate(null);
      // ReviewMissedDeadlinesModal remains open - the list will update automatically since missedDeadlines is computed from todos state
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:modalClosed',message:'Modal state updated',data:{taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleUpdateDeadline:error',message:'Error updating deadline',data:{taskId,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Error updating deadline:', error);
    }
  };

  const handleNewDeadlineClick = (task: Todo) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleNewDeadlineClick:entry',message:'Handle new deadline click called',data:{taskId:task.id,taskText:task.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    setTaskForDeadlineUpdate(task);
    // Keep the ReviewMissedDeadlinesModal open - don't close it
    setIsDeadlineModalOpen(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:handleNewDeadlineClick:stateSet',message:'State set for deadline modal',data:{taskId:task.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  };

  const handleTaskClick = (task: Todo) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const getTasksForMilestone = (milestoneId: number) => {
    // Filter out completed tasks - they should only show in the completed list
    // Exclude subtasks from milestone views
    return todos.filter(todo => todo.milestoneId === milestoneId && !todo.completed && !todo.parentTaskId);
  };

  const getTasksForList = (listId: number) => {
    if (listId === ALL_TASKS_LIST_ID) {
      // Return all non-completed tasks (regardless of listId, deadline, or any other property)
      // This includes tasks with no deadline, tasks in custom lists, and tasks in Today
      // Only exclude tasks that are explicitly in the completed list
      // Exclude subtasks (tasks with parentTaskId)
      const allTasks = todos.filter(todo => {
        const isNotCompleted = !todo.completed;
        const isNotInCompletedList = todo.listId !== COMPLETED_LIST_ID;
        const isNotSubtask = !todo.parentTaskId; // Exclude subtasks
        return isNotCompleted && isNotInCompletedList && isNotSubtask;
      });
      
      // Debug logging to help diagnose issues
      if (allTasks.length === 0 && todos.length > 0) {
        console.warn('All tasks is empty but todos exist:', {
          totalTodos: todos.length,
          completedTodos: todos.filter(t => t.completed).length,
          todosInCompletedList: todos.filter(t => t.listId === COMPLETED_LIST_ID).length,
          todosWithoutDeadline: todos.filter(t => !t.deadline).map(t => ({
            id: t.id,
            text: t.text.substring(0, 30),
            completed: t.completed,
            listId: t.listId
          }))
        });
      }
      
      // Sort tasks by date using the same logic as Month view (soonest first)
      const sortedTasks = [...allTasks].sort((a, b) => {
        // If either task doesn't have a deadline, put it at the end
        if (!a.deadline && !b.deadline) return 0; // Both without deadlines: maintain order
        if (!a.deadline) return 1; // a without deadline goes after b
        if (!b.deadline) return -1; // b without deadline goes after a
        
        // Both have deadlines - use same sorting logic as Month view
        // Compare dates first
        const dateA = a.deadline.date.getTime();
        const dateB = b.deadline.date.getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB; // Soonest date first
        }
        
        // If same date, compare times
        const timeA = a.deadline.time || "";
        const timeB = b.deadline.time || "";
        
        if (timeA && timeB) {
          // Parse time strings (HH:MM format)
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          const totalMinutesA = hoursA * 60 + minutesA;
          const totalMinutesB = hoursB * 60 + minutesB;
          return totalMinutesA - totalMinutesB; // Earliest time first
        }
        
        // If one has time and other doesn't, prioritize the one with time
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;
        
        return 0;
      });
      
      return sortedTasks;
    } else if (listId === COMPLETED_LIST_ID) {
      let completedTasks = todos.filter(todo => todo.listId === COMPLETED_LIST_ID && !todo.parentTaskId);
      
      // If timeRangeFilter is set, filter by time range
      if (timeRangeFilter) {
        const today = new Date();
        const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        completedTasks = completedTasks.filter(todo => {
          if (!todo.updatedAt) return false;
          const updatedDate = new Date(todo.updatedAt);
          const updatedDateNormalized = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
          
          switch (timeRangeFilter) {
            case "today":
              return (
                updatedDateNormalized.getFullYear() === todayNormalized.getFullYear() &&
                updatedDateNormalized.getMonth() === todayNormalized.getMonth() &&
                updatedDateNormalized.getDate() === todayNormalized.getDate()
              );
            case "week":
              // Check if completed within this week (from Monday to Sunday)
              const dayOfWeek = todayNormalized.getDay();
              // Calculate days to subtract to get to Monday (or Sunday if today is Sunday)
              const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
              const weekStart = new Date(todayNormalized);
              weekStart.setDate(todayNormalized.getDate() + daysToMonday);
              weekStart.setHours(0, 0, 0, 0);
              
              // Calculate days to add to get to Sunday
              const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
              const weekEnd = new Date(todayNormalized);
              weekEnd.setDate(todayNormalized.getDate() + daysUntilSunday);
              weekEnd.setHours(23, 59, 59, 999);
              return updatedDateNormalized >= weekStart && updatedDateNormalized <= weekEnd;
            case "month":
              // Check if completed within this month (from 1st to last day of month)
              const monthStart = new Date(todayNormalized.getFullYear(), todayNormalized.getMonth(), 1);
              monthStart.setHours(0, 0, 0, 0);
              const monthEnd = new Date(todayNormalized.getFullYear(), todayNormalized.getMonth() + 1, 0);
              monthEnd.setHours(23, 59, 59, 999);
              return updatedDateNormalized >= monthStart && updatedDateNormalized <= monthEnd;
            default:
              return true;
          }
        });
      } else if (dateFilter) {
        // If dateFilter is set, filter by completion date (specific date)
        completedTasks = completedTasks.filter(todo => {
          if (!todo.updatedAt) return false;
          const updatedDate = new Date(todo.updatedAt);
          return (
            updatedDate.getFullYear() === dateFilter.getFullYear() &&
            updatedDate.getMonth() === dateFilter.getMonth() &&
            updatedDate.getDate() === dateFilter.getDate()
          );
        });
      }
      
      return completedTasks;
    }
    // Exclude subtasks from list views
    return todos.filter(todo => todo.listId === listId && !todo.parentTaskId);
  };

  // Helper function to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to check if a date is tomorrow
  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  // Helper function to check if a date is within this week (from today until Sunday)
  const isThisWeek = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the next Sunday (or today if it's already Sunday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(23, 59, 59, 999); // End of Sunday
    
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    return taskDate >= today && taskDate <= nextSunday;
  };

  // Helper function to check if a date is within this month
  const isThisMonth = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the last day of the current month
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    return taskDate >= today && taskDate <= lastDayOfMonth;
  };

  // Filter tasks based on selected time range and list filter
  const getFilteredTasks = () => {
    const filtered = todos.filter(todo => {
      // Exclude subtasks from main views
      if (todo.parentTaskId) return false;
      
      if (!todo.deadline) return false;
      
      const taskDate = todo.deadline.date;
      let matchesRange = false;
      
      switch (selectedTimeRange) {
        case "today":
          matchesRange = isToday(taskDate);
          break;
        case "tomorrow":
          matchesRange = isTomorrow(taskDate);
          break;
        case "week":
          matchesRange = isThisWeek(taskDate);
          break;
        case "month":
          matchesRange = isThisMonth(taskDate);
          break;
        case "allTime":
          matchesRange = true; // Show all tasks with deadlines
          break;
      }
      
      if (!matchesRange) return false;
      
      // Apply list filter if any lists are selected
      if (selectedListFilterIds.size > 0) {
        const taskListId = todo.listId ?? 0; // Default to 0 (Today) if listId is undefined
        if (!selectedListFilterIds.has(taskListId)) {
          return false;
        }
      }
      
      // Show task if:
      // 1. It's not completed, OR
      // 2. It was recently completed (within 1 second)
      return !todo.completed || recentlyCompleted.has(todo.id);
    });
    
    // Sort by deadline for "This week", "This month", and "All time" views (soonest first)
    if (selectedTimeRange === "week" || selectedTimeRange === "month" || selectedTimeRange === "allTime") {
      return filtered.sort((a, b) => {
        // If either task doesn't have a deadline, put it at the end
        if (!a.deadline && !b.deadline) return 0; // Both without deadlines: maintain order
        if (!a.deadline) return 1; // a without deadline goes after b
        if (!b.deadline) return -1; // b without deadline goes after a
        
        // Both have deadlines - use same sorting logic as All tasks list
        // Compare dates first
        const dateA = a.deadline.date.getTime();
        const dateB = b.deadline.date.getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB; // Soonest date first
        }
        
        // If same date, compare times
        const timeA = a.deadline.time || "";
        const timeB = b.deadline.time || "";
        
        if (timeA && timeB) {
          // Parse time strings (HH:MM format)
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          const totalMinutesA = hoursA * 60 + minutesA;
          const totalMinutesB = hoursB * 60 + minutesB;
          return totalMinutesA - totalMinutesB; // Earliest time first
        }
        
        // If one has time and other doesn't, prioritize the one with time
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;
        
        return 0;
      });
    }
    
    return filtered;
  };

  const todayTasks = getFilteredTasks();
  
  // Filter reminders from regular tasks
  const reminders = todayTasks.filter(todo => todo.type === 'reminder');
  // Filter daily tasks (only tasks created from daily task templates) - exclude completed ones
  const dailyTaskItems = todayTasks.filter(todo => {
    const hasDailyTaskId = todo.dailyTaskId !== undefined && todo.dailyTaskId !== null;
    const isNotCompleted = !todo.completed;
    return hasDailyTaskId && isNotCompleted;
  });
  
  // Create a set of daily task texts for efficient lookup
  const dailyTaskTexts = new Set(dailyTaskItems.map(todo => todo.text.trim().toLowerCase()));

  // Helper function to get goal status (AI-determined with algorithmic fallback)
  const getGoalStatus = (goal: Goal): 'On track' | 'At risk' | 'Failing' | null => {
    const info = aiGoalStatuses[goal.id];
    if (info?.status) return info.status;

    // Fallback to algorithmic calculation if AI status not available
    const milestones = goalMilestones[goal.id] || [];
    const tasks = goalTasks[goal.id] || [];
    
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    
    // Get goal deadline or next incomplete milestone deadline
    let nextDueDate: string | null = null;
    if (goal.deadline_date) {
      nextDueDate = goal.deadline_date;
    } else {
      // Fallback to next incomplete milestone deadline
      const incompleteMilestones = milestones.filter(m => !m.completed && m.deadline_date);
      if (incompleteMilestones.length > 0) {
        const sorted = incompleteMilestones
          .map(m => ({ date: new Date(m.deadline_date!), milestone: m }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        nextDueDate = sorted[0].milestone.deadline_date!;
      }
    }

    // Determine status algorithmically (fallback)
    if (!nextDueDate) return null;
    
    const daysUntilDeadline = Math.ceil((new Date(nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
    
    if (daysUntilDeadline < 0 || (daysUntilDeadline < 7 && completionRate < 0.5)) {
      return 'Failing';
    } else if (daysUntilDeadline < 14 || completionRate < 0.6) {
      return 'At risk';
    }
    
    return 'On track';
  };

  // Get status color
  const getStatusColor = (status: string | null): string => {
    if (!status) return '#5b5d62';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('on track')) return '#00C853';
    if (statusLower.includes('at risk')) return '#FFB300';
    if (statusLower.includes('failing')) return '#F44336';
    return '#5b5d62';
  };

  // Filter goals that are at risk or failing
  const atRiskOrFailingGoals = goals.filter(goal => {
    if (goal.is_active === false) return false;
    const status = getGoalStatus(goal);
    return status === 'At risk' || status === 'Failing';
  });

  // All active goals (for NOTICE BOARD display)
  const activeGoals = goals.filter(goal => goal.is_active !== false);
  
  const regularTasks = todayTasks.filter(todo => {
    const isNotReminder = todo.type !== 'reminder';
    const isNotDaily = todo.dailyTaskId === undefined || todo.dailyTaskId === null;
    // Also exclude tasks that have the same text as a daily task (to handle duplicates)
    const isNotDuplicateDailyText = !dailyTaskTexts.has(todo.text.trim().toLowerCase());
    return isNotReminder && isNotDaily && isNotDuplicateDailyText;
  });
  
  // Calculate missed deadlines (tasks with deadlines that have passed and are not completed)
  // Use currentTime state to trigger re-renders when time passes
  const missedDeadlines = todos.filter(todo => {
    // Exclude subtasks
    if (todo.parentTaskId) return false;
    // Exclude daily tasks - they should be deleted and replaced, not shown as overdue
    if (todo.dailyTaskId !== undefined && todo.dailyTaskId !== null) return false;
    // Exclude reminders - they should not show as overdue
    if (todo.type === 'reminder') return false;
    if (!todo.deadline || todo.completed) return false;
    
    const now = currentTime; // Use state instead of new Date() to trigger re-renders
    const deadlineDate = todo.deadline.date;
    
    // If there's a time, create a full datetime for comparison
    if (todo.deadline.time && todo.deadline.time.trim() !== "") {
      const [hours, minutes] = todo.deadline.time.split(':').map(Number);
      const deadlineDateTime = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate(),
        hours,
        minutes,
        0,
        0
      );
      return deadlineDateTime < now;
    }
    
    // If no time, compare just the date (end of day)
    const endOfDeadlineDay = new Date(
      deadlineDate.getFullYear(),
      deadlineDate.getMonth(),
      deadlineDate.getDate(),
      23,
      59,
      59,
      999
    );
    return endOfDeadlineDay < now;
  });

  // Calculate tasks completed for the selected time range
  const getCompletedTasksForTimeRange = () => {
    if (selectedTimeRange === "tomorrow") {
      return []; // Don't show completed tasks for tomorrow
    }

    return todos.filter(todo => {
      // Check if task is completed (either by completed flag or by being in completed list)
      const isCompleted = todo.completed || todo.listId === COMPLETED_LIST_ID;
      if (!isCompleted) return false;
      
      // If no updatedAt, skip (we need a date to filter by time range)
      if (!todo.updatedAt || todo.updatedAt.trim() === "") return false;
      
      const updatedDate = new Date(todo.updatedAt);
      // Check if date is valid
      if (isNaN(updatedDate.getTime())) return false;
      
      const today = new Date();
      
      // Normalize dates to start of day for comparison
      const updatedDateNormalized = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
      const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (selectedTimeRange) {
        case "today":
          // Check if updated date is today (same year, month, and day)
          return (
            updatedDateNormalized.getFullYear() === todayNormalized.getFullYear() &&
            updatedDateNormalized.getMonth() === todayNormalized.getMonth() &&
            updatedDateNormalized.getDate() === todayNormalized.getDate()
          );
        case "week":
          // Check if completed within this week (from Monday to Sunday)
          const dayOfWeek = todayNormalized.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          // Calculate days to subtract to get to Monday (or Sunday if today is Sunday)
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise go to Monday
          const weekStart = new Date(todayNormalized);
          weekStart.setDate(todayNormalized.getDate() + daysToMonday);
          weekStart.setHours(0, 0, 0, 0);
          
          // Calculate days to add to get to Sunday
          const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          const weekEnd = new Date(todayNormalized);
          weekEnd.setDate(todayNormalized.getDate() + daysUntilSunday);
          weekEnd.setHours(23, 59, 59, 999); // End of Sunday
          
          return updatedDateNormalized >= weekStart && updatedDateNormalized <= weekEnd;
        case "month":
          // Check if completed within this month (from 1st to last day of month)
          const monthStart = new Date(todayNormalized.getFullYear(), todayNormalized.getMonth(), 1);
          monthStart.setHours(0, 0, 0, 0);
          const monthEnd = new Date(todayNormalized.getFullYear(), todayNormalized.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          
          return updatedDateNormalized >= monthStart && updatedDateNormalized <= monthEnd;
        case "allTime":
          // Show all completed tasks (no date filtering)
          return true;
        default:
          return false;
      }
    });
  };

  const tasksCompletedForTimeRange = getCompletedTasksForTimeRange();
  
  // Determine if we should show completed tasks box (for today, week, month, allTime tabs)
  const shouldShowCompletedBox = (selectedTimeRange === "today" || selectedTimeRange === "week" || selectedTimeRange === "month" || selectedTimeRange === "allTime") && tasksCompletedForTimeRange.length > 0;

  const getListById = (listId?: number) => {
    if (listId === undefined || listId === TODAY_LIST_ID || listId === COMPLETED_LIST_ID) {
      return null;
    }
    return lists.find(l => l.id === listId);
  };

  const getSubtaskCount = (taskId: number): number => {
    return todos.filter(todo => todo.parentTaskId === taskId).length;
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Format date as "MONDAY 24TH JANUARY" (all caps)
  const formatDateHeading = (date: Date): string => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    
    // Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinalSuffix = (n: number): string => {
      if (n > 3 && n < 21) return 'TH';
      switch (n % 10) {
        case 1: return 'ST';
        case 2: return 'ND';
        case 3: return 'RD';
        default: return 'TH';
      }
    };
    
    return `${dayName} ${day}${getOrdinalSuffix(day)} ${monthName}`;
  };

  // Group tasks by date for week, month, and allTime tabs
  const groupTasksByDate = (tasks: Todo[]): Array<{ date: Date; dateKey: string; tasks: Todo[] }> => {
    const grouped = new Map<string, { date: Date; tasks: Todo[] }>();
    
    tasks.forEach(task => {
      if (!task.deadline) return;
      
      const taskDate = task.deadline.date;
      // Create a key based on year, month, and day (ignore time)
      const dateKey = `${taskDate.getFullYear()}-${taskDate.getMonth()}-${taskDate.getDate()}`;
      
      if (!grouped.has(dateKey)) {
        // Create a new date object with time set to midnight for consistent grouping
        const dateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        grouped.set(dateKey, { date: dateOnly, tasks: [] });
      }
      
      grouped.get(dateKey)!.tasks.push(task);
    });
    
    // Convert to array and sort by date
    return Array.from(grouped.entries())
      .map(([dateKey, { date, tasks }]) => ({ date, dateKey, tasks }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
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

  // Show reset password page if on reset password route (even if not authenticated)
  if (currentPage === "resetPassword") {
    return (
      <ResetPassword 
        onPasswordReset={() => {
          setCurrentPage("today");
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          // User should now be authenticated, so reload
          window.location.reload();
        }}
        onCancel={() => {
          setCurrentPage("today");
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  // Show sign-in screen if not authenticated
  if (isCheckingAuth || !isAuthenticated) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  if (loading) {
    return (
      <div className="bg-background box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-0 relative size-full min-h-screen">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="bg-background box-border content-stretch flex flex-col items-center justify-center pb-0 pt-[60px] px-0 relative size-full min-h-screen">
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
            className="w-full bg-blue-500 text-primary-foreground py-2 px-4 rounded hover:bg-blue-600 transition-opacity"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background box-border content-stretch flex flex-col items-center justify-start pt-[60px] pb-[100px] px-0 relative w-full min-h-screen overflow-x-hidden" style={{ minHeight: '100vh', height: 'auto' }}>
      {/* Main Content Container - 700px max-width on desktop, centered */}
      <div className="w-full desktop-container">
        {currentPage === "today" ? (
          <TasksPage
            formattedDate={getFormattedDate()}
            onOpenFilter={() => setIsFilterListsModalOpen(true)}
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={setSelectedTimeRange}
            tasksCompletedCount={tasksCompletedForTimeRange.length}
            missedDeadlinesCount={missedDeadlines.length}
            onDoneCardClick={() => {
              if (tasksCompletedForTimeRange.length > 0) {
                const completedList = {
                  id: COMPLETED_LIST_ID,
                  name: 'Completed list',
                  color: '#00C853',
                  count: tasksCompletedForTimeRange.length,
                  isShared: false,
                };
                const newTimeRangeFilter = selectedTimeRange === 'today' ? 'today' : selectedTimeRange === 'week' ? 'week' : selectedTimeRange === 'month' ? 'month' : null;
                setTimeRangeFilter(newTimeRangeFilter);
                setDateFilter(null);
                handleSelectList(completedList, null);
              }
            }}
            onOverdueCardClick={() => {
              if (missedDeadlines.length > 0) {
                setIsReviewMissedDeadlinesOpen(true);
              }
            }}
            selectedListFilterIds={selectedListFilterIds}
            lists={lists}
            onRemoveListFilter={(listId) => {
              const next = new Set(selectedListFilterIds);
              next.delete(listId);
              setSelectedListFilterIds(next);
            }}
            reminders={reminders}
            dailyTaskItems={dailyTaskItems}
            activeGoals={activeGoals}
            isScheduledExpanded={isScheduledExpanded}
            onToggleScheduled={() => setIsScheduledExpanded(!isScheduledExpanded)}
            getGoalStatus={getGoalStatus}
            onGoalClick={(goal) => { setSelectedGoal(goal); setCurrentPage('goalDetail'); }}
            onNavigateToGoals={() => setCurrentPage('goals')}
            regularTasks={regularTasks}
            recentlyCompleted={recentlyCompleted}
            groupTasksByDate={groupTasksByDate}
            formatDateHeading={formatDateHeading}
            showNoticeBoard={selectedTimeRange === 'today' || selectedTimeRange === 'tomorrow'}
            onTaskClick={handleTaskClick}
            onToggleTask={toggleTodo}
            getListById={getListById}
            getSubtaskCount={getSubtaskCount}
            getNoteCount={(id) => notes.filter((n) => n.task_id === id).length}
            linkifyText={linkifyText}
            isCalendarConnected={isCalendarConnected}
            onConnectCalendar={handleConnectCalendarFromBanner}
            calendarPendingEventsCount={calendarPendingEventsCount}
            onCalendarSyncClick={() => setCurrentPage('calendarSync')}
            notificationPermission={notificationPermission}
            onEnableNotifications={handleEnableNotifications}
            onOpenSearch={() => setCurrentPage('search')}
          />
            ) : currentPage === "search" ? (
        <SearchPage
          todos={todos}
          notes={notes}
          lists={lists}
          getListById={getListById}
          onTaskClick={handleTaskClick}
          onBack={() => setCurrentPage("today")}
          onNavigateToNotes={() => {
            setNotesPreselectedTaskId(null);
            setCurrentPage("notes");
          }}
          onNoteClick={(note) => {
            const fullNote = notes.find((n) => n.id === note.id);
            if (fullNote) {
              setSelectedNote(fullNote);
              setNoteDetailReturnPage("search");
              setCurrentPage("noteDetail");
            } else {
              setNotesPreselectedTaskId(null);
              setCurrentPage("notes");
            }
          }}
        />
            ) : currentPage === "lists" ? (
        <Lists 
          onSelectList={handleSelectList}
          todos={todos}
          lists={lists}
          folders={listFolders}
          onAddList={addNewList}
          onUpdateList={updateList}
          onDeleteList={deleteList}
          onAddFolder={addNewFolder}
          onUpdateFolder={updateFolder}
          onDeleteFolder={deleteFolder}
          onBack={() => setCurrentPage("today")}
        />
      ) : currentPage === "dashboard" ? (
        <Dashboard 
          onAddTask={addNewTask}
          onNavigateToCalendarSync={() => setCurrentPage("calendarSync")}
          onNavigateToCommonTasks={() => setCurrentPage("commonTasks")}
          onNavigateToDailyTasks={() => setCurrentPage("dailyTasks")}
          onNavigateToGoals={() => setCurrentPage("goals")}
          onNavigateToNotes={(taskId) => {
            setNotesPreselectedTaskId(taskId ?? null);
            setCurrentPage("notes");
          }}
        />
      ) : currentPage === "calendarSync" ? (
        <CalendarSync 
          onBack={() => setCurrentPage("dashboard")}
          onAddTask={addNewTask}
          lists={lists}
          onSync={syncCalendar}
          isSyncing={isCalendarSyncing}
          onEventProcessed={checkCalendarEvents}
          onNavigateToDailyTasks={() => setCurrentPage("dailyTasks")}
          onNavigateToCommonTasks={() => setCurrentPage("commonTasks")}
          autoLoadOnMount={calendarPendingEventsCount > 0}
        />
      ) : currentPage === "commonTasks" ? (
        isSecondaryDataLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#e1e6ee]">Loading common tasks...</div>
          </div>
        ) : (
          <CommonTasks 
            onBack={() => setCurrentPage("dashboard")}
            commonTasks={commonTasks}
            onUpdateCommonTask={handleUpdateCommonTask}
            onCreateCommonTask={handleCreateCommonTask}
            onDeleteCommonTask={handleDeleteCommonTask}
            onAddTaskToList={handleAddCommonTaskToList}
            onSelectCommonTask={(task) => {
              setSelectedCommonTask(task);
              setCurrentPage("commonTaskDetail");
            }}
            lists={lists}
          />
        )
      ) : currentPage === "commonTaskDetail" && selectedCommonTask ? (
        <CommonTaskDetail
          commonTask={selectedCommonTask}
          onBack={() => {
            setCurrentPage("commonTasks");
            setSelectedCommonTask(null);
          }}
          tasks={todos}
          onToggleTask={toggleTodo}
          onTaskClick={(task) => {
            setSelectedTask(task);
            setIsTaskDetailOpen(true);
          }}
          onUpdateCommonTask={async (id, text, description, time, deadline) => {
            await handleUpdateCommonTask(id, text, description, time, deadline);
            // Update selectedCommonTask if it's the one being updated
            if (selectedCommonTask && selectedCommonTask.id === id) {
              const updatedTask = {
                ...selectedCommonTask,
                text,
                description,
                time,
                deadline: deadline || undefined,
              };
              setSelectedCommonTask(updatedTask);
            }
          }}
          onDeleteCommonTask={handleDeleteCommonTask}
          onAddTaskToList={handleAddCommonTaskToList}
          lists={lists}
        />
      ) : currentPage === "dailyTasks" ? (
        isSecondaryDataLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#e1e6ee]">Loading daily tasks...</div>
          </div>
        ) : (
          <DailyTasks 
            onBack={() => setCurrentPage("dashboard")}
            dailyTasks={dailyTasks}
            onUpdateDailyTask={handleUpdateDailyTask}
            onCreateDailyTask={handleCreateDailyTask}
            onDeleteDailyTask={handleDeleteDailyTask}
            lists={lists}
          />
        )
      ) : currentPage === "workshop" ? (
        <Workshop 
          onBack={() => setCurrentPage("dashboard")} 
          tasks={todos}
        />
      ) : currentPage === "noteDetail" && selectedNote ? (
        <NoteDetail
          note={notes.find((n) => n.id === selectedNote.id) ?? selectedNote}
          todos={todos.map((t) => ({ id: t.id, text: t.text, completed: t.completed }))}
          onBack={() => {
            setCurrentPage(noteDetailReturnPage ?? "notes");
            setSelectedNote(null);
            setNoteDetailReturnPage(null);
          }}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      ) : currentPage === "notes" ? (
        isSecondaryDataLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#e1e6ee]">Loading notes...</div>
          </div>
        ) : (
          <Notes
            onBack={() => {
              setCurrentPage("dashboard");
              setNotesPreselectedTaskId(null);
            }}
            notes={notes}
            todos={todos.map((t) => ({ id: t.id, text: t.text, completed: t.completed }))}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            preselectedTaskId={notesPreselectedTaskId}
            onNoteClick={(note) => {
              setSelectedNote(note);
              setNoteDetailReturnPage("notes");
              setCurrentPage("noteDetail");
            }}
          />
        )
      ) : currentPage === "goals" ? (
        isSecondaryDataLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#e1e6ee]">Loading goals...</div>
          </div>
        ) : (
          <Goals 
            onBack={() => setCurrentPage("dashboard")}
            goals={goals}
            onUpdateGoal={handleUpdateGoal}
            onCreateGoal={handleCreateGoal}
            onDeleteGoal={handleDeleteGoal}
            onSelectGoal={(goal) => {
              setSelectedGoal(goal);
              setCurrentPage("goalDetail");
            }}
            aiGoalStatuses={aiGoalStatuses}
            onRefreshGoalStatuses={refreshAiGoalStatuses}
          />
        )
      ) : currentPage === "goalDetail" && selectedGoal ? (
        <GoalDetail
          goal={selectedGoal}
          milestones={goalMilestones[selectedGoal.id]}
          tasks={goalTasks[selectedGoal.id]}
          milestoneUpdates={(() => {
            const ms = goalMilestones[selectedGoal.id] || [];
            const ids = new Set(ms.map((m) => m.id));
            return (milestoneUpdates || []).filter((u) => ids.has(u.milestone_id));
          })()}
          goalStatus={aiGoalStatuses[selectedGoal.id]?.status ?? null}
          goalExplanation={aiGoalStatuses[selectedGoal.id]?.explanation ?? null}
          onBack={() => {
            setCurrentPage("goals");
            setSelectedGoal(null);
          }}
          onUpdateGoal={async (id, text, description, is_active, deadline_date) => {
            await handleUpdateGoal(id, text, description, is_active, deadline_date);
            // Update the selected goal in state
            setSelectedGoal({ ...selectedGoal, text, description, is_active, deadline_date });
          }}
          onDeleteGoal={handleDeleteGoal}
          onFetchMilestones={async (goalId) => {
            return await fetchMilestones(goalId);
          }}
          onCreateMilestone={async (goalId, name, description, deadline) => {
            const created = await createMilestone({ goal_id: goalId, name, description, deadline: deadline || undefined });
            // Refresh milestones and AI statuses
            const goalMilestones = await fetchMilestones(goalId);
            setGoalMilestones(prev => {
              const updated = {
                ...prev,
                [goalId]: goalMilestones
              };
              // Save to localStorage
              try {
                localStorage.setItem('goal-milestones', JSON.stringify(updated));
              } catch (error) {
                console.error('Error saving goal milestones to localStorage:', error);
              }
              return updated;
            });
            setTimeout(() => refreshAiGoalStatuses(), 500);
            return created;
          }}
          onUpdateMilestone={async (id, name, description, deadline, achieved) => {
            const updated = await updateMilestone(id, { name, description, deadline: deadline || undefined, achieved });
            // Refresh milestones and AI statuses
            if (selectedGoal) {
              const goalMilestones = await fetchMilestones(selectedGoal.id);
              setGoalMilestones(prev => {
                const updated = {
                  ...prev,
                  [selectedGoal.id]: goalMilestones
                };
                // Save to localStorage
                try {
                  localStorage.setItem('goal-milestones', JSON.stringify(updated));
                } catch (error) {
                  console.error('Error saving goal milestones to localStorage:', error);
                }
                return updated;
              });
              setTimeout(() => refreshAiGoalStatuses(), 500);
            }
            return updated;
          }}
          onDeleteMilestone={async (id) => {
            await deleteMilestone(id);
            // Refresh milestones and AI statuses
            if (selectedGoal) {
              const goalMilestones = await fetchMilestones(selectedGoal.id);
              setGoalMilestones(prev => ({
                ...prev,
                [selectedGoal.id]: goalMilestones
              }));
              setTimeout(() => refreshAiGoalStatuses(), 500);
            }
          }}
          onSelectMilestone={(milestone) => {
            setSelectedMilestone(milestone);
            setCurrentPage("milestoneDetail");
          }}
        />
      ) : currentPage === "milestoneDetail" && selectedMilestone ? (
        <MilestoneDetail
          milestone={selectedMilestone}
          goal={selectedGoal!}
          onBack={() => {
            setCurrentPage("goalDetail");
            setSelectedMilestone(null);
          }}
          tasks={getTasksForMilestone(selectedMilestone.id)}
          onToggleTask={toggleTodo}
          onAddTask={(taskText, description, deadline) => addNewTaskToMilestone(taskText, description, selectedMilestone.id, deadline)}
          onTaskClick={handleTaskClick}
          onUpdateMilestone={async (id, name, description, deadline, achieved) => {
            const updated = await updateMilestone(id, { name, description, deadline: deadline || undefined, achieved });
            setSelectedMilestone(updated);
            // Refresh milestones with goals
            if (selectedGoal) {
              const goalMilestones = await fetchMilestones(selectedGoal.id);
              const allMilestones: Array<{ id: number; name: string; goalId: number; goalName: string }> = [];
              for (const goal of goals) {
                const ms = await fetchMilestones(goal.id);
                for (const m of ms) {
                  allMilestones.push({
                    id: m.id,
                    name: m.name,
                    goalId: goal.id,
                    goalName: goal.text
                  });
                }
              }
              setAllMilestonesWithGoals(allMilestones);
              
              // Also update goalMilestones state and save to localStorage
              setGoalMilestones(prev => {
                const updatedMilestones = {
                  ...prev,
                  [selectedGoal.id]: goalMilestones
                };
                // Save to localStorage
                try {
                  localStorage.setItem('goal-milestones', JSON.stringify(updatedMilestones));
                } catch (error) {
                  console.error('Error saving goal milestones to localStorage:', error);
                }
                return updatedMilestones;
              });
              
              // Refresh AI goal statuses after milestone changed
              setTimeout(() => refreshAiGoalStatuses(), 500);
            }
          }}
          onToggleAchieved={async (id, achieved) => {
            if (selectedMilestone && selectedMilestone.id === id) {
              const updated = await updateMilestone(id, { 
                name: selectedMilestone.name,
                description: selectedMilestone.description,
                deadline: selectedMilestone.deadline_date ? { 
                  date: new Date(selectedMilestone.deadline_date), 
                  time: '', 
                  recurring: undefined 
                } : null, 
                achieved 
              });
              setSelectedMilestone(updated);
              // Refresh milestones for the goal
              if (selectedGoal) {
                const goalMilestones = await fetchMilestones(selectedGoal.id);
                // Also refresh all milestones with goals
                const allMilestones: Array<{ id: number; name: string; goalId: number; goalName: string }> = [];
                for (const goal of goals) {
                  const ms = await fetchMilestones(goal.id);
                  for (const m of ms) {
                    allMilestones.push({
                      id: m.id,
                      name: m.name,
                      goalId: goal.id,
                      goalName: goal.text
                    });
                  }
                }
                setAllMilestonesWithGoals(allMilestones);
                setGoalMilestones(prev => {
                  const updated = {
                    ...prev,
                    [selectedGoal.id]: goalMilestones
                  };
                  // Save to localStorage
                  try {
                    localStorage.setItem('goal-milestones', JSON.stringify(updated));
                  } catch (error) {
                    console.error('Error saving goal milestones to localStorage:', error);
                  }
                  return updated;
                });
                
                // Refresh AI goal statuses after milestone achievement status changed
                setTimeout(() => refreshAiGoalStatuses(), 500);
              }
            }
          }}
          onDeleteMilestone={async (id) => {
            await deleteMilestone(id);
            // Refresh milestones and AI statuses
            if (selectedGoal) {
              const goalMilestones = await fetchMilestones(selectedGoal.id);
              setGoalMilestones(prev => {
                const updated = {
                  ...prev,
                  [selectedGoal.id]: goalMilestones
                };
                // Save to localStorage
                try {
                  localStorage.setItem('goal-milestones', JSON.stringify(updated));
                } catch (error) {
                  console.error('Error saving goal milestones to localStorage:', error);
                }
                return updated;
              });
              setTimeout(() => refreshAiGoalStatuses(), 500);
            }
            setCurrentPage("goalDetail");
            setSelectedMilestone(null);
          }}
          onFetchMilestones={async (goalId) => {
            return await fetchMilestones(goalId);
          }}
          onNavigateToDailyTasks={() => {
            setSelectedMilestone(null);
            setCurrentPage("dailyTasks");
          }}
          onNavigateToCommonTasks={() => {
            setSelectedMilestone(null);
            setCurrentPage("commonTasks");
          }}
        />
      ) : currentPage === "resetPassword" ? (
        <ResetPassword 
          onPasswordReset={() => {
            setCurrentPage("today");
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          }}
          onCancel={() => {
            setCurrentPage("today");
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          }}
        />
      ) : currentPage === "listDetail" && selectedList ? (
        (() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TodoApp.tsx:ListDetail:render',message:'Rendering ListDetail with timeRangeFilter',data:{listId:selectedList.id,listName:selectedList.name,timeRangeFilter,dateFilter:dateFilter?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return (
            <ListDetail 
              listId={selectedList.id}
              listName={selectedList.name}
              listColor={selectedList.color}
              isShared={selectedList.isShared}
              listFolderId={selectedList.folderId}
              onBack={selectedList.id === COMPLETED_LIST_ID && (timeRangeFilter !== undefined) ? () => {
                // If this is the completed list opened from today/week/month/allTime tab, go back to today page
                setSelectedList(null);
                setDateFilter(null);
                setTimeRangeFilter(null);
                setCurrentPage("today");
              } : handleBackFromList}
              tasks={getTasksForList(selectedList.id)}
              onToggleTask={toggleTodo}
              onAddTask={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : (taskText, description, type) => addNewTaskToList(taskText, description, selectedList.id, type)}
              onUpdateList={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : updateList}
              onDeleteList={selectedList.id === ALL_TASKS_LIST_ID ? () => {} : deleteList}
              onTaskClick={handleTaskClick}
              lists={lists}
              folders={listFolders}
              onAddFolder={addNewFolder}
              onUpdateFolder={updateFolder}
              onDeleteFolder={deleteFolder}
              onNavigateToDailyTasks={() => { setSelectedList(null); setCurrentPage("dailyTasks"); }}
              onNavigateToCommonTasks={() => { setSelectedList(null); setCurrentPage("commonTasks"); }}
              milestones={allMilestonesWithGoals}
              dateFilter={dateFilter}
              timeRangeFilter={timeRangeFilter}
              onClearDateFilter={() => {
                setDateFilter(null);
                setTimeRangeFilter(null);
              }}
              getNoteCount={(id) => notes.filter((n) => n.task_id === id).length}
            />
          );
        })()
      ) : currentPage === "settings" ? (
        <Settings
          onBack={() => setCurrentPage("today")}
          updateAvailable={updateAvailable}
          onCheckForUpdate={handleCheckForUpdate}
          onReload={handleReload}
          isChecking={isCheckingUpdate}
          onEnableNotifications={handleEnableNotifications}
          notificationPermission={notificationPermission}
          onTestNotification={handleTestNotification}
          onCreateOverdueTask={async () => {
            // Create a test task with a deadline from yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const overdueTask = {
              text: "Test overdue task",
              description: "This is a test task with an overdue deadline",
              completed: false,
              listId: TODAY_LIST_ID,
              deadline: {
                date: yesterday,
                time: "09:00", // 9 AM yesterday
                recurring: undefined
              }
            };
            try {
              const createdTask = await createTask(overdueTask);
              const appTodo = dbTodoToDisplayTodo(createdTask);
              setTodos(prevTodos => [...prevTodos, appTodo]);
              alert("Overdue test task created! Go to Today page to see it.");
            } catch (error) {
              console.error('Error creating overdue task:', error);
              alert("Failed to create overdue task. Check console for details.");
            }
          }}
        />
      ) : null}
      </div>

      {/* Bottom Navigation */}
      {currentPage !== "workshop" && (
      <nav className="flex gap-10 items-center justify-center py-5 pb-[60px] fixed bottom-0 left-0 right-0 w-full bg-card border-t border-border z-[1000]" aria-label="Main navigation">
        
        {/* Calendar Icon */}
        <button
          type="button"
          className="relative shrink-0 size-8 cursor-pointer p-0 border-none bg-transparent rounded hover:opacity-80 transition-opacity"
          onClick={() => {
            setCurrentPage("today");
            setSelectedList(null);
          }}
          aria-label="Tasks"
        >
          <svg
            className={`block size-full ${currentPage === "today" ? "stroke-foreground" : "stroke-muted-foreground"}`}
            fill="none"
            viewBox="0 0 32 32"
          >
            <path
              d={svgPaths.p1378b200}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>

        {/* Dashboard Icon */}
        <button
          type="button"
          className="relative shrink-0 size-8 cursor-pointer p-0 border-none bg-transparent rounded hover:opacity-80 transition-opacity"
          onClick={() => {
            setCurrentPage("dashboard");
            setSelectedList(null);
          }}
          aria-label="Dashboard"
        >
          <svg
            className={`block size-full ${currentPage === "dashboard" ? "stroke-foreground" : "stroke-muted-foreground"}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>

        {/* Plus Icon */}
        <button
          type="button"
          className="relative shrink-0 size-8 cursor-pointer p-0 border-none bg-transparent rounded hover:opacity-80 transition-opacity"
          onClick={() => setIsModalOpen(true)}
          aria-label="Add task"
        >
          <svg
            className="block size-full stroke-muted-foreground"
            fill="none"
            viewBox="0 0 32 32"
          >
            <path
              d="M16 6V26M26 16H6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>

        {/* List Icon */}
        <button
          type="button"
          className="relative shrink-0 size-8 cursor-pointer p-0 border-none bg-transparent rounded hover:opacity-80 transition-opacity"
          onClick={() => {
            setCurrentPage("lists");
            setSelectedList(null);
          }}
          aria-label="Lists"
        >
          <svg
            className={`block size-full ${currentPage === "lists" || currentPage === "listDetail" ? "stroke-foreground" : "stroke-muted-foreground"}`}
            fill="none"
            viewBox="0 0 32 32"
          >
            <path
              d={svgPaths.p8560f0}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>

        {/* Settings Icon */}
        <button
          type="button"
          className="relative shrink-0 size-8 cursor-pointer p-0 border-none bg-transparent rounded hover:opacity-80 transition-opacity"
          onClick={() => {
            setCurrentPage("settings");
            setSelectedList(null);
          }}
          aria-label="Settings"
        >
          <svg
            className={`block size-full ${currentPage === "settings" ? "stroke-foreground" : "stroke-muted-foreground"}`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </nav>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTask={addNewTask}
        onUpdateTask={async (id, task, description, listId, milestoneId, deadline, type) => {
          await updateTask(id, task, description ?? null, listId, milestoneId, deadline ?? null, type);
        }}
        onDeleteTask={deleteTask}
        lists={lists}
        milestones={allMilestonesWithGoals}
        defaultListId={currentPage === "listDetail" && selectedList && selectedList.id !== ALL_TASKS_LIST_ID ? selectedList.id : undefined}
        onNavigateToDailyTasks={() => {
          setIsModalOpen(false);
          setCurrentPage("dailyTasks");
        }}
        onNavigateToCommonTasks={() => {
          setIsModalOpen(false);
          setCurrentPage("commonTasks");
        }}
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
          milestones={allMilestonesWithGoals}
          onFetchSubtasks={handleFetchSubtasks}
          onCreateSubtask={handleCreateSubtask}
          onUpdateSubtask={handleUpdateSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onToggleSubtask={handleToggleSubtask}
          notesForTask={selectedTask ? notes.filter((n) => n.task_id === selectedTask.id) : []}
          onAddNote={(taskId, content) => handleAddNote(content, taskId)}
          onUpdateNote={(id, content) => handleUpdateNote(id, content, selectedTask?.id)}
          onDeleteNote={handleDeleteNote}
          onNavigateToDailyTasks={() => {
            setIsTaskDetailOpen(false);
            setSelectedTask(null);
            setCurrentPage("dailyTasks");
          }}
          onNavigateToCommonTasks={() => {
            setIsTaskDetailOpen(false);
            setSelectedTask(null);
            setCurrentPage("commonTasks");
          }}
          onConvertToDailyTask={convertTaskToDaily}
          onConvertToCommonTask={convertTaskToCommon}
        />
      )}

      {/* Review Missed Deadlines Modal */}
      <ReviewMissedDeadlinesModal
        isOpen={isReviewMissedDeadlinesOpen}
        onClose={() => setIsReviewMissedDeadlinesOpen(false)}
        missedDeadlines={missedDeadlines}
        lists={lists}
        onToggleTask={toggleTodo}
        onUpdateDeadline={handleUpdateDeadline}
        onDeleteTask={deleteTask}
        onTaskClick={(task) => {
          setSelectedTask(task);
          setIsReviewMissedDeadlinesOpen(false);
          setIsTaskDetailOpen(true);
        }}
        onNewDeadlineClick={handleNewDeadlineClick}
      />

      {/* Filter Lists Modal */}
      <FilterListsModal
        isOpen={isFilterListsModalOpen}
        onClose={() => setIsFilterListsModalOpen(false)}
        lists={lists}
        folders={listFolders}
        selectedListIds={selectedListFilterIds}
        onApplyFilter={(selectedIds) => {
          setSelectedListFilterIds(selectedIds);
        }}
        includeToday={true}
      />

      {/* Filter Lists Modal (duplicate for layout) */}
      <FilterListsModal
        isOpen={isFilterListsModalOpen}
        onClose={() => setIsFilterListsModalOpen(false)}
        lists={lists}
        folders={listFolders}
        selectedListIds={selectedListFilterIds}
        onApplyFilter={(selectedIds) => {
          setSelectedListFilterIds(selectedIds);
        }}
        includeToday={true}
      />

      {/* Deadline Modal for updating missed deadlines */}
      {taskForDeadlineUpdate && (
        <DeadlineModal
          isOpen={isDeadlineModalOpen}
          onClose={() => {
            setIsDeadlineModalOpen(false);
            setTaskForDeadlineUpdate(null);
          }}
          onSetDeadline={(date, time, recurring) => {
            handleUpdateDeadline(taskForDeadlineUpdate.id, { date, time, recurring });
          }}
          currentDeadline={taskForDeadlineUpdate.deadline || undefined}
        />
      )}
    </div>
  );
}
