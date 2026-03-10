# Delayed Task Indicator Feature Implementation

## Overview

This feature tracks and displays how many times a task's deadline has been changed/delayed. When a user modifies a task's deadline date, a counter increments and a red indicator appears next to the task showing the delay count.

## Implementation Details

### 1. Database Migration (`migration-add-times-delayed.sql`)

Added a new column to the `todos` table:
- Column: `times_delayed` (INTEGER, default 0)
- Index: `idx_todos_times_delayed` for optimized queries on delayed tasks
- Migration applied successfully to Supabase project

### 2. TypeScript Interfaces

Updated interfaces across the codebase to include `timesDelayed`:
- `src/lib/database.ts` - Todo interface
- `src/components/TasksPage.tsx` - Todo interface
- `src/components/TaskDetailModal.tsx` - Todo interface

### 3. Backend Logic (`src/lib/database.ts`)

Modified `updateTask()` function to automatically track deadline changes:
```typescript
// Check if deadline date has changed (only if both old and new deadlines exist)
if (existingTask && existingTask.deadline_date && dbTodo.deadline_date && 
    existingTask.deadline_date !== dbTodo.deadline_date) {
  // Deadline date changed - increment times_delayed counter
  const currentTimesDelayed = existingTask.times_delayed || 0;
  dbTodo.times_delayed = currentTimesDelayed + 1;
}
```

Key behaviors:
- Only increments when BOTH old and new deadline dates exist
- Skips increment when setting a deadline for the first time
- Skips increment when removing a deadline entirely
- Counter persists in database for historical tracking

### 4. UI Component (`src/components/TasksPage.tsx`)

Added delay indicator to `TaskRow` component:
```tsx
{todo.timesDelayed && todo.timesDelayed > 0 && (
  <div className="flex gap-1 items-center" style={{ color: "rgb(239, 65, 35)" }}>
    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      {/* Clock face */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      {/* Circular refresh arrows */}
      <path strokeLinecap="round" strokeLinejoin="round" 
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
    <span className="text-sm font-medium">{todo.timesDelayed}</span>
  </div>
)}
```

Visual Design:
- **Color**: Bright red (rgb(239, 65, 35)) - matches the "Overdue" card color
- **Icon**: Combination of clock face + circular refresh arrows = "deadline rescheduled"
- **Typography**: Small font (text-sm), medium weight for the number
- **Positioning**: Inline with other task metadata (time, list, subtask count, notes)
- **Visibility**: Only displays when counter > 0 (keeps UI clean)

## User Experience

### Before Implementation
Tasks showed: checkbox, text, time, list, subtask count, note count

### After Implementation
Tasks can also show: **delay indicator** (red clock+refresh icon with count)

### Example Layout
```
○ Complete project proposal
  🕐 2:00 PM   📋 Work   🔄 2   📝 3 subtasks
  ↑            ↑         ↑ NEW  ↑
  time         list      delay   subtasks
```

## Behavior Examples

1. **Creating a task with deadline**: Counter = 0 (not shown)
2. **Changing deadline once**: Counter increments to 1, red indicator appears
3. **Changing deadline again**: Counter increments to 2, indicator updates
4. **Removing deadline**: Counter stays at current value (historical tracking)
5. **Setting new deadline later**: Counter increments again

## Technical Decisions

### Why track ALL deadline changes?
The counter increments for ANY deadline date change, not just postponements. This provides a full history of deadline modifications, whether the user:
- Postpones a deadline (most common case)
- Brings a deadline forward (less common)
- Changes between different future dates

### Why only track date changes, not time changes?
- Date changes are more significant (different day entirely)
- Time changes are often minor adjustments (e.g., 2:00 PM → 3:00 PM)
- Reduces noise in the delay indicator

### Why show the icon in red?
- Red is universally associated with warnings/alerts
- Matches the app's existing "Overdue" status card color
- Creates visual consistency across deadline-related indicators

### Why use a clock + refresh icon?
- Clock = deadline/time-based
- Refresh arrows = changed/modified/rescheduled
- Combination clearly communicates "deadline has been changed"

## Files Modified

1. `/workspace/migration-add-times-delayed.sql` (new)
2. `/workspace/src/lib/database.ts`
3. `/workspace/src/components/TasksPage.tsx`
4. `/workspace/src/components/TaskDetailModal.tsx`

## Testing

- Database migration applied successfully to Supabase
- Visual demonstration created showing correct UI rendering
- Feature follows existing design patterns for task metadata display
- Icon design and positioning verified to be consistent with other indicators

## Future Enhancements (Optional)

- Add tooltip on hover showing delay history (dates of changes)
- Filter/sort tasks by delay count
- Analytics dashboard showing most-delayed tasks
- Reset counter option in task detail modal
- Different colors for different delay thresholds (e.g., yellow for 1-2, red for 3+)
