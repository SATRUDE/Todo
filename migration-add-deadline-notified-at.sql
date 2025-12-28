-- Migration: Add deadline_notified_at column to todos table
-- Run this in your Supabase SQL Editor if the column doesn't exist

-- Add the deadline_notified_at column if it doesn't exist
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS deadline_notified_at TIMESTAMP WITH TIME ZONE;

-- Add a comment to document the column
COMMENT ON COLUMN todos.deadline_notified_at IS 'Track when notification was sent for this deadline to prevent duplicate notifications';



