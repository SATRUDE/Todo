interface CalorieRingProps {
  total: number;
  goal: number | null;
  size?: number;
  strokeWidth?: number;
}

export function CalorieRing({ total, goal, size = 220, strokeWidth = 10 }: CalorieRingProps) {
  const r = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = goal && goal > 0 ? Math.min(total / goal, 1) : 0;
  const offset = circumference * (1 - ratio);
  const over = goal != null && total > goal;
  const remaining = goal != null ? Math.max(goal - total, 0) : 0;
  const overBy = goal != null ? Math.max(total - goal, 0) : 0;

  const progressClass = !goal
    ? "stroke-muted-foreground/40"
    : over
    ? "stroke-red-500"
    : total >= goal * 0.9
    ? "stroke-amber-500"
    : "stroke-emerald-500";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        goal == null
          ? `${total} kcal logged, no goal set`
          : over
          ? `${overBy} kcal over goal of ${goal}`
          : `${remaining} kcal left of ${goal} kcal goal`
      }
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          className="fill-none stroke-muted/40"
          strokeWidth={strokeWidth}
        />
        {over && (
          <circle
            cx="50"
            cy="50"
            r={r}
            className="fill-none stroke-red-500/30"
            strokeWidth={strokeWidth}
          />
        )}
        <circle
          cx="50"
          cy="50"
          r={r}
          className={`fill-none transition-all ${progressClass}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {goal == null ? (
          <>
            <p className="text-3xl font-medium tracking-tight text-foreground">
              {total.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">kcal logged</p>
            <p className="text-xs text-muted-foreground mt-2">No goal set</p>
          </>
        ) : over ? (
          <>
            <p className="text-3xl font-medium tracking-tight text-red-500">
              {overBy.toLocaleString()}
            </p>
            <p className="text-sm text-red-500 mt-1">kcal over</p>
            <p className="text-xs text-muted-foreground mt-2">
              {total.toLocaleString()} / {goal.toLocaleString()}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl font-medium tracking-tight text-foreground">
              {remaining.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">kcal left</p>
            <p className="text-xs text-muted-foreground mt-2">
              {total.toLocaleString()} / {goal.toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
