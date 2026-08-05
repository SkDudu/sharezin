"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode } from "react";

import { SharezinToaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConvexAuthProvider client={convex}>
        {children}
        <SharezinToaster />
      </ConvexAuthProvider>
    </ThemeProvider>
  );
}
