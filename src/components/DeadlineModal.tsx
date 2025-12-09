import { useState } from "react";
import { Calendar } from "./ui/calendar";
import svgPaths from "../imports/svg-e51h379o38";

type Period = "AM" | "PM";

interface TimeParts {
  hour: number;
  minute: number;
  period: Period;
}

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDeadline: (date: Date, time: string, recurring?: string) => void;
  onClearDeadline?: () => void;
  currentDeadline?: { date: Date; time: string; recurring?: string } | null;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const PERIODS: Period[] = ["AM", "PM"];
const DEFAULT_TIME_PARTS: TimeParts = { hour: 12, minute: 0, period: "PM" };

const padTimeUnit = (value: number) => value.toString().padStart(2, "0");

const roundTimeTo5Minutes = (time: string): string => {
  if (!time) return "";
  const [hoursStr = "0", minutesStr = "0"] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "";
  }

  const roundedMinutes = Math.round(minutes / 5) * 5;
  if (roundedMinutes === 60) {
    const nextHour = (hours + 1) % 24;
    return `${padTimeUnit(nextHour)}:00`;
  }

  return `${padTimeUnit(hours)}:${padTimeUnit(roundedMinutes)}`;
};

const toTimeParts = (hour24: number, minute: number): TimeParts => {
  let safeHour = ((hour24 % 24) + 24) % 24;
  const snappedMinute = Math.round(minute / 5) * 5;
  let safeMinute = snappedMinute;

  if (snappedMinute === 60) {
    safeMinute = 0;
    safeHour = (safeHour + 1) % 24;
  }

  const period: Period = safeHour >= 12 ? "PM" : "AM";
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12;

  return { hour: hour12, minute: safeMinute, period };
};

const getDefaultTimeParts = (): TimeParts => {
  const now = new Date();
  const rawTime = `${padTimeUnit(now.getHours())}:${padTimeUnit(now.getMinutes())}`;
  const rounded = roundTimeTo5Minutes(rawTime);

  if (!rounded) {
    return { ...DEFAULT_TIME_PARTS };
  }

  const [hourStr = "0", minuteStr = "0"] = rounded.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { ...DEFAULT_TIME_PARTS };
  }

  return toTimeParts(hour, minute);
};

const parseTimeString = (time?: string | null): TimeParts => {
  if (!time) {
    return getDefaultTimeParts();
  }

  const [hourStr = "0", minuteStr = "0"] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return getDefaultTimeParts();
  }

  return toTimeParts(hour, minute);
};

const timePartsToValue = (parts: TimeParts): string => {
  const { hour, minute, period } = parts;
  let hour24 = hour % 12;

  if (period === "PM") {
    hour24 += 12;
  }

  if (period === "AM" && hour === 12) {
    hour24 = 0;
  }

  if (period === "PM" && hour === 12) {
    hour24 = 12;
  }

  return `${padTimeUnit(hour24)}:${padTimeUnit(parts.minute)}`;
};

