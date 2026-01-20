-- Supabase Storage Setup for Task Images
-- Run this in your Supabase SQL Editor
-- 
-- IMPORTANT: 
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file content
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Check for any error messages in the results panel

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: Buckets are typically created via the Storage UI, but we'll set up policies here
-- If the bucket doesn't exist, create it first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "Create a new bucket"
-- 3. Name: "task-images"
-- 4. Make it PUBLIC (uncheck "Private bucket")
-- 5. Click "Create bucket"

-- Step 2: Create policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-images');

-- Step 3: Create policy to allow public read access to images
CREATE POLICY "Allow public read access to images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-images');

-- Step 4: Create policy to allow users to delete their own images
-- This ensures users can only delete files in their own user folder
CREATE POLICY "Allow users to delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 5: Create policy to allow users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verification queries (run these separately after the setup to confirm it worked):
-- SELECT * FROM storage.policies WHERE bucket_id = 'task-images';
-- SELECT * FROM storage.buckets WHERE id = 'task-images';
