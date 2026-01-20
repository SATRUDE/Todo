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

// Format goal for display in AI context
function formatGoalForAI(goal, milestones = []) {
  let formatted = `- ${goal.text || goal.name || 'Untitled goal'}`;
  if (goal.description) {
    formatted += `\n  Description: ${goal.description}`;
  }
  if (goal.is_active === false) {
    formatted += ' (inactive)';
  }
  const goalMilestones = milestones.filter(m => m.goal_id === goal.id || m.goalId === goal.id);
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

module.exports = async function handler(req, res) {

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
    let { userId, tasks = [], goals = [], reportType } = body;

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
            return deadlineDate < new Date() && !t.completed;
          } catch (error) {
            console.error('[workshop] Error checking overdue task:', error, t);
            return false;
          }
        });

        tasksContext = '\n\n## Tasks\n\n';
        
        if (incompleteTasks.length > 0) {
          tasksContext += `Active Tasks (${incompleteTasks.length}):\n`;
          incompleteTasks.slice(0, 30).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting task:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
          if (incompleteTasks.length > 30) {
            tasksContext += `... and ${incompleteTasks.length - 30} more active tasks\n`;
          }
        } else {
          tasksContext += 'No active tasks.\n';
        }

        if (overdueTasks.length > 0) {
          tasksContext += `\nOverdue Tasks (${overdueTasks.length}):\n`;
          overdueTasks.slice(0, 10).forEach(todo => {
            try {
              tasksContext += formatTaskForAI(todo) + '\n';
            } catch (error) {
              console.error('[workshop] Error formatting overdue task:', error, todo);
              tasksContext += `- ${todo.text || 'Untitled task'}\n`;
            }
          });
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

    // Format goals for AI context
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
              goalsContext += formatGoalForAI(goal, milestones) + '\n';
            } catch (error) {
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
              goalsContext += formatGoalForAI(goal, milestones) + '\n';
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

    // Build system message for report generation
    const systemMessage = `You are an AI assistant that analyzes tasks and goals to provide planning insights. Your role is to generate a structured report that helps the user understand their current situation and plan better.

Generate a report with two clear sections:
1. **Tasks Overview** - Analyze the user's tasks, identify priorities, highlight overdue items, suggest focus areas, and provide actionable insights
2. **Goals Overview** - Review goal progress, assess milestone completion, identify blockers, and provide recommendations

Write in a clear, professional, and helpful tone. Focus on actionable insights and recommendations. Be specific about what you observe in their tasks and goals. Use markdown formatting with ## for section headers.

Format your response as:
## Tasks Overview
[Your analysis of tasks here]

## Goals Overview
[Your analysis of goals here]` + tasksContext + goalsContext;

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: 'Please generate a comprehensive report analyzing my tasks and goals to help me plan better.'
      }
    ];

    // Call OpenAI API
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000, // Increased for comprehensive reports
      });
    } catch (openaiError) {
      console.error('[workshop] OpenAI API error:', openaiError);
      throw openaiError;
    }

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      console.error('[workshop] No message in OpenAI response:', completion);
      return res.status(500).json({
        error: 'No response from OpenAI',
        message: 'The AI did not return a response'
      });
    }

    // Return the response
    return res.status(200).json({
      message: assistantMessage,
      report: assistantMessage, // Alias for compatibility
      usage: completion.usage,
    });

  } catch (error) {
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
