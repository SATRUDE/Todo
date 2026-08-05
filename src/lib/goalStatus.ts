/**
 * Goal status pill colours.
 *
 * The three status pills were previously hardcoded three times over: inline
 * rgba() in Goals and GoalDetail, Tailwind palette classes in TasksPage. All
 * three were dark-theme values, so none of them read in light mode.
 *
 * These resolve to the --status-* tokens in index.css, which the .dark class
 * overrides, so the pill follows the app's own theme switch. Deliberately not
 * Tailwind `dark:` variants: this project has no `@custom-variant dark`, so
 * `dark:` compiles to @media (prefers-color-scheme: dark) and tracks the
 * operating system rather than the app's theme.
 */
export type GoalStatus = 'On track' | 'At risk' | 'Failing';

const TOKEN: Record<GoalStatus, string> = {
  'On track': 'good',
  'At risk': 'warn',
  Failing: 'bad',
};

/** Inline style for a status pill, themed via the --status-* tokens. */
export function goalStatusPillStyle(status: string | null | undefined) {
  // Anything unrecognised keeps the old fallback behaviour of reading as a
  // problem rather than as success.
  const token = TOKEN[status as GoalStatus] ?? 'bad';
  return {
    backgroundColor: `hsl(var(--status-${token}-bg))`,
    color: `hsl(var(--status-${token}-fg))`,
  };
}
