import { useState, useEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import checkIconPaths from "../imports/svg-230yvpiryj";
import deleteIconPaths from "../imports/svg-u66msu10qs";

interface FocusSession {
  id: number;
  name: string;
  color: string;
  notes?: string | null;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (name: string, color: string) => void;
  onUpdateSession?: (id: number, name: string, color: string) => void;
  onDeleteSession?: (id: number) => void;
  editingSession?: FocusSession | null;
}

const SESSION_COLORS = ["#8B5CF6", "#0B64F9", "#00C853", "#EF4123", "#FFA305"];

export function CreateSessionModal({
  isOpen,
  onClose,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  editingSession,
}: CreateSessionModalProps) {
  const [nameInput, setNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(SESSION_COLORS[0]);

  useEffect(() => {
    if (editingSession) {
      setNameInput(editingSession.name);
      setSelectedColor(editingSession.color);
    } else {
      setNameInput("");
      setSelectedColor(SESSION_COLORS[0]);
    }
  }, [editingSession, isOpen]);

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
    if (!nameInput.trim()) return;
    if (editingSession && onUpdateSession) {
      onUpdateSession(editingSession.id, nameInput, selectedColor);
    } else {
      onCreateSession(nameInput, selectedColor);
    }
    onClose();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleDelete = () => {
    if (editingSession && onDeleteSession) {
      onDeleteSession(editingSession.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="bg-background flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet">
          {/* Handle */}
          <div className="flex flex-col gap-[10px] items-center relative shrink-0 w-full">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="relative shrink-0 w-full flex flex-col gap-[32px]">
            <div className="flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
              {/* Name Input */}
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Session name"
                className="font-medium font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
                autoFocus
              />

              {/* Delete button row */}
              <div className="flex gap-[8px] items-center justify-between relative shrink-0 w-full">
                <div />
                {editingSession && (
                  <div
                    className="relative shrink-0 size-[24px] cursor-pointer opacity-100 hover:opacity-70"
                    onClick={handleDelete}
                  >
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <path d={deleteIconPaths.pf5e3c80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Color Picker + Submit */}
            <div className="flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
              <div className="content-start flex flex-wrap gap-[16px] items-start relative shrink-0 w-full">
                {SESSION_COLORS.map((color) => (
                  <div
                    key={color}
                    className="relative shrink-0 size-[32px] cursor-pointer"
                    onClick={() => setSelectedColor(color)}
                  >
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" fill={color} r="16" />
                      {selectedColor === color && (
                        <path d={checkIconPaths.pbde4c00} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      )}
                    </svg>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex gap-[10px] items-end justify-end w-full">
                <div
                  className="flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    width: "35px",
                    height: "35px",
                    padding: "3px",
                    flexShrink: 0,
                    backgroundColor: nameInput.trim() ? "#0b64f9" : "#5b5d62",
                  }}
                  onClick={handleSubmit}
                >
                  <div className="relative" style={{ width: "24px", height: "24px" }}>
                    <svg className="block" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" style={{ width: "24px", height: "24px" }}>
                      <line x1="12" y1="6" x2="12" y2="18" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="6" y1="12" x2="18" y2="12" stroke="#E1E6EE" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
