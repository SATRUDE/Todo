import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  CalorieSavedFood,
  MealType,
  fetchSavedFoods,
  createSavedFood,
  updateSavedFood,
  deleteSavedFood,
} from "../lib/database";

const MEAL_OPTIONS: { value: MealType | "none"; label: string }[] = [
  { value: "none", label: "No meal" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

interface SavedFoodsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface FoodDraft {
  name: string;
  calories: string;
  meal: MealType | "none";
  protein: string;
  carbs: string;
  fat: string;
}

const emptyDraft: FoodDraft = {
  name: "",
  calories: "",
  meal: "none",
  protein: "",
  carbs: "",
  fat: "",
};

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SavedFoodsSheet({ isOpen, onClose, onChanged }: SavedFoodsSheetProps) {
  const [foods, setFoods] = useState<CalorieSavedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<FoodDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await fetchSavedFoods();
      setFoods(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    void reload();
  }, [isOpen]);

  const startNew = () => {
    setDraft(emptyDraft);
    setEditingId("new");
    setError(null);
  };

  const startEdit = (food: CalorieSavedFood) => {
    setDraft({
      name: food.name,
      calories: String(food.calories),
      meal: (food.meal_type as MealType | null) ?? "none",
      protein: food.protein_g != null ? String(food.protein_g) : "",
      carbs: food.carbs_g != null ? String(food.carbs_g) : "",
      fat: food.fat_g != null ? String(food.fat_g) : "",
    });
    setEditingId(food.id);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const handleSave = async () => {
    const name = draft.name.trim();
    const caloriesNum = parseNumber(draft.calories);
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (caloriesNum == null || caloriesNum < 0) {
      setError("Enter a calorie amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        calories: caloriesNum,
        meal_type: draft.meal === "none" ? null : draft.meal,
        protein_g: parseNumber(draft.protein),
        carbs_g: parseNumber(draft.carbs),
        fat_g: parseNumber(draft.fat),
      };
      if (editingId === "new") {
        await createSavedFood(payload);
      } else if (typeof editingId === "number") {
        await updateSavedFood(editingId, payload);
      }
      await reload();
      onChanged();
      cancelEdit();
    } catch (err) {
      console.error(err);
      setError("Could not save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (food: CalorieSavedFood) => {
    if (!confirm(`Delete "${food.name}" from saved foods?`)) return;
    try {
      await deleteSavedFood(food.id);
      await reload();
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] [&>button]:top-[max(env(safe-area-inset-top),1rem)]"
      >
        <SheetHeader>
          <SheetTitle>Saved foods</SheetTitle>
          <SheetDescription>
            Save foods you eat often so you can log them with one tap.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {editingId == null && (
            <Button type="button" onClick={startNew} className="gap-2">
              <Plus className="size-4" />
              Add new
            </Button>
          )}

          {editingId != null && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="saved-name">Name</Label>
                <Input
                  id="saved-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saved-kcal">Calories</Label>
                  <Input
                    id="saved-kcal"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draft.calories}
                    onChange={(e) =>
                      setDraft({ ...draft, calories: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saved-meal">Meal</Label>
                  <Select
                    value={draft.meal}
                    onValueChange={(v) =>
                      setDraft({ ...draft, meal: v as MealType | "none" })
                    }
                  >
                    <SelectTrigger id="saved-meal">
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
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saved-protein">Protein</Label>
                  <Input
                    id="saved-protein"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={draft.protein}
                    onChange={(e) =>
                      setDraft({ ...draft, protein: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saved-carbs">Carbs</Label>
                  <Input
                    id="saved-carbs"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={draft.carbs}
                    onChange={(e) =>
                      setDraft({ ...draft, carbs: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="saved-fat">Fat</Label>
                  <Input
                    id="saved-fat"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={draft.fat}
                    onChange={(e) =>
                      setDraft({ ...draft, fat: e.target.value })
                    }
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={submitting}>
                  {submitting ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : foods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved foods yet.
              </p>
            ) : (
              foods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {food.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {food.calories} kcal
                      {food.meal_type ? ` · ${food.meal_type}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(food)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Edit ${food.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(food)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    aria-label={`Delete ${food.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
