import * as React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div className="relative inline-block">
        <input
          type="checkbox"
          className="peer h-5 w-5 shrink-0 rounded border border-slate-300 appearance-none checked:bg-slate-900 checked:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          ref={ref}
          {...props}
        />
        <Check className="absolute top-0.5 left-0.5 h-4 w-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100" />
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
