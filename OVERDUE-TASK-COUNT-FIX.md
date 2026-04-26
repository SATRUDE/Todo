# Overdue Task Count Bug Fix

## Issue Summary

Linear Issue: **CODING-61**

The overdue task notification count was incorrect due to:
1. Including reminders in the count
2. Including daily tasks in the count
3. Using UTC timezone instead of Norwegian time for deadline comparisons
4. Incorrect logic for tasks without specific times

## Root Cause Analysis

The bug was in `/api/reminders-overdue.js` which is responsible for sending periodic "You have N overdue items" notifications.

### Problems Identified

1. **Timezone Issue**: The function used UTC for all date/time comparisons, but the user lives in Norway (CET/CEST timezone). This meant:
   - A task due at 14:00 Norwegian time (12:00 UTC) would show as overdue at the wrong time
   - Tasks due "today" could be marked overdue when they shouldn't be

2. **Missing Type Filter**: The function didn't exclude `type = 'reminder'` tasks, which are conceptually different from regular tasks and shouldn't be counted as overdue.

3. **Missing Daily Task Filter**: The function didn't exclude tasks with `daily_task_id` set. Daily tasks are template-based recurring tasks that get automatically regenerated, so old instances shouldn't show as overdue.

4. **Incorrect "No Time" Logic**: When a task had no `deadline_time` specified, it was treated as overdue only after the *end* of that day (23:59:59), but without proper timezone handling.

## Solution

### Changes Made

1. **Updated `isTodoOverdue()` function** to use Norwegian timezone (Europe/Oslo):
   - Uses `Intl.DateTimeFormat` with `timeZone: 'Europe/Oslo'` for all date/time comparisons
   - Defaults to `Europe/Oslo` but respects `REMINDER_TIMEZONE` environment variable
   - Properly handles tasks with and without specific times

2. **Added type filtering**:
   ```javascript
   if (todo.type === 'reminder') return false;
   ```

3. **Added daily task filtering**:
   ```javascript
   if (todo.daily_task_id !== undefined && todo.daily_task_id !== null) return false;
   ```

4. **Corrected timezone for "no time" logic**:
   - Tasks with no time are due for the entire day and become overdue after 23:59:59 of that day
   - Now uses Norwegian timezone instead of UTC for the comparison
   - A task due on April 26 (no time) is NOT overdue until April 26 23:59:59 Norwegian time has passed
   - Previously used UTC for comparison, causing incorrect overdue detection depending on timezone offset

### Correct Behavior

The overdue count now correctly:

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Task due yesterday, no time | Overdue ✅ | Overdue ✅ |
| Task due today, no time | Depends on UTC offset | NOT overdue ✅ (due until 23:59:59 Norwegian time) |
| Task due today at 08:00, current time 12:00 | Depends on UTC offset | Overdue ✅ (Norwegian time) |
| Task due today at 23:00, current time 12:00 | Depends on UTC offset | NOT overdue ✅ (Norwegian time) |
| Reminder task (overdue deadline) | Counted ❌ | Excluded ✅ |
| Daily task (overdue deadline) | Counted ❌ | Excluded ✅ |

## Testing

Created and ran `test-overdue-logic.js` which validated:

1. ✅ Tasks due yesterday (no time) are overdue
2. ✅ Tasks due today (no time) are NOT overdue
3. ✅ Tasks due tomorrow (no time) are NOT overdue
4. ✅ Tasks with times respect Norwegian timezone
5. ✅ Reminders are excluded from overdue count
6. ✅ Daily tasks are excluded from overdue count

Example output (current time: 12:06 Norwegian time):
```
Total todos: 4
Overdue todos (after filtering): 1

Overdue todos:
  - [1] Regular overdue task

Filtered out:
  - [2] Overdue reminder (reason: reminder)
  - [3] Overdue daily task (reason: daily task)
  - [4] Future task (reason: not overdue yet)
```

## Environment Variable Configuration

The timezone can be configured via the `REMINDER_TIMEZONE` environment variable:

```bash
REMINDER_TIMEZONE=Europe/Oslo  # Norwegian time (default)
```

Other examples:
- `America/New_York` - Eastern Time
- `America/Los_Angeles` - Pacific Time
- `Europe/London` - British Time
- `Asia/Tokyo` - Japan Standard Time

## Files Modified

1. `/api/reminders-overdue.js` - Main fix for overdue logic and filtering
2. `/workspace/VERCEL-CRON-SETUP.md` - Updated documentation

## Deployment Notes

To deploy this fix:

1. Push the changes to the repository
2. Ensure `REMINDER_TIMEZONE=Europe/Oslo` is set in Vercel environment variables
3. Deploy to Vercel
4. The cron job at `/api/reminders-overdue` will automatically use the new logic

## Impact

This fix ensures that:
- Users only see accurate overdue counts in their notifications
- Reminders are not confusingly counted as overdue tasks
- Daily tasks (which auto-regenerate) don't pollute the overdue count
- All time comparisons respect the user's actual timezone (Norwegian time)

The notification will now show: "You have N overdue items" where N is the accurate count of actual overdue tasks.
