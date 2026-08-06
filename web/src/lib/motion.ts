/** CSS enter/exit via tw-animate. Framer/VT/stagger = YAGNI. */

export const EXIT_MS = 300;

export const enter = {
  fade: "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
  scrim: "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
  /** bottom sheet — avoid zoom (conflicts with desktop translate centering) */
  sheet:
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
  modal: "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
} as const;

export const exit = {
  fade: "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-200",
  scrim: "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-200",
  sheet:
    "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-4 motion-safe:duration-300",
  modal: "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-200",
} as const;

export function io(exiting: boolean, enterCls: string, exitCls: string) {
  return exiting ? exitCls : enterCls;
}
