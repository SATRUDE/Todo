import { useState, useEffect } from "react";
import { Calendar } from "./ui/calendar";
import { TimeInput } from "./TimeInput";

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDeadline: (date: Date, time: string, recurring?: string) => void;
  onClearDeadline?: () => void;
  currentDeadline?: { date: Date; time: string; recurring?: string } | null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

const QUICK_SELECT_OPTIONS: { label: string; getDate: () => Date }[] = [
  { label: "Today", getDate: () => new Date() },
  { label: "Tomorrow", getDate: () => addDays(new Date(), 1) },
  { label: "In 2 days", getDate: () => addDays(new Date(), 2) },
  { label: "In 3 days", getDate: () => addDays(new Date(), 3) },
  { label: "In a week", getDate: () => addDays(new Date(), 7) },
  { label: "In a month", getDate: () => addMonths(new Date(), 1) },
];

export function DeadlineModal({ isOpen, onClose, onSetDeadline, onClearDeadline, currentDeadline }: DeadlineModalProps) {
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseSelectedDays = (recurringValue: string): string[] => {
    if (recurringValue && recurringValue.includes(',')) {
      return recurringValue.split(',').map(day => day.trim().toLowerCase());
    }
    return [];
  };

  const getInitialRecurring = (): string => {
    if (currentDeadline?.recurring && currentDeadline.recurring.includes(',')) {
      return "weekly";
    }
    return currentDeadline?.recurring || "none";
  };

  const getInitialSelectedDays = (): string[] => {
    if (currentDeadline?.recurring && currentDeadline.recurring.includes(',')) {
      return parseSelectedDays(currentDeadline.recurring);
    }
    return [];
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDeadline?.date || new Date());
  const [selectedTime, setSelectedTime] = useState(currentDeadline?.time || "");
  const [recurring, setRecurring] = useState(getInitialRecurring());
  const [noTime, setNoTime] = useState(!currentDeadline?.time || currentDeadline.time.trim() === "");
  const [noDate, setNoDate] = useState(!currentDeadline?.date);
  const [selectedDays, setSelectedDays] = useState<string[]>(getInitialSelectedDays());

  useEffect(() => {
    if (isOpen) {
      if (currentDeadline?.time && currentDeadline.time.trim() !== "") {
        setSelectedTime(currentDeadline.time);
        setNoTime(false);
      } else {
        setSelectedTime("");
        setNoTime(true);
      }
      if (currentDeadline?.date) {
        setSelectedDate(currentDeadline.date);
        setNoDate(false);
      } else {
        setSelectedDate(undefined);
        setNoDate(true);
      }
      if (currentDeadline?.recurring && currentDeadline.recurring.includes(',')) {
        setSelectedDays(parseSelectedDays(currentDeadline.recurring));
        setRecurring("weekly");
      } else {
        setSelectedDays([]);
        if (recurring === "weekly" && selectedDate) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          setSelectedDays([dayNames[selectedDate.getDay()]]);
        } else {
          setSelectedDays([]);
        }
      }
    }
  }, [isOpen, currentDeadline]);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleConfirm = () => {
    if (noDate || !selectedDate) {
      if (onClearDeadline) {
        onClearDeadline();
      }
      onClose();
    } else {
      const timeToSet = noTime ? "" : selectedTime;
      let recurringValue: string | undefined;
      if (recurring === "weekly") {
        if (selectedDays.length > 0) {
          recurringValue = selectedDays.join(',');
        } else {
          recurringValue = dayNames[selectedDate.getDay()];
        }
      } else if (recurring !== "none") {
        recurringValue = recurring;
      }
      onSetDeadline(selectedDate, timeToSet, recurringValue);
      onClose();
    }
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleNoTimeToggle = () => {
    const newNoTime = !noTime;
    setNoTime(newNoTime);
    setSelectedTime(newNoTime ? "" : getCurrentTime());
  };

  const handleNoDateToggle = () => {
    const newNoDate = !noDate;
    setNoDate(newNoDate);
    setSelectedDate(newNoDate ? undefined : new Date());
  };

  const handleQuickSelect = (getDate: () => Date) => {
    setSelectedDate(getDate());
    setNoDate(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10003] pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />

      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl bg-card pt-5 desktop-bottom-sheet">
          {/* Handle */}
          <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>

          <div className="w-full shrink-0 px-5">
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Set Deadline
            </h2>
          </div>

          <div className="flex flex-1 flex-col w-full overflow-x-hidden overflow-y-auto px-5 [-webkit-overflow-scrolling:touch] min-h-0">
            <div className="flex flex-col gap-6 pt-4 pb-2">
              {/* Calendar section */}
              <div className="w-full">
                {/* No Date Toggle */}
                <button
                  type="button"
                  onClick={handleNoDateToggle}
                  className="flex items-center gap-2 rounded-full px-4 py-2 bg-secondary hover:bg-accent transition-colors mb-3"
                >
                  <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${noDate ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                    <div
                      className={`absolute top-1 size-4 rounded-full bg-white shadow transition-all ${noDate ? 'left-6' : 'left-1'}`}
                    />
                  </div>
                  <span className="text-lg font-normal text-foreground">No date</span>
                </button>

                <div className={`flex justify-center ${noDate ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setNoDate(false);
                      }
                    }}
                    className="rounded-lg border border-border bg-secondary"
                  />
                </div>

                {/* Quick-select buttons */}
                {!noDate && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_SELECT_OPTIONS.map(({ label, getDate }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleQuickSelect(getDate)}
                        className="px-3 py-2 rounded-lg text-sm font-normal bg-secondary hover:bg-accent text-foreground transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Picker */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleNoTimeToggle}
                  className="flex items-center gap-2 rounded-full px-4 py-2 bg-secondary hover:bg-accent transition-colors mb-3"
                >
                  <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${noTime ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                    <div
                      className={`absolute top-1 size-4 rounded-full bg-white shadow transition-all ${noTime ? 'left-6' : 'left-1'}`}
                    />
                  </div>
                  <span className="text-lg font-normal text-foreground">No time</span>
                </button>
                <TimeInput
                  id="deadline-time"
                  value={selectedTime}
                  onChange={(time) => setSelectedTime(time)}
                  label="Time"
                  disabled={noTime}
                />
              </div>

              {/* Recurring Dropdown */}
              <div className="w-full">
                <label htmlFor="deadline-recurring" className="text-lg font-normal text-foreground mb-2 block">
                  Recurring
                </label>
                <select
                  id="deadline-recurring"
                  value={recurring}
                  onChange={(e) => {
                    setRecurring(e.target.value);
                    if (e.target.value !== "weekly") {
                      setSelectedDays([]);
                    } else if (selectedDate) {
                      setSelectedDays([dayNames[selectedDate.getDay()]]);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-violet-500/30 cursor-pointer"
                >
                  <option value="none" className="bg-card text-foreground">None</option>
                  <option value="daily" className="bg-card text-foreground">Every day</option>
                  <option value="weekly" className="bg-card text-foreground">Weekly (select days)</option>
                  <option value="weekday" className="bg-card text-foreground">Every weekday</option>
                  <option value="monthly" className="bg-card text-foreground">Every month</option>
                </select>
              </div>

              {/* Day Selection for Weekly */}
              {recurring === "weekly" && !noDate && (
                <div className="w-full">
                  <label className="text-lg font-normal text-foreground mb-2 block">
                    Select Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-4 py-2 rounded-lg font-normal text-base transition-colors ${
                          selectedDays.includes(day)
                            ? 'bg-blue-500 text-primary-foreground'
                            : 'bg-secondary text-foreground hover:bg-accent'
                        }`}
                      >
                        {dayLabels[index]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed action buttons - always visible at bottom */}
          <div className="shrink-0 w-full px-5 py-4 bg-card border-t border-border">
            <div className="flex gap-3 w-full">
              {onClearDeadline && currentDeadline && (
                <button
                  type="button"
                  onClick={() => {
                    onClearDeadline();
                    onClose();
                  }}
                  className="flex-1 rounded-lg px-6 py-3 font-normal text-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg px-6 py-3 font-normal text-lg bg-secondary hover:bg-accent text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-lg px-6 py-3 font-medium text-lg bg-blue-500 hover:bg-blue-600 text-primary-foreground transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
