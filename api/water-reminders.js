/**
 * Vercel serverless function to send water reminder push notifications
 * Runs at 9am, 12pm, 2pm, 4pm (configurable via REMINDER_TIMEZONE)
 */

const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

/** Water reminder times (hour in 24h format) - 9am, 12pm, 2pm, 4pm */
const WATER_REMINDER_HOURS = [9, 12, 14, 16];

function getCurrentHourInTimezone() {
  const tz = process.env.REMINDER_TIMEZONE || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
}

function isWaterReminderTime() {
  const { hour, minute } = getCurrentHourInTimezone();
  // Run at the top of the hour (minute 0-4 to account for cron variance)
  return WATER_REMINDER_HOURS.includes(hour) && minute < 5;
}

async function sendWaterNotification(subscription, supabase) {
  try {
    const payload = JSON.stringify({
      title: 'Stay hydrated! 💧',
      body: 'Time to drink water',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'water-reminder',
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
    console.error('Failed to send water notification:', error.message);
    return false;
  }
}

function getScheduledSlot() {
  const { hour } = getCurrentHourInTimezone();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hour)}:00`;
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

  const { hour, minute } = getCurrentHourInTimezone();
  if (!WATER_REMINDER_HOURS.includes(hour) || minute >= 5) {
    console.log(
      `Skipping water reminders: not a reminder time (current: ${hour}:${String(minute).padStart(2, '0')}, times: ${WATER_REMINDER_HOURS.join(',')})`
    );
    return res.status(200).json({
      success: true,
      message: 'Not a water reminder time',
      checked: new Date().toISOString(),
      currentHour: hour,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const scheduledSlot = getScheduledSlot();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  try {
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .not('user_id', 'is', null);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No push subscriptions found',
        checked: new Date().toISOString(),
        notificationsSent: 0,
      });
    }

    // Fetch users who already received this slot recently (avoid duplicates when cron runs every 10 min)
    const { data: alreadySent } = await supabase
      .from('water_reminder_log')
      .select('user_id')
      .gte('sent_at', twoHoursAgo)
      .eq('scheduled_slot', scheduledSlot);

    const alreadySentUserIds = new Set((alreadySent || []).map((r) => r.user_id));

    let sent = 0;
    const now = new Date().toISOString();

    for (const sub of subscriptions) {
      if (alreadySentUserIds.has(sub.user_id)) continue;

      const success = await sendWaterNotification(sub, supabase);
      if (success) {
        sent++;
        await supabase.from('water_reminder_log').insert({
          user_id: sub.user_id,
          sent_at: now,
          scheduled_slot: scheduledSlot,
        });
      }
    }

    console.log(`Water reminders: sent ${sent} notifications at ${scheduledSlot}`);

    return res.status(200).json({
      success: true,
      message: 'Water reminder check complete',
      checked: now,
      scheduledSlot,
      notificationsSent: sent,
    });
  } catch (error) {
    console.error('Error in water reminders:', error);
    return res.status(500).json({
      error: 'Failed to process water reminders',
      message: error.message,
      checked: new Date().toISOString(),
    });
  }
};
