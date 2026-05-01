import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  CalorieLog,
  MealType,
  createCalorieLog,
  updateCalorieLog,
  deleteCalorieLog,
  createSavedFood,
} from "../lib/database";

const MEAL_OPTIONS: { value: MealType | "none"; label: string }[] = [
  { value: "none", label: "No meal" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

interface LogEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  date: Date;
  initialEntry?: CalorieLog;
  defaultMealType?: MealType;
  onSaved: () => void;
}

function toInputString(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LogEntryDialog({
  isOpen,
  onClose,
  mode,
  date,
  initialEntry,
  defaultMealType,
  onSaved,
}: LogEntryDialogProps) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState<MealType | "none">("none");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSubmitting(false);
    if (mode === "edit" && initialEntry) {
      setName(initialEntry.name ?? "");
      setCalories(String(initialEntry.calories ?? ""));
      setMealType((initialEntry.meal_type as MealType | null) ?? "none");
      setProtein(toInputString(initialEntry.protein_g));
      setCarbs(toInputString(initialEntry.carbs_g));
      setFat(toInputString(initialEntry.fat_g));
      setSaveAsFavorite(false);
    } else {
      setName("");
      setCalories("");
      setMealType(defaultMealType ?? "none");
      setProtein("");
      setCarbs("");
      setFat("");
      setSaveAsFavorite(false);
    }
  }, [isOpen, mode, initialEntry, defaultMealType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const caloriesNum = parseNumber(calories);
    if (caloriesNum == null || caloriesNum < 0) {
      setError("Enter a calorie amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      const meal = mealType === "none" ? null : mealType;
      const proteinNum = parseNumber(protein);
      const carbsNum = parseNumber(carbs);
      const fatNum = parseNumber(fat);

      if (mode === "create") {
        await createCalorieLog({
          date,
          name: trimmedName || null,
          calories: caloriesNum,
          mealType: meal,
          protein_g: proteinNum,
          carbs_g: carbsNum,
          fat_g: fatNum,
        });
        if (saveAsFavorite && trimmedName) {
          await createSavedFood({
            name: trimmedName,
            calories: caloriesNum,
            meal_type: meal,
            protein_g: proteinNum,
            carbs_g: carbsNum,
            fat_g: fatNum,
          });
        }
      } else if (initialEntry) {
        await updateCalorieLog(initialEntry.id, {
          name: trimmedName || null,
          calories: caloriesNum,
          mealType: meal,
          protein_g: proteinNum,
          carbs_g: carbsNum,
          fat_g: fatNum,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEntry) return;
    if (!confirm("Delete this entry?")) return;
    setSubmitting(true);
    try {
      await deleteCalorieLog(initialEntry.id);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not delete. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Log food" : "Edit entry"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Calories are required. Everything else is optional."
              : "Update this food entry."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="calorie-name">Food</Label>
            <Input
              id="calorie-name"
              type="text"
              placeholder="e.g. Oatmeal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="calorie-kcal">Calories *</Label>
              <Input
                id="calorie-kcal"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="calorie-meal">Meal</Label>
              <Select
                value={mealType}
                onValueChange={(v) => setMealType(v as MealType | "none")}
              >
                <SelectTrigger id="calorie-meal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="calorie-protein">Protein (g)</Label>
              <Input
                id="calorie-protein"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="calorie-carbs">Carbs (g)</Label>
              <Input
                id="calorie-carbs"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="calorie-fat">Fat (g)</Label>
              <Input
                id="calorie-fat"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>

          {mode === "create" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={saveAsFavorite}
                onChange={(e) => setSaveAsFavorite(e.target.checked)}
              />
              Save to my foods (needs a food name)
            </label>
          )}

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={submitting}
                className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
