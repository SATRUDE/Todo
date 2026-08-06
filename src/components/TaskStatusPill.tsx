import { TASK_STATUS_LABELS, taskStatusPillStyle, type TaskStatus } from "../lib/taskStatus";

/**
 * The status pill on a task row.
 *
 * To do is not rendered by default: it is what most tasks are, so a pill on
 * every row would be noise rather than information. Done is likewise left off,
 * because a ticked row already reads as done through the checkbox and the
 * strikethrough. That leaves the pill meaning "this one is not in the usual
 * state", which is the only time it earns its place in the metadata row.
 */
export function TaskStatusPill({
  status,
  showAll = false,
}: {
  status: TaskStatus;
  showAll?: boolean;
}) {
  if (!showAll && (status === "todo" || status === "done")) return null;

  return (
    <span
      className="shrink-0 rounded-md px-2 py-0.5 text-[13px] font-medium leading-tight"
      style={taskStatusPillStyle(status)}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
