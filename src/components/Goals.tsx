import { useState, useEffect } from "react";
import { GoalDetailModal } from "./GoalDetailModal";
import { supabase } from "../lib/supabase";
import { fetchMilestones, Milestone, fetchMilestoneUpdatesForMilestones, MilestoneUpdate } from "../lib/database";

interface Goal {
  id: number;
  text: string;
  description?: string | null;
  is_active?: boolean;
  deadline_date?: string | null;
}

type GoalStatus = 'On track' | 'At risk' | 'Failing';

interface GoalStatusInfo {
  status: GoalStatus;
  explanation?: string | null;
}

interface GoalsProps {
  onBack: () => void;
  goals: Goal[];
  onUpdateGoal: (id: number, text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => Promise<void>;
  onCreateGoal: (text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
  onSelectGoal: (goal: Goal) => void;
  aiGoalStatuses: Record<number, GoalStatusInfo>;
  onRefreshGoalStatuses?: () => Promise<void>;
}

export function Goals({ 
  onBack, 
  goals, 
  onUpdateGoal,
  onCreateGoal,
  onDeleteGoal,
  onSelectGoal,
  aiGoalStatuses,
  onRefreshGoalStatuses
}: GoalsProps) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalsReport, setGoalsReport] = useState<string>("");
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
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

  // Load saved Goals Overview report and last sync time from localStorage on mount
  useEffect(() => {
    const savedGoalsReport = localStorage.getItem('workshop-goals-report');
    const savedSyncTime = localStorage.getItem('workshop-goals-last-sync');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:useEffect:loadSyncTime',message:'Loading sync time from localStorage',data:{hasSavedSyncTime:!!savedSyncTime,hasSavedReport:!!savedGoalsReport,savedSyncTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    if (savedGoalsReport) {
      setGoalsReport(savedGoalsReport);
    }
    if (savedSyncTime) {
      const syncTime = new Date(savedSyncTime);
      setLastSyncTime(syncTime);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:useEffect:setSyncTime',message:'Set sync time from localStorage',data:{syncTimeISO:syncTime.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    }
  }, []);

  // Fetch milestones and tasks for goals
  useEffect(() => {
    const loadGoalData = async () => {
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
      
      // Save to localStorage for instant loading on next page load
      try {
        localStorage.setItem('goal-milestones', JSON.stringify(milestonesMap));
        localStorage.setItem('goal-tasks', JSON.stringify(tasksMap));
      } catch (error) {
        console.error('Error saving goal data to localStorage:', error);
      }
    };

    if (goals.length > 0) {
      loadGoalData();
    }
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
        
        // Save to localStorage for instant loading on next page load
        try {
          localStorage.setItem('milestone-updates', JSON.stringify(updates));
        } catch (error) {
          console.error('Error saving milestone updates to localStorage:', error);
        }
      } catch (error) {
        console.error('Error fetching milestone updates:', error);
      }
    };
    
