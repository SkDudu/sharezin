"use client";

import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center pb-16 text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <>{children}</>;
}
