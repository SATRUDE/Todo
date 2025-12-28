export function Dashboard() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="w-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
          {/* Header */}
          <div className="content-stretch flex flex-col gap-[4px] items-start leading-[1.5] not-italic relative shrink-0 text-nowrap whitespace-pre">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[28px] text-white tracking-[-0.308px]">Dashboard</p>
          </div>

          {/* Dashboard Content */}
          <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full">
            <p className="text-[#5b5d62] text-[16px]">Dashboard content coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}


