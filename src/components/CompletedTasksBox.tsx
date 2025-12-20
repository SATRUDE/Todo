interface CompletedTasksBoxProps {
  onClick?: () => void;
  completedCount?: number;
}

export function CompletedTasksBox({ onClick, completedCount }: CompletedTasksBoxProps) {
  return (
    <div 
      className="bg-[#1f2022] box-border content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
      style={{ backgroundColor: '#1f2022', borderRadius: '8px' }}
    >
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[24px]">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="#00c853"
            className="size-6"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
            />
          </svg>
        </div>
        <p 
          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre"
          style={{ color: '#00c853' }}
        >
          Tasks completed
        </p>
      </div>
      {completedCount !== undefined && completedCount > 0 && (
        <p 
          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre"
          style={{ color: '#5b5d62' }}
        >
          {completedCount}
        </p>
      )}
    </div>
  );
}

