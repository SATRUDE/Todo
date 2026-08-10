import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WORKOUT_EFFORTS,
  WORKOUT_KINDS,
  WORKOUT_MUSCLE_SECTIONS,
  createWorkoutLog,
  deleteWorkoutLog,
  fetchPushExports,
  fetchWorkoutLogs,
  updateWorkoutLog,
  uploadPushExport,
  type PushExport,
  type WorkoutEffort,
  type WorkoutKind,
  type WorkoutLog,
  type WorkoutMuscle,
} from "../lib/database";
import { AppSheet } from "./AppSheet";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

/**
 * Where Mark logs a run or a gym session.
 *
 * PUSH, his lifting tracker, sees resistance training and nothing else, so
 * every run, ride and walk was invisible to Mickey. What is logged here is read
 * by the trainer routine the next morning and folded into the day's brief. The
 * tick on a row is that confirmation, so it is worth showing rather than hiding.
 */

const KIND_LABELS: Record<WorkoutKind, string> = {
  run: "Run",
  gym: "Gym",
  ride: "Ride",
  walk: "Walk",
  swim: "Swim",
  other: "Other",
};

/** Kinds where a distance is worth asking for. A gym session has none. */
const DISTANCE_KINDS: WorkoutKind[] = ["run", "ride", "walk", "swim"];

const EFFORT_LABELS: Record<WorkoutEffort, string> = {
  easy: "Easy",
  steady: "Steady",
  hard: "Hard",
};

/**
 * The stored keys are Mickey's, so they are snake_case and abbreviated. He needs
 * them unchanged; Mark should not have to read them.
 */
const MUSCLE_LABELS: Record<WorkoutMuscle, string> = {
  chest: "Chest",
  back: "Back",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  traps: "Traps",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
};

