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
        <div className="flex flex-col items-center rounded-t-xl w-full max-h-[90vh] overflow-hidden bg-card desktop-bottom-sheet">
          <div className="flex flex-col gap-2.5 items-center shrink-0 w-full pt-5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5">
                <line x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>
          <div className="px-5 w-full shrink-0 pb-2">
            <h2 className="text-xl font-medium tracking-tight text-foreground">Add</h2>
          </div>
          <div className="flex flex-col w-full pb-8 px-5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddList();
              }}
              className="flex gap-3 items-center w-full py-4 text-left rounded-xl hover:bg-accent/50 transition-colors border-0 bg-transparent cursor-pointer text-foreground"
            >
              <div className="shrink-0 size-6 text-foreground">
                <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </div>
              <span className="text-lg font-normal tracking-tight">Add list</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddFolder();
              }}
              className="flex gap-3 items-center w-full py-4 text-left rounded-xl hover:bg-accent/50 transition-colors border-0 bg-transparent cursor-pointer text-foreground"
            >
              <div className="shrink-0 size-6 text-foreground">
                <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="text-lg font-normal tracking-tight">Add folder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
