"use client";

import { useEffect, useState } from "react";

import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/** Boot splash — bg/fg follow `sharezin-theme` via CSS tokens. */
export function BootSplash() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = window.setTimeout(() => setHide(true), reduce ? 0 : 280);
    const t2 = window.setTimeout(() => setGone(true), reduce ? 0 : 580);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-background",
        hide && "pointer-events-none opacity-0 transition-opacity duration-300",
      )}
    >
      <LogoMark size={80} />
      <p className="font-display text-[28px] leading-none font-extrabold tracking-tight text-foreground">
        Sharezin
      </p>
    </div>
  );
}
