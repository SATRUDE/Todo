-- Add description column to todos table if it doesn't exist
-- Run this in your Supabase SQL Editor

ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS description TEXT;



