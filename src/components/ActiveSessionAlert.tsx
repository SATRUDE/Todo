import { X } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface ActiveSessionAlertProps {
  sessionName: string;
  sessionColor: string;
  onNavigateToSession: () => void;
  onDismiss: () => void;
}

export function ActiveSessionAlert({
  sessionName,
  sessionColor,
  onNavigateToSession,
  onDismiss,
}: ActiveSessionAlertProps) {
  return (
    <div className="w-full px-5">
      <Card className="border-border">
        <CardContent className="flex items-center gap-3 p-3">
          <div
            className="shrink-0 size-3 rounded-full"
            style={{ backgroundColor: sessionColor }}
          />
          <button
            type="button"
            onClick={onNavigateToSession}
            className="flex-1 text-base text-foreground text-left hover:opacity-80 transition-opacity"
          >
            Active session: <span className="font-medium">{sessionName}</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 size-5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-full" strokeWidth={1.5} />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
