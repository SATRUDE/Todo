import { useEffect } from "react";

export type TaskTypeOption = "task" | "reminder" | "daily" | "common";

interface TaskTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: "task" | "reminder";
  onSelectType: (type: "task" | "reminder" | "daily" | "common") => void;
}

const OPTIONS: { value: TaskTypeOption; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
  { value: "daily", label: "Daily task" },
  { value: "common", label: "Common task" },
];

export function TaskTypeModal({
  isOpen,
  onClose,
  currentType,
  onSelectType,
}: TaskTypeModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (value: TaskTypeOption) => {
    onSelectType(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10004] pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />

      <div className="absolute bottom-0 left-0 right-0 animate-slide-up pointer-events-auto flex justify-center">
        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl bg-card pb-[60px] pt-5 desktop-bottom-sheet">
          {/* Handle */}
          <div className="flex shrink-0 w-full flex-col items-center gap-2.5">
            <div className="h-5 w-24 shrink-0 text-muted-foreground">
              <svg
                className="block size-full"
                fill="none"
                viewBox="0 0 100 20"
                aria-hidden
              >
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeOpacity="0.3"
                  strokeWidth="5"
                  x1="13"
                  x2="87"
                  y1="10"
                  y2="10"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="w-full shrink-0 px-5">
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Task type
            </h2>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-1 px-5 pb-6 pt-4">
            {OPTIONS.map((option) => {
              const isSelected =
                (option.value === "task" || option.value === "reminder") &&
                option.value === currentType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left text-lg text-foreground transition-colors hover:bg-accent ${
                    isSelected ? "bg-secondary" : ""
                  }`}
                >
                  {option.value === "task" && (
                    <svg
                      className="size-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99"
                      />
                    </svg>
                  )}
                  {option.value === "reminder" && (
                    <svg
                      className="size-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                      />
                    </svg>
                  )}
                  {option.value === "daily" && (
                    <svg
                      className="size-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                      />
                    </svg>
                  )}
                  {option.value === "common" && (
                    <svg
                      className="size-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6h.008v.008H6V6Z"
                      />
                    </svg>
                  )}
                  {option.label}
                  {isSelected && (
                    <span className="ml-auto size-5 shrink-0 text-blue-500">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
