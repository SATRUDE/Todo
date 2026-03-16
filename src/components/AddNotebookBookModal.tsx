import { createPortal } from "react-dom";
import { useState, useEffect, KeyboardEvent } from "react";

interface AddNotebookBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (name: string, color?: string) => void;
  onUpdateBook?: (id: number, name: string, color?: string) => void;
  onDeleteBook?: (id: number) => void;
  editingBook?: { id: number; name: string; color: string } | null;
}

const BOOK_COLORS = ["#8B5CF6", "#0B64F9", "#00C853", "#EF4123", "#FFA305"];

export function AddNotebookBookModal({
  isOpen,
  onClose,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  editingBook,
}: AddNotebookBookModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8B5CF6");

  useEffect(() => {
    if (editingBook) {
      setName(editingBook.name);
      setColor(editingBook.color);
    } else {
      setName("");
      setColor("#8B5CF6");
    }
  }, [editingBook, isOpen]);

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
    if (!name.trim()) return;
    if (editingBook && onUpdateBook) {
      onUpdateBook(editingBook.id, name.trim(), color);
    } else {
      onAddBook(name.trim(), color);
    }
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none" style={{ zIndex: 10001 }}>
      <div
        className="absolute inset-0 pointer-events-auto transition-opacity"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="bg-[#110c10] flex flex-col gap-8 items-center overflow-clip pb-[60px] pt-[20px] px-0 rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet">
          <div className="h-1.5 w-24 rounded-full bg-white/10 shrink-0" />
          <div className="flex flex-col gap-8 w-full px-5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add book"
              className="font-medium text-[28px] leading-snug text-white bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
              autoFocus
            />
            <div className="flex items-center justify-between w-full">
              {editingBook && onDeleteBook && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBook(editingBook.id);
                    onClose();
                  }}
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Delete book
                </button>
              )}
              <div className="flex flex-wrap gap-4 flex-1 justify-end">
              {BOOK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="size-8 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-[#110c10] transition-all"
                  style={{
                    backgroundColor: c,
                    ringColor: color === c ? c : "transparent",
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="self-end rounded-full p-2 transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{
                backgroundColor: name.trim() ? "#8B5CF6" : "#5b5d62",
              }}
            >
              <svg
                className="size-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
