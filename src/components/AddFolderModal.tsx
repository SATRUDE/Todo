import { useState, useEffect, KeyboardEvent } from "react";

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFolder: (folderName: string) => void;
}

export function AddFolderModal({ isOpen, onClose, onAddFolder }: AddFolderModalProps) {
  const [folderName, setFolderName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFolderName("");
    }
  }, [isOpen]);

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

  const handleSubmit = () => {
    const name = folderName.trim() || "New folder";
    onAddFolder(name);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10002] pointer-events-none"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10002 }}
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

          <div className="flex flex-col w-full gap-[24px] pb-[40px] px-[20px]">
            <div className="box-border content-stretch flex flex-col gap-[32px] items-start relative w-full">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Folder name"
                className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
                autoFocus
              />

              {/* Plus Button - bottom right, grey when empty */}
              <div className="flex gap-[10px] items-end justify-end w-full" style={{ justifyContent: "flex-end", width: "100%" }}>
                <div
                  className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    width: "35px",
                    height: "35px",
                    padding: "3px",
                    flexShrink: 0,
                    backgroundColor: folderName.trim() ? "#0b64f9" : "#5b5d62",
                  }}
                  onClick={() => {
                    if (folderName.trim()) {
                      handleSubmit();
                    }
                  }}
                >
                  <div className="relative" style={{ width: "24px", height: "24px" }}>
                    <svg className="block" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" style={{ width: "24px", height: "24px" }}>
                      <g>
                        <line x1="12" y1="6" x2="12" y2="18" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="6" y1="12" x2="18" y2="12" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
