import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Clock, LayoutList, ChevronDown, Bell, CheckCircle2, AlertCircle, Search, StickyNote } from "lucide-react";
import svgPathsToday from "../imports/svg-z2a631st9g";
import { linkifyText } from "../lib/textUtils";

const LIST_ICON_PATH = svgPathsToday.p1c6a4380;

export type TimeRange = "today" | "tomorrow" | "week" | "month" | "allTime";

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  type?: "task" | "reminder";
  listId?: number;
  parentTaskId?: number | null;
  dailyTaskId?: number | null;
  description?: string | null;
  deadline?: { date: Date; time: string; recurring?: string };
}

export interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

export interface Goal {
  id: number;
  text: string;
  is_active?: boolean;
}

interface TaskRowProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onClick: (todo: Todo) => void;
  showCheckbox?: boolean;
  getListById?: (listId?: number) => ListItem | null;
  getSubtaskCount?: (taskId: number) => number;
  getNoteCount?: (taskId: number) => number;
  linkifyDescription?: boolean;
}

export function TaskRow({
  todo,
  onToggle,
  onClick,
  showCheckbox = true,
  getListById,
  getSubtaskCount,
  getNoteCount,
  linkifyDescription = false,
}: TaskRowProps) {
  const time = todo.deadline?.time || todo.time;
  const list = getListById?.(todo.listId);
  const subtaskCount = getSubtaskCount?.(todo.id) ?? 0;
  const noteCount = getNoteCount?.(todo.id) ?? 0;
  const description = todo.description?.trim();

  return (
    <div
      className="flex flex-col gap-1 cursor-pointer group"
      onClick={() => onClick(todo)}
    >
      <div className="flex gap-2 items-center w-full min-w-0">
        {showCheckbox && todo.type !== "reminder" && (
          <div
            className="shrink-0 size-6 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(todo.id);
            }}
          >
            <svg
              className="block size-full"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={todo.completed ? 0 : 1.5}
            >
              <circle
                cx="12"
                cy="12"
                r="11.25"
                className="stroke-muted-foreground"
                fill={todo.completed ? "hsl(var(--muted-foreground))" : "none"}
              />
              {todo.completed && (
                <path
                  d="M7 12L10.5 15.5L17 9"
                  className="stroke-background"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        )}
        {todo.type === "reminder" && (
          <Bell className="shrink-0 size-6 text-muted-foreground" />
        )}
        <p
          className={`min-w-0 flex-1 text-lg break-words tracking-tight ${
            todo.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {todo.text}
        </p>
      </div>

      {description && (
        <div className="w-full pl-8 overflow-hidden">
          <p className="text-muted-foreground text-sm break-words">
            {linkifyDescription ? linkifyText(description) : description}
          </p>
        </div>
      )}

      {(time || list || subtaskCount > 0 || noteCount > 0) && (
        <div className="flex gap-2 items-center pl-8 flex-wrap">
          {time && (
            <div className="flex gap-1 items-center text-muted-foreground">
              <Clock className="size-5 shrink-0" />
              <span className="text-base">{time}</span>
            </div>
          )}
          {list && (
            <div
              className="flex gap-1 items-center text-muted-foreground"
              style={{ color: list.color }}
            >
              <svg
                className="size-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d={LIST_ICON_PATH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm">{list.name}</span>
            </div>
          )}
          {subtaskCount > 0 && (
            <div className="flex gap-1 items-center text-muted-foreground">
              <LayoutList className="size-5 shrink-0" />
              <span className="text-sm">{subtaskCount}</span>
            </div>
          )}
          {noteCount > 0 && (
            <div className="flex gap-1 items-center text-muted-foreground">
              <StickyNote className="size-5 shrink-0" />
              <span className="text-sm">note {noteCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  accentColor: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function StatusCard({
  icon,
  label,
  count,
  accentColor,
  onClick,
  disabled = false,
}: StatusCardProps) {
  return (
    <Card
      className={`flex-1 rounded-lg border-0 bg-card transition-opacity ${
        disabled ? "opacity-25" : "cursor-pointer hover:opacity-90"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="px-3 pt-3 pb-2 [&:last-child]:pb-3 flex flex-col gap-2.5">
        <div className="flex items-start justify-between w-full">
          <div
            className="size-6 [&_svg]:size-6"
            style={{ color: accentColor }}
          >
            {icon}
          </div>
          <span className="text-lg text-muted-foreground">{count}</span>
        </div>
        <p
          className="text-lg font-normal tracking-tight"
          style={{ color: accentColor }}
        >
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

interface TimeRangeTabsProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TABS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "allTime", label: "All time" },
];

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  return (
    <div className="w-full px-5 overflow-x-auto overflow-y-hidden scrollbar-none -webkit-overflow-scrolling-touch">
      <div className="flex gap-2 items-center rounded-full py-1 px-1 min-w-max bg-card">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant="ghost"
            size="sm"
            className={`shrink-0 rounded-full h-9 px-4 font-normal text-lg whitespace-nowrap ${
              value === tab.value
                ? "bg-muted text-foreground border border-border hover:bg-muted hover:text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface NoticeBoardSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

export function NoticeBoardSection({
  title,
  count,
  isExpanded,
  onToggleExpand,
  children,
}: NoticeBoardSectionProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between px-5">
        <p className="text-xs uppercase tracking-wider text-foreground">
          {title}
        </p>
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1 -mr-1 rounded hover:bg-accent/50 transition-transform"
          aria-expanded={isExpanded}
        >
          <ChevronDown
            className={`size-5 text-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      {isExpanded && (
        <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-none">
          <div className="flex gap-3 mx-5 pb-5 pr-5 min-w-max">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface NoticeBoardCardProps {
  header: string;
  count: number;
  onClickHeader?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function NoticeBoardCard({
  header,
  count,
  onClickHeader,
  children,
  className = "",
}: NoticeBoardCardProps) {
  return (
    <Card
      className={`flex flex-col gap-2.5 p-4 rounded-lg border-0 bg-card min-w-[300px] w-[300px] ${className}`}
    >
      <div className="flex items-start justify-between w-full">
        <button
          type="button"
          onClick={onClickHeader}
          className={`text-xs uppercase tracking-wider text-foreground ${
            onClickHeader ? "cursor-pointer hover:opacity-80" : ""
          }`}
        >
          {header}
        </button>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function FilterTag({
  listName,
  listColor,
  onRemove,
}: {
  listName: string;
  listColor: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex gap-2 items-center justify-center px-4 py-1 rounded-full shrink-0 cursor-pointer w-fit bg-accent/10 hover:opacity-90 text-foreground text-base"
    >
      {listName}
      <span className="size-5 flex items-center justify-center" aria-hidden>
        ×
      </span>
    </button>
  );
}

function GoalStatusBadge({
  status,
}: {
  status: "On track" | "At risk" | "Failing";
}) {
  const styles = {
    "On track": "bg-emerald-500/20 text-emerald-400",
    "At risk": "bg-amber-500/20 text-amber-400",
    Failing: "bg-red-500/20 text-red-400",
  };
  return (
    <Badge
      variant="secondary"
      className={`text-[13px] font-medium px-2.5 py-0.5 rounded-md ${styles[status]}`}
    >
      {status}
    </Badge>
  );
}

export interface TasksPageProps {
  // Header
  formattedDate: string;
  onOpenFilter: () => void;

  // Time range
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;

  // Status cards
  tasksCompletedCount: number;
  missedDeadlinesCount: number;
  onDoneCardClick: () => void;
  onOverdueCardClick: () => void;

  // Filter tags
  selectedListFilterIds: Set<number>;
  lists: ListItem[];
  onRemoveListFilter: (listId: number) => void;

  // Notice board
  reminders: Todo[];
  dailyTaskItems: Todo[];
  activeGoals: Goal[];
  isScheduledExpanded: boolean;
  onToggleScheduled: () => void;
  getGoalStatus: (goal: Goal) => "On track" | "At risk" | "Failing" | null;
  onGoalClick: (goal: Goal) => void;
  onNavigateToGoals: () => void;

  // Task list
  regularTasks: Todo[];
  recentlyCompleted: Set<number>;
  groupTasksByDate?: (
    tasks: Todo[]
  ) => Array<{ date: Date; dateKey: string; tasks: Todo[] }>;
  formatDateHeading: (date: Date) => string;
  showNoticeBoard: boolean;

  // Callbacks
  onTaskClick: (todo: Todo) => void;
  onToggleTask: (id: number) => void;
  getListById: (listId?: number) => ListItem | null;
  getSubtaskCount: (taskId: number) => number;
  getNoteCount?: (taskId: number) => number;
  linkifyText: (text: string) => React.ReactNode;

  // Banners
  isCalendarConnected: boolean | null;
  onConnectCalendar?: () => void;
  calendarPendingEventsCount: number;
  onCalendarSyncClick?: () => void;
  notificationPermission?: NotificationPermission;
  onEnableNotifications?: () => void;
  onOpenSearch?: () => void;
}

export function TasksPage(props: TasksPageProps) {
  const {
    formattedDate,
    onOpenFilter,
    selectedTimeRange,
    onTimeRangeChange,
    tasksCompletedCount,
    missedDeadlinesCount,
    onDoneCardClick,
    onOverdueCardClick,
    selectedListFilterIds,
    lists,
    onRemoveListFilter,
    reminders,
    dailyTaskItems,
    activeGoals,
    isScheduledExpanded,
    onToggleScheduled,
    getGoalStatus,
    onGoalClick,
    onNavigateToGoals,
    regularTasks,
    onTaskClick,
    onToggleTask,
    getListById,
    getSubtaskCount,
    getNoteCount,
    linkifyText: _linkifyText,
    showNoticeBoard,
    groupTasksByDate,
    formatDateHeading,
    isCalendarConnected,
    onConnectCalendar,
    calendarPendingEventsCount,
    onCalendarSyncClick,
    notificationPermission,
    onEnableNotifications,
    onOpenSearch,
  } = props;

  const [isDailyExpanded, setIsDailyExpanded] = useState(true);
  const [collapsedDailyDates, setCollapsedDailyDates] = useState<Set<string>>(new Set());

  const toggleDailyExpanded = (dateKey?: string) => {
    if (dateKey) {
      setCollapsedDailyDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateKey)) next.delete(dateKey);
        else next.add(dateKey);
        return next;
      });
    } else {
      setIsDailyExpanded((prev) => !prev);
    }
  };

  const renderTaskRow = (todo: Todo, useLinkify = false) => (
    <TaskRow
      key={todo.id}
      todo={todo}
      onToggle={onToggleTask}
      onClick={onTaskClick}
      showCheckbox={todo.type !== "reminder"}
      getListById={getListById}
      getSubtaskCount={getSubtaskCount}
      getNoteCount={getNoteCount}
      linkifyDescription={useLinkify}
    />
  );

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-8 pt-0 pb-[150px] overflow-x-hidden">
        {/* Header */}
        <div className="flex gap-8 items-start w-full px-5">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-2xl font-medium text-foreground tracking-tight">
              Tasks
            </h1>
            <p className="text-lg text-muted-foreground tracking-tight">
              {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="shrink-0 size-8 cursor-pointer p-1 -m-1 rounded hover:bg-accent/50 text-foreground"
                aria-label="Search"
              >
                <Search className="block size-full" strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenFilter}
              className="shrink-0 size-8 cursor-pointer p-1 -m-1 rounded hover:bg-accent/50 text-foreground"
              aria-label="Filter lists"
            >
              <svg
                className="block size-full"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification banner */}
        {notificationPermission !== "granted" &&
          onEnableNotifications &&
          "Notification" in window && (
          <div className="w-full px-5">
            <Card
              className="cursor-pointer hover:opacity-90 border-border"
              onClick={onEnableNotifications}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <Bell className="size-5 shrink-0 text-muted-foreground" />
                <p className="flex-1 text-base text-foreground">
                  Enable notifications to get reminders for due tasks
                </p>
                <svg
                  className="size-5 shrink-0 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar banners */}
        {isCalendarConnected === false && onConnectCalendar && (
          <div className="w-full px-5">
            <Card
              className="cursor-pointer hover:opacity-90 border-border"
              onClick={onConnectCalendar}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <svg
                  className="size-5 shrink-0 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
                <p className="flex-1 text-base text-foreground">
                  Connect your calendar to sync events with your tasks
                </p>
                <svg
                  className="size-5 shrink-0 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </CardContent>
            </Card>
          </div>
        )}

        {calendarPendingEventsCount > 0 && onCalendarSyncClick && (
          <div className="w-full px-5">
            <Card
              className="cursor-pointer hover:opacity-90 border-border"
              onClick={onCalendarSyncClick}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <svg
                  className="size-5 shrink-0 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
                <p className="flex-1 text-base text-foreground">
                  {calendarPendingEventsCount} calendar event
                  {calendarPendingEventsCount !== 1 ? "s" : ""} ready to sync
                </p>
                <svg
                  className="size-5 shrink-0 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time range tabs */}
        <TimeRangeTabs value={selectedTimeRange} onChange={onTimeRangeChange} />

        {/* Status cards */}
        <div className="flex gap-4 w-full px-5">
          <StatusCard
            icon={<CheckCircle2 className="size-6" />}
            label="Done"
            count={tasksCompletedCount}
            accentColor="rgb(0, 200, 83)"
            onClick={onDoneCardClick}
            disabled={tasksCompletedCount === 0}
          />
          <StatusCard
            icon={<AlertCircle className="size-6" />}
            label="Overdue"
            count={missedDeadlinesCount}
            accentColor="rgb(239, 65, 35)"
            onClick={onOverdueCardClick}
            disabled={missedDeadlinesCount === 0}
          />
        </div>

        {/* Filter tags */}
        {selectedListFilterIds.size > 0 && (
          <div className="flex gap-2 flex-wrap w-full px-5">
            {Array.from(selectedListFilterIds).map((listId) => {
              const list =
                listId === 0
                  ? { name: "Today", color: "hsl(var(--foreground))" }
                  : lists.find((l) => l.id === listId);
              if (!list) return null;
              return (
                <FilterTag
                  key={listId}
                  listName={list.name}
                  listColor={list.color}
                  onRemove={() => onRemoveListFilter(listId)}
                />
              );
            })}
          </div>
        )}

        {/* Notice board */}
        {showNoticeBoard &&
          (reminders.length > 0 || activeGoals.length > 0) && (
            <NoticeBoardSection
              title="NOTICE BOARD"
              count={0}
              isExpanded={isScheduledExpanded}
              onToggleExpand={onToggleScheduled}
            >
              {reminders.length > 0 && (
                <NoticeBoardCard
                  header="REMINDERS"
                  count={reminders.length}
                >
                  {reminders.map((todo) => renderTaskRow(todo, true))}
                </NoticeBoardCard>
              )}
              {activeGoals.length > 0 && (
                <NoticeBoardCard
                  header="GOALS"
                  count={activeGoals.length}
                  onClickHeader={onNavigateToGoals}
                >
                  {activeGoals.map((goal) => {
                    const status = getGoalStatus(goal);
                    return (
                      <div
                        key={goal.id}
                        className="flex flex-col gap-2 cursor-pointer rounded-lg p-3 bg-secondary/50 hover:bg-secondary/70"
                        onClick={() => onGoalClick(goal)}
                      >
                        <div className="flex gap-2 items-center min-w-0">
                          <svg
                            className="shrink-0 size-6 text-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                            />
                          </svg>
                          <p className="flex-1 text-lg break-words text-foreground">
                            {goal.text}
                          </p>
                        </div>
                        {status && (
                          <div className="pl-8">
                            <GoalStatusBadge status={status} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </NoticeBoardCard>
              )}
            </NoticeBoardSection>
          )}

        {/* Task list */}
        <div className="flex flex-col gap-6 w-full px-5">
          {selectedTimeRange === "week" ||
          selectedTimeRange === "month" ||
          selectedTimeRange === "allTime" ? (
            groupTasksByDate ? (
              (() => {
                const grouped = groupTasksByDate(regularTasks);
                const groupedReminders = groupTasksByDate(reminders);
                const groupedDaily = groupTasksByDate(dailyTaskItems);
                const tasksByDate = new Map<string, Todo[]>();
                const remindersByDate = new Map<string, Todo[]>();
                const dailyByDate = new Map<string, Todo[]>();
                const allDates = new Map<string, Date>();

                grouped.forEach(({ dateKey, date, tasks }) => {
                  tasksByDate.set(dateKey, tasks);
                  allDates.set(dateKey, date);
                });
                groupedReminders.forEach(({ dateKey, date, tasks }) => {
                  remindersByDate.set(dateKey, tasks);
                  if (!allDates.has(dateKey)) allDates.set(dateKey, date);
                });
                groupedDaily.forEach(({ dateKey, date, tasks }) => {
                  dailyByDate.set(dateKey, tasks);
                  if (!allDates.has(dateKey)) allDates.set(dateKey, date);
                });

                const sortedDates = Array.from(allDates.entries())
                  .map(([k, d]) => ({ dateKey: k, date: d }))
                  .sort((a, b) => a.date.getTime() - b.date.getTime());

                return sortedDates.map(({ dateKey, date }) => {
                  const dateTasks = tasksByDate.get(dateKey) || [];
                  const dateReminders = remindersByDate.get(dateKey) || [];
                  const dateDaily = dailyByDate.get(dateKey) || [];

                  return (
                    <div key={dateKey} className="flex flex-col gap-6">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {formatDateHeading(date)}
                      </p>
                      {dateDaily.length > 0 && (() => {
                        const isExpanded = !collapsedDailyDates.has(dateKey);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleDailyExpanded(dateKey)}
                              className="flex items-center gap-2 w-full text-left rounded hover:bg-accent/30 py-1 -my-1 transition-colors"
                            >
                              <ChevronDown
                                className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                                  isExpanded ? "rotate-0" : "-rotate-90"
                                }`}
                              />
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Daily
                              </p>
                            </button>
                            {isExpanded && (
                              <>
                                <div className="flex flex-col gap-2">
                                  {dateDaily.map((t) => renderTaskRow(t, true))}
                                </div>
                                <div className="h-px w-full bg-border" />
                              </>
                            )}
                          </>
                        );
                      })()}
                      {dateReminders.length > 0 && (
                        <NoticeBoardCard
                          header="REMINDERS"
                          count={dateReminders.length}
                        >
                          {dateReminders.map((t) => renderTaskRow(t, true))}
                        </NoticeBoardCard>
                      )}
                      {dateTasks.map((t) => renderTaskRow(t, true))}
                    </div>
                  );
                });
              })()
            ) : (
              regularTasks.map((t) => renderTaskRow(t, true))
            )
          ) : (
            <>
              {dailyTaskItems.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleDailyExpanded()}
                    className="flex items-center gap-2 w-full text-left rounded hover:bg-accent/30 py-1 -my-1 transition-colors"
                  >
                    <ChevronDown
                      className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                        isDailyExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Daily
                    </p>
                  </button>
                  {isDailyExpanded && (
                    <>
                      <div className="flex flex-col gap-2">
                        {dailyTaskItems.map((todo) => renderTaskRow(todo, true))}
                      </div>
                      <div className="h-px w-full bg-border" />
                    </>
                  )}
                </>
              )}
              {regularTasks.map((t) => renderTaskRow(t, true))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
