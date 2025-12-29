-- Migration: Add deadline fields to common_tasks table
-- Run this in your Supabase SQL Editor after creating the common_tasks table

-- Add deadline_date column
ALTER TABLE common_tasks 
ADD COLUMN IF NOT EXISTS deadline_date DATE;

-- Add deadline_time column (separate from time for consistency with todos table)
ALTER TABLE common_tasks 
ADD COLUMN IF NOT EXISTS deadline_time TEXT;

-- Add deadline_recurring column
ALTER TABLE common_tasks 
ADD COLUMN IF NOT EXISTS deadline_recurring TEXT;

-- Note: We're keeping the 'time' column for backward compatibility
-- But deadline_date + deadline_time + deadline_recurring will be used for full deadline support

