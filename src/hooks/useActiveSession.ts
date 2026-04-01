import { useState, useEffect } from 'react';

const ACTIVE_SESSION_KEY = 'active-focus-session';

export interface ActiveSessionData {
  sessionId: number;
  sessionName: string;
  sessionColor: string;
  timestamp: number;
}

export function useActiveSession() {
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);

  // Load active session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as ActiveSessionData;
        setActiveSession(data);
      } catch (error) {
        console.error('Error parsing active session:', error);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    }
  }, []);

  const setSession = (sessionId: number, sessionName: string, sessionColor: string) => {
    const data: ActiveSessionData = {
      sessionId,
      sessionName,
      sessionColor,
      timestamp: Date.now(),
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
    setActiveSession(data);
  };

  const clearSession = () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    setActiveSession(null);
  };

  return {
    activeSession,
    setSession,
    clearSession,
  };
}
