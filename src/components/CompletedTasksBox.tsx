interface CompletedTasksBoxProps {
  onClick?: () => void;
  completedCount?: number;
}

export function CompletedTasksBox({ onClick, completedCount }: CompletedTasksBoxProps) {
  return (
    <div
      className="bg-card border border-border flex items-center justify-between px-4 py-3 rounded-lg w-full cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      <div className="flex gap-2.5 items-center shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-6 text-emerald-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <p className="text-lg font-normal tracking-tight text-emerald-600">
          Tasks completed
        </p>
      </div>
      {completedCount !== undefined && completedCount > 0 && (
        <p className="text-lg font-normal tracking-tight text-muted-foreground">
          {completedCount}
        </p>
      )}
    </div>
  );
}





