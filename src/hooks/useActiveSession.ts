import { useState, useEffect } from 'react';

export interface ActiveSessionInfo {
  sessionId: number;
  sessionName: string;
  sessionColor: string;
}

const ACTIVE_SESSION_KEY = 'activeSession';

export function useActiveSession() {
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveSessionInfo = (info: ActiveSessionInfo | null) => {
    setActiveSession(info);
    if (info) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  };

  const clearActiveSession = () => {
    setActiveSessionInfo(null);
  };

  return {
    activeSession,
    setActiveSession: setActiveSessionInfo,
    clearActiveSession,
  };
}
