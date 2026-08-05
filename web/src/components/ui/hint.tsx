import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Yellow hint callout — Paper DS. */
function Hint({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="hint"
      className={cn(
        "rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-sm leading-relaxed text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Hint };
