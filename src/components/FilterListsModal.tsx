import { useState, useEffect } from "react";
import svgPaths from "../imports/svg-p3zv31caxs";
import { Button } from "./ui/button";

interface ListFolder {
  id: number;
  name: string;
  sort_order: number;
}

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
  folderId?: number | null;
}

interface FilterListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListItem[];
  folders?: ListFolder[];
  selectedListIds: Set<number>;
  onApplyFilter: (selectedListIds: Set<number>) => void;
  includeToday?: boolean; // Add option to include "Today" (listId = 0)
}

export function FilterListsModal({ isOpen, onClose, lists, folders = [], selectedListIds, onApplyFilter, includeToday = false }: FilterListsModalProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(new Set(selectedListIds));

  // Update local state when modal opens or selectedListIds prop changes
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(new Set(selectedListIds));
    }
  }, [isOpen, selectedListIds]);

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

  // Group user lists by folder (same order as Lists page: folders first, then "No folder")
  const folderIds = new Set(folders.map(f => f.id));
  const todayItem = includeToday ? [{ id: 0, name: "Today", color: "currentColor", count: 0, isShared: false, folderId: null as number | null }] : [];
  const listsByFolder = (() => {
    const byFolder = new Map<number | null, ListItem[]>();
    byFolder.set(null, []);
    folders.forEach(f => byFolder.set(f.id, []));
    lists.forEach(list => {
      const rawKey = list.folderId ?? null;
      const key = rawKey !== null && folderIds.has(rawKey) ? rawKey : null;
      const arr = byFolder.get(key) ?? [];
      arr.push(list);
      byFolder.set(key, arr);
    });
    return byFolder;
  })();

  const renderListRow = (list: ListItem) => (
    <div
      key={list.id}
      className="flex items-center gap-2 w-full py-2 px-3 -mx-3 rounded-lg cursor-pointer transition-colors hover:bg-accent"
      onClick={() => handleToggleList(list.id)}
    >
      <div className="relative shrink-0 size-6 flex items-center justify-center">
        {localSelectedIds.has(list.id) ? (
          <div className="size-6 rounded-md border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
            <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="size-6 rounded-md border-2 border-border" />
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
  );

  const handleToggleList = (listId: number) => {
    const newSelected = new Set(localSelectedIds);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setLocalSelectedIds(newSelected);
  };

  const handleApply = () => {
    onApplyFilter(localSelectedIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl bg-card pb-[60px] pt-5 desktop-bottom-sheet">
          {/* Handle */}
          <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg className="block size-full" fill="none" viewBox="0 0 100 20" aria-hidden>
                <line stroke="currentColor" strokeLinecap="round" strokeOpacity="0.3" strokeWidth="5" x1="13" x2="87" y1="10" y2="10" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="w-full shrink-0 px-5">
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Filter by list
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex flex-1 flex-col w-full overflow-x-hidden overflow-y-auto px-5 [-webkit-overflow-scrolling:touch] min-h-0" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="flex flex-col gap-4 pt-4 pb-2">
              {/* Today (if included) */}
              {todayItem.length > 0 && (
                <div className="flex flex-col gap-3 w-full">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight">
                    Today
                  </p>
                  <div className="flex flex-col gap-1 w-full">
                    {todayItem.map((list) => renderListRow(list))}
                  </div>
                </div>
              )}

              {/* Lists grouped by folder */}
              {folders.map((folder) => {
                const folderLists = listsByFolder.get(folder.id) ?? [];
                if (folderLists.length === 0) return null;
                return (
                  <div key={folder.id} className="flex flex-col gap-3 w-full">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight">
                      {folder.name}
                    </p>
                    <div className="flex flex-col gap-1 w-full">
                      {folderLists.map((list) => renderListRow(list))}
                    </div>
                  </div>
                );
              })}

              {/* No folder */}
              {((listsByFolder.get(null) ?? []).length > 0) && (
                <div className="flex flex-col gap-3 w-full">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight">
                    No folder
                  </p>
                  <div className="flex flex-col gap-1 w-full">
                    {(listsByFolder.get(null) ?? []).map((list) => renderListRow(list))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end w-full mt-4 pt-2">
                <Button
                  size="icon"
                  className="size-9 rounded-full bg-blue-500 text-primary-foreground hover:bg-blue-600 focus-visible:ring-violet-500/30"
                  onClick={handleApply}
                  aria-label="Apply filter"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

