import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  taskStatusPillStyle,
  type TaskStatus,
} from "../lib/taskStatus";

interface TaskStatusFilterProps {
  value: TaskStatus | null;
  onChange: (value: TaskStatus | null) => void;
  /** Which statuses to offer. Defaults to all four. */
  statuses?: TaskStatus[];
  className?: string;
}

/**
 * The status filter row: All, then one chip per status.
 *
 * A visible row rather than another entry in the filter sheet, because this is
 * the kind of filter you flick between while working rather than set once. It
 * scrolls sideways so it stays one line on a phone, and the selected chip wears
 * its own status colour so the current filter is readable at a glance instead
 * of having to be read.
 */
export function TaskStatusFilter({
  value,
  onChange,
  statuses = TASK_STATUSES,
  className = "",
}: TaskStatusFilterProps) {
  const baseChip =
    "shrink-0 cursor-pointer rounded-full px-4 py-1 text-base whitespace-nowrap transition-colors";

  return (
    <div
      className={`w-full overflow-x-auto overflow-y-hidden scrollbar-none -webkit-overflow-scrolling-touch ${className}`}
      role="group"
      aria-label="Filter by status"
    >
      <div className="flex gap-2 items-center min-w-max">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`${baseChip} ${
            value === null
              ? "bg-muted text-foreground border border-border"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {statuses.map((status) => {
          const isActive = value === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange(isActive ? null : status)}
              aria-pressed={isActive}
              className={`${baseChip} ${
                isActive ? "font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              style={isActive ? taskStatusPillStyle(status) : undefined}
            >
              {TASK_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
