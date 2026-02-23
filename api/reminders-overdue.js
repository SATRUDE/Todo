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
 */
function isTodoOverdue(todo) {
  if (!todo.deadline_date) return false;

  const now = new Date();
  const [year, month, day] = todo.deadline_date.split('-').map(Number);
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const deadlineDateUTC = new Date(Date.UTC(year, month - 1, day));

  if (deadlineDateUTC.getTime() > todayUTC.getTime()) return false;

  if (!todo.deadline_time || todo.deadline_time.trim() === '') {
    return true; // date passed, no time → overdue
  }

  const [hours, minutes] = todo.deadline_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return true;

  const deadlineDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  return now >= deadlineDateTime;
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

    const overdueTodos = (todos || []).filter(isTodoOverdue);
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
