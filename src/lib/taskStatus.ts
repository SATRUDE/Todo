/**
 * Task status: where a task has got to, separate from when it is due.
 *
 * `completed` stays the source of truth for done-ness, because the checkbox,
 * the Done counter, the completed list and the overdue calculation all read
 * it. Status carries the three states in between, and Done is derived from
 * `completed` rather than stored twice, so the app can never hold two
 * disagreeing opinions about whether a task is finished. Read a task's status
 * through `taskStatusOf` rather than off the raw column and that holds for
 * free, including the nice side effect that un-ticking a task returns it to
 * the state it was in before it was finished.
 *
 * The column has one writer, `updateTaskStatus`. Nothing else may write it.
 *
 * Stored as `in_progress` rather than `in progress`: the value is compared as
 * a raw string in filters and CHECK constraints, and the display label lives
 * in TASK_STATUS_LABELS.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done';

/** Display order, used by the picker and the filter chips. */
export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as string[]).includes(value);
}

/**
 * A task's effective status. Completion wins, so a ticked task always reads as
 * Done however stale its stored status is, and a task with nothing stored (every
 * task predating this column) reads as To do.
 */
export function taskStatusOf(todo: { status?: string | null; completed?: boolean }): TaskStatus {
  if (todo.completed) return 'done';
  if (isTaskStatus(todo.status) && todo.status !== 'done') return todo.status;
  return 'todo';
}

/** Does this status mean the task is finished? */
export function isDoneStatus(status: TaskStatus): boolean {
  return status === 'done';
}

/**
 * Pill colours, themed via the --status-* tokens in index.css so they follow
 * the app's own light/dark switch. Same approach as the goal status pills.
 */
const TOKEN: Record<TaskStatus, string | null> = {
  todo: null, // neutral, no accent
  in_progress: 'info',
  waiting: 'warn',
  done: 'good',
};

export function taskStatusPillStyle(status: TaskStatus) {
  const token = TOKEN[status];
  if (!token) {
    return {
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--muted-foreground))',
    };
  }
  return {
    backgroundColor: `hsl(var(--status-${token}-bg))`,
    color: `hsl(var(--status-${token}-fg))`,
  };
}
