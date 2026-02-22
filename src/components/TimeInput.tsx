interface TimeInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function TimeInput({ 
  id = 'time-picker', 
  value, 
  onChange, 
  label,
  className,
  disabled = false
}: TimeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    // Pass HH:MM format directly (no seconds)
    onChange?.(timeValue || '');
  };

  // Value is already in HH:MM format
  const inputValue = value || '';

  return (
    <div className={`w-full flex flex-col gap-1 items-start ${className || ''}`}>
      {label && (
        <label htmlFor={id} className="text-lg font-normal text-foreground">
          {label}
        </label>
      )}
      <div className={`flex gap-2 items-center rounded-lg p-4 w-full bg-secondary border border-border ${disabled ? 'opacity-50' : ''}`}>
        <div className="shrink-0 size-6 text-muted-foreground">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <input
          type="time"
          id={id}
          value={inputValue}
          onChange={handleChange}
          step="60"
          disabled={disabled}
          className="bg-transparent border-none outline-none font-normal text-lg flex-1 min-w-0 cursor-pointer disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          placeholder="09:00"
        />
      </div>
    </div>
  );
}

