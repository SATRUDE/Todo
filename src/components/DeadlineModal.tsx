import { useState, useEffect } from "react";
import { Calendar } from "./ui/calendar";
import { TimeInput } from "./TimeInput";
import svgPaths from "../imports/svg-e51h379o38";

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDeadline: (date: Date, time: string, recurring?: string) => void;
  onClearDeadline?: () => void;
  currentDeadline?: { date: Date; time: string; recurring?: string } | null;
}

export function DeadlineModal({ isOpen, onClose, onSetDeadline, onClearDeadline, currentDeadline }: DeadlineModalProps) {
  // Get current time as default
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDeadline?.date || new Date());
  const [selectedTime, setSelectedTime] = useState(currentDeadline?.time || "");
  const [recurring, setRecurring] = useState(currentDeadline?.recurring || "none");
  const [noTime, setNoTime] = useState(!currentDeadline?.time || currentDeadline.time.trim() === "");

  // Set default time when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentDeadline?.time && currentDeadline.time.trim() !== "") {
        setSelectedTime(currentDeadline.time);
        setNoTime(false);
      } else {
        // If no time exists, default to "no time" being checked
        setSelectedTime("");
        setNoTime(true);
      }
    }
  }, [isOpen, currentDeadline]);

  const getDayOfWeek = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const currentDayOfWeek = selectedDate ? getDayOfWeek(selectedDate) : "Friday";


  const handleConfirm = () => {
    if (selectedDate) {
      // If "no time" is selected, pass empty string for time
      const timeToSet = noTime ? "" : selectedTime;
      onSetDeadline(selectedDate, timeToSet, recurring !== "none" ? recurring : undefined);
      onClose();
    }
  };

  const handleNoTimeToggle = () => {
    const newNoTime = !noTime;
    setNoTime(newNoTime);
    if (newNoTime) {
      // Clear time when "no time" is enabled
      setSelectedTime("");
    } else {
      // Set to current time when "no time" is disabled
      setSelectedTime(getCurrentTime());
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
            {/* No Time Toggle */}
            <div className="mb-[12px]">
              <div 
                className="bg-[rgba(225,230,238,0.1)] box-border flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer inline-flex"
                onClick={handleNoTimeToggle}
              >
                {/* Toggle Switch */}
                <div className="h-[24px] relative shrink-0 w-[44px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
                    <g>
                      <rect fill={noTime ? "#00C853" : "#595559"} height="24" rx="12" width="44" />
                      <circle cx={noTime ? "32" : "12"} cy="12" fill="white" r="10" />
                    </g>
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">No time</p>
              </div>
            </div>
            <TimeInput
              id="deadline-time"
              value={selectedTime}
              onChange={(time) => setSelectedTime(time)}
              label="Time"
              disabled={noTime}
            />
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
