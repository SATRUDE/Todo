import { useEffect } from "react";

interface AddListOrFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddList: () => void;
  onAddFolder: () => void;
}

export function AddListOrFolderModal({ isOpen, onClose, onAddList, onAddFolder }: AddListOrFolderModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] pointer-events-none"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}
    >
      <div
        className="absolute inset-0 pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div
          className="bg-[#110c10] box-border flex flex-col items-center relative rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet"
          style={{ display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}
        >
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full pt-[20px]">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          <div className="px-[20px] w-full shrink-0 pb-[8px]">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">
              Add
            </p>
          </div>

          <div className="flex flex-col w-full gap-[0px] pb-[32px] px-[20px]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddList();
              }}
              className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full py-[16px] text-left rounded-xl hover:bg-[rgba(225,230,238,0.06)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <div className="relative shrink-0 size-[24px]">
                <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </div>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[18px] text-white tracking-[-0.198px]">
                Add list
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onAddFolder();
              }}
              className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full py-[16px] text-left rounded-xl hover:bg-[rgba(225,230,238,0.06)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <div className="relative shrink-0 size-[24px]">
                <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[18px] text-white tracking-[-0.198px]">
                Add folder
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
