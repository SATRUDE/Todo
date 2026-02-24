import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { ChevronLeft, Bell, RefreshCw, Calendar, Sparkles, FlaskConical, LogOut } from "lucide-react";
import { APP_VERSION } from "../lib/version";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarConnection,
  CalendarConnection,
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
  const { theme, setTheme } = useTheme();
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const isDark = theme === "dark";

  // Check for calendar connection on mount and handle OAuth callback
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connection = await getCalendarConnection();
        setCalendarConnection(connection);
        
        // Connection is now validated - if it exists, it has a valid calendar_name
      } catch (error) {
        console.error('Error checking calendar connection:', error);
        // Clear connection if there's an error
        setCalendarConnection(null);
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
      const authUrl = await connectGoogleCalendar();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
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


  return (
    <div className="relative w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-4 items-center min-w-0 flex-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
              aria-label="Back"
            >
              <ChevronLeft className="size-6" strokeWidth={2} />
            </Button>
            <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">Settings</h1>
          </div>
        </div>

        {/* Settings rows as cards */}
        <div className="flex flex-col gap-4 w-full">
          {/* Dark mode */}
          <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-normal text-foreground tracking-tight">Dark mode</span>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </Card>

          {/* Notifications */}
          <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex gap-3 items-center flex-1 justify-start h-auto p-0 text-foreground hover:bg-transparent font-normal text-lg"
                onClick={() => onEnableNotifications?.()}
              >
                <Bell className="size-6 shrink-0 text-foreground" strokeWidth={1.5} />
                <span className="tracking-tight">
                  {notificationPermission === "granted" ? "Notifications enabled" : "Enable notifications"}
                </span>
              </Button>
              {notificationPermission === "granted" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-primary hover:bg-accent/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTestNotification?.();
                  }}
                >
                  Test
                </Button>
              )}
            </div>
          </Card>

          {/* Check for update */}
          <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              className="flex gap-3 items-center justify-between w-full h-auto p-0 text-left font-normal text-lg text-foreground hover:bg-transparent"
              onClick={() => (updateAvailable ? onReload() : onCheckForUpdate())}
            >
              <div className="flex gap-3 items-center min-w-0 flex-1">
                <RefreshCw className="size-6 shrink-0 text-foreground" strokeWidth={1.5} />
                <span className="tracking-tight">Check for update</span>
              </div>
              <span className="shrink-0 text-muted-foreground tabular-nums">{APP_VERSION}</span>
            </Button>
          </Card>

          {/* Google Calendar */}
          <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isConnecting}
              className="flex gap-3 items-center w-full h-auto p-0 justify-start font-normal text-lg text-foreground hover:bg-transparent"
              onClick={() =>
                calendarConnection ? handleDisconnectCalendar() : handleConnectCalendar()
              }
            >
              <Calendar className="size-6 shrink-0 text-foreground" strokeWidth={1.5} />
              <span className="tracking-tight truncate text-left">
                {calendarConnection
                  ? calendarConnection.calendar_name || "Connected to Calendar"
                  : isConnecting
                    ? "Connecting…"
                    : "Connect Google Calendar"}
              </span>
            </Button>
            {syncStatus && (
              <p className="mt-2 pl-9 text-sm text-muted-foreground">{syncStatus}</p>
            )}
          </Card>

          {/* Storybook - localhost only */}
          {typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && (
            <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
              <a
                href="http://localhost:6006"
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-center w-full text-foreground no-underline hover:opacity-90"
              >
                <Sparkles className="size-6 shrink-0 text-foreground" strokeWidth={1.5} />
                <span className="text-lg font-normal tracking-tight">Component library (Storybook)</span>
              </a>
            </Card>
          )}

          {/* Create overdue test task - localhost only */}
          {onCreateOverdueTask &&
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && (
            <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                className="flex gap-3 items-center w-full h-auto p-0 justify-start font-normal text-lg text-foreground hover:bg-transparent"
                onClick={() => onCreateOverdueTask()}
              >
                <FlaskConical className="size-6 shrink-0 text-destructive" strokeWidth={1.5} />
                <span className="tracking-tight">Create overdue test task</span>
              </Button>
            </Card>
          )}

          {/* Sign out */}
          <Card className="w-full rounded-lg border border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              className="flex gap-3 items-center w-full h-auto p-0 justify-start font-normal text-lg text-destructive hover:bg-transparent hover:text-destructive"
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (error) {
                  console.error("Error signing out:", error);
                }
              }}
            >
              <LogOut className="size-6 shrink-0" strokeWidth={1.5} />
              <span className="tracking-tight">Sign out</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

