/**
 * Vercel serverless function to generate tasks from common and daily tasks
 * This endpoint is called by Vercel cron jobs daily at midnight Norwegian time
 */

const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Calculate next recurring date
 */
function getNextRecurringDate(currentDate, recurring) {
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
}

/**
 * Format date as YYYY-MM-DD
 */
function formatLocalDate(date) {
  if (!date || isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
function parseLocalDate(dateString) {
  if (!dateString) {
    return undefined;
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Convert local time to UTC for storage
 */
function convertTimeToUTC(date, timeString) {
  if (!timeString || timeString.trim() === '') {
    return null;
  }
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDateTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );
  const utcHours = localDateTime.getUTCHours();
  const utcMinutes = localDateTime.getUTCMinutes();
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

module.exports = async function handler(req, res) {
  // Only allow GET requests (for cron)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate required environment variables
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    return res.status(500).json({ 
      error: 'Missing Supabase credentials',
      details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    });
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('🚀 Starting task generation...');
  console.log(`⏰ Current time: ${new Date().toISOString()}`);

  try {
    // Get today's date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date for daily tasks
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get distinct user IDs from common_tasks and daily_tasks tables
    const { data: commonTasksUsers, error: commonTasksUsersError } = await supabase
      .from('common_tasks')
      .select('user_id')
      .not('user_id', 'is', null)
      .not('deadline_date', 'is', null);

    const { data: dailyTasksUsers, error: dailyTasksUsersError } = await supabase
      .from('daily_tasks')
      .select('user_id')
      .not('user_id', 'is', null);

    if (commonTasksUsersError || dailyTasksUsersError) {
      console.error('❌ Error fetching user IDs:', commonTasksUsersError || dailyTasksUsersError);
      return res.status(500).json({ 
        error: 'Failed to fetch user IDs',
        details: (commonTasksUsersError || dailyTasksUsersError).message 
      });
    }

    // Get unique user IDs
    const userIds = new Set();
    if (commonTasksUsers) {
      commonTasksUsers.forEach(task => {
        if (task.user_id) userIds.add(task.user_id);
      });
    }
    if (dailyTasksUsers) {
      dailyTasksUsers.forEach(task => {
        if (task.user_id) userIds.add(task.user_id);
      });
    }

    if (userIds.size === 0) {
      console.log('ℹ️ No users with common or daily tasks found');
      return res.status(200).json({ 
        success: true, 
        message: 'No users with tasks found',
        usersProcessed: 0,
        commonTasksGenerated: 0,
        dailyTasksGenerated: 0
      });
    }

    let totalCommonTasksGenerated = 0;
    let totalDailyTasksGenerated = 0;
    let usersProcessed = 0;
    let errors = [];

    // Process each user
    for (const userId of userIds) {
      try {
        console.log(`\n👤 Processing user: ${userId}`);

        // Fetch user's common tasks with deadlines
        const { data: commonTasks, error: commonTasksError } = await supabase
          .from('common_tasks')
          .select('*')
          .eq('user_id', userId)
          .not('deadline_date', 'is', null);

        if (commonTasksError) {
          console.error(`❌ Error fetching common tasks for user ${userId}:`, commonTasksError);
          errors.push({ userId, type: 'common_tasks_fetch', error: commonTasksError.message });
          continue;
        }

        // Fetch user's daily tasks
        const { data: dailyTasks, error: dailyTasksError } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('user_id', userId);

        if (dailyTasksError) {
          console.error(`❌ Error fetching daily tasks for user ${userId}:`, dailyTasksError);
          errors.push({ userId, type: 'daily_tasks_fetch', error: dailyTasksError.message });
          continue;
        }

        // Fetch user's existing todos
        const { data: existingTodos, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (todosError) {
          console.error(`❌ Error fetching todos for user ${userId}:`, todosError);
          errors.push({ userId, type: 'todos_fetch', error: todosError.message });
          continue;
        }

        // Process common tasks
        if (commonTasks && commonTasks.length > 0) {
          for (const commonTask of commonTasks) {
            try {
              if (!commonTask.deadline_date) continue;

              const deadlineDate = parseLocalDate(commonTask.deadline_date);
              if (!deadlineDate) continue;

              const recurring = commonTask.deadline_recurring;
              let datesToGenerate = [];

              // First, check how many future tasks already exist for this common task
              const existingFutureTasks = existingTodos.filter(todo => {
                if (todo.text !== commonTask.text) return false;
                if (!todo.deadline_date) return false;
                if (todo.completed) return false;
                // Match recurring pattern
                const todoRecurring = todo.deadline_recurring || null;
                const commonRecurring = recurring || null;
                if (todoRecurring !== commonRecurring) return false;
                // Check if date is today or in the future
                const todoDate = parseLocalDate(todo.deadline_date);
                if (!todoDate) return false;
                const todoDateNormalized = new Date(todoDate);
                todoDateNormalized.setHours(0, 0, 0, 0);
                return todoDateNormalized >= today;
              });

              // We need to ensure 4 future tasks exist
              const tasksNeeded = Math.max(0, 4 - existingFutureTasks.length);

              if (tasksNeeded > 0) {
                if (recurring) {
                  // For recurring tasks, calculate next occurrences
                  let currentDate = new Date(deadlineDate);
                  currentDate.setHours(0, 0, 0, 0);

                  // If the initial date is in the past, calculate the next occurrence
                  while (currentDate < today) {
                    currentDate = getNextRecurringDate(currentDate, recurring);
                  }

                  // Get existing future task dates to avoid duplicates
                  const existingDates = new Set(
                    existingFutureTasks
                      .map(t => {
                        const d = parseLocalDate(t.deadline_date);
                        return d ? formatLocalDate(d) : null;
                      })
                      .filter(d => d !== null)
                  );

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
                      while (checkDate <= maxDate && datesToGenerate.length < tasksNeeded) {
                        const dayIndex = checkDate.getDay();
                        if (selectedDayIndices.includes(dayIndex)) {
                          const dateStr = formatLocalDate(checkDate);
                          if (!existingDates.has(dateStr)) {
                            datesToGenerate.push(new Date(checkDate));
                          }
                        }
                        checkDate.setDate(checkDate.getDate() + 1);
                      }
                    }
                  } else {
                    // Handle standard recurring patterns - generate next occurrences
                    let checkDate = new Date(currentDate);
                    const maxDate = new Date(today);
                    maxDate.setDate(maxDate.getDate() + 30);

                    while (checkDate <= maxDate && datesToGenerate.length < tasksNeeded) {
                      const dateStr = formatLocalDate(checkDate);
                      if (!existingDates.has(dateStr)) {
                        datesToGenerate.push(new Date(checkDate));
                      }
                      checkDate = getNextRecurringDate(checkDate, recurring);
                    }
                  }
                } else {
                  // For one-time deadlines, only generate if deadline is today or in the future
                  const deadlineDateNormalized = new Date(deadlineDate);
                  deadlineDateNormalized.setHours(0, 0, 0, 0);

                  if (deadlineDateNormalized >= today) {
                    const dateStr = formatLocalDate(deadlineDateNormalized);
                    const existingDates = new Set(
                      existingFutureTasks
                        .map(t => {
                          const d = parseLocalDate(t.deadline_date);
                          return d ? formatLocalDate(d) : null;
                        })
                        .filter(d => d !== null)
                    );
                    if (!existingDates.has(dateStr)) {
                      datesToGenerate.push(deadlineDateNormalized);
                    }
                  }
                }
              }

              // Generate tasks for the calculated dates
              for (const targetDate of datesToGenerate) {
                const targetDateStr = formatLocalDate(targetDate);
                if (!targetDateStr) continue;

                // Double-check this date doesn't already exist (safety check)
                const existingTask = existingTodos.find(todo => {
                  if (todo.text !== commonTask.text) return false;
                  if (!todo.deadline_date) return false;
                  if (todo.deadline_date !== targetDateStr) return false;
                  if (todo.completed) return false;
                  // Match recurring pattern
                  const todoRecurring = todo.deadline_recurring || null;
                  const commonRecurring = recurring || null;
                  return todoRecurring === commonRecurring;
                });

                if (!existingTask) {
                  // Generate the task
                  // deadline_time in common_tasks is already stored in UTC format (HH:MM)
                  // We can use it directly, but we need to handle the case where time might need adjustment
                  // For now, use the stored deadline_time directly
                  const newTodo = {
                    user_id: userId,
                    text: commonTask.text,
                    completed: false,
                    list_id: 0, // Default to today list
                    description: commonTask.description || null,
                    time: commonTask.time || null,
                    deadline_date: targetDateStr,
                    deadline_time: commonTask.deadline_time || null,
                    deadline_recurring: recurring || null,
                    type: 'task'
                  };

                  const { error: insertError } = await supabase
                    .from('todos')
                    .insert(newTodo);

                  if (insertError) {
                    console.error(`❌ Error creating task from common task ${commonTask.id}:`, insertError);
                    errors.push({ userId, type: 'common_task_create', taskId: commonTask.id, error: insertError.message });
                  } else {
                    totalCommonTasksGenerated++;
                    console.log(`✅ Created task from common task ${commonTask.id} for date ${targetDateStr}`);
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Error processing common task ${commonTask.id}:`, error);
              errors.push({ userId, type: 'common_task_process', taskId: commonTask.id, error: error.message });
            }
          }
        }

        // Process daily tasks
        if (dailyTasks && dailyTasks.length > 0) {
          for (const dailyTask of dailyTasks) {
            try {
              const tomorrowStr = formatLocalDate(tomorrow);
              if (!tomorrowStr) continue;

              // Check if a task already exists for tomorrow from this daily task template
              const existingTask = existingTodos.find(todo => {
                if (todo.completed) return false;
                if (todo.daily_task_id === dailyTask.id) {
                  // Check if it has tomorrow's date as deadline
                  if (todo.deadline_date === tomorrowStr) {
                    return true;
                  }
                }
                return false;
              });

              if (!existingTask) {
                // Generate tomorrow's task
                const targetListId = dailyTask.list_id !== undefined && dailyTask.list_id !== null ? dailyTask.list_id : 0;
                
                // For daily tasks, time is stored as local time in the time field
                // We need to convert it to UTC for deadline_time
                const newTodo = {
                  user_id: userId,
                  text: dailyTask.text,
                  completed: false,
                  list_id: targetListId,
                  description: dailyTask.description || null,
                  time: dailyTask.time || null,
                  daily_task_id: dailyTask.id,
                  deadline_date: tomorrowStr,
                  deadline_time: dailyTask.time ? 
                    convertTimeToUTC(tomorrow, dailyTask.time) : null,
                  deadline_recurring: 'daily',
                  type: 'task'
                };

                const { error: insertError } = await supabase
                  .from('todos')
                  .insert(newTodo);

                if (insertError) {
                  console.error(`❌ Error creating task from daily task ${dailyTask.id}:`, insertError);
                  errors.push({ userId, type: 'daily_task_create', taskId: dailyTask.id, error: insertError.message });
                } else {
                  totalDailyTasksGenerated++;
                  console.log(`✅ Created task from daily task ${dailyTask.id} for tomorrow`);
                }
              }
            } catch (error) {
              console.error(`❌ Error processing daily task ${dailyTask.id}:`, error);
              errors.push({ userId, type: 'daily_task_process', taskId: dailyTask.id, error: error.message });
            }
          }
        }

        usersProcessed++;
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
        errors.push({ userId, type: 'user_process', error: error.message });
      }
    }

    console.log(`\n✅ Task generation complete!`);
    console.log(`   Users processed: ${usersProcessed}`);
    console.log(`   Common tasks generated: ${totalCommonTasksGenerated}`);
    console.log(`   Daily tasks generated: ${totalDailyTasksGenerated}`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Task generation complete',
      usersProcessed,
      commonTasksGenerated: totalCommonTasksGenerated,
      dailyTasksGenerated: totalDailyTasksGenerated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Fatal error in task generation:', error);
    return res.status(500).json({
      error: 'Task generation failed',
      details: error.message
    });
  }
};
