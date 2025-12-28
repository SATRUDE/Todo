import { useState, useEffect } from "react";
import { APP_VERSION } from "../lib/version";
import { 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  getCalendarConnection,
  syncAllTasksToCalendar,
  CalendarConnection 
} from "../lib/calendar";

interface SettingsProps {
  onBack: () => void;
  updateAvailable: boolean;
  onCheckForUpdate: () => void;
  onReload: () => void;
  isChecking: boolean;
  onEnableNotifications?: () => void;
  notificationPermission?: NotificationPermission;
  onTestNotification?: () => void;
  onCreateOverdueTask?: () => void;
}

export function Settings({ onBack, updateAvailable, onCheckForUpdate, onReload, isChecking, onEnableNotifications, notificationPermission = 'default', onTestNotification, onCreateOverdueTask }: SettingsProps) {
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Check for calendar connection on mount and handle OAuth callback
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connection = await getCalendarConnection();
        setCalendarConnection(connection);
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      }
    };

    checkConnection();

    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar_connected') === 'true') {
      checkConnection();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('calendar_error')) {
      const error = urlParams.get('calendar_error');
      setSyncStatus(`Connection failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);
      setSyncStatus('Connecting to Google...');
      
      console.log('[Settings] Initiating calendar connection...');
      const authUrl = await connectGoogleCalendar();
      console.log('[Settings] Got auth URL, redirecting...', authUrl);
      
      if (!authUrl || !authUrl.startsWith('http')) {
        throw new Error('Invalid auth URL received');
      }
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
      
      // If redirect doesn't happen immediately, show message
      setTimeout(() => {
        if (isConnecting) {
          setSyncStatus('Redirecting to Google...');
        }
      }, 1000);
    } catch (error) {
      console.error('[Settings] Error connecting calendar:', error);
      setSyncStatus(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await disconnectGoogleCalendar();
      setCalendarConnection(null);
      setSyncStatus('Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setSyncStatus(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncCalendar = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus(null);
      const result = await syncAllTasksToCalendar();
      setSyncStatus(`Synced ${result.synced} tasks${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
    } catch (error) {
      console.error('Error syncing calendar:', error);
      setSyncStatus(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Debug: Log props on mount and when permission changes
  console.log('Settings component rendered with:', {
    hasOnEnableNotifications: !!onEnableNotifications,
    hasOnCheckForUpdate: !!onCheckForUpdate,
    hasOnReload: !!onReload,
    hasOnTestNotification: !!onTestNotification,
    notificationPermission,
    updateAvailable,
    shouldShowTestButton: notificationPermission === 'granted'
  });

  return (
    <div className="w-full h-full flex flex-col" style={{ pointerEvents: 'auto', minHeight: '100%' }}>
      {/* Main Content Container - frameParent equivalent */}
      <div className="flex-1 flex flex-col justify-between px-[20px] pb-[24px]" style={{ pointerEvents: 'auto', minHeight: '100%' }}>
        {/* Top Section - frameGroup equivalent */}
        <div className="flex flex-col gap-[32px]">
          {/* Header */}
          <div className="flex gap-[32px] items-center">
            <div className="flex gap-[16px] items-center">
              <div 
                className="relative shrink-0 size-[32px] cursor-pointer"
                onClick={onBack}
              >
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g>
                    <path 
                      d="M20 8L12 16L20 24" 
                      stroke="#E1E6EE" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                    />
                  </g>
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">Settings</p>
              </div>
            </div>
          </div>

          {/* Settings Content - frameContainer equivalent */}
          <div className="flex flex-col gap-[24px] items-start w-full">
            {/* Enable Notifications */}
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                className="flex gap-[8px] items-center cursor-pointer bg-transparent border-none p-0 text-left"
                style={{ pointerEvents: 'auto', zIndex: 1, color: 'inherit', font: 'inherit' }}
                onClick={(e) => {
                  console.log('Enable notifications clicked', { notificationPermission, hasHandler: !!onEnableNotifications });
                  e.stopPropagation();
                  if (onEnableNotifications) {
                    console.log('Calling onEnableNotifications');
                    onEnableNotifications();
                  } else {
                    console.error('onEnableNotifications handler is not defined!');
                  }
                }}
              >
                <div className="relative shrink-0 size-[24px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="#E1E6EE" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">
                  {notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
                </p>
              </button>
              {notificationPermission === 'granted' && (
                <button
                  type="button"
                  className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#0b64f9] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre bg-transparent border-none p-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Test notification clicked', { hasHandler: !!onTestNotification });
                    if (onTestNotification) {
                      onTestNotification();
                    } else {
                      console.error('onTestNotification handler is not defined!');
                    }
                  }}
                >
                  Test
                </button>
              )}
            </div>

            {/* Check for Update */}
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                className="flex gap-[8px] items-center cursor-pointer bg-transparent border-none p-0 text-left"
                style={{ pointerEvents: 'auto', zIndex: 1, userSelect: 'none', color: 'inherit', font: 'inherit' }}
                onClick={(e) => {
                  console.log('Check for update clicked', { updateAvailable, hasReload: !!onReload, hasCheck: !!onCheckForUpdate });
                  e.stopPropagation();
                  if (updateAvailable) {
                    console.log('Calling onReload');
                    onReload();
                  } else {
                    console.log('Calling onCheckForUpdate');
                    onCheckForUpdate();
                  }
                }}
              >
                <div className="relative shrink-0 size-[24px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="#E1E6EE" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">
                  Check for update
                </p>
              </button>
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">
                {APP_VERSION}
              </p>
            </div>

            {/* Google Calendar Connection */}
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                className="flex gap-[8px] items-center cursor-pointer bg-transparent border-none p-0 text-left"
                style={{ pointerEvents: 'auto', zIndex: 1, color: 'inherit', font: 'inherit' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (calendarConnection) {
                    handleDisconnectCalendar();
                  } else {
                    handleConnectCalendar();
                  }
                }}
                disabled={isConnecting}
              >
                <div className="relative shrink-0 size-[24px]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="#E1E6EE" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">
                  {calendarConnection 
                    ? `Connected to ${calendarConnection.calendar_name}` 
                    : isConnecting 
                    ? 'Connecting...' 
                    : 'Connect Google Calendar'}
                </p>
              </button>
              {calendarConnection && (
                <button
                  type="button"
                  className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#0b64f9] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre bg-transparent border-none p-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncCalendar();
                  }}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
              )}
            </div>
            {syncStatus && (
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#5b5d62] text-[14px] text-nowrap tracking-[-0.198px] whitespace-pre w-full">
                {syncStatus}
              </p>
            )}

            {/* Create Overdue Task (Test) */}
            {onCreateOverdueTask && (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  className="flex gap-[8px] items-center cursor-pointer bg-transparent border-none p-0 text-left"
                  style={{ pointerEvents: 'auto', zIndex: 1, color: 'inherit', font: 'inherit' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCreateOverdueTask) {
                      onCreateOverdueTask();
                    }
                  }}
                >
                  <div className="relative shrink-0 size-[24px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="#EF4123" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
                    </svg>
                  </div>
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[18px] text-nowrap text-white tracking-[-0.198px] whitespace-pre">
                    Create overdue test task
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

