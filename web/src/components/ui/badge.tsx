import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success: "bg-success/20 text-success",
        destructive: "bg-destructive/15 text-destructive",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
