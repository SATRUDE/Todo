import { useState, KeyboardEvent, useEffect } from "react";
import { createPortal } from "react-dom";
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
  onAddFolder?: (folderName: string) => void | Promise<number | undefined>;
  onUpdateFolder?: (folderId: number, folderName: string) => void;
  onDeleteFolder?: (folderId: number) => void;
}

export function AddListModal({ isOpen, onClose, onAddList, onUpdateList, onDeleteList, editingList, folders = [], onAddFolder, onUpdateFolder, onDeleteFolder }: AddListModalProps) {
  const [listInput, setListInput] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("#0B64F9");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

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
      setNewFolderName("");
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

  const handleAddFolder = async () => {
    const name = newFolderName.trim() || "New folder";
    if (onAddFolder) {
      const id = await onAddFolder(name);
      if (id != null) setSelectedFolderId(id);
      setNewFolderName("");
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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}>
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
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full desktop-bottom-sheet">
          {/* Handle */}
          <div className="content-stretch flex flex-col gap-[10px] items-center relative shrink-0 w-full">
            <div className="h-[20px] relative shrink-0 w-[100px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 100 20">
                <g>
                  <line stroke="#E1E6EE" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="6" x1="13" x2="87" y1="7" y2="7" />
                </g>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="relative shrink-0 w-full">
            <div className="size-full">
              <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
                {/* Input Field */}
                <input
                  type="text"
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add List"
                  className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[28px] tracking-[-0.308px] bg-transparent border-none outline-none w-full placeholder:text-[#5b5d62]"
                  autoFocus
                />

                {/* Shared Toggle and Delete Button */}
                <div className="content-stretch flex gap-[8px] items-start justify-between relative shrink-0 w-full">
                  <div 
                    className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[8px] items-center justify-center pl-[8px] pr-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer"
                    onClick={() => setIsShared(!isShared)}
                  >
                    {/* Toggle Switch */}
                    <div className="h-[24px] relative shrink-0 w-[44px]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 24">
                        <g>
                          <rect fill={isShared ? "#00C853" : "#595559"} height="24" rx="12" width="44" />
                          <circle cx={isShared ? "32" : "12"} cy="12" fill="white" r="10" />
                        </g>
                      </svg>
                    </div>
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Share</p>
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

                {/* Folder picker */}
                {folders.length > 0 || onAddFolder ? (
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    <p className="font-['Inter:Regular',sans-serif] font-normal text-[14px] text-[#5b5d62] tracking-[-0.154px]">Folder</p>
                    <div className="flex flex-wrap gap-[8px] items-center w-full">
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className="px-[12px] py-[6px] rounded-[100px] text-[14px] border transition-colors"
                        style={{
                          backgroundColor: selectedFolderId === null ? 'rgba(11, 100, 249, 0.25)' : 'rgba(225, 230, 238, 0.1)',
                          color: selectedFolderId === null ? '#4b93f8' : '#e1e6ee',
                          border: 'none',
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
                          }}
                        >
                          {folder.name}
                        </button>
                      ))}
                    </div>
                    {onAddFolder && (
                      <div className="flex gap-[8px] items-center w-full mt-2">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="New folder name"
                          className="flex-1 min-w-0 px-[12px] py-[8px] rounded-[8px] text-[14px] bg-[rgba(225,230,238,0.1)] text-[#e1e6ee] border-none outline-none placeholder:text-[#5b5d62]"
                        />
                        <button
                          type="button"
                          onClick={handleAddFolder}
                          className="px-[12px] py-[8px] rounded-[8px] text-[14px] bg-[#0b64f9] text-white border-none cursor-pointer hover:opacity-90"
                        >
                          Add folder
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

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
                    className="box-border flex items-center justify-center overflow-clip rounded-[100px] cursor-pointer hover:opacity-90 transition-opacity"
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
        </div>
      </div>
    </div>,
    document.body
  );
}
