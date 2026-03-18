import React, { useState } from "react";
import { ChevronLeft, Plus, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { CreateSessionModal } from "./CreateSessionModal";

interface FocusSession {
  id: number;
  name: string;
  color: string;
  notes?: string | null;
  created_at?: string;
}

interface SessionTaskCount {
  sessionId: number;
  total: number;
  completed: number;
}

interface FocusSessionsProps {
  sessions: FocusSession[];
  sessionTaskCounts?: SessionTaskCount[];
  onSelectSession: (session: FocusSession) => void;
  onCreateSession: (name: string, color: string) => void;
  onUpdateSession: (id: number, name: string, color: string) => void;
  onDeleteSession: (id: number) => void;
  onBack: () => void;
  pendingTaskId?: number | null;
}

export function FocusSessions({
  sessions,
  sessionTaskCounts = [],
  onSelectSession,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onBack,
  pendingTaskId,
}: FocusSessionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null);

  const getTaskCount = (sessionId: number) => {
    const counts = sessionTaskCounts.find((c) => c.sessionId === sessionId);
    return counts ? { total: counts.total, completed: counts.completed } : { total: 0, completed: 0 };
  };

  const handleEditSession = (session: FocusSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  return (
    <>
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
              <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">Sessions</h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setEditingSession(null); setIsModalOpen(true); }}
              className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
              aria-label="New session"
            >
              <Plus className="size-6" strokeWidth={2} />
            </Button>
          </div>

          {/* Pending task hint */}
          {pendingTaskId != null && (
            <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-sm text-violet-300">
              <Zap className="size-4 shrink-0" />
              <span>Select a session to add this task to it</span>
            </div>
          )}

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Zap className="size-12 text-violet-400 opacity-60" strokeWidth={1.5} />
              <div className="flex flex-col gap-1">
                <p className="text-lg font-medium text-foreground">No sessions yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a session to pull tasks from different lists and focus on them together.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => { setEditingSession(null); setIsModalOpen(true); }}
              >
                <Plus className="size-4 mr-1" />
                New session
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {sessions.map((session) => {
                const counts = getTaskCount(session.id);
                return (
                  <Card
                    key={session.id}
                    className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
                    onClick={() => onSelectSession(session)}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex gap-3 items-center min-w-0 flex-1">
                        {/* Session color dot */}
                        <div
                          className="shrink-0 size-3 rounded-full"
                          style={{ backgroundColor: session.color }}
                        />
                        <p className="text-lg font-normal text-foreground tracking-tight truncate">
                          {session.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {counts.total > 0 && (
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {counts.completed}/{counts.total}
                          </span>
                        )}
                        <button
                          type="button"
                          className="size-6 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => handleEditSession(session, e)}
                          aria-label="Edit session"
                        >
                          <svg className="block size-full" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateSessionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreateSession={(name, color) => {
          onCreateSession(name, color);
          handleCloseModal();
        }}
        onUpdateSession={(id, name, color) => {
          onUpdateSession(id, name, color);
          handleCloseModal();
        }}
        onDeleteSession={(id) => {
          onDeleteSession(id);
          handleCloseModal();
        }}
        editingSession={editingSession}
      />
    </>
  );
}
