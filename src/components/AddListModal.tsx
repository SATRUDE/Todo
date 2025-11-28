import { useState, KeyboardEvent, useEffect } from "react";
import svgPaths from "../imports/svg-5oexr7g1cf";
import checkIconPaths from "../imports/svg-230yvpiryj";
import deleteIconPaths from "../imports/svg-u66msu10qs";

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
}

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddList: (listName: string, isShared: boolean, color: string) => void;
  onUpdateList?: (listId: number, listName: string, isShared: boolean, color: string) => void;
  onDeleteList?: (listId: number) => void;
  editingList?: ListItem | null;
}

export function AddListModal({ isOpen, onClose, onAddList, onUpdateList, onDeleteList, editingList }: AddListModalProps) {
  const [listInput, setListInput] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("#0B64F9");

  const colors = ["#0B64F9", "#00C853", "#EF4123", "#FFA305", "#FA8072"];

  // Update state when editingList changes
  useEffect(() => {
    if (editingList) {
      setListInput(editingList.name);
      setIsShared(editingList.isShared);
      setSelectedColor(editingList.color);
    } else {
      setListInput("");
      setIsShared(false);
      setSelectedColor("#0B64F9");
    }
  }, [editingList, isOpen]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && listInput.trim() !== "") {
      if (editingList && onUpdateList) {
        onUpdateList(editingList.id, listInput, isShared, selectedColor);
      } else {
        onAddList(listInput, isShared, selectedColor);
      }
      setListInput("");
      setIsShared(false);
      setSelectedColor("#0B64F9");
      onClose();
    }
  };

  const handleDelete = () => {
    if (editingList && onDeleteList) {
      onDeleteList(editingList.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto">
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-center overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
