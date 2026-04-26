/**
 * Vercel serverless function to send periodic push notifications for overdue todos
 * Runs during allowed hours only (9am–10pm). No notifications between 10pm and 9am.
 * Throttled to at most one "overdue summary" per user every 4 hours.
 */

const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

/** Interval in ms before we send another overdue reminder to the same user */
const OVERDUE_REMINDER_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Check if we're in quiet hours (10pm–9am). No notifications during this window.
 * Uses REMINDER_TIMEZONE env (default UTC) for the time check.
 */
function isWithinQuietHours() {
  const tz = process.env.REMINDER_TIMEZONE || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(formatter.format(new Date()), 10);
  // Quiet: 22:00–23:59 and 00:00–08:59
  return hour >= 22 || hour < 9;
}

/**
 * Check if a todo is overdue (deadline has passed, not completed)
 * Uses Norwegian timezone (Europe/Oslo) for all comparisons
 */
function isTodoOverdue(todo) {
  if (!todo.deadline_date) return false;

  const tz = process.env.REMINDER_TIMEZONE || 'Europe/Oslo';
  const now = new Date();
  
  const [year, month, day] = todo.deadline_date.split('-').map(Number);

  if (!todo.deadline_time || todo.deadline_time.trim() === '') {
    // If no time specified, the task is overdue at the start of the next day (in Norwegian timezone)
    // This means a task due on April 26 becomes overdue on April 27 at 00:00 Norwegian time
    const deadlineDate = new Date(year, month - 1, day);
    
    // Get current date in Norwegian timezone (YYYY-MM-DD format)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const currentDateStr = formatter.format(now);
    const [currentYear, currentMonth, currentDay] = currentDateStr.split('-').map(Number);
    const currentDate = new Date(currentYear, currentMonth - 1, currentDay);
    
    // Task is overdue if the current date (in Norwegian timezone) is AFTER the deadline date
    return currentDate > deadlineDate;
  }

  const [hours, minutes] = todo.deadline_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    // Invalid time format - treat as no time (overdue at start of next day)
    const deadlineDate = new Date(year, month - 1, day);
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const currentDateStr = formatter.format(now);
    const [currentYear, currentMonth, currentDay] = currentDateStr.split('-').map(Number);
    const currentDate = new Date(currentYear, currentMonth - 1, currentDay);
    
    return currentDate > deadlineDate;
  }

  // Task has both date and time - need to compare exact datetime in Norwegian timezone
  // The deadline_time is stored in the user's local timezone (Norwegian time)
  // We need to create a datetime object that represents the deadline in Norwegian timezone
  
  // Create a date string in ISO format for the deadline date
  const deadlineDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const deadlineTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  // Parse the deadline in Norwegian timezone
  // We create a localized date string and parse it as if it were in Norwegian time
  const deadlineDateTimeStr = `${deadlineDateStr}T${deadlineTimeStr}`;
  
  // Create a Date object for the deadline
  // We'll use Intl.DateTimeFormat to get the current time in Norwegian timezone
  // and compare it with the deadline
  const nowInNorwegianTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  
  const currentNorwegianDateTime = {};
  nowInNorwegianTz.forEach(part => {
    if (part.type !== 'literal') {
      currentNorwegianDateTime[part.type] = parseInt(part.value, 10);
    }
  });
  
  // Compare dates first
  if (currentNorwegianDateTime.year > year) return true;
  if (currentNorwegianDateTime.year < year) return false;
  if (currentNorwegianDateTime.month > month) return true;
  if (currentNorwegianDateTime.month < month) return false;
  if (currentNorwegianDateTime.day > day) return true;
  if (currentNorwegianDateTime.day < day) return false;
  
  // Same date, compare time
  if (currentNorwegianDateTime.hour > hours) return true;
  if (currentNorwegianDateTime.hour < hours) return false;
  if (currentNorwegianDateTime.minute >= minutes) return true;
  
  return false;
}

async function sendOverdueNotification(subscription, count, supabase) {
  try {
    const payload = JSON.stringify({
      title: 'Overdue items',
      body: `You have ${count} overdue ${count === 1 ? 'item' : 'items'} to address`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `overdue-summary-${subscription.user_id}`,
      data: { url: '/' },
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload
    );
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription.id);
    }
    console.error('Failed to send overdue notification:', error.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'Missing VAPID keys' });
  }

  webpush.setVapidDetails('mailto:todo-app@example.com', vapidPublicKey, vapidPrivateKey);

  if (isWithinQuietHours()) {
    console.log('Skipping overdue reminders: within quiet hours (10pm–9am)');
    return res.status(200).json({
      success: true,
      message: 'Skipped: quiet hours (10pm–9am)',
      checked: new Date().toISOString(),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .not('deadline_date', 'is', null);

    if (todosError) {
      throw new Error(`Failed to fetch todos: ${todosError.message}`);
    }

    // Filter out reminders and daily tasks, then check for overdue
    const overdueTodos = (todos || []).filter(todo => {
      // Exclude reminders - they should not show as overdue
      if (todo.type === 'reminder') return false;
      
      // Exclude daily tasks - they should be deleted and replaced, not shown as overdue
      if (todo.daily_task_id !== undefined && todo.daily_task_id !== null) return false;
      
      // Check if the task is actually overdue
      return isTodoOverdue(todo);
    });
    if (overdueTodos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No overdue todos',
        checked: new Date().toISOString(),
      });
    }

    const byUser = new Map();
    for (const todo of overdueTodos) {
      const uid = todo.user_id;
      if (!uid) continue;
      byUser.set(uid, (byUser.get(uid) || 0) + 1);
    }

    const { data: logRows } = await supabase
      .from('overdue_notification_log')
      .select('user_id, sent_at')
      .in('user_id', [...byUser.keys()]);

    const lastSent = new Map();
    for (const row of logRows || []) {
      lastSent.set(row.user_id, new Date(row.sent_at));
    }

    const now = new Date();
    let sent = 0;

    for (const [userId, count] of byUser) {
      const last = lastSent.get(userId);
      if (last && now - last < OVERDUE_REMINDER_INTERVAL_MS) continue;

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subs || subs.length === 0) continue;

      for (const sub of subs) {
        if (await sendOverdueNotification(sub, count, supabase)) sent++;
      }

      await supabase
        .from('overdue_notification_log')
        .upsert(
          { user_id: userId, sent_at: now.toISOString() },
          { onConflict: 'user_id' }
        );
    }

    return res.status(200).json({
      success: true,
      message: 'Overdue reminder check complete',
      checked: now.toISOString(),
      overdueCount: overdueTodos.length,
      notificationsSent: sent,
    });
  } catch (error) {
    console.error('Error in overdue reminders:', error);
    return res.status(500).json({
      error: 'Failed to process overdue reminders',
      message: error.message,
      checked: new Date().toISOString(),
    });
  }
};
