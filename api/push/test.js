const webPush = require('web-push');

function parseBody(req) {
  if (!req.body) {
    return null;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[push/test] Failed to parse JSON body', error);
      return null;
    }
  }

  return req.body;
}

function ensureVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return { error: 'Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables.' };
  }

  webPush.setVapidDetails('mailto:todo-app@example.com', publicKey, privateKey);
  return { publicKey, privateKey };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const vapidStatus = ensureVapidConfig();
  if (vapidStatus.error) {
    return res.status(500).json({ error: vapidStatus.error });
  }

  const body = parseBody(req) || {};
  const subscription = body.subscription;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  const payload = JSON.stringify({
    title: 'Todo App',
    body: 'Push notifications are working!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'test-notification',
    requireInteraction: false,
    data: {
      url: '/',
      test: true,
    },
  });

  try {
    await webPush.sendNotification(subscription, payload);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[push/test] Failed to send push notification', error);

    if (error.statusCode === 404 || error.statusCode === 410) {
      return res.status(410).json({ error: 'Subscription is no longer valid.' });
    }

    return res.status(500).json({ error: 'Failed to send push notification.' });
  }
};
