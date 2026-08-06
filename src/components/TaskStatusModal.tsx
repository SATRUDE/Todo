import { useEffect } from "react";
import { AppSheet } from "./AppSheet";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  taskStatusPillStyle,
  type TaskStatus,
} from "../lib/taskStatus";

interface TaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: TaskStatus;
  onSelectStatus: (status: TaskStatus) => void;
}

const HINTS: Record<TaskStatus, string> = {
  todo: "Not started",
  in_progress: "Being worked on",
  waiting: "Blocked on someone else",
  done: "Finished, and ticks the task off",
};

export function TaskStatusModal({
  isOpen,
  onClose,
  currentStatus,
  onSelectStatus,
}: TaskStatusModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (value: TaskStatus) => {
    onSelectStatus(value);
    onClose();
  };

  return (
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Status">
      {/* Title */}
      <div className="w-full shrink-0">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Status
        </h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-1 pb-6 pt-4">
        {TASK_STATUSES.map((status) => {
          const isSelected = status === currentStatus;
          return (
            <button
              key={status}
              type="button"
              onClick={() => handleSelect(status)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left text-lg text-foreground transition-colors hover:bg-accent ${
                isSelected ? "bg-secondary" : ""
              }`}
            >
              <span
                className="shrink-0 rounded-full px-3 py-0.5 text-sm font-medium"
                style={taskStatusPillStyle(status)}
              >
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="text-base text-muted-foreground">
                {HINTS[status]}
              </span>
              {isSelected && (
                <span className="ml-auto size-5 shrink-0 text-primary">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </AppSheet>
  );
}
