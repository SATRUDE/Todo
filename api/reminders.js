/**
 * Vercel serverless function to send push notifications for due/overdue todos
 * This endpoint is called by Vercel cron jobs
 */

const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

/**
 * Check if a todo is due based on deadline_date and deadline_time
 */
function isTodoDue(todo, logContext = '') {
  if (!todo.deadline_date) {
    if (logContext) console.log(`${logContext} - No deadline_date`);
    return false;
  }

  const now = new Date();
  
  // Parse deadline_date (YYYY-MM-DD format)
  const [year, month, day] = todo.deadline_date.split('-').map(Number);
  
  // Create today's date in UTC (midnight UTC)
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  // Create deadline date in UTC (midnight UTC)
  const deadlineDateUTC = new Date(Date.UTC(year, month - 1, day));

  // REQUIRE both date AND time to be set for notifications
  // If no deadline_time, do NOT send notification (return false)
  if (!todo.deadline_time || todo.deadline_time.trim() === '') {
    if (logContext) {
      console.log(`${logContext} - No time set, skipping notification (notifications require both date and time)`);
    }
    return false;
  }

  // Check if deadline_date is in the future (if so, don't send notification)
  // Compare dates only (not times) - if deadline date is after today, skip
  if (deadlineDateUTC.getTime() > todayUTC.getTime()) {
    if (logContext) {
      console.log(`${logContext} - Deadline date ${todo.deadline_date} is in the future (today UTC: ${todayUTC.toISOString().split('T')[0]})`);
    }
    return false;
  }

  // If deadline_time is set, check if current time is at or past the deadline
  // We check if the deadline has passed (not just within a window) to ensure we catch it
  const [hours, minutes] = todo.deadline_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    // Invalid time format, do NOT send notification
    if (logContext) {
      console.log(`${logContext} - Invalid time format: ${todo.deadline_time}, skipping notification`);
    }
    return false;
  }

  // Create deadline datetime in UTC (Vercel servers run in UTC)
  // The deadline_time is stored as HH:MM and should be interpreted as UTC
  // Use Date.UTC to ensure we're creating the date in UTC timezone
  const deadlineDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  // Calculate time difference (positive = deadline has passed, negative = deadline is in future)
  const timeDiff = now - deadlineDateTime;
  
  // Send notification if deadline has passed (timeDiff >= 0)
  // The deadline_notified_at check in the main handler will prevent duplicates,
  // ensuring we only send one notification per todo when the deadline is first hit
  const isDue = timeDiff >= 0;

  if (logContext) {
    const diffSeconds = Math.round(timeDiff / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    const timeStr = diffHours > 0 
      ? `${diffHours}h ${remainingMinutes}m ${diffSeconds % 60}s`
      : `${remainingMinutes}m ${diffSeconds % 60}s`;
    console.log(`${logContext} - Deadline: ${deadlineDateTime.toISOString()}, Now: ${now.toISOString()}, Diff: ${timeStr}, Due: ${isDue}`);
  }

  return isDue;
}

/**
 * Send push notification to a subscription
 */
