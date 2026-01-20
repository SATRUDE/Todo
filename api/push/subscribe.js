const { createClient } = require('@supabase/supabase-js');

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
  // #region agent log
  const fs = require('fs');
  const logPath = '/Users/markdiffey/Documents/Todo/.cursor/debug.log';
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:entry',message:'Handler entry',data:{method:req.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
  } catch(e){}
  // #endregion
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseBody(req) || {};
  const subscription = body.subscription;
  const userId = body.user_id;

  // #region agent log
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:parsedBody',message:'Parsed request body',data:{hasSubscription:!!subscription,hasEndpoint:!!subscription?.endpoint,hasUserId:!!userId,hasKeys:!!subscription?.keys,hasP256dh:!!subscription?.keys?.p256dh,hasAuth:!!subscription?.keys?.auth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
  } catch(e){}
  // #endregion

  if (!subscription || !subscription.endpoint) {
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:invalidPayload',message:'Invalid subscription payload',data:{hasSubscription:!!subscription,hasEndpoint:!!subscription?.endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:invalidKeys',message:'Invalid subscription keys',data:{hasKeys:!!subscription?.keys,hasP256dh:!!subscription?.keys?.p256dh,hasAuth:!!subscription?.keys?.auth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(400).json({ error: 'Invalid subscription keys' });
  }

  if (!userId) {
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:noUserId',message:'User ID is required',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log('[push/subscribe] Received subscription', subscription.endpoint, 'for user', userId);

  // Get Supabase credentials from environment variables
  // Use service role key to bypass RLS (required for serverless functions)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:checkCredentials',message:'Checking Supabase credentials',data:{hasSupabaseUrl:!!supabaseUrl,hasSupabaseServiceRoleKey:!!supabaseServiceRoleKey,urlLength:supabaseUrl?.length,keyLength:supabaseServiceRoleKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
  } catch(e){}
  // #endregion

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[push/subscribe] Missing Supabase credentials');
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:missingCredentials',message:'Missing Supabase credentials',data:{hasSupabaseUrl:!!supabaseUrl,hasSupabaseServiceRoleKey:!!supabaseServiceRoleKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(500).json({ error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:beforeUpsert',message:'About to upsert subscription',data:{userId:userId.substring(0,8),endpointLength:subscription.endpoint?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'5'})+'\n');
    } catch(e){}
    // #endregion

    // Upsert subscription (insert or update if endpoint already exists)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single();

    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:afterUpsert',message:'Upsert completed',data:{hasData:!!data,dataId:data?.id,hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error?.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'5'})+'\n');
    } catch(e){}
    // #endregion

    if (error) {
      console.error('[push/subscribe] Database error:', error);
      // #region agent log
      try {
        fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:databaseError',message:'Database error occurred',data:{errorCode:error.code,errorMessage:error.message,errorDetails:error.details,errorHint:error.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'5'})+'\n');
      } catch(e){}
      // #endregion
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    console.log('[push/subscribe] Subscription saved successfully');
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:success',message:'Subscription saved successfully',data:{dataId:data?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'5'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('[push/subscribe] Unexpected error:', error);
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'api/push/subscribe.js:handler:catch',message:'Unexpected exception',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})+'\n');
    } catch(e){}
    // #endregion
    return res.status(500).json({ error: 'Internal server error' });
  }
};
