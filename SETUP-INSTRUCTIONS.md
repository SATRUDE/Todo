# Setup Instructions for Open Session Fix

## Overview
This PR fixes the issue where open session messages don't persist across app restarts or device switches. The fix is complete and ready to use, but requires a one-time database migration.

## Quick Setup (One-Time)

### Step 1: Run the Database Migration
The migration SQL has been prepared in `migrations/migration-add-is-open-to-focus-sessions.sql`.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Navigate to your project (https://iyslthoocddlpznkxkce.supabase.co)
3. Click on "SQL Editor" in the left sidebar
4. Copy and paste the SQL from `migrations/migration-add-is-open-to-focus-sessions.sql`:
   ```sql
   ALTER TABLE focus_sessions
   ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT FALSE;

   CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_user_open ON focus_sessions(user_id)
   WHERE is_open = TRUE;
   ```
5. Click "Run" to execute the migration

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db reset  # This will run all migrations including the new one
```

### Step 2: Test the Feature
1. Start the dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Sign in (use "Skip sign-in (dev only)" button)
4. Go to Focus Sessions page
5. Select or create a session
6. Navigate to Tasks page - you should see the open session banner
7. Close the browser or refresh the page
8. Navigate back to Tasks page - the banner should still be there! 🎉
9. Delete the session - the banner should disappear

## What Changed

### Database Schema
- Added `is_open` BOOLEAN column to `focus_sessions` table
- Added unique partial index to ensure only one session per user can be open

### Application Code
- Added `setSessionOpen()` function to manage session open/close state
- Modified session selection logic to persist open state to database
- Updated Tasks page to read open session from database instead of React state

## Migration Already Applied?
To check if the migration has already been run:
1. Go to Supabase Dashboard > SQL Editor
2. Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'focus_sessions';`
3. If you see `is_open` in the results, the migration is already applied!

## Troubleshooting

### Error: "Could not find the 'is_open' column"
This means the migration hasn't been run yet. Follow Step 1 above.

### Banner doesn't appear
1. Make sure you've selected a session first (go to Focus Sessions page and click on a session)
2. Check the browser console for errors
3. Verify the migration was applied successfully

### Multiple sessions show as open
This shouldn't happen due to the unique index, but if it does:
1. Run in SQL Editor: `UPDATE focus_sessions SET is_open = false;`
2. Then select your preferred session again in the app
