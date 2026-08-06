"use client";

import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { ChevronRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthGate } from "@/components/auth-gate";
import { ProfileChangePassword } from "@/components/profile-change-password";
import { ProfileSignOutSheet } from "@/components/profile-sign-out-sheet";
import { useTheme } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

function initial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function ProfileContent() {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const displayName = me?.name?.trim() || "Usuário";
  const displayEmail = me?.email ?? "—";
  const letter = initial(me?.name, me?.email);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-2 pb-28 md:gap-7 md:px-12 md:py-10 md:pb-10">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[13px] leading-4 font-medium text-muted-foreground">
              <span className="md:hidden">Sua conta</span>
              <span className="hidden md:inline">Conta e preferências</span>
            </p>
            <h1 className="font-display text-2xl leading-[30px] font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
              Perfil
            </h1>
          </div>
        </header>

        {me === undefined ? (
          <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-5 py-7 md:flex-row md:gap-5 md:px-8">
              <Skeleton className="size-[88px] shrink-0 rounded-full md:size-20" />
              <div className="flex w-full flex-col items-center gap-2 md:items-start">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-[70px] w-full rounded-2xl" />
            <Skeleton className="h-[70px] w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl md:w-40" />
          </div>
        ) : (
          <>
            {/* Avatar card — stacked mobile, row desktop */}
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-5 py-7 md:flex-row md:gap-5 md:px-8">
              <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-primary md:size-20">
                <span className="font-display text-[36px] leading-[44px] font-extrabold text-primary-foreground md:text-3xl md:leading-10">
                  {letter}
                </span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1.5 md:grow md:items-start">
                <p className="font-display text-center text-2xl leading-[30px] font-bold text-foreground md:text-left md:text-[28px] md:leading-[34px]">
                  {displayName}
                </p>
                <p className="text-center text-sm leading-[18px] text-muted-foreground md:text-left md:text-[15px]">
                  {displayEmail}
                </p>
              </div>
            </div>

            {/* Dark mode */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between gap-4 px-4 py-[18px]">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-[15px] leading-[18px] font-semibold text-foreground">
                    Modo escuro
                  </p>
                  <p className="text-xs leading-4 text-muted-foreground">
                    Aparência do app
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
                  aria-label="Modo escuro"
                />
              </div>
            </div>

            {/* Change password */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="flex w-full items-center justify-between gap-4 px-4 py-[18px] text-left"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                    <Lock
                      className="size-4 text-foreground"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="text-[15px] leading-[18px] font-semibold text-foreground">
                    Trocar senha
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={2.2}
                />
              </button>
            </div>

            <Button
              type="button"
              variant="destructive-soft"
              size="lg"
              className="w-full rounded-xl text-[15px] md:self-start"
              onClick={() => setSignOutOpen(true)}
            >
              Sair
            </Button>
          </>
        )}
      </div>

      <ProfileChangePassword
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
      <ProfileSignOutSheet
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={async () => {
          await signOut();
          router.replace("/login");
        }}
      />
    </>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}
