function Frame2() {
  return (
    <div className="h-[20px] relative shrink-0 w-[100px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
        <g id="Frame 12">
          <line id="Line 1" stroke="var(--stroke-0, #E1E6EE)" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full">
      <Frame2 />
    </div>
  );
}

function Toggle() {
  return (
    <div className="h-[24px] relative shrink-0 w-[44px]" data-name="toggle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
        <g id="toggle">
          <rect fill="var(--fill-0, #00C853)" height="24" id="Rectangle 2" rx="12" width="44" />
          <circle cx="32" cy="12" fill="var(--fill-0, white)" id="Ellipse 2" r="10" />
        </g>
      </svg>
    </div>
  );
}

function Switch() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="switch">
      <Toggle />
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0">
      <Switch />
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Shared</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[28px] text-nowrap tracking-[-0.308px] whitespace-pre">Add List</p>
          <Frame1 />
        </div>
      </div>
    </div>
  );
}

export default function List() {
  return (
    <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] size-full" data-name="List">
      <Frame3 />
      <Frame />
    </div>
  );
}