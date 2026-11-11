import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 rounded-lg border border-white/10 bg-zinc-950/70 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
