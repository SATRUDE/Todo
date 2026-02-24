interface DashboardCardProps {
  label: string;
  iconPath: string;
  colorClass: string;
  onClick: () => void;
}

function DashboardCard({ label, iconPath, colorClass, onClick }: DashboardCardProps) {
  return (
    <button
      type="button"
      className="flex flex-col items-start justify-end px-4 py-3 flex-1 cursor-pointer rounded-lg bg-card border border-border h-[146px] transition-colors hover:bg-accent/50 text-left"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2.5 items-start w-full">
        <svg
          className={`size-10 shrink-0 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
        <p className={`text-lg font-normal tracking-tight leading-relaxed ${colorClass}`}>
          {label}
        </p>
      </div>
    </button>
  );
}

interface DashboardProps {
  onAddTask?: (taskText: string, description?: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  onNavigateToCalendarSync?: () => void;
  onNavigateToCommonTasks?: () => void;
  onNavigateToDailyTasks?: () => void;
  onNavigateToGoals?: () => void;
  onNavigateToNotes?: (taskId?: number) => void;
}

export function Dashboard({ onAddTask, onNavigateToCalendarSync, onNavigateToCommonTasks, onNavigateToDailyTasks, onNavigateToGoals, onNavigateToNotes }: DashboardProps) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
          Dashboard
        </h1>

        <div className="flex flex-col gap-4 w-full">
          <div className="flex gap-4 w-full">
            <DashboardCard
              label="Calendar sync"
              iconPath="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              colorClass="text-emerald-400"
              onClick={onNavigateToCalendarSync ?? (() => {})}
            />
            <DashboardCard
              label="Common tasks"
              iconPath="m9 9 6-6m0 0 6 6m-6-6v12a6 6 0 0 1-12 0v-3"
              colorClass="text-orange-500"
              onClick={onNavigateToCommonTasks ?? (() => {})}
            />
          </div>

          <div className="flex gap-4 w-full">
            <DashboardCard
              label="Daily"
              iconPath="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              colorClass="text-foreground"
              onClick={onNavigateToDailyTasks ?? (() => {})}
            />
            <DashboardCard
              label="Goals"
              iconPath="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
              colorClass="text-blue-400"
              onClick={onNavigateToGoals ?? (() => {})}
            />
          </div>

          <div className="flex gap-4 w-full">
            <DashboardCard
              label="Notes"
              iconPath="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
              colorClass="text-violet-400"
              onClick={() => onNavigateToNotes?.()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

