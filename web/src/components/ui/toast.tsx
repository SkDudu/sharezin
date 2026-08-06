"use client";

import toast, { Toaster, type DefaultToastOptions } from "react-hot-toast";

/** Sharezin DS — Paper §09 Toasts. Import `toast` from here, not react-hot-toast. */
export { toast };

export const toastOptions = {
  duration: 2800,
  style: {
    background: "var(--card)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "18px",
    padding: "14px 16px",
    boxShadow: "var(--toast-shadow)",
    maxWidth: "360px",
  },
  success: {
    iconTheme: {
      primary: "#A8E610",
      secondary: "#0C0C0D",
    },
  },
  error: {
    iconTheme: {
      primary: "#FF6B7A",
      secondary: "#FFFFFF",
    },
  },
  // default / blank → primary yellow (código copiado, etc.)
  blank: {
    iconTheme: {
      primary: "#F5C518",
      secondary: "#0C0C0D",
    },
  },
} satisfies DefaultToastOptions;

export function SharezinToaster() {
  return (
    <Toaster position="top-center" toastOptions={toastOptions} />
  );
}
