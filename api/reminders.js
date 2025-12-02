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
function isTodoDue(todo) {
  if (!todo.deadline_date) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(todo.deadline_date);

  // Check if deadline_date is today or in the past
  if (deadlineDate > today) {
    return false;
  }

  // If no deadline_time, consider it due if deadline_date is today or past
  if (!todo.deadline_time) {
    return deadlineDate <= today;
  }

  // If deadline_time is set, check if current time is within ±1 minute of deadline
  // With cron running every minute, this ensures notifications are sent at the exact deadline time
  const [hours, minutes] = todo.deadline_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    // Invalid time format, treat as due if date matches
    return deadlineDate <= today;
  }

  const deadlineDateTime = new Date(deadlineDate);
  deadlineDateTime.setHours(hours, minutes, 0, 0);

  // Check if current time is within ±1 minute of deadline
  // With 1-minute cron schedule, this ensures notifications are sent at the exact time
  const timeDiff = Math.abs(now - deadlineDateTime);
  const oneMinute = 1 * 60 * 1000;

  return timeDiff <= oneMinute;
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

    // Filter todos that are due and haven't been notified
    const dueTodos = todos.filter(todo => {
      if (todo.deadline_notified_at) {
        // Check if we've already notified for this deadline
        const deadlineDateTime = todo.deadline_time 
          ? (() => {
              const [hours, minutes] = todo.deadline_time.split(':').map(Number);
              const deadlineDate = new Date(todo.deadline_date);
              deadlineDate.setHours(hours, minutes, 0, 0);
              return deadlineDate.toISOString();
            })()
          : new Date(todo.deadline_date).toISOString();
        
        // If already notified for this exact deadline, skip
        if (todo.deadline_notified_at === deadlineDateTime) {
          return false;
        }
      }
      return isTodoDue(todo);
    });

    if (dueTodos.length === 0) {
      console.log('ℹ️ No todos are due at this time');
      return res.status(200).json({ 
        success: true, 
        message: 'No todos are due at this time',
        checked: new Date().toISOString()
      });
    }

    console.log(`⏰ Found ${dueTodos.length} due todos`);

    // Fetch all push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No push subscriptions found');
      return res.status(200).json({ 
        success: true, 
        message: 'No push subscriptions found',
        checked: new Date().toISOString()
      });
    }

    console.log(`📱 Found ${subscriptions.length} push subscriptions`);

    // Send notifications for each due todo to all subscriptions
    let successCount = 0;
    let failureCount = 0;

    for (const todo of dueTodos) {
      console.log(`\n📝 Processing todo #${todo.id}: "${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}"`);

      let todoNotificationSent = false;
      for (const subscription of subscriptions) {
        const success = await sendNotification(subscription, todo, supabase);
        if (success) {
          successCount++;
          todoNotificationSent = true;
        } else {
          failureCount++;
        }
      }

      // Mark this todo as notified after successfully sending to at least one subscription
      if (todoNotificationSent) {
        const deadlineDateTime = todo.deadline_time 
          ? (() => {
              const [hours, minutes] = todo.deadline_time.split(':').map(Number);
              const deadlineDate = new Date(todo.deadline_date);
              deadlineDate.setHours(hours, minutes, 0, 0);
              return deadlineDate.toISOString();
            })()
          : new Date(todo.deadline_date).toISOString();

        await supabase
          .from('todos')
          .update({ deadline_notified_at: deadlineDateTime })
          .eq('id', todo.id);
        
        console.log(`✅ Marked todo #${todo.id} as notified`);
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

