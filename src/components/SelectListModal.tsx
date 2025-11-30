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
}

export function SelectListModal({ isOpen, onClose, lists, selectedListId, onSelectList }: SelectListModalProps) {
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
      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto">
        <div className="bg-[#110c10] box-border content-stretch flex flex-col gap-[40px] items-start overflow-clip pb-[60px] pt-[20px] px-0 relative rounded-tl-[32px] rounded-tr-[32px] w-full">
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
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[20px] text-nowrap tracking-[-0.22px] whitespace-pre">Add to list</p>
                
                {/* List Items */}
                {lists.map((list) => (
                  <div 
                    key={list.id}
                    className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full cursor-pointer"
                    onClick={() => onSelectList(list.id)}
                  >
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
                      {/* Radio Button */}
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
                        <div className="relative shrink-0 size-[24px]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                            {selectedListId === list.id ? (
                              <g>
                                <circle cx="12" cy="12" fill="#110C10" r="11.25" stroke="#E1E6EE" strokeWidth="1.5" />
                                <circle cx="12" cy="12" fill="#E1E6EE" r="6" />
                              </g>
                            ) : (
                              <circle cx="12" cy="12" fill="#110C10" r="11.25" stroke="#E1E6EE" strokeWidth="1.5" />
                            )}
                          </svg>
                        </div>
                      </div>
                      {/* Hashtag Icon */}
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
