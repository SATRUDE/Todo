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
  upsertCalorieDayOverride,
  deleteCalorieDayOverride,
  saveCalorieDefaults,
} from "../lib/database";

interface EditDayGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  currentCalorieGoal: number | null;
  currentProteinGoal: number | null;
  isOverride: boolean;
  onSaved: () => void;
}

function parseGoal(value: string, allowDecimal: boolean): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return "invalid";
  return allowDecimal ? Math.round(num * 10) / 10 : Math.round(num);
}

export function EditDayGoalDialog({
  isOpen,
  onClose,
  date,
  currentCalorieGoal,
  currentProteinGoal,
  isOverride,
  onSaved,
}: EditDayGoalDialogProps) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCalories(currentCalorieGoal != null ? String(currentCalorieGoal) : "");
    setProtein(currentProteinGoal != null ? String(currentProteinGoal) : "");
    setError(null);
    setSubmitting(false);
  }, [isOpen, currentCalorieGoal, currentProteinGoal]);

  const calorieParsed = parseGoal(calories, false);
  const proteinParsed = parseGoal(protein, true);

  const validate = (): { calorieGoal: number | null; proteinGoal: number | null } | null => {
    if (calorieParsed === "invalid") {
      setError("Enter a valid calorie goal.");
      return null;
    }
    if (proteinParsed === "invalid") {
      setError("Enter a valid protein goal.");
      return null;
    }
    return {
      calorieGoal: calorieParsed,
      proteinGoal: proteinParsed,
    };
  };

  const handleSaveForDay = async () => {
    const values = validate();
    if (!values) return;
    setSubmitting(true);
    setError(null);
    try {
      await upsertCalorieDayOverride(date, {
        goal_calories: values.calorieGoal,
        protein_goal_g: values.proteinGoal,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAsDefault = async () => {
    const values = validate();
    if (!values) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveCalorieDefaults({
        calorieGoal: values.calorieGoal,
        proteinGoalG: values.proteinGoal,
      });
      if (isOverride) {
        await deleteCalorieDayOverride(date);
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

  const handleResetToDefault = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteCalorieDayOverride(date);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not reset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSave = calorieParsed !== "invalid" && proteinParsed !== "invalid";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily goals</DialogTitle>
          <DialogDescription>
            Set goals for this day, or save them as your new defaults for every day.
            Leave a field blank to remove that goal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-kcal">Calories (kcal)</Label>
            <Input
              id="goal-kcal"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="2000"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-protein">Protein (g)</Label>
            <Input
              id="goal-protein"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="120"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-stretch">
          <Button
            type="button"
            onClick={handleSaveForDay}
            disabled={submitting || !canSave}
            className="w-full"
          >
            Save for this day only
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAsDefault}
            disabled={submitting || !canSave}
            className="w-full"
          >
            Save as new defaults
          </Button>
          {isOverride && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetToDefault}
              disabled={submitting}
              className="w-full text-muted-foreground"
            >
              Reset to defaults
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
