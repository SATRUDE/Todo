import { APP_VERSION } from "../lib/version";

interface SettingsProps {
  onBack: () => void;
  updateAvailable: boolean;
  onCheckForUpdate: () => void;
  onReload: () => void;
  isChecking: boolean;
  onEnableNotifications?: () => void;
  notificationPermission?: NotificationPermission;
  onTestNotification?: () => void;
}

export function Settings({ onBack, updateAvailable, onCheckForUpdate, onReload, isChecking, onEnableNotifications, notificationPermission = 'default', onTestNotification }: SettingsProps) {
  return (
    <div className="bg-[#110c10] box-border content-stretch flex flex-col items-start justify-start pb-[120px] pt-[60px] px-0 relative size-full min-h-screen">
      {/* Back Button */}
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full px-[20px] mb-[32px]">
        <div 
          className="relative shrink-0 size-[24px] cursor-pointer"
          onClick={onBack}
        >
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g>
              <path
                d="M15 18L9 12L15 6"
                stroke="#E1E6EE"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>
        <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-white text-[28px] tracking-[-0.308px]">
          Settings
        </p>
      </div>

      {/* Settings Content */}
      <div className="box-border content-stretch flex flex-col gap-[32px] items-start px-[20px] py-0 relative w-full">
        {/* Check for Update Section */}
        <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
          <div 
            className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full cursor-pointer"
            onClick={updateAvailable ? onReload : onCheckForUpdate}
          >
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">
              {isChecking ? 'Checking for update...' : updateAvailable ? 'Update available - Tap to reload' : 'Check for update'}
            </p>
          </div>
          
          {updateAvailable && (
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[14px] text-nowrap text-[#5b5d62] tracking-[-0.154px] whitespace-pre">
                A new version is available. Tap above to reload and apply the update.
              </p>
            </div>
          )}
        </div>

        {/* Notification Buttons */}
        <div className="content-stretch flex flex-col gap-[16px] items-stretch relative shrink-0 w-full">
          {notificationPermission !== 'granted' && onEnableNotifications && (
            <button
              onClick={onEnableNotifications}
              className="content-stretch flex items-center justify-center relative shrink-0 w-full py-[12px] px-[20px] bg-[#0B64F9] rounded-[8px] cursor-pointer"
            >
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[16px] text-nowrap tracking-[-0.176px] whitespace-pre">
                Enable Notifications
              </p>
            </button>
          )}
          {notificationPermission === 'granted' && onTestNotification && (
            <button
              onClick={onTestNotification}
              className="content-stretch flex items-center justify-center relative shrink-0 w-full py-[12px] px-[20px] bg-[#0B64F9] rounded-[8px] cursor-pointer"
            >
              <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-white text-[16px] text-nowrap tracking-[-0.176px] whitespace-pre">
                Test Notification
              </p>
            </button>
          )}
        </div>

        {/* Version Info */}
        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[14px] text-nowrap text-[#5b5d62] tracking-[-0.154px] whitespace-pre">
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}

