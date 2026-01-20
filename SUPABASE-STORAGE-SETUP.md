# Supabase Storage Setup for Task Images

Follow these steps to set up image storage for tasks:

## Step 1: Create the Storage Bucket (via UI)

1. Go to your Supabase Dashboard
2. Click on **Storage** in the left sidebar
3. Click **"Create a new bucket"** button
4. Configure the bucket:
   - **Name**: `task-images`
   - **Public bucket**: ✅ Check this (uncheck "Private bucket")
   - Click **"Create bucket"**

## Step 2: Set Up Storage Policies (via SQL Editor)

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **"New query"**
3. Copy and paste the contents of `setup-supabase-storage.sql`
4. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

**OR** set up policies manually via UI:

### Manual Policy Setup (Alternative to SQL):

1. Go to **Storage** → **Policies** tab
2. Select the `task-images` bucket
3. Click **"New Policy"** and create these policies:

#### Policy 1: Allow authenticated users to upload
- **Policy name**: "Allow authenticated users to upload images"
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**: `bucket_id = 'task-images'`

#### Policy 2: Allow public read access
- **Policy name**: "Allow public read access to images"
- **Allowed operation**: SELECT
- **Target roles**: anon, authenticated
- **Policy definition**: `bucket_id = 'task-images'`

#### Policy 3: Allow users to delete their own images
- **Policy name**: "Allow users to delete their own images"
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**: `bucket_id = 'task-images' AND auth.uid()::text = (storage.foldername(name))[1]`

#### Policy 4: Allow users to update their own images
- **Policy name**: "Allow users to update their own images"
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**: `bucket_id = 'task-images' AND auth.uid()::text = (storage.foldername(name))[1]`

## Step 3: Verify Setup

Run this query in SQL Editor to verify policies are set up:

```sql
SELECT * FROM storage.policies WHERE bucket_id = 'task-images';
```

You should see 4 policies (INSERT, SELECT, DELETE, UPDATE).

## Troubleshooting

### Error: "Failed to upload image"
- **Check**: Is the bucket named exactly `task-images`?
- **Check**: Is the bucket set to Public?
- **Check**: Are the storage policies created?
- **Check**: Are you signed in? (Images require authentication)

### Error: "Bucket not found"
- Make sure you created the bucket via the Storage UI first
- The bucket name must be exactly `task-images`

### Error: "new row violates row-level security policy"
- The storage policies are not set up correctly
- Re-run the SQL script or create policies manually

### Images not displaying
- Check that the bucket is Public
- Verify the SELECT policy allows public access
- Check browser console for CORS errors
