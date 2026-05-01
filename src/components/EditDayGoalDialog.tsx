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
  saveDefaultCalorieGoal,
} from "../lib/database";

interface EditDayGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  currentGoal: number | null;
  isOverride: boolean;
  onSaved: () => void;
}

export function EditDayGoalDialog({
  isOpen,
  onClose,
  date,
  currentGoal,
  isOverride,
  onSaved,
}: EditDayGoalDialogProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(currentGoal != null ? String(currentGoal) : "");
    setError(null);
    setSubmitting(false);
  }, [isOpen, currentGoal]);

  const parsed = (() => {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
  })();

  const handleSaveForDay = async () => {
    if (parsed == null) {
      setError("Enter a valid calorie goal.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await upsertCalorieDayOverride(date, parsed);
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
    if (parsed == null) {
      setError("Enter a valid calorie goal.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveDefaultCalorieGoal(parsed);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calorie goal</DialogTitle>
          <DialogDescription>
            Set a goal for this day, or save it as your new default for every day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="goal-kcal">Goal (kcal)</Label>
          <Input
            id="goal-kcal"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="2000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
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
            disabled={submitting || parsed == null}
            className="w-full"
          >
            Save for this day only
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAsDefault}
            disabled={submitting || parsed == null}
            className="w-full"
          >
            Save as new default
          </Button>
          {isOverride && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetToDefault}
              disabled={submitting}
              className="w-full text-muted-foreground"
            >
              Reset to default goal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
