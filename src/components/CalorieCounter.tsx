import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Pencil,
  Bookmark,
  Settings2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalorieRing } from "./CalorieRing";
import { LogEntryDialog } from "./LogEntryDialog";
import { EditDayGoalDialog } from "./EditDayGoalDialog";
import { SavedFoodsSheet } from "./SavedFoodsSheet";
import {
  CalorieDaySummary,
  CalorieLog,
  CalorieSavedFood,
  MealType,
  fetchCalorieDaySummary,
  fetchSavedFoods,
  quickAddSavedFood,
} from "../lib/database";

interface CalorieCounterProps {
  onBack: () => void;
}

const MEAL_GROUPS: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(target, today)) return "Today";
  if (isSameDay(target, yesterday)) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year:
      target.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function inferDefaultMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function CalorieCounter({ onBack }: CalorieCounterProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [summary, setSummary] = useState<CalorieDaySummary | null>(null);
  const [savedFoods, setSavedFoods] = useState<CalorieSavedFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CalorieLog | null>(null);
  const [defaultMeal, setDefaultMeal] = useState<MealType | undefined>();
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [savedFoodsOpen, setSavedFoodsOpen] = useState(false);

  const loadSummary = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const data = await fetchCalorieDaySummary(date);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load calorie summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedFoods = useCallback(async () => {
    try {
      const list = await fetchSavedFoods();
      setSavedFoods(list);
    } catch (err) {
      console.error("Failed to load saved foods:", err);
    }
  }, []);

  useEffect(() => {
    void loadSummary(selectedDate);
  }, [selectedDate, loadSummary]);

  useEffect(() => {
    void loadSavedFoods();
  }, [loadSavedFoods]);

  const isToday = isSameDay(selectedDate, today);
  const canGoNext = !isToday;

  const goPrev = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(startOfDay(prev));
  };

  const goNext = () => {
    if (!canGoNext) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(startOfDay(next));
  };

  const handleAddNew = () => {
    setEditingLog(null);
    setDefaultMeal(isToday ? inferDefaultMeal() : undefined);
    setLogDialogOpen(true);
  };

  const handleEdit = (log: CalorieLog) => {
    setEditingLog(log);
    setDefaultMeal(undefined);
    setLogDialogOpen(true);
  };

  const handleQuickAdd = async (food: CalorieSavedFood) => {
    try {
      await quickAddSavedFood(food.id, selectedDate);
      await Promise.all([loadSummary(selectedDate), loadSavedFoods()]);
    } catch (err) {
      console.error("Quick-add failed:", err);
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, CalorieLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      other: [],
    };
    if (summary) {
      for (const log of summary.logs) {
        const key = log.meal_type ?? "other";
        (groups[key] ?? groups.other).push(log);
      }
    }
    return groups;
  }, [summary]);

  const totals = summary?.totals ?? {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  };
  const goal = summary?.goalCalories ?? null;

  return (
    <div className="flex flex-col min-h-0 w-full">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 -ml-2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-medium text-foreground flex-1">
          Calorie Counter
        </h1>
        <button
          type="button"
          onClick={() => setSavedFoodsOpen(true)}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Manage saved foods"
        >
          <Settings2 className="size-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-auto px-4 py-6 pb-[120px]">
        {/* Date navigator */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-5" />
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-center font-medium text-foreground hover:bg-accent/50"
              >
                {formatDateLabel(selectedDate)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(startOfDay(date));
                    setCalendarOpen(false);
                  }
                }}
                disabled={{ after: today }}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next day"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Ring */}
        <div className="flex flex-col items-center gap-3">
          <CalorieRing total={totals.calories} goal={goal} />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGoalDialogOpen(true)}
              className="gap-2"
            >
              <Pencil className="size-3.5" />
              {goal == null
                ? "Set goal"
                : `Goal: ${goal.toLocaleString()} kcal`}
            </Button>
            {summary?.isOverride && (
              <span className="text-xs text-muted-foreground">
                (override for this day)
              </span>
            )}
          </div>
        </div>

        {/* Macros */}
        {(totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0) && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Protein", value: totals.protein_g, color: "text-emerald-500" },
              { label: "Carbs", value: totals.carbs_g, color: "text-amber-500" },
              { label: "Fat", value: totals.fat_g, color: "text-rose-500" },
            ].map((m) => (
              <div
                key={m.label}
                className="flex flex-col items-center rounded-lg border border-border bg-card px-3 py-2"
              >
                <span className={`text-lg font-medium ${m.color}`}>
                  {Math.round(m.value * 10) / 10}g
                </span>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Saved foods (quick-add) */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Quick add
            </h2>
            <button
              type="button"
              onClick={() => setSavedFoodsOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage
            </button>
          </div>
          {savedFoods.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border bg-card/40 px-3 py-3">
              Save foods you eat often to log them with one tap.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {savedFoods.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => handleQuickAdd(food)}
                  className="shrink-0 flex flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-accent/50 max-w-[160px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="size-3 text-rose-400" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {food.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {food.calories} kcal
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Log entries */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Logged
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={handleAddNew}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Add food
            </Button>
          </div>

          {loading ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
              Loading…
            </div>
          ) : summary && summary.logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-muted-foreground">
              Nothing logged yet for this day.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {MEAL_GROUPS.map(({ key, label }) => {
                const items = grouped[key];
                if (!items || items.length === 0) return null;
                const sectionKcal = items.reduce(
                  (sum, l) => sum + (l.calories || 0),
                  0
                );
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {sectionKcal} kcal
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((log) => (
                        <LogRow key={log.id} log={log} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {grouped.other.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                    Other
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {grouped.other.map((log) => (
                      <LogRow key={log.id} log={log} onEdit={handleEdit} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <LogEntryDialog
        isOpen={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        mode={editingLog ? "edit" : "create"}
        date={selectedDate}
        initialEntry={editingLog ?? undefined}
        defaultMealType={defaultMeal}
        onSaved={() => {
          void loadSummary(selectedDate);
          void loadSavedFoods();
        }}
      />

      <EditDayGoalDialog
        isOpen={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        date={selectedDate}
        currentGoal={goal}
        isOverride={summary?.isOverride ?? false}
        onSaved={() => {
          void loadSummary(selectedDate);
        }}
      />

      <SavedFoodsSheet
        isOpen={savedFoodsOpen}
        onClose={() => setSavedFoodsOpen(false)}
        onChanged={() => void loadSavedFoods()}
      />
    </div>
  );
}

function LogRow({
  log,
  onEdit,
}: {
  log: CalorieLog;
  onEdit: (log: CalorieLog) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(log)}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-accent/50"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {log.name?.trim() || (
            <span className="italic text-muted-foreground">Untitled</span>
          )}
        </p>
        {(log.protein_g || log.carbs_g || log.fat_g) && (
          <p className="text-xs text-muted-foreground">
            {log.protein_g != null && `P ${log.protein_g}g`}
            {log.protein_g != null && (log.carbs_g != null || log.fat_g != null) && " · "}
            {log.carbs_g != null && `C ${log.carbs_g}g`}
            {log.carbs_g != null && log.fat_g != null && " · "}
            {log.fat_g != null && `F ${log.fat_g}g`}
          </p>
        )}
      </div>
      <span className="font-medium text-foreground tabular-nums">
        {log.calories} kcal
      </span>
    </button>
  );
}