async function sendNotification(subscription, todo, supabase) {
  try {
    const payload = JSON.stringify({
      title: 'Todo Reminder',
      body: todo.text.length > 100 ? todo.text.substring(0, 100) + '...' : todo.text,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `todo-${todo.id}`,
      data: {
        todoId: todo.id,
        url: '/',
      },
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    );

    console.log(`✅ Sent notification for todo #${todo.id} to ${subscription.endpoint.substring(0, 50)}...`);
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid, remove it
      console.log(`⚠️ Removing invalid subscription: ${subscription.endpoint.substring(0, 50)}...`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription.id);
      return false;
    }
    console.error(`❌ Failed to send notification: ${error.message}`);
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Only allow GET requests (for cron) or POST (for manual triggering)
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
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

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('❌ Missing VAPID keys');
    return res.status(500).json({ 
      error: 'Missing VAPID keys',
      details: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set'
    });
  }

  // Configure web-push with VAPID keys
  webpush.setVapidDetails(
    'mailto:todo-app@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('🚀 Starting reminder check...');
  console.log(`⏰ Current time: ${new Date().toISOString()}`);

  try {
    // Fetch all incomplete todos that haven't been notified yet
    // We check deadline_notified_at to avoid duplicate notifications
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .not('deadline_date', 'is', null);

    if (todosError) {
      throw new Error(`Failed to fetch todos: ${todosError.message}`);
    }

    if (!todos || todos.length === 0) {
      console.log('ℹ️ No todos with deadlines found');
      return res.status(200).json({ 
        success: true, 
        message: 'No todos with deadlines found',
        checked: new Date().toISOString()
      });
    }

    console.log(`📋 Found ${todos.length} todos with deadlines`);
    
    // Log all todos with deadlines for debugging
    todos.forEach(todo => {
      console.log(`  - Todo #${todo.id}: "${todo.text.substring(0, 30)}..." | Date: ${todo.deadline_date} | Time: ${todo.deadline_time || 'none'} | Completed: ${todo.completed} | Notified: ${todo.deadline_notified_at || 'never'}`);
    });

    // Filter todos that are due and haven't been notified
    const dueTodos = todos.filter(todo => {
      const logPrefix = `Todo #${todo.id} "${todo.text.substring(0, 30)}..."`;
      
      // Check if already notified - if deadline_notified_at exists, skip entirely
      // This ensures we only send notification once when the deadline is first hit
      if (todo.deadline_notified_at && todo.deadline_notified_at !== null && todo.deadline_notified_at !== '') {
        console.log(`${logPrefix} - Already notified at ${todo.deadline_notified_at}, skipping`);
        return false;
      }
      
      // Check if due (deadline has passed)
      const isDue = isTodoDue(todo, logPrefix);
      if (!isDue) {
        console.log(`${logPrefix} - Not due yet (deadline is in the future)`);
      }
      return isDue;
    });

    if (dueTodos.length === 0) {
      console.log('ℹ️ No todos are due at this time');
      console.log(`📊 Summary: Checked ${todos.length} todos with deadlines, ${todos.length - dueTodos.length} were filtered out`);
      return res.status(200).json({ 
        success: true, 
        message: 'No todos are due at this time',
        checked: new Date().toISOString(),
        todosChecked: todos.length,
        todosFiltered: todos.length - dueTodos.length
      });
    }

    console.log(`⏰ Found ${dueTodos.length} due todos`);

    // Note: Subscriptions are now fetched per-user in the loop below

      // Send notifications for each due todo to user's subscriptions
      let successCount = 0;
      let failureCount = 0;

      for (const todo of dueTodos) {
      console.log(`\n📝 Processing todo #${todo.id}: "${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}"`);

      // Mark as notified IMMEDIATELY before sending to prevent duplicate notifications
      // This uses a database-level check to ensure only one process can mark it as notified
      // Use UTC to match the isTodoDue function logic
      const [year, month, day] = todo.deadline_date.split('-').map(Number);
      const deadlineDateTime = todo.deadline_time 
        ? (() => {
            const [hours, minutes] = todo.deadline_time.split(':').map(Number);
            // Create deadline datetime in UTC to match isTodoDue function
            const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
            return dt.toISOString();
          })()
        : new Date(Date.UTC(year, month - 1, day)).toISOString();

      // Try to mark as notified - only succeeds if deadline_notified_at is currently null
      // This prevents race conditions if multiple cron jobs run simultaneously
      const { data: updateData, error: updateError } = await supabase
        .from('todos')
        .update({ deadline_notified_at: deadlineDateTime })
        .eq('id', todo.id)
        .is('deadline_notified_at', null) // Only update if not already set
        .select();
      
      if (updateError) {
        console.error(`❌ Failed to mark todo #${todo.id} as notified:`, updateError);
        // If update failed, skip sending notifications to avoid duplicates
        continue;
      }
      
      // Check if the update actually happened (another process might have already marked it)
      if (!updateData || updateData.length === 0) {
        console.log(`⚠️ Todo #${todo.id} was already marked as notified by another process, skipping`);
        continue;
      }
      
      console.log(`✅ Marked todo #${todo.id} as notified at ${deadlineDateTime}`);

      // Fetch subscriptions for this todo's user
      const { data: userSubscriptions, error: userSubsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', todo.user_id);

      if (userSubsError) {
        console.error(`❌ Failed to fetch subscriptions for user ${todo.user_id}:`, userSubsError);
        continue;
      }

      if (!userSubscriptions || userSubscriptions.length === 0) {
        console.log(`ℹ️ No push subscriptions found for user ${todo.user_id}`);
        continue;
      }

      // Now send notifications - we've already marked it as notified so duplicates are prevented
      let todoNotificationSent = false;
      for (const subscription of userSubscriptions) {
        const success = await sendNotification(subscription, todo, supabase);
        if (success) {
          successCount++;
          todoNotificationSent = true;
        } else {
          failureCount++;
        }
      }
      
      if (todoNotificationSent) {
        console.log(`📤 Sent notifications for todo #${todo.id}`);
      } else {
        console.log(`⚠️ Failed to send notifications for todo #${todo.id}, but it's already marked as notified`);
      }
    }

    console.log(`\n✅ Reminder check complete!`);
    console.log(`   Successfully sent: ${successCount} notifications`);
    console.log(`   Failed: ${failureCount} notifications`);

    return res.status(200).json({
      success: true,
      message: 'Reminder check complete',
      checked: new Date().toISOString(),
      dueTodos: dueTodos.length,
      subscriptions: subscriptions.length,
      notificationsSent: successCount,
      notificationsFailed: failureCount
    });
  } catch (error) {
    console.error('❌ Error in reminder check:', error);
    return res.status(500).json({
      error: 'Failed to process reminders',
      message: error.message,
      checked: new Date().toISOString()
    });
  }
};

