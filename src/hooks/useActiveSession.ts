import { useState, useEffect } from "react";

export interface ActiveSession {
  id: number;
  name: string;
  color: string;
}

const ACTIVE_SESSION_KEY = "active-focus-session";

export function useActiveSession() {
  const [activeSession, setActiveSessionState] = useState<ActiveSession | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveSession = (session: ActiveSession | null) => {
    setActiveSessionState(session);
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  };

  const clearActiveSession = () => {
    setActiveSession(null);
  };

  return {
    activeSession,
    setActiveSession,
    clearActiveSession,
  };
}
