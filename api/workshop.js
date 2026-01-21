/**
 * Vercel serverless function for ChatGPT Workshop integration
 * This endpoint generates AI-powered reports on tasks and goals
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to parse request body
function parseBody(req) {
  if (!req.body) {
    return null;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[workshop] Failed to parse JSON body', error);
      return null;
    }
  }
  return req.body;
}

// Format task for display in AI context
function formatTaskForAI(todo) {
  try {
    let formatted = `- ${todo.text || todo.task || 'Untitled task'}`;
    if (todo.completed) {
      formatted += ' ✓ (completed)';
    }
    if (todo.deadline) {
      let deadlineDate;
      if (todo.deadline.date) {
        if (todo.deadline.date instanceof Date) {
          deadlineDate = todo.deadline.date.toLocaleDateString();
        } else if (typeof todo.deadline.date === 'string') {
          deadlineDate = new Date(todo.deadline.date).toLocaleDateString();
        } else {
          deadlineDate = String(todo.deadline.date);
        }
      } else {
        deadlineDate = String(todo.deadline);
      }
      formatted += ` [Due: ${deadlineDate}`;
      if (todo.deadline.time) {
        formatted += ` at ${todo.deadline.time}`;
      }
      formatted += ']';
    } else if (todo.deadline_date) {
      formatted += ` [Due: ${todo.deadline_date}`;
      if (todo.deadline_time) {
        formatted += ` at ${todo.deadline_time}`;
      }
      formatted += ']';
    }
    if (todo.description) {
      formatted += `\n  Description: ${todo.description}`;
    }
    if (todo.effort !== undefined && todo.effort !== null) {
      formatted += ` (Effort: ${todo.effort}/10)`;
    }
    if (todo.listId !== undefined && todo.listId !== null && todo.listId !== 0 && todo.listId !== -1) {
      formatted += ` [List ID: ${todo.listId}]`;
    }
    return formatted;
  } catch (error) {
    console.error('[workshop] Error formatting task:', error, todo);
    return `- ${todo.text || todo.task || 'Untitled task'} (error formatting)`;
  }
}

// Format goal for display in AI context with progress metrics
function formatGoalForAI(goal, milestones = [], metrics = null) {
  let formatted = `- ${goal.text || goal.name || 'Untitled goal'}`;
  if (goal.description) {
    formatted += `\n  Description: ${goal.description}`;
  }
  if (goal.is_active === false) {
    formatted += ' (inactive)';
  }
  const goalMilestones = milestones.filter(m => m.goal_id === goal.id || m.goalId === goal.id);
  
  // Add progress metrics if available
  if (metrics) {
    formatted += `\n  Progress Summary:`;
    formatted += `\n    - Milestones: ${metrics.completedMilestones}/${metrics.totalMilestones} completed (${Math.round(metrics.milestoneCompletionRate)}%)`;
    formatted += `\n    - Tasks: ${metrics.completedTasks}/${metrics.totalTasks} completed (${Math.round(metrics.taskCompletionRate)}%)`;
    formatted += `\n    - Recent Activity: ${metrics.recentCompletedTasks} tasks completed in last 7 days`;
    if (metrics.velocity > 0) {
      formatted += `\n    - Velocity: ~${metrics.velocity.toFixed(1)} tasks/week`;
    }
    if (metrics.daysToNextDeadline !== null) {
      if (metrics.daysToNextDeadline < 0) {
        formatted += `\n    - Next Deadline: OVERDUE by ${Math.abs(metrics.daysToNextDeadline)} days`;
      } else {
        formatted += `\n    - Next Deadline: ${metrics.daysToNextDeadline} days away`;
      }
    }
    if (metrics.requiredVelocity !== null && metrics.requiredVelocity > 0) {
      formatted += `\n    - Required Velocity: ~${metrics.requiredVelocity.toFixed(1)} tasks/week to meet deadline`;
    }
  }
  
  if (goalMilestones.length > 0) {
    formatted += `\n  Milestones (${goalMilestones.length}):`;
    goalMilestones.forEach(milestone => {
      formatted += `\n    - ${milestone.name || milestone.text}`;
      if (milestone.completed) {
        formatted += ' ✓';
      }
      if (milestone.deadline_date) {
        formatted += ` [Due: ${milestone.deadline_date}]`;
      }
      if (milestone.description) {
        formatted += ` - ${milestone.description}`;
      }
    });
  }
  return formatted;
}

// Safe logging helper - only logs in development, silently fails in production
function safeLog(location, message, data, hypothesisId) {
  try {
    // Only log to file in local development
    if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
      fs.appendFileSync(logPath, JSON.stringify({location, message, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId}) + '\n');
    }
  } catch(e) {
    // Silently fail - don't break production
  }
}

module.exports = async function handler(req, res) {
  // #region agent log
  safeLog('api/workshop.js:handler:entry', 'Workshop API called', {method: req.method, hasBody: !!req.body, sectionType: req.body?.sectionType}, 'A');
  // #endregion

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OpenAI API key not configured');
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables'
    });
  }

  try {
    const body = parseBody(req) || {};
    let { userId, tasks = [], goals = [], reportType, sectionType = 'both' } = body;

    // Ensure tasks and goals are arrays
    if (!Array.isArray(tasks)) {
      console.warn('[workshop] tasks is not an array, converting');
      tasks = [];
    }
    if (!Array.isArray(goals)) {
      console.warn('[workshop] goals is not an array, converting');
      goals = [];
    }

    // Sanitize tasks - convert Date objects to strings for processing
    // Note: tasks are already serialized from the client, but we handle Date objects if they exist
    const sanitizedTasks = tasks.map(task => {
      try {
        const sanitized = { ...task };
        if (sanitized.deadline && sanitized.deadline.date) {
          // Handle both Date objects and date strings
          if (sanitized.deadline.date instanceof Date) {
            sanitized.deadline = {
              ...sanitized.deadline,
              date: sanitized.deadline.date.toISOString().split('T')[0] // Convert to YYYY-MM-DD
            };
          }
        }
        return sanitized;
      } catch (error) {
        console.error('[workshop] Error sanitizing task:', error, task);
        return task; // Return original if sanitization fails
      }
    });
    tasks = sanitizedTasks;

    // Support both old chat format and new report format
    if (reportType !== 'workshop' && body.message) {
      // Legacy chat format - return error or handle differently
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'This endpoint now requires tasks and goals data for report generation'
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User ID is required'
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[workshop] Missing Supabase credentials');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured'
      });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch milestones for goals if not provided
    let milestones = [];
    if (goals && goals.length > 0) {
      try {
        const goalIds = goals.map(g => g.id).filter(id => id !== undefined && id !== null);
        if (goalIds.length > 0) {
          const { data: milestonesData, error: milestonesError } = await supabase
            .from('milestones')
            .select('*')
            .in('goal_id', goalIds)
            .order('deadline_date', { ascending: true, nullsLast: true });

          if (!milestonesError && milestonesData) {
            milestones = milestonesData;
          }
        }
      } catch (milestonesError) {
        console.error('[workshop] Error fetching milestones:', milestonesError);
        // Continue without milestones if fetch fails
      }
    }

    // Fetch tasks linked to milestones for progress tracking
    let goalTasks = {}; // Map goal_id -> array of tasks
    if (milestones.length > 0) {
      try {
        const milestoneIds = milestones.map(m => m.id).filter(id => id !== undefined && id !== null);
        // #region agent log
        safeLog('api/workshop.js:fetchTasks:beforeQuery', 'Before task query', {milestonesCount: milestones.length, milestoneIdsCount: milestoneIds.length, userId}, 'B');
        // #endregion
        if (milestoneIds.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('todos')
            .select('id, text, completed, milestone_id, created_at, updated_at')
            .in('milestone_id', milestoneIds)
            .or(`user_id.is.null,user_id.eq.${userId}`);

          // #region agent log
          safeLog('api/workshop.js:fetchTasks:afterQuery', 'After task query', {hasTasksData: !!tasksData, tasksCount: tasksData?.length, hasTasksError: !!tasksError, tasksError: tasksError?.message}, 'B');
          // #endregion

          if (!tasksError && tasksData) {
            // Group tasks by goal_id via milestones
            goals.forEach(goal => {
              const goalMilestoneIds = milestones
                .filter(m => (m.goal_id === goal.id || m.goalId === goal.id))
                .map(m => m.id);
              goalTasks[goal.id] = tasksData.filter(t => goalMilestoneIds.includes(t.milestone_id));
            });
            // #region agent log
            safeLog('api/workshop.js:fetchTasks:grouped', 'Tasks grouped by goal', {goalTasksKeys: Object.keys(goalTasks), goalTasksCounts: Object.fromEntries(Object.entries(goalTasks).map(([k,v]) => [k, v.length]))}, 'B');
            // #endregion
          }
        }
      } catch (tasksError) {
        // #region agent log
        safeLog('api/workshop.js:fetchTasks:error', 'Error fetching goal tasks', {errorMessage: tasksError?.message, errorStack: tasksError?.stack}, 'B');
        // #endregion
        console.error('[workshop] Error fetching goal tasks:', tasksError);
        // Continue without task data if fetch fails
      }
    }

    // Calculate progress metrics for each goal
    function calculateGoalMetrics(goal, goalMilestones, goalTasksList) {
      // #region agent log
      safeLog('api/workshop.js:calculateGoalMetrics:entry', 'Calculating metrics', {goalId: goal?.id, goalName: goal?.text, milestonesCount: goalMilestones?.length, tasksCount: goalTasksList?.length}, 'C');
      // #endregion
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const totalMilestones = goalMilestones.length;
      const completedMilestones = goalMilestones.filter(m => m.completed).length;
      const milestoneCompletionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
      
      const allTasks = goalTasksList || [];
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.completed).length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Tasks completed in last 7 days
      const recentCompletedTasks = allTasks.filter(t => {
        if (!t.completed) return false;
        if (!t.updated_at) return false;
        const updatedAt = new Date(t.updated_at);
        return updatedAt >= sevenDaysAgo;
      }).length;
      
      // Calculate velocity (tasks completed per week)
      // Get all completed tasks with updated_at timestamps
      const completedTasksWithDates = allTasks.filter(t => t.completed && t.updated_at);
      let velocity = 0;
      if (completedTasksWithDates.length > 0) {
        const oldestCompletion = new Date(Math.min(...completedTasksWithDates.map(t => new Date(t.updated_at).getTime())));
        const daysSinceStart = Math.max(1, (now - oldestCompletion) / (1000 * 60 * 60 * 24));
        const weeksSinceStart = daysSinceStart / 7;
        velocity = weeksSinceStart > 0 ? completedTasksWithDates.length / weeksSinceStart : completedTasksWithDates.length;
      }
      
      // Find next incomplete milestone deadline
      const incompleteMilestones = goalMilestones.filter(m => !m.completed && m.deadline_date);
      let daysToNextDeadline = null;
      if (incompleteMilestones.length > 0) {
        const nextDeadline = incompleteMilestones
          .map(m => new Date(m.deadline_date))
          .sort((a, b) => a - b)[0];
        const daysDiff = Math.ceil((nextDeadline - now) / (1000 * 60 * 60 * 24));
        daysToNextDeadline = daysDiff;
      }
      
      // Calculate required velocity
      const remainingTasks = totalTasks - completedTasks;
      const remainingMilestones = totalMilestones - completedMilestones;
      let requiredVelocity = null;
      if (remainingTasks > 0 && daysToNextDeadline !== null && daysToNextDeadline > 0) {
        const weeksRemaining = daysToNextDeadline / 7;
        requiredVelocity = weeksRemaining > 0 ? remainingTasks / weeksRemaining : remainingTasks;
      }
      
      const metrics = {
        totalMilestones,
        completedMilestones,
        milestoneCompletionRate,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        recentCompletedTasks,
        velocity,
        daysToNextDeadline,
        requiredVelocity,
        remainingTasks,
        remainingMilestones
      };
      // #region agent log
      safeLog('api/workshop.js:calculateGoalMetrics:exit', 'Metrics calculated', {goalId: goal?.id, metrics}, 'C');
      // #endregion
      return metrics;
    }

    // Format tasks for AI context
    let tasksContext = '';
    try {
      if (tasks && tasks.length > 0) {
        const incompleteTasks = tasks.filter(t => !t.completed);
        const completedTasks = tasks.filter(t => t.completed);
        const overdueTasks = incompleteTasks.filter(t => {
          try {
            if (!t.deadline && !t.deadline_date) return false;
            let deadlineDate = null;
            if (t.deadline?.date) {
              deadlineDate = t.deadline.date instanceof Date 
                ? t.deadline.date 
                : new Date(t.deadline.date);
            } else if (t.deadline_date) {
              deadlineDate = new Date(t.deadline_date);
            }
            if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
            
            // Compare dates only (not times) - a task due today is NOT overdue
            // Parse date strings as local dates (YYYY-MM-DD format should be treated as local, not UTC)
            let parsedDeadline = deadlineDate;
            if (typeof deadlineDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadlineDate)) {
              const [year, month, day] = deadlineDate.split('-').map(Number);
              parsedDeadline = new Date(year, month - 1, day); // Create local date (not UTC)
            } else if (!(deadlineDate instanceof Date)) {
              parsedDeadline = new Date(deadlineDate);
            }
            
            // Get today's date in local timezone (not UTC)
            const now = new Date();
            const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const deadlineLocal = new Date(parsedDeadline.getFullYear(), parsedDeadline.getMonth(), parsedDeadline.getDate());
            
            // Only overdue if deadline date is BEFORE today (not today or future)
            return deadlineLocal.getTime() < todayLocal.getTime() && !t.completed;
          } catch (error) {
            console.error('[workshop] Error checking overdue task:', error, t);
            return false;
          }
        });

        // Categorize tasks by due date
        // Parse date strings as local dates (YYYY-MM-DD format should be treated as local, not UTC)
        const parseDateString = (dateStr) => {
          if (!dateStr) return null;
          // If it's already a Date object, return it
          if (dateStr instanceof Date) return dateStr;
          // If it's a string in YYYY-MM-DD format, parse it as local date
          if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day); // Create local date (not UTC)
          }
          // Otherwise, try to parse as Date
          return new Date(dateStr);
        };

        // Get today's date in local timezone (not UTC)
        const now = new Date();
        const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const weekFromNowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

        const tasksDueToday = incompleteTasks.filter(t => {
          try {
            if (!t.deadline && !t.deadline_date) return false;
            let deadlineDate = null;
            if (t.deadline?.date) {
              deadlineDate = parseDateString(t.deadline.date);
            } else if (t.deadline_date) {
              deadlineDate = parseDateString(t.deadline_date);
            }
            if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
            // Compare dates in local timezone
            const deadlineLocal = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
            return deadlineLocal.getTime() === todayLocal.getTime();
          } catch (error) {
            return false;
          }
        });

        const tasksDueTomorrow = incompleteTasks.filter(t => {
          try {
            if (!t.deadline && !t.deadline_date) return false;
            let deadlineDate = null;
            if (t.deadline?.date) {
              deadlineDate = parseDateString(t.deadline.date);
            } else if (t.deadline_date) {
              deadlineDate = parseDateString(t.deadline_date);
            }
            if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
            // Compare dates in local timezone
            const deadlineLocal = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
            return deadlineLocal.getTime() === tomorrowLocal.getTime();
          } catch (error) {
            return false;
          }
        });

        const tasksDueThisWeek = incompleteTasks.filter(t => {
          try {
            if (!t.deadline && !t.deadline_date) return false;
            let deadlineDate = null;
            if (t.deadline?.date) {
              deadlineDate = parseDateString(t.deadline.date);
            } else if (t.deadline_date) {
              deadlineDate = parseDateString(t.deadline_date);
            }
            if (!deadlineDate || isNaN(deadlineDate.getTime())) return false;
            // Compare dates in local timezone
            const deadlineLocal = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
            return deadlineLocal.getTime() > tomorrowLocal.getTime() && deadlineLocal.getTime() <= weekFromNowLocal.getTime();
          } catch (error) {
            return false;
          }
        });

        const tasksWithoutDeadlines = incompleteTasks.filter(t => !t.deadline && !t.deadline_date);

        tasksContext = '\n\n## Tasks\n\n';
        
        tasksContext += `Total Active Tasks: ${incompleteTasks.length}\n\n`;

        if (overdueTasks.length > 0) {
          tasksContext += `Overdue Tasks (${overdueTasks.length} - deadlines BEFORE today):\n`;
          overdueTasks.slice(0, 10).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting overdue task:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          tasksContext += '\n';
        }

        if (tasksDueToday.length > 0) {
          tasksContext += `Tasks Due Today (${tasksDueToday.length}):\n`;
          tasksDueToday.slice(0, 15).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting task due today:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          if (tasksDueToday.length > 15) {
            tasksContext += `... and ${tasksDueToday.length - 15} more tasks due today\n`;
          }
          tasksContext += '\n';
        }

        if (tasksDueTomorrow.length > 0) {
          tasksContext += `Tasks Due Tomorrow (${tasksDueTomorrow.length}):\n`;
          tasksDueTomorrow.slice(0, 15).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting task due tomorrow:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          if (tasksDueTomorrow.length > 15) {
            tasksContext += `... and ${tasksDueTomorrow.length - 15} more tasks due tomorrow\n`;
          }
          tasksContext += '\n';
        }

        if (tasksDueThisWeek.length > 0) {
          tasksContext += `Tasks Due This Week (${tasksDueThisWeek.length}):\n`;
          tasksDueThisWeek.slice(0, 20).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting task due this week:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          if (tasksDueThisWeek.length > 20) {
            tasksContext += `... and ${tasksDueThisWeek.length - 20} more tasks due this week\n`;
          }
          tasksContext += '\n';
        }

        if (tasksWithoutDeadlines.length > 0) {
          tasksContext += `Tasks Without Deadlines (${tasksWithoutDeadlines.length}):\n`;
          tasksWithoutDeadlines.slice(0, 20).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting task without deadline:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          if (tasksWithoutDeadlines.length > 20) {
            tasksContext += `... and ${tasksWithoutDeadlines.length - 20} more tasks without deadlines\n`;
          }
          tasksContext += '\n';
        }

        if (completedTasks.length > 0) {
          tasksContext += `\nRecently Completed (${completedTasks.length} total):\n`;
          completedTasks.slice(0, 5).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting completed task:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
        }
      } else {
        tasksContext = '\n\n## Tasks\n\nNo tasks found.\n';
      }
    } catch (error) {
      console.error('[workshop] Error formatting tasks context:', error);
      tasksContext = '\n\n## Tasks\n\nError processing tasks.\n';
    }

    // Format goals for AI context with progress metrics
    let goalsContext = '';
    try {
      if (goals && goals.length > 0) {
        const activeGoals = goals.filter(g => g.is_active !== false);
        const inactiveGoals = goals.filter(g => g.is_active === false);

        goalsContext = '\n\n## Goals\n\n';
        
        if (activeGoals.length > 0) {
          goalsContext += `Active Goals (${activeGoals.length}):\n`;
          activeGoals.forEach(goal => {
            try {
              const goalMilestones = milestones.filter(m => m.goal_id === goal.id || m.goalId === goal.id);
              const goalTasksList = goalTasks[goal.id] || [];
              // #region agent log
              safeLog('api/workshop.js:formatGoals:beforeMetrics', 'Before calculating metrics for goal', {goalId: goal.id, goalName: goal.text, milestonesCount: goalMilestones.length, tasksCount: goalTasksList.length}, 'C');
              // #endregion
              const metrics = calculateGoalMetrics(goal, goalMilestones, goalTasksList);
              goalsContext += formatGoalForAI(goal, milestones, metrics) + '\n';
            } catch (error) {
              // #region agent log
              safeLog('api/workshop.js:formatGoals:error', 'Error formatting goal', {goalId: goal.id, errorMessage: error?.message, errorStack: error?.stack}, 'C');
              // #endregion
              console.error('[workshop] Error formatting goal:', error, goal);
              goalsContext += `- ${goal.text || goal.name || 'Untitled goal'}\n`;
            }
          });
        } else {
          goalsContext += 'No active goals.\n';
        }

        if (inactiveGoals.length > 0) {
          goalsContext += `\nInactive Goals (${inactiveGoals.length}):\n`;
          inactiveGoals.forEach(goal => {
            try {
              const goalMilestones = milestones.filter(m => m.goal_id === goal.id || m.goalId === goal.id);
              const goalTasksList = goalTasks[goal.id] || [];
              const metrics = calculateGoalMetrics(goal, goalMilestones, goalTasksList);
              goalsContext += formatGoalForAI(goal, milestones, metrics) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting inactive goal:', error, goal);
              goalsContext += `- ${goal.text || goal.name || 'Untitled goal'}\n`;
            }
          });
        }
      } else {
        goalsContext = '\n\n## Goals\n\nNo goals found.\n';
      }
    } catch (error) {
      console.error('[workshop] Error formatting goals context:', error);
      goalsContext = '\n\n## Goals\n\nError processing goals.\n';
    }

    // Determine which sections to generate
    const generateTasks = sectionType === 'both' || sectionType === 'tasks';
    const generateGoals = sectionType === 'both' || sectionType === 'goals';

    // Build system message for report generation
    let systemMessage = `You are an AI assistant that analyzes tasks and goals to provide planning insights. Your role is to generate a structured report that helps the user understand their current situation and plan better.

CRITICAL INSTRUCTIONS FOR TASKS ANALYSIS:
1. **Overdue Tasks**: ONLY mention overdue tasks if they are explicitly listed in the context. If no overdue tasks are listed, DO NOT discuss overdue tasks at all. Do NOT calculate or infer overdue tasks yourself.
2. **Focus on Current and Upcoming Tasks**: The primary focus should be on:
   - Tasks due TODAY (these are the immediate priorities)
   - Tasks due TOMORROW (planning for the next day)
   - Tasks due THIS WEEK (upcoming priorities)
   - Tasks without deadlines (backlog items that may need scheduling)
3. **Provide Actionable Insights**: Analyze the tasks provided and give specific, actionable advice about:
   - What to focus on today
   - How to plan for tomorrow and this week
   - Patterns you notice (e.g., many tasks in one area, time management opportunities)
   - Suggestions for task organization and prioritization
4. **Be Specific**: Reference actual tasks from the lists provided, not generic advice.
5. **Formatting Requirements**:
   - DO NOT repeat section titles or headings anywhere in your response
   - DO NOT include titles like "asks Due Today" or any variation of section titles
   - For each time period (Today, Tomorrow, This Week), use the heading ONCE, then immediately list the tasks, then provide insights
   - Format insights as individual bullet points (one per line), NOT as a single paragraph
   - Each insight should be a separate, standalone item starting with "-"
   - Do NOT use subheadings like "Actionable Insights for Today" - just list the insights directly after the tasks
   - After the section heading (e.g., "### Tasks Due Today (Immediate Priorities)"), go directly to listing tasks, then insights - NO repeated titles

Generate a report with ${generateTasks && generateGoals ? 'two clear sections' : 'one clear section'}:${generateTasks ? `
1. **Tasks Overview** - Analyze the user's current and upcoming tasks:
   - For tasks due TODAY: Use heading "### Tasks Due Today (Immediate Priorities)" ONCE, then list the tasks, then provide individual actionable insights (one per line, as bullet points starting with "-")
   - For tasks due TOMORROW: Use heading "### Tasks Due Tomorrow (Planning for the Next Day)" ONCE, then list the tasks, then provide individual actionable insights (one per line, as bullet points starting with "-")
   - For tasks due THIS WEEK: Use heading "### Tasks Due This Week (Upcoming Priorities)" ONCE, then list notable tasks, then provide individual actionable insights (one per line, as bullet points starting with "-")
   - Only mention overdue tasks if they are explicitly listed (otherwise skip this entirely)
   - Analyze tasks without deadlines if relevant
   - Each insight should be specific and actionable, referencing actual tasks from the lists` : ''}${generateGoals ? `${generateTasks ? '\n2' : '1'}. **Goals Overview** - Provide a data-driven analysis of each goal with:
   - **Status Assessment**: For each goal, determine if it's "On Track", "At Risk", or "Behind" based on:
     * Milestone completion rate vs. time elapsed (compare completed milestones to total milestones and consider deadlines)
     * Recent task completion velocity (tasks completed in last 7 days)
     * Upcoming deadline proximity (if next deadline is within 7 days or overdue, flag as At Risk or Behind)
   - **Progress Analysis**: 
     * Report tasks completed in last 7 days per goal (use the "Recent Activity" metric provided)
     * Compare current velocity (tasks/week) to required velocity (if provided) to meet deadlines
     * Identify trends: Is progress accelerating, maintaining pace, or slowing down?
     * Calculate completion rates: milestone completion % and task completion %
   - **Prediction**: 
     * Based on current velocity and remaining milestones/tasks, predict if goal will be achieved
     * Use milestone deadlines and completion rates to estimate completion date
     * State clearly: "Likely to achieve by [date]", "At risk - needs attention", or "Unlikely to achieve on time"
   - **Actionable Adjustments**:
     * If behind: Provide specific recommendations (e.g., "Need to complete 2 more tasks/week to meet deadline")
     * If at risk: Suggest priority actions to get back on track
     * If on track: Provide optimization suggestions to maintain or accelerate progress
   - **Format**: For each goal, structure as:
     * Goal name with status badge: "[Goal Name] - [On Track/At Risk/Behind]"
     * Progress summary: "X/Y milestones completed (Z%), N tasks completed in last 7 days"
     * Prediction: Clear statement about likelihood of achievement
     * Key adjustments: 2-3 specific, actionable recommendations as bullet points` : ''}

Write in a clear, professional, and helpful tone. Focus on actionable insights and recommendations. Be specific about what you observe in their tasks and goals. Use markdown formatting with ## for main section headers and ### for subsections.

CRITICAL: Each section heading (### Tasks Due Today, etc.) should appear EXACTLY ONCE. Do NOT repeat it or include variations of it anywhere else in that section.

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE EXACTLY:
- Use markdown headings: ## for main sections, ### for subsections
- Each subsection heading appears EXACTLY ONCE - do NOT repeat it
- After each subsection heading, list tasks first (as numbered list 1., 2., 3., etc.)
- After listing tasks, provide insights as individual bullet points, each starting with "-" on a new line
- Do NOT write paragraphs - use bullet points for insights
- Do NOT repeat the subsection title anywhere after the heading
- Do NOT include text like "asks Due Today" or any variation

Example of CORRECT format:
### Tasks Due Today (Immediate Priorities)
1. Task one [Due: 1/21/2026]
2. Task two [Due: 1/21/2026]
- Prioritize task one as it's urgent
- Allocate time for task two in the morning
- Consider batching similar tasks together

Example of INCORRECT format (DO NOT DO THIS):
### Tasks Due Today (Immediate Priorities)
asks Due Today (Immediate Priorities) - Task one, task two. Prioritize task one as it's urgent. Allocate time for task two.

Format your response EXACTLY as:${generateTasks ? `
## Tasks Overview

### Tasks Due Today (Immediate Priorities)
[Numbered list of tasks: 1. Task name [Due: date], 2. Task name [Due: date], etc.]
- [First insight as bullet point]
- [Second insight as bullet point]
- [Third insight as bullet point]

### Tasks Due Tomorrow (Planning for the Next Day)
[Numbered list of tasks: 1. Task name [Due: date], 2. Task name [Due: date], etc.]
- [First insight as bullet point]
- [Second insight as bullet point]

### Tasks Due This Week (Upcoming Priorities)
[Numbered list of notable tasks: 1. Task name [Due: date], 2. Task name [Due: date], etc.]
- [First insight as bullet point]
- [Second insight as bullet point]` : ''}${generateGoals ? `
## Goals Overview

For each goal, provide:

### [Goal Name] - [Status: On Track / At Risk / Behind]

**Progress Summary:**
- X/Y milestones completed (Z%)
- N tasks completed in last 7 days
- M% task completion rate
- Velocity: ~N tasks/week

**Prediction:**
[Clear statement: Likely to achieve by [date] / At risk - needs attention / Unlikely to achieve on time]

**Key Adjustments:**
- [Specific actionable recommendation 1]
- [Specific actionable recommendation 2]
- [Specific actionable recommendation 3]

[Repeat for each goal]` : ''}` + (generateTasks ? tasksContext : '') + (generateGoals ? goalsContext : '');

    // #region agent log
    safeLog('api/workshop.js:beforeOpenAI', 'Before OpenAI API call', {generateTasks, generateGoals, goalsContextLength: goalsContext.length, tasksContextLength: tasksContext.length}, 'D');
    // #endregion

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: generateTasks && generateGoals 
          ? 'Please generate a comprehensive report analyzing my tasks and goals to help me plan better.'
          : generateGoals 
          ? 'Please generate a Goals Overview analyzing my goals, their progress, milestone completion, blockers, and provide recommendations.'
          : 'Please generate a Tasks Overview analyzing my current and upcoming tasks to help me plan better.'
      }
    ];

    // Call OpenAI API
    let completion;
    try {
      // #region agent log
      safeLog('api/workshop.js:openai:beforeCall', 'Before OpenAI API call', {model: 'gpt-4o-mini', messagesCount: messages.length}, 'D');
      // #endregion
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000, // Increased for comprehensive reports
      });
      // #region agent log
      safeLog('api/workshop.js:openai:afterCall', 'After OpenAI API call', {hasCompletion: !!completion, hasChoices: !!completion?.choices, choicesCount: completion?.choices?.length, responseLength: completion?.choices?.[0]?.message?.content?.length}, 'D');
      // #endregion
    } catch (openaiError) {
      console.error('[workshop] OpenAI API error:', openaiError);
      throw openaiError;
    }

    const assistantMessage = completion.choices[0]?.message?.content;

    // #region agent log
    safeLog('api/workshop.js:aiResponse:received', 'Received AI response', {responseLength: assistantMessage?.length, responsePreview: assistantMessage?.substring(0, 500), hasTasksDueToday: assistantMessage?.includes('Tasks Due Today'), hasRepeatedTitle: assistantMessage?.includes('asks Due Today'), hasBulletPoints: assistantMessage?.includes('- '), hasParagraphFormat: assistantMessage?.match(/Tasks Due Today.*asks Due Today/) !== null}, 'A');
    // #endregion

    if (!assistantMessage) {
      console.error('[workshop] No message in OpenAI response:', completion);
      return res.status(500).json({
        error: 'No response from OpenAI',
        message: 'The AI did not return a response'
      });
    }

    // #region agent log
    safeLog('api/workshop.js:aiResponse:fullResponse', 'Full AI response content', {fullResponse: assistantMessage}, 'B');
    // #endregion

    // Return the response
    return res.status(200).json({
      message: assistantMessage,
      report: assistantMessage, // Alias for compatibility
      usage: completion.usage,
    });

  } catch (error) {
    // #region agent log
    safeLog('api/workshop.js:handler:error', 'Top-level error caught', {errorMessage: error?.message, errorStack: error?.stack, errorName: error?.name}, 'A');
    // #endregion
    console.error('[workshop] Error:', error);
    
    // Ensure we always return valid JSON
    try {
      // Handle specific OpenAI errors
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'OpenAI API error',
          message: error.response.data?.error?.message || error.message || 'Unknown error',
          code: error.response.data?.error?.code
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      });
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      console.error('[workshop] Failed to send JSON error response:', jsonError);
      res.status(500).send('Internal server error: Failed to generate error response');
    }
  }
};
