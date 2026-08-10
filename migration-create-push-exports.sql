-- Migration: PUSH export uploads
--
-- Mark's lifting history comes out of the PUSH app as one JSON file, about 5 MB.
-- Until now the only way in was Mark committing it to the marks-magazine repo by
-- hand, which is friction, and it shows: the committed copy sat a month stale.
-- This lets him upload it on the Workouts page instead, so everything training
-- lives in one place.
--
-- The table is a queue in the same shape as workout_logs: Mickey's routine reads
-- rows with applied_at IS NULL, downloads the file, rebuilds the dashboard from
-- it, and stamps the row.
--
-- Adds:
--   * a PRIVATE gym-exports storage bucket, owner-scoped by user folder
--   * push_exports (one row per upload)

-- The bucket. Private, unlike task-images: this is Mark's whole training history,
-- and nothing needs to read it in a browser without a session.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gym-exports', 'gym-exports', FALSE, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['application/json'];

-- Owner-scoped: the first path segment must be the uploader's own user id, the
-- same convention task-images uses for deletes.
DROP POLICY IF EXISTS "gym_exports_owner_insert" ON storage.objects;
CREATE POLICY "gym_exports_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gym-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "gym_exports_owner_select" ON storage.objects;
CREATE POLICY "gym_exports_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'gym-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "gym_exports_owner_delete" ON storage.objects;
CREATE POLICY "gym_exports_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gym-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE TABLE IF NOT EXISTS push_exports (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Path inside the gym-exports bucket, e.g. '<uid>/push-2026-08-10T09-12-03.json'.
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  -- Read out of the file at upload time, so the app can say what it just took
  -- without downloading 5 MB again.
  workout_count INTEGER,
  latest_workout_date DATE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Stamped by the trainer routine once it has rebuilt the dashboard from this
  -- file. NULL means "not yet applied"; that is the queue.
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE push_exports IS
  'PUSH app JSON exports Mark uploads in the app. The trainer routine applies rows with applied_at IS NULL and stamps them.';

CREATE INDEX IF NOT EXISTS idx_push_exports_user
  ON push_exports(user_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_exports_unapplied
  ON push_exports(applied_at, uploaded_at)
  WHERE applied_at IS NULL;

ALTER TABLE push_exports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "push_exports_owner" ON push_exports;
EXCEPTION WHEN undefined_table THEN NULL; WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "push_exports_owner" ON push_exports
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
