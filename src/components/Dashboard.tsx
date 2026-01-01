interface DashboardProps {
  onAddTask?: (taskText: string, description?: string, listId?: number, deadline?: { date: Date; time: string; recurring?: string }) => void;
  onNavigateToCalendarSync?: () => void;
  onNavigateToCommonTasks?: () => void;
  onNavigateToGoals?: () => void;
}

export function Dashboard({ onAddTask, onNavigateToCalendarSync, onNavigateToCommonTasks, onNavigateToGoals }: DashboardProps) {

  return (
    <div className="relative shrink-0 w-full">
      <div className="w-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] pt-0 relative w-full h-fit" style={{ paddingBottom: '150px' }}>
          {/* Header */}
          <div className="content-stretch flex items-center gap-[16px] relative shrink-0 w-full">
            <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
              <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Dashboard</p>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
            {/* First Row: Calendar Sync and Common Tasks */}
            <div className="flex gap-[16px] w-full">
              {/* Calendar Sync Card */}
              <div 
                className="flex flex-col items-start justify-end px-[16px] py-[12px] relative flex-1 cursor-pointer"
                style={{ 
                  backgroundColor: '#1f2022',
                  height: '146px',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  justifyContent: 'flex-end'
                }}
                onClick={onNavigateToCalendarSync}
              >
                <div className="flex flex-col gap-[10px] items-start relative shrink-0 w-full">
                  <div className="relative shrink-0" style={{ width: '40px', height: '40px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#8fe594" style={{ width: '40px', height: '40px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-extralight relative shrink-0 text-[18px]"
                    style={{ 
                      color: '#8fe594',
                      letterSpacing: '-0.01em',
                      lineHeight: '150%'
                    }}
                  >
                    Calendar sync
                  </p>
                </div>
              </div>

              {/* Common Tasks Card */}
              <div 
                className="flex flex-col items-start justify-end px-[16px] py-[12px] relative flex-1 cursor-pointer"
                style={{ 
                  backgroundColor: '#1f2022',
                  height: '146px',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  justifyContent: 'flex-end'
                }}
                onClick={onNavigateToCommonTasks}
              >
                <div className="flex flex-col gap-[10px] items-start justify-center relative shrink-0">
                  <div className="relative shrink-0" style={{ width: '40px', height: '40px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ff6d00" style={{ width: '40px', height: '40px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12a6 6 0 0 1-12 0v-3" />
                    </svg>
                  </div>
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px]"
                    style={{ 
                      color: '#ff6d00'
                    }}
                  >
                    Common tasks
                  </p>
                </div>
              </div>
            </div>

            {/* Second Row: Goals Card */}
            <div className="w-full">
              <div 
                className="flex flex-col items-start justify-end px-[16px] py-[12px] relative w-full cursor-pointer"
                style={{ 
                  backgroundColor: '#1f2022',
                  height: '146px',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  justifyContent: 'flex-end'
                }}
                onClick={onNavigateToGoals}
              >
                <div className="flex flex-col gap-[10px] items-start justify-center relative shrink-0">
                  <div className="relative shrink-0" style={{ width: '40px', height: '40px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#76a2ff" style={{ width: '40px', height: '40px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                    </svg>
                  </div>
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap tracking-[-0.198px]"
                    style={{ 
                      color: '#76a2ff'
                    }}
                  >
                    Goals
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Spacer to prevent bottom cutoff */}
          <div className="w-full" style={{ height: '20px' }} />
        </div>
      </div>
    </div>
  );
}

