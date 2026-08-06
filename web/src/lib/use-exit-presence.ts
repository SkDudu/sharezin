"use client";

import { useEffect, useState } from "react";

import { EXIT_MS } from "@/lib/motion";

/** Keep mounted while exit CSS runs. */
export function useExitPresence(open: boolean, ms = EXIT_MS) {
  const [show, setShow] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
      setExiting(false);
      return;
    }
    if (!show) return;
    setExiting(true);
  }, [open, show]);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(() => {
      setShow(false);
      setExiting(false);
    }, ms);
    return () => window.clearTimeout(id);
  }, [exiting, ms]);

  return { show, exiting };
}
