function parseBody(req) {
  if (!req.body) {
    return null;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[push/subscribe] Failed to parse JSON body', error);
      return null;
    }
  }

  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseBody(req) || {};
  const subscription = body.subscription;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  console.log('[push/subscribe] Received subscription', subscription.endpoint);

  // In a real implementation you would persist the subscription in a database.
  // For now we simply acknowledge receipt so the client knows the call succeeded.
  return res.status(200).json({ success: true });
};
