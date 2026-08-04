import { useState } from "react";
import svgPaths from "../imports/svg-p3zv31caxs";
import { AppSheet } from "./AppSheet";

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

  const listItemsWithDefault = includeToday
    ? [{ id: 0, name: "Today", color: "currentColor", count: 0, isShared: false }, ...lists]
    : lists;

  return (
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Add to list">
          <div className="w-full shrink-0">
            <h2 className="text-xl font-medium tracking-tight text-foreground">Add to list</h2>
          </div>
          <div className="flex flex-1 flex-col w-full min-h-0">
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
                        <div className="size-3 rounded-full bg-primary" />
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
                  <p className="font-normal text-lg leading-relaxed text-foreground break-words">{list.name}</p>
                </div>
              ))}
            </div>
          </div>
    </AppSheet>
  );
}
