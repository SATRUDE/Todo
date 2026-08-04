import { useEffect } from "react";
import { AppSheet } from "./AppSheet";

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
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Add list or folder">
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
    </AppSheet>
  );
}
