-- Migration: backfill status on tasks that were already completed
--
-- migration-add-task-status.sql tried to do this and could not. Adding a
-- column WITH a default fills every existing row at once, so by the time its
-- `WHERE status IS NULL` ran there were no nulls left and all 1303 finished
-- tasks were sitting at 'todo'.
--
-- The app was never wrong because of it: taskStatusOf derives Done from the
-- `completed` flag and ignores the stored value. But anything reading the
-- column straight, a report or a card query, would have miscounted, so the
-- stored data should say what is true.

UPDATE todos
SET status = 'done'
WHERE completed AND status <> 'done';

-- Verification (run separately):
-- SELECT status, completed, count(*) FROM todos GROUP BY status, completed ORDER BY count(*) DESC;