    loadMilestoneUpdates();
  }, [goalMilestones]);

  const handleGoalClick = (goal: Goal) => {
    onSelectGoal(goal);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleCreateNewGoal = () => {
    const newGoal: Goal = {
      id: -1, // Temporary ID to indicate it's a new goal
      text: "",
      description: null,
      is_active: true,
    };
    setSelectedGoal(newGoal);
    setIsModalOpen(true);
  };

  const handleCreateGoal = async (text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => {
    await onCreateGoal(text, description, is_active, deadline_date);
    handleCloseModal();
  };

  const handleUpdateGoal = async (id: number, text: string, description?: string | null, is_active?: boolean, deadline_date?: string | null) => {
    await onUpdateGoal(id, text, description, is_active, deadline_date);
    handleCloseModal();
  };

  // Parse Goals Overview into structured goal data
  interface GoalInsight {
    goalName: string;
    status: 'On Track' | 'At Risk' | 'Failing' | null;
    progressSummary: {
      milestonesCompleted?: string;
      tasksCompletedRecent?: string;
      taskCompletionRate?: string;
      velocity?: string;
    };
    prediction: string | null;
    adjustments: string[];
  }

  const parseGoalsInsights = (goalsContent: string): GoalInsight[] => {
    const goals: GoalInsight[] = [];
    
    try {
      // Split by markdown headings (###) to find individual goals
      const goalSections = goalsContent.split(/(?=###\s+)/);
    
    for (const section of goalSections) {
      const trimmed = section.trim();
      if (!trimmed || trimmed.length < 10) continue;
      
      // Check for ### heading with goal name and status
      const headingMatch = trimmed.match(/^###\s+(.+?)(?:\n|$)/);
      if (headingMatch) {
        const headingText = headingMatch[1].trim();
        
        // Extract goal name and status from heading like "Goal Name - Status: On Track"
        const statusMatch = headingText.match(/-\s*Status:\s*(On Track|At Risk|Failing)/i);
        const goalName = statusMatch 
          ? headingText.substring(0, statusMatch.index).trim()
          : headingText;
        const status = statusMatch 
          ? (statusMatch[1] as 'On Track' | 'At Risk' | 'Failing')
          : null;
        
        let content = trimmed.replace(/^###\s+.+?\n?/, '').trim();
        
        // Extract Progress Summary section
        const progressMatch = content.match(/\*\*Progress Summary:\*\*\s*\n([\s\S]*?)(?=\*\*|$)/i);
        const progressSummary: GoalInsight['progressSummary'] = {};
        if (progressMatch) {
          const progressText = progressMatch[1];
          const milestonesMatch = progressText.match(/(\d+)\/(\d+)\s*milestones\s*completed\s*\((\d+)%\)/i);
          if (milestonesMatch) {
            progressSummary.milestonesCompleted = `${milestonesMatch[1]}/${milestonesMatch[2]} (${milestonesMatch[3]}%)`;
          }
          const tasksRecentMatch = progressText.match(/(\d+)\s*tasks\s*completed\s*in\s*last\s*7\s*days/i);
          if (tasksRecentMatch) {
            progressSummary.tasksCompletedRecent = tasksRecentMatch[1];
          }
          const taskRateMatch = progressText.match(/(\d+)%\s*task\s*completion\s*rate/i);
          if (taskRateMatch) {
            progressSummary.taskCompletionRate = `${taskRateMatch[1]}%`;
          }
          const velocityMatch = progressText.match(/Velocity:\s*~?([\d.]+)\s*tasks\/week/i);
          if (velocityMatch) {
            progressSummary.velocity = `~${velocityMatch[1]} tasks/week`;
          }
        }
        
        // Extract Prediction section
        const predictionMatch = content.match(/\*\*Prediction:\*\*\s*\n([\s\S]*?)(?=\*\*|$)/i);
        let prediction: string | null = null;
        if (predictionMatch) {
          prediction = predictionMatch[1].trim();
        }
        
        // Extract Key Adjustments section
        const adjustmentsMatch = content.match(/\*\*Key Adjustments:\*\*\s*\n([\s\S]*?)(?=\*\*|$)/i);
        const adjustments: string[] = [];
        if (adjustmentsMatch) {
          const adjustmentsText = adjustmentsMatch[1];
          // Extract bullet points
          const bulletMatches = adjustmentsText.match(/^-\s+(.+)$/gm);
          if (bulletMatches) {
            adjustments.push(...bulletMatches.map(m => m.replace(/^-\s+/, '').trim()).filter(a => a.length > 0));
          }
        }
        
        // If no structured sections found, try to extract from plain text
        if (!progressMatch && !predictionMatch && !adjustmentsMatch) {
          // Fallback: extract any bullet points as adjustments
          const bulletMatches = content.match(/^-\s+(.+)$/gm);
          if (bulletMatches) {
            adjustments.push(...bulletMatches.map(m => m.replace(/^-\s+/, '').trim()).filter(a => a.length > 0));
          }
        }
        
        goals.push({
          goalName,
          status,
          progressSummary,
          prediction,
          adjustments
        });
      }
    }
    
      // If no structured goals found, create a fallback entry
      if (goals.length === 0 && goalsContent.trim().length > 0) {
        goals.push({
          goalName: 'Goals Overview',
          status: null,
          progressSummary: {},
          prediction: null,
          adjustments: []
        });
      }
      
      return goals;
    } catch (error) {
      console.error('Error parsing goals insights:', error);
      return [];
    }
  };

  const generateGoalsReport = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:entry',message:'Sync button clicked',data:{goalsCount:goals.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    setIsLoadingGoals(true);

    try {
      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:auth',message:'Auth check complete',data:{hasUser:!!user,hasAuthError:!!authError,authError:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const sanitizedGoals = goals.map(goal => ({ ...goal }));

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:beforeApiCall',message:'Before API call',data:{userId:user.id,goalsCount:sanitizedGoals.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Call the API endpoint with sectionType='goals'
      const response = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          tasks: [],
          goals: sanitizedGoals,
          reportType: 'workshop',
          sectionType: 'goals'
        }),
      });

      // Check if response has content before parsing
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:apiResponse',message:'API response received',data:{status:response.status,ok:response.ok,contentType,textLength:text.length,textPreview:text.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (text && contentType?.includes('application/json')) {
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = text || errorMessage;
          }
        } else if (text) {
          errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      if (!text) {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      const reportContent = data.message || data.report || '';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:parsedResponse',message:'Response parsed',data:{hasMessage:!!data.message,hasReport:!!data.report,reportContentLength:reportContent.length,reportContentPreview:reportContent.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Extract Goals Overview
      const goalsMatch = reportContent.match(/##\s*Goals?\s*Overview?\s*\n([\s\S]*?)(?=##\s*Tasks?\s*Overview|$)/i);
      const goalsContent = goalsMatch ? goalsMatch[1].trim() : reportContent.trim();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:extractedGoals',message:'Goals content extracted',data:{hasMatch:!!goalsMatch,goalsContentLength:goalsContent.length,goalsContentPreview:goalsContent.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Save Goals Overview to localStorage and update state
      if (goalsContent) {
        localStorage.setItem('workshop-goals-report', goalsContent);
        const syncTime = new Date();
        localStorage.setItem('workshop-goals-last-sync', syncTime.toISOString());
        setGoalsReport(goalsContent);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:beforeSetState',message:'Before setLastSyncTime',data:{syncTimeISO:syncTime.toISOString(),syncTimeString:syncTime.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        setLastSyncTime(syncTime);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:afterSetState',message:'After setLastSyncTime',data:{savedLength:goalsContent.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:noContent',message:'No goals content to save',data:{goalsContentLength:goalsContent.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:error',message:'Error caught',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      console.error('Error calling workshop API for goals:', error);
    } finally {
      setIsLoadingGoals(false);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Goals.tsx:generateGoalsReport:finally',message:'Function complete',data:{isLoadingGoals:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  };

  const goalsInsights = goalsReport ? parseGoalsInsights(goalsReport) : [];

  // Helper function to get status badge color
  const getStatusColor = (status: string | null): string => {
    if (!status) return '#5b5d62';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('on track')) return '#00C853';
    if (statusLower.includes('at risk')) return '#FFB300';
    if (statusLower.includes('failing')) return '#F44336';
    return '#5b5d62';
  };

  // Helper function to extract milestone completion percentage
  const getMilestonePercentage = (progressSummary: GoalInsight['progressSummary']): number => {
    if (!progressSummary || !progressSummary.milestonesCompleted) return 0;
    const match = progressSummary.milestonesCompleted.match(/\((\d+)%\)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Helper function to calculate goal metrics
  const getGoalMetrics = (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    const milestones = goalMilestones[goalId] || [];
    const tasks = goalTasks[goalId] || [];
    
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    
    // Get goal deadline or next incomplete milestone deadline
    let nextDueDate: string | null = null;
    if (goal?.deadline_date) {
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

    // Calculate tasks completed in last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCompletedTasks = tasks.filter(t => {
      if (!t.completed || !t.updated_at) return false;
      return new Date(t.updated_at) >= oneWeekAgo;
    }).length;

    // Determine status (AI-determined with algorithmic fallback)
    let status: 'On track' | 'At risk' | 'Failing' = 'On track';
    const info = aiGoalStatuses[goalId];
    if (info?.status) {
      status = info.status;
    } else if (nextDueDate) {
      // Fallback to algorithmic calculation if AI status not available
      const daysUntilDeadline = Math.ceil((new Date(nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const completionRate = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
      
      if (daysUntilDeadline < 0 || (daysUntilDeadline < 7 && completionRate < 0.5)) {
        status = 'Failing';
      } else if (daysUntilDeadline < 14 || completionRate < 0.6) {
        status = 'At risk';
      }
    }

    return {
      totalMilestones,
      completedMilestones,
      nextDueDate,
      recentCompletedTasks,
      status
    };
  };

  // Helper function to format due date
  const formatDueDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Due ${date.getDate()} ${months[date.getMonth()]}`;
  };


  const activeGoals = goals.filter(g => g.is_active !== false);
  const inactiveGoals = goals.filter(g => g.is_active === false);

  return (
    <div className="relative shrink-0 w-full">
      <div className="w-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-[30px] relative w-full h-fit" style={{ paddingBottom: '150px' }}>
          {/* Header */}
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="content-stretch flex items-center gap-[16px] relative shrink-0">
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
              <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
                <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Goals</p>
              </div>
            </div>
            <div className="content-stretch flex items-center gap-[12px] relative shrink-0">
              {/* Plus Button */}
              <div 
                className="relative shrink-0 size-[32px] cursor-pointer"
                onClick={handleCreateNewGoal}
              >
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g>
                    <path
                      d="M16 6V26M26 16H6"
                      stroke="#E1E6EE"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {/* Goals count */}
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px]">
            {activeGoals.length}/4 Goals set
          </p>

          {/* Goals List */}
          <div className="flex flex-col gap-[24px] items-start w-full min-w-0">
            {goals.length === 0 ? (
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] tracking-[-0.198px]">
                No goals yet. Click the + button in the top right to add one.
              </p>
            ) : (
              <>
                {/* Active Goals */}
                {activeGoals.map((goal) => {
                  const metrics = getGoalMetrics(goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="rounded-[12px] w-full min-w-0 cursor-pointer overflow-hidden"
                      style={{ 
                        backgroundColor: '#1f2022',
                        padding: '16px'
                      }}
                      onClick={() => handleGoalClick(goal)}
                    >
                      {/* Header: Due date and Status */}
                      <div className="flex items-center justify-between mb-[12px]">
                        {metrics.nextDueDate ? (
                          <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px]" style={{ color: '#A1A1AA' }}>
                            {formatDueDate(metrics.nextDueDate)}
                          </p>
                        ) : (
                          <div />
                        )}
                        {metrics.status && (
                          <span
                            className="font-['Inter:Medium',sans-serif] font-medium text-[13px] tracking-[-0.1px]"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor:
                                metrics.status === 'On track'
                                  ? 'rgba(76, 175, 80, 0.2)'
                                  : metrics.status === 'At risk'
                                    ? 'rgba(255, 193, 7, 0.2)'
                                    : 'rgba(244, 67, 54, 0.2)',
                              color:
                                metrics.status === 'On track'
                                  ? '#81c784'
                                  : metrics.status === 'At risk'
                                    ? '#ffca28'
                                    : '#e57373',
                            }}
                          >
                            {metrics.status}
                          </span>
                        )}
                      </div>

                      {/* Goal Title */}
                      <h3 className="font-['Inter:Medium',sans-serif] font-medium text-[18px] text-white mb-[10px] tracking-[-0.198px] break-words min-w-0">
                        {goal.text}
                      </h3>

                      {/* Milestone Progress */}
                      {metrics.totalMilestones > 0 && (
                        <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px] mb-[8px]" style={{ color: '#A1A1AA' }}>
                          {metrics.completedMilestones}/{metrics.totalMilestones} milestones completed
                        </p>
                      )}

                      {/* Recent Activity */}
                      <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px]" style={{ color: '#5b5d62' }}>
                        {metrics.recentCompletedTasks} task{metrics.recentCompletedTasks !== 1 ? 's' : ''} completed in last week
                      </p>
                    </div>
                  );
                })}
                
                {/* Inactive Goals */}
                {inactiveGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex gap-[8px] items-center w-full min-w-0 cursor-pointer"
                    onClick={() => handleGoalClick(goal)}
                  >
                    {/* Trophy Icon - gray for inactive */}
                    <div className="relative shrink-0 size-[24px]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="#5b5d62"
                        className="block size-full"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                        />
                      </svg>
                    </div>
                    {/* Goal Name */}
                    <div className="basis-0 flex flex-col grow items-start min-h-px min-w-0 overflow-hidden">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[18px] text-[#5b5d62] tracking-[-0.198px] break-words min-w-0">
                        {goal.text}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
        </div>
      </div>

      {/* Goal Detail Modal - Only for creating new goals */}
      {selectedGoal && selectedGoal.id < 0 && (
        <GoalDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          goal={selectedGoal}
          onUpdateGoal={handleUpdateGoal}
          onCreateGoal={handleCreateGoal}
          onDeleteGoal={onDeleteGoal}
        />
      )}
    </div>
  );
}

