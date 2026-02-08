import { useState, useEffect } from "react";
import svgPaths from "../imports/svg-p3zv31caxs";

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
  const todayItem = includeToday ? [{ id: 0, name: "Today", color: "#E1E6EE", count: 0, isShared: false, folderId: null as number | null }] : [];
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
      className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
      onClick={() => handleToggleList(list.id)}
    >
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
        <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
          <div className="relative shrink-0 size-[24px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
              {localSelectedIds.has(list.id) ? (
                <g>
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="#E1E6EE" stroke="#E1E6EE" strokeWidth="1.5" />
                  <path d="M7 12L10.5 15.5L17 9" stroke="#110C10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ) : (
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#E1E6EE" strokeWidth="1.5" />
              )}
            </svg>
          </div>
        </div>
        <div className="relative shrink-0 size-[20px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
            <g>
              <path d={svgPaths.p1dfd6800} stroke={list.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
            </g>
          </svg>
        </div>
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">{list.name}</p>
      </div>
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
    <div className="fixed inset-0 z-[10002] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div 
          className="bg-[#110c10] box-border flex flex-col items-center relative rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet"
          style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
        >
          {/* Handle */}
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full pt-[20px]">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="px-[20px] w-full shrink-0">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">Filter by list</p>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex flex-col w-full"
            style={{ 
              overflowY: 'auto', 
              WebkitOverflowScrolling: 'touch', 
              maxHeight: 'calc(90vh - 120px)', 
              minHeight: 0, 
              overflowX: 'hidden' 
            }}
          >
            <div className="flex flex-col gap-[16px] items-start pb-[40px] pt-[20px] px-[20px]">
              {/* Today (if included) */}
              {todayItem.length > 0 && (
                <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic text-[#5b5d62] text-[14px] tracking-[-0.154px] uppercase">
                    Today
                  </p>
                  <div className="content-stretch flex flex-col gap-[16px] items-start w-full pl-0">
                    {todayItem.map((list) => renderListRow(list))}
                  </div>
                </div>
              )}

              {/* Lists grouped by folder */}
              {folders.map((folder) => {
                const folderLists = listsByFolder.get(folder.id) ?? [];
                if (folderLists.length === 0) return null;
                return (
                  <div key={folder.id} className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic text-[#5b5d62] text-[14px] tracking-[-0.154px] uppercase">
                      {folder.name}
                    </p>
                    <div className="content-stretch flex flex-col gap-[16px] items-start w-full pl-0">
                      {folderLists.map((list) => renderListRow(list))}
                    </div>
                  </div>
                );
              })}

              {/* No folder */}
              {((listsByFolder.get(null) ?? []).length > 0) && (
                <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic text-[#5b5d62] text-[14px] tracking-[-0.154px] uppercase">
                    No folder
                  </p>
                  <div className="content-stretch flex flex-col gap-[16px] items-start w-full pl-0">
                    {(listsByFolder.get(null) ?? []).map((list) => renderListRow(list))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-[10px] items-end justify-end w-full mt-[16px]" style={{ justifyContent: 'flex-end', width: '100%' }}>
                <div 
                  className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    width: '35px',
                    height: '35px',
                    padding: '3px',
                    flexShrink: 0,
                    backgroundColor: '#0b64f9'
                  }}
                  onClick={handleApply}
                >
                  <div className="relative" style={{ width: '24px', height: '24px' }}>
                    <svg className="block" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                      <g>
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="#E1E6EE"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
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

