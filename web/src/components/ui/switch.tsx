"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

/** Sharezin toggle — yellow when on (Paper DS). */
function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-primary justify-end" : "bg-muted justify-start dark:bg-neutral-600",
        className,
      )}
    >
      <span
        className={cn(
          "size-[26px] rounded-full transition-transform",
          checked ? "bg-primary-foreground" : "bg-foreground",
        )}
      />
    </button>
  );
}

export { Switch };
