import { useEffect, useRef } from "react";

type Deadline = {
  date: Date;
  time: string;
  recurring?: string;
};

type TodoWithDeadline = {
  id: number;
  text: string;
  completed: boolean;
  deadline?: Deadline;
  listId?: number;
};

const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout limit (~24 days)

const getDeadlineTimestamp = (deadline?: Deadline): number | null => {
  if (!deadline?.date) {
    return null;
  }

  const target = new Date(deadline.date.getTime());

  if (deadline.time && deadline.time.includes(":")) {
    const [hoursString, minutesString] = deadline.time.split(":");
    const hours = Number(hoursString);
    const minutes = Number(minutesString ?? 0);

    if (!Number.isNaN(hours)) {
      target.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    } else {
      target.setHours(0, 0, 0, 0);
    }
  } else {
    target.setHours(0, 0, 0, 0);
  }

  return target.getTime();
};

const buildNotificationBody = (todo: TodoWithDeadline) => {
  if (!todo.deadline) return "Task is due.";
  const parts: string[] = [];

  if (todo.deadline.time) {
    parts.push(`Due at ${todo.deadline.time}`);
  }

  if (todo.listId !== undefined) {
    parts.push("Tap to view task");
  }

  return parts.join(" • ") || "Task is due.";
};

const showNativeNotification = (
  todo: TodoWithDeadline,
  onNotificationOpen: (taskId: number) => void
) => {
  const notification = new Notification(todo.text, {
    body: buildNotificationBody(todo),
    tag: `todo-deadline-${todo.id}`,
    requireInteraction: true,
    data: { taskId: todo.id },
    renotify: true,
  });

  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();
    onNotificationOpen(todo.id);
    notification.close();
  };
};

export function useDeadlineNotifications(
  todos: TodoWithDeadline[],
  onNotificationOpen: (taskId: number) => void
) {
  const scheduledRef = useRef<
    Map<number, { timeoutId: number; deadlineMs: number }>
  >(new Map());
  const notifiedRef = useRef<Map<number, number>>(new Map());
  const onNotificationOpenRef = useRef(onNotificationOpen);

  useEffect(() => {
    onNotificationOpenRef.current = onNotificationOpen;
  }, [onNotificationOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // Permission prompt failed or was dismissed.
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const activeTodos = todos.filter(
      (todo) => !todo.completed && todo.deadline
    );
    const activeIds = new Set(activeTodos.map((todo) => todo.id));

    // Clear timeouts for tasks that no longer require notifications.
    scheduledRef.current.forEach((entry, taskId) => {
      if (!activeIds.has(taskId)) {
        window.clearTimeout(entry.timeoutId);
        scheduledRef.current.delete(taskId);
        notifiedRef.current.delete(taskId);
      }
    });

    activeTodos.forEach((todo) => {
      const deadlineMs = getDeadlineTimestamp(todo.deadline);
      if (!deadlineMs) return;

      const lastNotified = notifiedRef.current.get(todo.id);
      if (deadlineMs <= Date.now()) {
        if (lastNotified === deadlineMs) {
          return;
        }
        notifiedRef.current.set(todo.id, deadlineMs);
        scheduleNotificationDisplay(todo);
        return;
      }

      const existing = scheduledRef.current.get(todo.id);
      if (existing) {
        if (existing.deadlineMs === deadlineMs) {
          return;
        }
        window.clearTimeout(existing.timeoutId);
        scheduledRef.current.delete(todo.id);
      }

      const delay = deadlineMs - Date.now();
      if (delay > MAX_TIMEOUT_MS) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        scheduledRef.current.delete(todo.id);
        notifiedRef.current.set(todo.id, deadlineMs);
        scheduleNotificationDisplay(todo);
      }, delay);

      scheduledRef.current.set(todo.id, { timeoutId, deadlineMs });
    });

    return () => {
      scheduledRef.current.forEach((entry) =>
        window.clearTimeout(entry.timeoutId)
      );
      scheduledRef.current.clear();
    };
  }, [todos]);

  const scheduleNotificationDisplay = (todo: TodoWithDeadline) => {
    const options: NotificationOptions = {
      body: buildNotificationBody(todo),
      tag: `todo-deadline-${todo.id}`,
      requireInteraction: true,
      data: { taskId: todo.id },
      renotify: true,
    };

    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker?.ready &&
      typeof navigator.serviceWorker.ready.then === "function"
    ) {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (registration?.showNotification) {
            registration.showNotification(todo.text, options);
            return;
          }
          showNativeNotification(todo, onNotificationOpenRef.current);
        })
        .catch(() => {
          showNativeNotification(todo, onNotificationOpenRef.current);
        });
      return;
    }

    showNativeNotification(todo, onNotificationOpenRef.current);
  };
}
