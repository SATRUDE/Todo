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
        <div className="flex flex-col items-center rounded-t-xl w-full max-h-[90vh] overflow-hidden bg-card desktop-bottom-sheet">
          <div className="flex flex-col gap-2.5 items-center shrink-0 w-full pt-5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5">
                <line x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col w-full gap-6 pb-10 px-5">
            <div className="flex flex-col gap-8 items-start w-full">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Folder name"
                className="font-medium text-2xl tracking-tight bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
                autoFocus
              />

              {/* Submit button */}
              <div className="flex justify-end w-full">
                <button
                  type="button"
                  className={`flex items-center justify-center size-9 rounded-full shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${
                    folderName.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => folderName.trim() && handleSubmit()}
                  aria-label="Create folder"
                >
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="12" y1="6" x2="12" y2="18" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
