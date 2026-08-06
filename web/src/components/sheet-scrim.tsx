"use client";

import { useEffect, type ReactNode } from "react";

import { enter, exit, io } from "@/lib/motion";
import { useExitPresence } from "@/lib/use-exit-presence";
import { cn } from "@/lib/utils";

export function SheetScrim({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { show, exiting } = useExitPresence(open);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [show, open, onClose]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-[2px]",
          io(exiting, enter.scrim, exit.scrim),
        )}
        onClick={onClose}
        disabled={exiting}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-card md:rounded-2xl",
          io(exiting, enter.sheet, exit.sheet),
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
