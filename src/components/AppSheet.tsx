import { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";
import { cn } from "./ui/utils";

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Screen-reader title (required for dialog semantics; rendered sr-only). */
  title: string;
  children: ReactNode;
  /** Extra classes for the sheet surface. */
  className?: string;
  /** Extra classes for the scrollable content region. */
  contentClassName?: string;
}

/**
 * The house bottom sheet: vaul Drawer styled like the app's hand-rolled
 * sheets (card surface, rounded top, drag handle, thumb-reach), with the
 * dialog semantics the hand-rolled ones lacked — focus trap, Escape,
 * swipe-to-dismiss, aria roles — for free.
 */
export function AppSheet({ open, onOpenChange, title, children, className, contentClassName }: AppSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        className={cn(
          "bg-card border-none rounded-t-xl desktop-bottom-sheet !max-h-[90vh] pb-[max(env(safe-area-inset-bottom),1.5rem)]",
          className,
        )}
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div
          className={cn(
            "flex min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto px-5 pt-6 [-webkit-overflow-scrolling:touch]",
            contentClassName,
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
