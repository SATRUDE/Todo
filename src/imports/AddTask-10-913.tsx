function Frame4() {
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

function Frame5() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full">
      <Frame4 />
    </div>
  );
}

function Group() {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Group 6">
          <circle cx="12" cy="12" fill="var(--fill-0, #110C10)" id="Ellipse 4" r="11.25" stroke="var(--stroke-0, #E1E6EE)" strokeWidth="1.5" />
          <circle cx="12" cy="12" fill="var(--fill-0, #E1E6EE)" id="Ellipse 5" r="6" />
        </g>
      </svg>
    </div>
  );
}

function RadioButton() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="radio button">
      <Group />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
      <RadioButton />
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Task name</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full">
      <Frame1 />
    </div>
  );
}

function RadioButton1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="radio button">
      <div className="relative shrink-0 size-[24px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" fill="var(--fill-0, #110C10)" id="Ellipse 4" r="11.25" stroke="var(--stroke-0, #E1E6EE)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
      <RadioButton1 />
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Task name</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full">
      <Frame2 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">Add to list</p>
          <Frame />
          {[...Array(2).keys()].map((_, i) => (
            <Frame6 key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AddTask() {
  return (
    <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-start overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] size-full" data-name="Add task">
      <Frame5 />
      <Frame3 />
    </div>
  );
}