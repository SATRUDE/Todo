/**
 * Vercel serverless function to reset a single common task.
 *
 * Deletes every OPEN (incomplete) todo generated from a given common task and
 * returns how many rows were actually removed. It runs with the Supabase
 * service-role key so it can clean up rows the browser client cannot delete
 * under RLS — including legacy rows created under an anonymous session with a
 * different or NULL user_id, which is exactly what made earlier client-side
 * resets report success while leaving every task in place. Completed todos are
 * kept so history survives.
 *
 * Regeneration of the fresh scheduled set is intentionally left to the client,
 * which reuses its existing generation logic after this endpoint returns.
 *
 * Matching is by the common task's stored text (looked up server-side, so the
 * client can't target arbitrary text). This is a single-user app, so an open
 * todo with that text is, by definition, an instance of this common task.
 *
 * Auth: requires an `Authorization: Bearer <access_token>` header; the token
 * must resolve to a valid user before anything is deleted.
 */

const { createClient } = require('@supabase/supabase-js');

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[reset-common-task] Failed to parse JSON body', error);
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

  // Target the same project the frontend uses. VITE_SUPABASE_URL is the
  // app's URL; prefer it so we never operate on a different database than the
  // one the user is looking at.
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[reset-common-task] Missing Supabase service-role credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const body = parseBody(req) || {};
  const commonTaskId = body.commonTaskId;
  if (commonTaskId === undefined || commonTaskId === null) {
    return res.status(400).json({ error: 'commonTaskId is required' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Require an authenticated caller before any destructive work.
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up the common task to get its exact stored text (the match key).
    const { data: commonTask, error: fetchError } = await supabase
      .from('common_tasks')
      .select('*')
      .eq('id', commonTaskId)
      .single();

    if (fetchError || !commonTask) {
      return res.status(404).json({ error: 'Common task not found' });
    }

    // Delete every open todo whose text matches this common task. No user_id
    // filter: the legacy duplicates may carry assorted/NULL user_ids, and the
    // service role + token check already gate the operation. `.select('id')`
    // returns the rows actually deleted, giving an honest count.
    const { data: deleted, error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('text', commonTask.text)
      .eq('completed', false)
      .select('id');

    if (deleteError) {
      console.error('[reset-common-task] Delete failed:', deleteError);
      return res.status(500).json({ error: 'Failed to delete tasks', message: deleteError.message });
    }

    const deletedCount = Array.isArray(deleted) ? deleted.length : 0;
    console.log(`[reset-common-task] Removed ${deletedCount} open task(s) for common task ${commonTaskId}`);

    return res.status(200).json({ success: true, deletedCount });
  } catch (error) {
    console.error('[reset-common-task] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
