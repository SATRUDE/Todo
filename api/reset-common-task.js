/**
 * Vercel serverless function to reset a single common task.
 *
 * Deletes every OPEN (incomplete) todo generated from a given common task and
 * returns how many rows were actually removed. It runs with the Supabase
 * service-role key so it can clean up rows the browser client cannot delete
 * under RLS (legacy rows with a NULL user_id, or rows that otherwise fail the
 * `auth.uid() = user_id` policy). Completed todos are kept so history survives.
 *
 * Regeneration of the fresh scheduled set is intentionally left to the client,
 * which reuses its existing generation logic after this endpoint returns.
 *
 * Auth: expects an `Authorization: Bearer <access_token>` header. The user is
 * derived from the verified token rather than trusted from the request body,
 * because this is a destructive bulk delete.
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[reset-common-task] Missing Supabase service-role credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Extract bearer token.
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
    // Verify the token and derive the user.
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Load the common task and confirm it belongs to this user. We use its
    // stored text as the match key so the client can't target arbitrary text.
    const { data: commonTask, error: fetchError } = await supabase
      .from('common_tasks')
      .select('id, user_id, text')
      .eq('id', commonTaskId)
      .single();

    if (fetchError || !commonTask) {
      return res.status(404).json({ error: 'Common task not found' });
    }
    if (commonTask.user_id && commonTask.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your common task' });
    }

    // Delete every open todo whose text matches this common task and that is
    // owned by the user (or is a legacy NULL-user row). Service role bypasses
    // RLS so legacy/orphaned rows are removed too. `.select('id')` returns the
    // rows that were actually deleted, giving an honest count.
    const { data: deleted, error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('text', commonTask.text)
      .eq('completed', false)
      .or(`user_id.eq.${user.id},user_id.is.null`)
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
