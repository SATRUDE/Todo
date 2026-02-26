import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Droplets, ChevronLeft, CheckCircle2 } from "lucide-react";

interface WaterReminderLog {
  id: number;
  user_id: string;
  sent_at: string;
  scheduled_slot: string;
}

export function DrinkWater({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<WaterReminderLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("water_reminder_log")
        .select("id, user_id, sent_at, scheduled_slot")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load water reminder logs:", error);
      } else {
        setLogs((data ?? []) as WaterReminderLog[]);
      }
      setLoading(false);
    }
    void loadLogs();
  }, []);

  function formatDate(sentAt: string) {
    const d = new Date(sentAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }

  function formatTime(slot: string) {
    // slot is "09:00", "12:00", etc - convert to friendly format
    const [h, m] = slot.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }

  const scheduleSlots = [
    { slot: "09:00", label: "9:00 AM" },
    { slot: "12:00", label: "12:00 PM" },
    { slot: "14:00", label: "2:00 PM" },
    { slot: "16:00", label: "4:00 PM" },
  ];

  return (
    <div className="flex flex-col min-h-0 w-full">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 -ml-2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-lg font-medium text-foreground">Drink Water</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-auto px-4 py-6 pb-[100px]">
        <Card className="border-0 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <Droplets className="size-7" />
              </div>
              <div>
                <CardTitle className="text-xl">Water reminders</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Push notifications sent to your device at 9am, 12pm, 2pm & 4pm
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Schedule
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {scheduleSlots.map(({ slot, label }) => (
              <div
                key={slot}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="text-2xl" aria-hidden>💧</span>
                <span className="font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Notifications sent
          </h2>

          {loading ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
              No notifications sent yet. Enable push notifications in Settings and
              wait for the next reminder.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <CheckCircle2 className="size-5 shrink-0 text-cyan-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      Sent at {formatTime(log.scheduled_slot)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(log.sent_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
