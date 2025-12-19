interface TimeInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export function TimeInput({ 
  id = 'time-picker', 
  value, 
  onChange, 
  label,
  className 
}: TimeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    // Pass HH:MM format directly (no seconds)
    onChange?.(timeValue || '');
  };

  // Value is already in HH:MM format
  const inputValue = value || '';

  return (
    <div className={`w-full flex flex-col gap-[4px] items-start ${className || ''}`}>
      {label && (
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[#e1e6ee] text-[18px] tracking-[-0.198px]">
          {label}
        </p>
      )}
      <div 
        className="box-border flex gap-[4px] items-center rounded-[8px] w-full relative"
        style={{
          backgroundColor: '#201C20',
          padding: '16px'
        }}
      >
        <div className="relative shrink-0 size-[24px]">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            className="size-6"
            style={{ width: '24px', height: '24px', color: '#e1e6ee' }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
            />
          </svg>
        </div>
        <input
          type="time"
          id={id}
          value={inputValue}
          onChange={handleChange}
          step="60"
          className="bg-transparent border-none outline-none font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[18px] tracking-[-0.198px] flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
          placeholder="09:00"
          style={{
            color: inputValue ? '#e1e6ee' : '#5b5d62'
          }}
        />
      </div>
    </div>
  );
}