/** Kinds where naming the muscles worked is worth asking for. */
const MUSCLE_KINDS: WorkoutKind[] = ["gym"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A YYYY-MM-DD date string as a local Date, not the UTC midnight Date() gives. */
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayHeading(key: string): string {
  const date = parseDateKey(key);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/** "8.2 km, 44 min, steady" — only the parts that were filled in. */
function summariseLog(log: WorkoutLog): string {
  const parts: string[] = [];
  if (log.distance_km != null) parts.push(`${Number(log.distance_km)} km`);
  if (log.duration_min != null) parts.push(`${log.duration_min} min`);
  if (log.effort) parts.push(EFFORT_LABELS[log.effort].toLowerCase());
  return parts.join(", ");
}

/** "Chest, triceps, front delts" — the muscles line under a gym session. */
function summariseMuscles(log: WorkoutLog): string | null {
  if (!log.muscles?.length) return null;
  return log.muscles
    .map((m, i) => (i === 0 ? MUSCLE_LABELS[m] : MUSCLE_LABELS[m].toLowerCase()))
    .join(", ");
}

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

interface LogWorkoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editing: WorkoutLog | null;
  onSaved: () => void;
}

function LogWorkoutSheet({ isOpen, onClose, editing, onSaved }: LogWorkoutSheetProps) {
  const [kind, setKind] = useState<WorkoutKind>("run");
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [effort, setEffort] = useState<WorkoutEffort | null>(null);
  const [muscles, setMuscles] = useState<WorkoutMuscle[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on every open, so a cancelled edit never leaks into the next session.
  useEffect(() => {
    if (!isOpen) return;
    setKind(editing?.kind ?? "run");
    setDateKey(editing?.workout_date ?? toDateKey(new Date()));
    setDuration(editing?.duration_min != null ? String(editing.duration_min) : "");
    setDistance(editing?.distance_km != null ? String(Number(editing.distance_km)) : "");
    setEffort(editing?.effort ?? null);
    setMuscles(editing?.muscles ?? []);
    setNotes(editing?.notes ?? "");
    setError(null);
    setSaving(false);
  }, [isOpen, editing]);

  const wantsDistance = DISTANCE_KINDS.includes(kind);
  const wantsMuscles = MUSCLE_KINDS.includes(kind);

  function toggleMuscle(muscle: WorkoutMuscle) {
    setMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  }

  async function handleSave() {
    const durationMin = duration.trim() ? Number(duration) : null;
    const distanceKm = wantsDistance && distance.trim() ? Number(distance) : null;

    if (durationMin != null && (!Number.isFinite(durationMin) || durationMin <= 0)) {
      setError("Give the duration in whole minutes.");
      return;
    }
    if (distanceKm != null && (!Number.isFinite(distanceKm) || distanceKm <= 0)) {
      setError("Give the distance in kilometres.");
      return;
    }
    const keptMuscles = wantsMuscles ? muscles : [];
    if (durationMin == null && distanceKm == null && !notes.trim() && keptMuscles.length === 0) {
      setError("Add a duration, a distance, the muscles or a note, so there is something to read.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        date: parseDateKey(dateKey),
        kind,
        durationMin: durationMin == null ? null : Math.round(durationMin),
        distanceKm,
        effort,
        muscles: keptMuscles,
        notes,
      };
      if (editing) {
        await updateWorkoutLog(editing.id, input);
      } else {
        await createWorkoutLog(input);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
      setError("That did not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AppSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={editing ? "Edit session" : "Log a session"}
    >
      <div className="flex flex-col gap-6 pb-2">
        <h2 className="text-xl font-semibold text-foreground">
          {editing ? "Edit session" : "Log a session"}
        </h2>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">What was it</span>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_KINDS.map((k) => (
              <Chip key={k} label={KIND_LABELS[k]} selected={kind === k} onClick={() => setKind(k)} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="workout-date" className="text-sm text-muted-foreground">
            When
          </label>
          <Input
            id="workout-date"
            type="date"
            value={dateKey}
            max={toDateKey(new Date())}
            onChange={(e) => setDateKey(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="workout-duration" className="text-sm text-muted-foreground">
              Minutes
            </label>
            <Input
              id="workout-duration"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          {wantsDistance && (
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="workout-distance" className="text-sm text-muted-foreground">
                Kilometres
              </label>
              <Input
                id="workout-distance"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0.1"
                placeholder="8.2"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">How it felt</span>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_EFFORTS.map((e) => (
              <Chip
                key={e}
                label={EFFORT_LABELS[e]}
                selected={effort === e}
                onClick={() => setEffort(effort === e ? null : e)}
              />
            ))}
          </div>
        </div>

        {wantsMuscles && (
          <div className="flex flex-col gap-3">
            <span className="text-sm text-muted-foreground">What you worked</span>
            {WORKOUT_MUSCLE_SECTIONS.map((section) => (
              <div key={section.label} className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">{section.label}</span>
                <div className="flex flex-wrap gap-2">
                  {section.muscles.map((m) => (
                    <Chip
                      key={m}
                      label={MUSCLE_LABELS[m]}
                      selected={muscles.includes(m)}
                      onClick={() => toggleMuscle(m)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="workout-notes" className="text-sm text-muted-foreground">
            Anything Mickey should know
          </label>
          <Textarea
            id="workout-notes"
            rows={3}
            placeholder="Hills, felt heavy in the calves"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Log it"}
          </Button>
        </div>
      </div>
    </AppSheet>
  );
}

/** "6 Aug" / "6 Aug 2025" — a stored YYYY-MM-DD, read short. */
function formatShortDate(key: string): string {
  const date = parseDateKey(key);
  const today = new Date();
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Uploading the PUSH export.
 *
 * PUSH holds the lifting history and only exports it as a file, so this is the
 * one part of Mark's training that cannot be typed in. It used to reach the
 * system by him committing the file to the marks-magazine repo, and the copy
 * there went a month stale, which is the whole reason this exists. Mickey applies
 * the newest upload on his next round.
 */
function PushImportCard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [latest, setLatest] = useState<PushExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState<PushExport | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await fetchPushExports(1);
      setLatest(rows[0] ?? null);
    } catch (err) {
      console.error("Failed to load PUSH exports:", err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setJustUploaded(null);
    try {
      const row = await uploadPushExport(file);
      setLatest(row);
      setJustUploaded(row);
    } catch (err) {
      console.error("Failed to upload PUSH export:", err);
      setError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const shown = justUploaded ?? latest;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base text-foreground">From PUSH</h2>
        <p className="text-sm text-muted-foreground">
          Export your history in PUSH and drop the JSON here. Mickey rebuilds your strength and volume
          numbers from it overnight.
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
        {busy ? "Uploading…" : "Choose a PUSH export"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {justUploaded && (
        <p className="text-sm text-foreground">
          Taken: {justUploaded.workout_count ?? 0} workouts
          {justUploaded.latest_workout_date && `, the newest from ${formatShortDate(justUploaded.latest_workout_date)}`}.
          Mickey picks it up on his next round.
        </p>
      )}

      {!justUploaded && shown && (
        <p className="text-sm text-muted-foreground">
          Last upload {formatShortDate(shown.uploaded_at.slice(0, 10))}: {shown.workout_count ?? 0} workouts
          {shown.latest_workout_date && `, newest ${formatShortDate(shown.latest_workout_date)}`}.
          {shown.applied_at ? " Mickey has applied it." : " Waiting for Mickey."}
        </p>
      )}

      {!shown && !error && (
        <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
      )}
    </div>
  );
}

export function WorkoutsPage({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutLog | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkoutLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchWorkoutLogs());
      setLoadFailed(false);
    } catch (err) {
      console.error("Failed to load workouts:", err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo(() => {
    const grouped = new Map<string, WorkoutLog[]>();
    for (const log of logs) {
      const list = grouped.get(log.workout_date);
      if (list) list.push(log);
      else grouped.set(log.workout_date, [log]);
    }
    return [...grouped.entries()];
  }, [logs]);

  const thisWeekCount = useMemo(() => {
    const monday = startOfDay(new Date());
    // getDay() is 0 on Sunday, which belongs to the week that just ended.
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return logs.filter((l) => parseDateKey(l.workout_date) >= monday).length;
  }, [logs]);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteWorkoutLog(pendingDelete.id);
      setLogs((prev) => prev.filter((l) => l.id !== pendingDelete.id));
    } catch (err) {
      console.error("Failed to delete workout:", err);
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-col gap-6 px-5 pt-0 pb-[150px] w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-accent"
            aria-label="Back"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Workouts</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          {thisWeekCount === 0
            ? "Nothing logged this week yet. Mickey reads these each morning."
            : `${thisWeekCount} ${thisWeekCount === 1 ? "session" : "sessions"} this week. Mickey reads these each morning.`}
        </p>

        <Button
          className="w-full"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          Log a session
        </Button>

        <PushImportCard />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : loadFailed ? (
          <p className="text-sm text-muted-foreground">
            Could not load your sessions. Pull the page again in a moment.
          </p>
        ) : days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Runs, rides and walks especially: those are the ones PUSH cannot see.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map(([dateKey, dayLogs]) => (
              <div key={dateKey} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">{formatDayHeading(dateKey)}</h2>
                {dayLogs.map((log) => {
                  const summary = summariseLog(log);
                  const muscleLine = summariseMuscles(log);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => {
                          setEditing(log);
                          setSheetOpen(true);
                        }}
                      >
                        <p className="text-base text-foreground">
                          {KIND_LABELS[log.kind]}
                          {summary && <span className="text-muted-foreground"> · {summary}</span>}
                        </p>
                        {muscleLine && <p className="mt-1 text-sm text-muted-foreground">{muscleLine}</p>}
                        {log.notes && <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>}
                        {log.seen_by_trainer_at && (
                          <p className="mt-1 text-xs text-muted-foreground">Mickey has this one</p>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(log)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Delete ${KIND_LABELS[log.kind]} on ${formatDayHeading(dateKey)}`}
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <LogWorkoutSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this session?"
        description="It goes from your log. If Mickey has already read it, his note for that day stays as it is."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
