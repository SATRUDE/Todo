import { useState, useEffect, useRef } from "react";

interface RadialTimePickerProps {
  selectedTime: string; // Format: "HH:MM"
  onTimeChange: (time: string) => void;
}

export function RadialTimePicker({ selectedTime, onTimeChange }: RadialTimePickerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef({ hours: false, minutes: false });
  const startY = useRef({ hours: 0, minutes: 0 });
  const currentScroll = useRef({ hours: 0, minutes: 0 });

  const lastPropTime = useRef(selectedTime);
  const isUserInteracting = useRef(false);
  const isInternalUpdate = useRef(false);

  // Parse initial time or when prop changes externally
  useEffect(() => {
    if (!isInternalUpdate.current && selectedTime !== lastPropTime.current) {
      if (selectedTime) {
        const [h, m] = selectedTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          setHours(h);
          setMinutes(m);
        }
      } else {
        const now = new Date();
        setHours(now.getHours());
        setMinutes(now.getMinutes());
      }
      lastPropTime.current = selectedTime;
    }
    isInternalUpdate.current = false;
  }, [selectedTime]);

  // Update parent when time changes internally
  useEffect(() => {
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    if (timeString !== lastPropTime.current) {
      isInternalUpdate.current = true;
      lastPropTime.current = timeString;
      onTimeChange(timeString);
    }
  }, [hours, minutes, onTimeChange]);

  // Scroll to selected value on mount or when prop changes
  useEffect(() => {
    if (hoursRef.current && !isUserInteracting.current) {
      const itemHeight = 48;
      const spacerHeight = 72;
      const scrollPosition = hours * itemHeight + spacerHeight;
      requestAnimationFrame(() => {
        if (hoursRef.current && !isUserInteracting.current) {
          hoursRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [hours]);

  useEffect(() => {
    if (minutesRef.current && !isUserInteracting.current) {
      const itemHeight = 48;
      const spacerHeight = 72;
      const scrollPosition = minutes * itemHeight + spacerHeight;
      requestAnimationFrame(() => {
        if (minutesRef.current && !isUserInteracting.current) {
          minutesRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [minutes]);

  const handleScroll = (type: 'hours' | 'minutes', scrollTop: number) => {
    isUserInteracting.current = true;
    const itemHeight = 48;
    // Add offset to account for the spacer at the top
    const adjustedScroll = scrollTop - 72;
    const index = Math.round(adjustedScroll / itemHeight);
    
    if (type === 'hours') {
      const newHours = Math.max(0, Math.min(23, index));
      if (newHours !== hours) {
        setHours(newHours);
      }
    } else {
      const newMinutes = Math.max(0, Math.min(59, index));
      if (newMinutes !== minutes) {
        setMinutes(newMinutes);
      }
    }
    
    // Reset interaction flag after a delay
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 100);
  };

  const handleWheel = (type: 'hours' | 'minutes', e: React.WheelEvent) => {
    e.preventDefault();
    isUserInteracting.current = true;
    // More sensitive scrolling - smaller increments for smoother feel
    const delta = Math.abs(e.deltaY) > 50 ? (e.deltaY > 0 ? 1 : -1) : 0;
    
    if (delta === 0) return;
    
    if (type === 'hours') {
      setHours(prev => {
        const newValue = prev + delta;
        return Math.max(0, Math.min(23, newValue));
      });
    } else {
      setMinutes(prev => {
        const newValue = prev + delta;
        return Math.max(0, Math.min(59, newValue));
      });
    }
    
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 100);
  };

  const handleMouseDown = (type: 'hours' | 'minutes', e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current[type] = true;
    startY.current[type] = e.clientY;
    currentScroll.current[type] = type === 'hours' 
      ? (hoursRef.current?.scrollTop || 0)
      : (minutesRef.current?.scrollTop || 0);
  };

  const handleTouchStart = (type: 'hours' | 'minutes', e: React.TouchEvent) => {
    e.preventDefault();
    isDragging.current[type] = true;
    startY.current[type] = e.touches[0].clientY;
    currentScroll.current[type] = type === 'hours' 
      ? (hoursRef.current?.scrollTop || 0)
      : (minutesRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (type: 'hours' | 'minutes', e: MouseEvent | TouchEvent) => {
    if (!isDragging.current[type]) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY.current[type];
    const itemHeight = 48;
    const newScroll = Math.max(0, currentScroll.current[type] + deltaY);
    
    if (type === 'hours') {
      const maxScroll = 23 * itemHeight + 72 * 2;
      const clampedScroll = Math.min(maxScroll, newScroll);
      hoursRef.current?.scrollTo({ top: clampedScroll, behavior: 'auto' });
      handleScroll('hours', clampedScroll);
    } else {
      const maxScroll = 59 * itemHeight + 72 * 2;
      const clampedScroll = Math.min(maxScroll, newScroll);
      minutesRef.current?.scrollTo({ top: clampedScroll, behavior: 'auto' });
      handleScroll('minutes', clampedScroll);
    }
  };

  const handleMouseUp = (type: 'hours' | 'minutes') => {
    isDragging.current[type] = false;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current.hours) {
        handleMouseMove('hours', e);
      }
      if (isDragging.current.minutes) {
        handleMouseMove('minutes', e);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging.current.hours) {
        handleMouseMove('hours', e);
      }
      if (isDragging.current.minutes) {
        handleMouseMove('minutes', e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging.current.hours) {
        handleMouseUp('hours');
      }
      if (isDragging.current.minutes) {
        handleMouseUp('minutes');
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging.current.hours) {
        handleMouseUp('hours');
      }
      if (isDragging.current.minutes) {
        handleMouseUp('minutes');
      }
    };

    if (isDragging.current.hours || isDragging.current.minutes) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [hours, minutes]);

  const renderTimeColumn = (type: 'hours' | 'minutes', currentValue: number) => {
    const items = type === 'hours' 
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 60 }, (_, i) => i);
    
    const ref = type === 'hours' ? hoursRef : minutesRef;

    return (
      <div
        ref={ref}
        className="flex flex-col gap-[10px] items-center overflow-y-auto scrollbar-hide"
        style={{
          height: '192px',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
        }}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          handleScroll(type, scrollTop);
        }}
        onWheel={(e) => handleWheel(type, e)}
        onMouseDown={(e) => handleMouseDown(type, e)}
        onTouchStart={(e) => handleTouchStart(type, e)}
      >
        {/* Spacer for centering */}
        <div style={{ height: '72px' }} />
        
        {items.map((value) => {
          const isSelected = value === currentValue;
          const distance = Math.abs(value - currentValue);
          // More natural opacity fade - only show 3-4 items clearly
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.4 : 0.2;
          // More natural scaling - selected is largest, adjacent slightly smaller
          const scale = isSelected ? 1 : distance === 1 ? 0.9 : distance === 2 ? 0.8 : 0.7;
          
          return (
            <div
              key={value}
              className="flex items-center justify-center cursor-pointer select-none"
              style={{
                height: '48px',
                scrollSnapAlign: 'center',
                opacity,
                transform: `scale(${scale})`,
                transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onClick={() => {
                isUserInteracting.current = true;
                if (type === 'hours') {
                  setHours(value);
                } else {
                  setMinutes(value);
                }
                setTimeout(() => {
                  isUserInteracting.current = false;
                }, 100);
              }}
            >
              <p
                className={`font-normal leading-[1.5] tracking-tight text-foreground whitespace-pre ${
                  isSelected ? 'text-2xl' : 'text-xl'
                }`}
              >
                {value.toString().padStart(2, '0')}
              </p>
            </div>
          );
        })}
        
        {/* Spacer for centering */}
        <div style={{ height: '72px' }} />
      </div>
    );
  };

  return (
    <div className="bg-secondary border border-border rounded-lg flex gap-16 items-center justify-center p-5 w-full">
      <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0">
        {renderTimeColumn('hours', hours)}
      </div>
      <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0">
        {renderTimeColumn('minutes', minutes)}
      </div>
    </div>
  );
}

