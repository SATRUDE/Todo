interface ReviewMissedDeadlinesBoxProps {
  onClick?: () => void;
  missedCount?: number;
}

export function ReviewMissedDeadlinesBox({ onClick, missedCount }: ReviewMissedDeadlinesBoxProps) {
  return (
    <div 
      className="bg-[#1f2022] box-border content-stretch flex items-center justify-between px-[16px] py-[12px] relative rounded-[8px] shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
      style={{ backgroundColor: '#1f2022', borderRadius: '8px' }}
      data-node-id="36:326"
    >
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="92:881">
        <div className="relative shrink-0 size-[24px]" data-node-id="36:327">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="#ef4123"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
            />
          </svg>
        </div>
        <p 
          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#ef4123] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre"
          style={{ color: '#ef4123' }}
          data-node-id="36:325"
        >
          Overdue tasks
        </p>
      </div>
      {missedCount !== undefined && missedCount > 0 && (
        <p 
          className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre"
          style={{ color: '#5b5d62' }}
          data-node-id="92:882"
        >
          {missedCount}
        </p>
      )}
    </div>
  );
}