const formatTimeFromValue = (value: string): string => {
  if (!value) return "";
  const date = new Date(`2000-01-01T${value}`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTimeFromParts = (parts: TimeParts): string =>
  formatTimeFromValue(timePartsToValue(parts));

const getPolarPosition = (index: number, total: number, radius: number, containerSize: number) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = containerSize / 2 + radius * Math.cos(angle);
  const y = containerSize / 2 + radius * Math.sin(angle);
  return { left: `${x}px`, top: `${y}px` };
};

interface RadialTimePickerProps {
  timeParts: TimeParts;
  hasSelection: boolean;
  onHourSelect: (hour: number) => void;
  onMinuteSelect: (minute: number) => void;
  onPeriodChange: (period: Period) => void;
}

const RadialTimePicker = ({
  timeParts,
  hasSelection,
  onHourSelect,
  onMinuteSelect,
  onPeriodChange,
}: RadialTimePickerProps) => {
  const containerSize = 260;
  const hoursRadius = 105;
  const minutesRadius = 75;
  const selectedLabel = formatTimeFromParts(timeParts);

  const baseHourClasses =
    "flex size-11 items-center justify-center rounded-full text-[16px] font-medium transition border border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30";
  const baseMinuteClasses =
    "flex size-9 items-center justify-center rounded-full text-[13px] font-semibold transition border border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30";
  const activeClasses = "bg-white text-[#110c10] shadow-[0_12px_24px_rgba(17,12,16,0.35)]";
  const inactiveClasses =
    "bg-[rgba(225,230,238,0.08)] text-[#e1e6ee] hover:bg-[rgba(225,230,238,0.16)]";

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative"
        style={{ width: containerSize, height: containerSize }}
        aria-label="Radial time picker"
      >
        <div
          className="absolute inset-6 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-70 blur-3xl"
          aria-hidden="true"
        />

        {HOURS.map((hourValue, index) => {
          const position = getPolarPosition(index, HOURS.length, hoursRadius, containerSize);
          const isActive = hasSelection && timeParts.hour === hourValue;

          return (
            <button
              key={`hour-${hourValue}`}
              type="button"
              aria-pressed={isActive}
              aria-label={`Select ${hourValue} ${timeParts.period}`}
              className={`${baseHourClasses} ${isActive ? activeClasses : inactiveClasses}`}
              style={{ ...position, transform: "translate(-50%, -50%)" }}
              onClick={() => onHourSelect(hourValue)}
            >
              {hourValue}
            </button>
          );
        })}

        {MINUTES.map((minuteValue, index) => {
          const position = getPolarPosition(index, MINUTES.length, minutesRadius, containerSize);
          const isActive = hasSelection && timeParts.minute === minuteValue;
          const displayMinute = padTimeUnit(minuteValue);

          return (
            <button
              key={`minute-${minuteValue}`}
              type="button"
              aria-pressed={isActive}
              aria-label={`Select ${displayMinute} minutes`}
              className={`${baseMinuteClasses} ${isActive ? activeClasses : inactiveClasses}`}
              style={{ ...position, transform: "translate(-50%, -50%)" }}
              onClick={() => onMinuteSelect(minuteValue)}
            >
              {displayMinute}
            </button>
          );
        })}

        <div
          className="absolute left-1/2 top-1/2 flex w-[150px] flex-col items-center gap-1 rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-center backdrop-blur-lg"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {hasSelection ? (
            <>
              <span className="text-[11px] uppercase tracking-[0.32em] text-[#5b5d62]">Selected</span>
              <span className="text-[32px] font-semibold leading-none text-white">{selectedLabel}</span>
            </>
          ) : (
            <>
              <span className="text-[11px] uppercase tracking-[0.32em] text-[#5b5d62]">No time yet</span>
              <span className="text-lg font-semibold text-white">Tap to pick</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {PERIODS.map((period) => {
          const isActive = timeParts.period === period;
          return (
            <button
              key={period}
              type="button"
              aria-pressed={isActive}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30 ${
                isActive
                  ? "border-white bg-white text-[#110c10] shadow-[0_12px_24px_rgba(17,12,16,0.35)]"
                  : "border-[rgba(225,230,238,0.24)] text-[#e1e6ee] hover:border-white/40 hover:text-white"
              }`}
              onClick={() => onPeriodChange(period)}
            >
              {period}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export function DeadlineModal({
  isOpen,
  onClose,
  onSetDeadline,
  onClearDeadline,
  currentDeadline,
}: DeadlineModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDeadline?.date || new Date());
  const [selectedTime, setSelectedTime] = useState(
    currentDeadline?.time ? roundTimeTo5Minutes(currentDeadline.time) : "",
  );
  const [recurring, setRecurring] = useState(currentDeadline?.recurring || "none");

  const timeParts = parseTimeString(selectedTime);
  const hasTimeSelection = Boolean(selectedTime);

  const updateTimeParts = (changes: Partial<TimeParts>) => {
    const nextParts = { ...timeParts, ...changes };
    setSelectedTime(timePartsToValue(nextParts));
  };

  const getDayOfWeek = (date: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  const currentDayOfWeek = selectedDate ? getDayOfWeek(selectedDate) : "Friday";

  const handleConfirm = () => {
    if (selectedDate) {
      onSetDeadline(selectedDate, selectedTime, recurring !== "none" ? recurring : undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto">
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[32px] items-center overflow-clip pb-[40px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full">
          {/* Handle */}
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="px-[20px] w-full">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic text-white text-[28px] tracking-[-0.308px]">
              Set Deadline
            </p>
          </div>

          {/* Calendar */}
          <div className="px-[20px] w-full flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border border-[rgba(225,230,238,0.1)] bg-[rgba(225,230,238,0.05)]"
            />
          </div>

          {/* Time Picker */}
          <div className="px-[20px] w-full">
            <div className="mb-4 flex items-center justify-between">
              <label className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[#e1e6ee] text-[18px] tracking-[-0.198px] block">
                Time
              </label>
              {selectedTime && (
                <button
                  onClick={() => setSelectedTime("")}
                  className="text-[#5b5d62] transition hover:text-[#e1e6ee] text-sm font-['Inter:Regular',sans-serif]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex w-full justify-center">
              <RadialTimePicker
                timeParts={timeParts}
                hasSelection={hasTimeSelection}
                onHourSelect={(hour) => updateTimeParts({ hour })}
                onMinuteSelect={(minute) => updateTimeParts({ minute })}
                onPeriodChange={(period) => updateTimeParts({ period })}
              />
            </div>

            {!selectedTime && (
              <p className="text-[#5b5d62] text-sm mt-3 text-center font-['Inter:Regular',sans-serif]">
                No time set – task will appear on the selected date
              </p>
            )}
            {selectedTime && (
              <p className="text-[#5b5d62] text-sm mt-3 text-center font-['Inter:Regular',sans-serif]">
                Notifications will be sent at {formatTimeFromValue(selectedTime)}
              </p>
            )}
          </div>

          {/* Recurring Dropdown */}
          <div className="px-[20px] w-full">
            <label className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[#e1e6ee] text-[18px] tracking-[-0.198px] mb-2 block">
              Recurring
            </label>
            <select
              value={recurring}
              onChange={(e) => setRecurring(e.target.value)}
              className="w-full bg-[rgba(225,230,238,0.1)] border border-[rgba(225,230,238,0.1)] rounded-[12px] px-[16px] py-[12px] text-white font-['Inter:Regular',sans-serif] font-normal text-[18px] outline-none focus:border-[rgba(225,230,238,0.3)] cursor-pointer"
            >
              <option value="none" className="bg-[#110c10]">None</option>
              <option value="daily" className="bg-[#110c10]">Every day</option>
              <option value="weekly" className="bg-[#110c10]">Every {currentDayOfWeek}</option>
              <option value="weekday" className="bg-[#110c10]">Every weekday</option>
              <option value="monthly" className="bg-[#110c10]">Every month</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="px-[20px] w-full flex gap-[12px]">
            {onClearDeadline && currentDeadline && (
              <button
                onClick={() => {
                  onClearDeadline();
                  onClose();
                }}
                className="flex-1 bg-[rgba(239,65,35,0.1)] hover:bg-[rgba(239,65,35,0.15)] rounded-[12px] px-[24px] py-[12px] font-['Inter:Regular',sans-serif] font-normal text-[#EF4123] text-[18px] tracking-[-0.198px]"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-[rgba(225,230,238,0.1)] hover:bg-[rgba(225,230,238,0.15)] rounded-[12px] px-[24px] py-[12px] font-['Inter:Regular',sans-serif] font-normal text-[#e1e6ee] text-[18px] tracking-[-0.198px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-white hover:bg-[#e1e6ee] rounded-[12px] px-[24px] py-[12px] font-['Inter:Medium',sans-serif] font-medium text-[#110c10] text-[18px] tracking-[-0.198px]"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
