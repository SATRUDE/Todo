import { X, Zap } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

interface ActiveSessionAlertProps {
  sessionName: string;
  sessionColor: string;
  onGoToSession: () => void;
  onDismiss: () => void;
}

export function ActiveSessionAlert({
  sessionName,
  sessionColor,
  onGoToSession,
  onDismiss,
}: ActiveSessionAlertProps) {
  return (
    <Alert className="border-violet-500/20 bg-violet-500/10">
      <Zap className="text-violet-400" />
      <AlertDescription className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onGoToSession}
          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <div
            className="shrink-0 size-3 rounded-full"
            style={{ backgroundColor: sessionColor }}
          />
          <span className="text-violet-300 truncate">
            Active session: <span className="font-medium">{sessionName}</span>
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="shrink-0 size-6 text-violet-300 hover:text-violet-200 hover:bg-violet-500/10"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
