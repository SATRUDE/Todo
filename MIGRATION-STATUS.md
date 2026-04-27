# Focus Sessions Migration Status

## Task Summary
Add `is_open` field to `focus_sessions` table to track which session is currently active/open.

## Migration File Created
✅ Created: `migration-add-is-open-to-focus-sessions.sql`

```sql
-- Migration: Add is_open field to focus_sessions
-- Tracks which session is currently active/open
-- Only one session can be open at a time per user

ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT FALSE;

-- Create a unique partial index to ensure only one session is open per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_user_open ON focus_sessions(user_id)
WHERE is_open = TRUE;
```

## Migration Status
❌ **NOT YET APPLIED** - Blocked by authentication issues

## Evidence Migration Is Needed
When attempting to open a focus session in the application, the following database error occurs:

```
Error setting session open state: {
  code: "PGRST204",
  details: null,
  hint: null,
  message: "Could not find the 'is_open' column of 'focus_sessions' in [[Prototype]]"
}
```

This confirms the `is_open` column does not exist in the database.

## Attempts To Run Migration

### 1. Supabase Dashboard (Web UI)
- **Status**: ❌ FAILED
- **Issue**: Cannot authenticate - no GitHub/Google credentials available
- **Attempted**: Direct navigation to `https://supabase.com/dashboard/project/iyslthoocddlpznkxkce/sql`
- **Result**: Page requires authentication, stays blank without valid session

### 2. Supabase CLI
- **Status**: ❌ FAILED  
- **Issue**: Cannot install Supabase CLI as global npm module (not supported)
- **Error**: "Installing Supabase CLI as a global module is not supported"

### 3. Programmatic Execution (Node.js + anon key)
- **Status**: ❌ FAILED
- **Issue**: Anon key does not have permissions to execute SQL
- **Error**: `PGRST202 - Could not find the function public.exec_sql(sql) in the schema cache`

### 4. Direct Database Access (psql)
- **Status**: ❌ BLOCKED
- **Issue**: No database credentials available
- **Missing**: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or direct postgres connection string

## Next Steps (Manual Intervention Required)

To complete this migration, someone with Supabase dashboard access needs to:

1. Sign in to https://supabase.com/dashboard
2. Navigate to project: https://iyslthoocddlpznkxkce.supabase.co  
3. Go to SQL Editor
4. Run the SQL from `migration-add-is-open-to-focus-sessions.sql`
5. Verify migration success

## Application Code Status
✅ **Code Already Implements Feature** - The application code in `src/lib/database.ts` and `src/components/TodoApp.tsx` already includes:
- `setSessionOpen()` function to update session open/close state
- Logic to handle session selection and banner display
- However, feature cannot work until migration is applied

## Testing Plan (After Migration)
Once migration is applied:
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Sign in (use "Skip sign-in" button)
4. Go to Focus Sessions page
5. Select an existing session or create a new one (this sets `is_open` to true automatically)
6. Navigate to Tasks page - should see open session banner
7. Close the app or refresh the page
8. Navigate back to Tasks page - banner should still be visible (this was the bug)
9. Delete the session - banner should disappear

## Summary
The issue was that the open session banner only appeared temporarily when a session was selected, but didn't persist across app restarts or device switches because the state was only stored in React state (`selectedSession`), not in the database.

The fix adds an `is_open` boolean field to the `focus_sessions` table that:
- Persists which session is currently open in the database
- Ensures only one session can be open at a time per user (via unique partial index)
- Allows the app to show the open session banner whenever the user opens the app, not just when first selecting it
