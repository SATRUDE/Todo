interface ReviewMissedDeadlinesBoxProps {
  onClick?: () => void;
  missedCount?: number;
}

export function ReviewMissedDeadlinesBox({ onClick, missedCount }: ReviewMissedDeadlinesBoxProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg bg-card w-full cursor-pointer transition-opacity hover:opacity-90"
      onClick={onClick}
    >
      <div className="flex gap-2.5 items-center shrink-0">
        <svg className="size-6 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
        </svg>
        <p className="text-lg font-normal text-destructive tracking-tight">
          Overdue tasks
        </p>
      </div>
      {missedCount !== undefined && missedCount > 0 && (
        <p className="text-lg font-normal text-muted-foreground tracking-tight">
          {missedCount}
        </p>
      )}
    </div>
  );
}

