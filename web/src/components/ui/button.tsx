import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "rounded-full border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "rounded-full hover:bg-muted hover:text-foreground",
        destructive:
          "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-soft":
          "rounded-full border border-destructive/25 bg-destructive/12 text-destructive hover:bg-destructive/20",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-5 text-sm",
        xs: "h-7 gap-1 px-2.5 text-xs",
        sm: "h-8 gap-1.5 px-3.5 text-xs",
        lg: "h-[52px] gap-2 px-6 text-base",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
        fab: "size-[52px] rounded-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
