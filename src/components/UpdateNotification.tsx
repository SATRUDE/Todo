import { useState, useEffect } from 'react';

interface UpdateNotificationProps {
  onReload: () => void;
  onDismiss?: () => void;
}

export function UpdateNotification({ onReload, onDismiss }: UpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleReload = () => {
    setIsVisible(false);
    onReload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10002] pointer-events-auto">
      <div className="bg-[#0b64f9] box-border flex items-center justify-between gap-[16px] px-[20px] py-[12px] w-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-white text-[16px] tracking-[-0.176px] flex-1">
          New version available
        </p>
        <div className="flex gap-[12px] items-center">
          <button
            onClick={handleReload}
            className="bg-white text-[#0b64f9] font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic text-[16px] tracking-[-0.176px] px-[16px] py-[8px] rounded-[8px] cursor-pointer hover:opacity-90 transition-opacity"
          >
            Reload
          </button>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-white font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic text-[16px] tracking-[-0.176px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


