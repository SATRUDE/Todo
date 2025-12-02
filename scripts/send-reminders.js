#!/usr/bin/env node

/**
 * Send push notifications for due/overdue todos
 * This script is run by GitHub Actions on a cron schedule
 */

// Check if dependencies are available
try {
  require.resolve('@supabase/supabase-js');
  require.resolve('web-push');
} catch (error) {
  console.error('❌ Missing required dependencies. Please run: npm install');
  console.error('Error:', error.message);
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'NOT SET');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'Set' : 'NOT SET');
  process.exit(1);
}

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ Missing VAPID keys');
  console.error('Required: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
  console.error('VAPID_PUBLIC_KEY:', vapidPublicKey ? 'Set' : 'NOT SET');
  console.error('VAPID_PRIVATE_KEY:', vapidPrivateKey ? 'Set' : 'NOT SET');
  process.exit(1);
}

console.log('✅ All environment variables are set');
console.log('📊 Supabase URL:', supabaseUrl.substring(0, 30) + '...');

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com', // This can be any email or a URL
  vapidPublicKey,
  vapidPrivateKey
);

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

  // If deadline_time is set, check if current time is within ±5 minutes
  // Since deadlines are restricted to 15-minute intervals, this ensures notifications are sent
  const [hours, minutes] = todo.deadline_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    // Invalid time format, treat as due if date matches
    return deadlineDate <= today;
  }

  const deadlineDateTime = new Date(deadlineDate);
  deadlineDateTime.setHours(hours, minutes, 0, 0);

  // Check if current time is within ±5 minutes of deadline
  // Since deadlines are now restricted to 15-minute intervals, a ±5 minute window ensures
  // notifications are sent when the workflow runs at the scheduled time
  const timeDiff = Math.abs(now - deadlineDateTime);
  const fiveMinutes = 5 * 60 * 1000;

  return timeDiff <= fiveMinutes;
}

/**
 * Send push notification to a subscription
 */
async function sendNotification(subscription, todo) {
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
    console.error('Error details:', {
      statusCode: error.statusCode,
      endpoint: error.endpoint,
      body: error.body,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting reminder check...');
  console.log(`⏰ Current time: ${new Date().toISOString()}`);

  try {
    // Fetch all incomplete todos
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
      return;
    }

    console.log(`📋 Found ${todos.length} todos with deadlines`);

    // Filter todos that are due
    const dueTodos = todos.filter(isTodoDue);

    if (dueTodos.length === 0) {
      console.log('ℹ️ No todos are due at this time');
      return;
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
      return;
    }

    console.log(`📱 Found ${subscriptions.length} push subscriptions`);

    // Send notifications for each due todo to all subscriptions
    let successCount = 0;
    let failureCount = 0;

    for (const todo of dueTodos) {
      console.log(`\n📝 Processing todo #${todo.id}: "${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}"`);

      for (const subscription of subscriptions) {
        const success = await sendNotification(subscription, todo);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    console.log(`\n✅ Reminder check complete!`);
    console.log(`   Successfully sent: ${successCount} notifications`);
    console.log(`   Failed: ${failureCount} notifications`);
  } catch (error) {
    console.error('❌ Error in reminder check:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

