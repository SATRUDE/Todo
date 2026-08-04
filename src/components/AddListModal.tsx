import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { AppSheet } from "./AppSheet";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import svgPaths from "../imports/svg-5oexr7g1cf";
import checkIconPaths from "../imports/svg-230yvpiryj";
import deleteIconPaths from "../imports/svg-u66msu10qs";

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

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddList: (listName: string, isShared: boolean, color: string, folderId?: number | null) => void;
  onUpdateList?: (listId: number, listName: string, isShared: boolean, color: string, folderId?: number | null) => void;
  onDeleteList?: (listId: number) => void;
  editingList?: ListItem | null;
  folders?: ListFolder[];
  onUpdateFolder?: (folderId: number, folderName: string) => void;
  onDeleteFolder?: (folderId: number) => void;
}

export function AddListModal({ isOpen, onClose, onAddList, onUpdateList, onDeleteList, editingList, folders = [], onUpdateFolder, onDeleteFolder }: AddListModalProps) {
  const [listInput, setListInput] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("#0B64F9");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const folderChipsRowRef = useRef<HTMLDivElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);

  const colors = ["#0B64F9", "#00C853", "#EF4123", "#FFA305", "#FA8072"];

  // Update state when editingList changes
  useEffect(() => {
    if (editingList) {
      setListInput(editingList.name);
      setIsShared(editingList.isShared);
      setSelectedColor(editingList.color);
      setSelectedFolderId(editingList.folderId ?? null);
    } else {
      setListInput("");
      setIsShared(false);
      setSelectedColor("#0B64F9");
      setSelectedFolderId(null);
    }
  }, [editingList, isOpen]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && listInput.trim() !== "") {
      if (editingList && onUpdateList) {
        onUpdateList(editingList.id, listInput, isShared, selectedColor, selectedFolderId ?? undefined);
      } else {
        onAddList(listInput, isShared, selectedColor, selectedFolderId ?? undefined);
      }
      setListInput("");
      setIsShared(false);
      setSelectedColor("#0B64F9");
      setSelectedFolderId(null);
      onClose();
    }
  };

  const handleDelete = () => {
    if (editingList && onDeleteList) {
      onDeleteList(editingList.id);
      onClose();
    }
  };

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

  useEffect(() => {
    if (!isOpen || folders.length === 0) return;
    const t = setTimeout(() => {
      const row = folderChipsRowRef.current;
      const firstChip = firstChipRef.current;
      const parent = row?.parentElement;
      const pad = row ? window.getComputedStyle(row).paddingLeft : '';
      const rect = row?.getBoundingClientRect();
      const chipRect = firstChip?.getBoundingClientRect();
      const parentRect = parent?.getBoundingClientRect();
    }, 150);
    return () => clearTimeout(t);
  }, [isOpen, folders.length, editingList]);

  if (!isOpen) return null;

  return (
    <AppSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="New list">

          {/* Content */}
          <div className="relative shrink-0 w-full flex flex-col gap-[32px]">
            <div className="size-full">
              <div className="flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
                {/* Input Field */}
                <input
                  type="text"
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add List"
                  className="font-medium font-medium leading-[1.5] not-italic relative shrink-0 text-foreground text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
                  autoFocus
                />

                {/* Shared Toggle and Delete Button */}
                <div className="flex gap-[8px] items-start justify-between relative shrink-0 w-full">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="list-shared"
                      checked={isShared}
                      onCheckedChange={setIsShared}
                    />
                    <Label htmlFor="list-shared" className="text-foreground text-[18px] tracking-[-0.198px] cursor-pointer">Share</Label>
                  </div>

                  {/* Delete Button - only show when editing */}
                  {editingList && (
                    <div 
                      className="relative shrink-0 size-[24px] cursor-pointer opacity-100 hover:opacity-70"
                      onClick={handleDelete}
                    >
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <g>
                          <path d={deleteIconPaths.pf5e3c80} stroke="#E1E6EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </g>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Folder picker - full-width block with 16px padding (no overflow clip) */}
            {folders.length > 0 ? (
              <div className="flex flex-col gap-[8px] items-start relative shrink-0 w-full" style={{ paddingLeft: 16, paddingRight: 16 }}>
                <div ref={folderChipsRowRef} className="flex flex-wrap items-center w-full" style={{ gap: 16 }}>
                  <button
                    ref={firstChipRef}
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="px-[12px] py-[6px] rounded-[100px] text-[14px] border transition-colors"
                    style={{
                      backgroundColor: selectedFolderId === null ? 'rgba(11, 100, 249, 0.25)' : 'rgba(225, 230, 238, 0.1)',
                      color: selectedFolderId === null ? '#4b93f8' : '#e1e6ee',
                      border: 'none',
                      paddingLeft: 12,
                      paddingRight: 12,
                    }}
                  >
                    No folder
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="px-[12px] py-[6px] rounded-[100px] text-[14px] border transition-colors"
                      style={{
                        backgroundColor: selectedFolderId === folder.id ? 'rgba(11, 100, 249, 0.25)' : 'rgba(225, 230, 238, 0.1)',
                        color: selectedFolderId === folder.id ? '#4b93f8' : '#e1e6ee',
                        border: 'none',
                        paddingLeft: 12,
                        paddingRight: 12,
                      }}
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="size-full">
              <div className="flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
                {/* Color Picker */}
                <div className="content-start flex flex-wrap gap-[16px] items-start relative shrink-0 w-full">
                  {colors.map((color) => (
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

                {/* Submit Button Row */}
                <div className="flex gap-[10px] items-end justify-end w-full" style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <div 
                    className="flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      width: '35px',
                      height: '35px',
                      padding: '3px',
                      flexShrink: 0,
                      backgroundColor: listInput.trim() ? '#0b64f9' : '#5b5d62'
                    }}
                    onClick={() => {
                      if (listInput.trim() !== "") {
                        if (editingList && onUpdateList) {
                          onUpdateList(editingList.id, listInput, isShared, selectedColor, selectedFolderId ?? undefined);
                        } else {
                          onAddList(listInput, isShared, selectedColor, selectedFolderId ?? undefined);
                        }
                        setListInput("");
                        setIsShared(false);
                        setSelectedColor("#0B64F9");
                        setSelectedFolderId(null);
                        onClose();
                      }
                    }}
                  >
                    <div className="relative" style={{ width: '24px', height: '24px' }}>
                      <svg className="block" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                        <g>
                          <line
                            x1="12"
                            y1="6"
                            x2="12"
                            y2="18"
                            stroke="#E1E6EE"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <line
                            x1="6"
                            y1="12"
                            x2="18"
                            y2="12"
                            stroke="#E1E6EE"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </AppSheet>
  );
}
