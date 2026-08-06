import { cn } from "@/lib/utils";

/** Corte Justo — official mark (dois blocos + gap). */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="48" height="48" rx="12" fill="var(--color-primary)" />
      <rect
        x="8"
        y="10"
        width="13"
        height="28"
        rx="4"
        fill="var(--color-primary-foreground)"
      />
      <rect
        x="27"
        y="10"
        width="13"
        height="28"
        rx="4"
        fill="var(--color-primary-foreground)"
      />
    </svg>
  );
}

export function LogoLockup({
  className,
  markSize = 32,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <span className="font-display text-[22px] leading-7 font-extrabold tracking-tight text-foreground">
        Sharezin
      </span>
    </div>
  );
}
