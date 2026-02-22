import { useState, useEffect } from "react";
import svgPaths from "../imports/svg-p3zv31caxs";

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface SelectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListItem[];
  selectedListId: number | null;
  onSelectList: (listId: number) => void;
  includeToday?: boolean; // Add option to include "Today" (listId = 0)
}

export function SelectListModal({ isOpen, onClose, lists, selectedListId, onSelectList, includeToday = false }: SelectListModalProps) {
  if (!isOpen) return null;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);


  const listItemsWithDefault = includeToday
    ? [{ id: 0, name: "Today", color: "currentColor", count: 0, isShared: false }, ...lists]
    : lists;

  return (
    <div className="fixed inset-0 z-[10002] pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl bg-card pb-[60px] pt-5 desktop-bottom-sheet">
          <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>
          <div className="w-full shrink-0 px-5">
            <h2 className="text-xl font-medium tracking-tight text-foreground">Add to list</h2>
          </div>
          <div className="flex flex-1 flex-col w-full overflow-x-hidden overflow-y-auto px-5 [-webkit-overflow-scrolling:touch] min-h-0" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="flex flex-col gap-4 pt-4 pb-2">
              {listItemsWithDefault.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center gap-2 w-full py-2 px-3 -mx-3 rounded-lg cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => onSelectList(list.id)}
                >
                  <div className="relative shrink-0 size-6 flex items-center justify-center">
                    {selectedListId === list.id ? (
                      <div className="size-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        <div className="size-3 rounded-full bg-blue-500" />
                      </div>
                    ) : (
                      <div className="size-6 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div
                    className="relative shrink-0 size-5 text-muted-foreground"
                    style={list.color !== "currentColor" ? { color: list.color } : undefined}
                  >
                    <svg className="block size-full" fill="none" viewBox="0 0 20 20">
                      <path d={svgPaths.p1dfd6800} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <p className="font-normal text-lg leading-relaxed text-foreground truncate">{list.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
