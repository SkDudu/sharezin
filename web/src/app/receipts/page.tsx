"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGate } from "@/components/auth-gate";
import { JoinReceiptSheet } from "@/components/join-receipt-sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { brl, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function initial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function ReceiptsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") === "closed" ? "closed" : "open";

  const me = useQuery(api.users.me);
  const receipts = useQuery(api.receipts.listMine);
  const [joinOpen, setJoinOpen] = useState(false);

  const openCount = useMemo(
    () => (receipts ?? []).filter((r) => r.status === "open").length,
    [receipts],
  );

  const list = useMemo(() => {
    if (!receipts) return [];
    return receipts.filter((r) => r.status === filter);
  }, [receipts, filter]);

  const isEmptyAll = receipts !== undefined && receipts.length === 0;
  const showFab = list.length > 0;

  function setFilter(next: "open" | "closed") {
    router.replace(next === "open" ? "/receipts" : "/receipts?filter=closed");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-2 pb-28 md:gap-7 md:px-12 md:py-10 md:pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          {!isEmptyAll ? (
            <p className="text-[13px] leading-4 font-medium text-muted-foreground">
              <span className="md:hidden">
                {openCount} {openCount === 1 ? "aberto" : "abertos"}
              </span>
              <span className="hidden md:inline">Gerencie e entre em contas</span>
            </p>
          ) : null}
          <h1 className="font-display text-2xl leading-[30px] font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
            Recibos
          </h1>
        </div>

        <Link
          href="/profile"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground"
          aria-label="Perfil"
        >
          {initial(me?.name, me?.email)}
        </Link>
      </header>

      {!isEmptyAll ? (
        <div className="flex gap-2">
          {(["open", "closed"] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "flex h-9 items-center rounded-full px-4 text-[13px] leading-4 transition-colors",
                  active
                    ? "bg-primary font-bold text-primary-foreground"
                    : "border border-border bg-card font-semibold text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "open" ? "Abertos" : "Fechados"}
              </button>
            );
          })}
        </div>
      ) : null}

      {receipts === undefined ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Carregando…
        </p>
      ) : isEmptyAll ? (
        /* Paper R0 — empty recibos */
        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-10">
          <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full border border-neutral-100 bg-card md:size-[104px]">
            <div className="flex items-center">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-bold text-muted-foreground md:size-[42px] md:text-base">
                ?
              </span>
              <span className="-ml-3 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary text-[15px] font-bold text-primary-foreground md:size-12 md:text-lg">
                +
              </span>
              <span className="-ml-3 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-bold text-muted-foreground md:size-[42px] md:text-base">
                ?
              </span>
            </div>
          </div>
          <div className="flex w-full max-w-[280px] flex-col items-center gap-2.5 text-center md:max-w-[360px] md:gap-3">
            <h2 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
              Nenhum recibo ainda
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground md:text-base md:leading-6">
              Divida a conta do bar. Crie um ou entre com código.
            </p>
          </div>
          <div className="flex w-full max-w-[280px] flex-col gap-3 md:max-w-none md:flex-row md:justify-center">
            <Link
              href="/receipt/new"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-[52px] font-bold md:px-7",
              )}
            >
              Novo recibo
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setJoinOpen(true)}
              className="h-[52px] border border-border font-semibold md:px-7"
            >
              Entrar com código
            </Button>
          </div>
        </div>
      ) : list.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhum recibo {filter === "open" ? "aberto" : "fechado"}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => {
            const meta = [
              r.isCreator ? "Criado por você" : "Convidado",
              `${r.participantCount} ${r.participantCount === 1 ? "pessoa" : "pessoas"}`,
            ];
            const when = relativeTime(r._creationTime);

            return (
              <li key={r._id}>
                <Link
                  href={`/receipt/${r._id}`}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40",
                    "md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-5",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-3 md:items-center md:justify-start md:gap-2.5">
                      <p className="font-display truncate text-[17px] leading-[22px] font-bold text-foreground md:text-lg">
                        {r.title}
                      </p>
                      <Badge
                        variant={r.status === "open" ? "default" : "muted"}
                        className="h-[22px] shrink-0 px-2.5 text-[10px] tracking-[0.04em]"
                      >
                        {r.status === "open" ? "Aberto" : "Fechado"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-4 text-muted-foreground md:text-[13px]">
                      <span className="md:hidden">{meta.join(" · ")}</span>
                      <span className="hidden md:inline">
                        {[...meta, when].join(" · ")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:shrink-0">
                    <p className="font-mono text-xl leading-6 font-bold text-foreground md:text-[22px] md:leading-7">
                      {brl(r.totalCents)}
                    </p>
                    <p className="text-xs leading-4 text-muted-foreground md:hidden">
                      {when}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paper · FAB — mobile only; desktop sidebar CTA */}
      {showFab ? (
        <div className="fixed right-5 bottom-[108px] z-30 flex flex-col items-center gap-3 md:hidden">
          <button
            type="button"
            aria-label="Entrar com código"
            onClick={() => setJoinOpen(true)}
            className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            <Search className="size-5" strokeWidth={2} />
          </button>
          <Link
            href="/receipt/new"
            aria-label="Novo recibo"
            className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </Link>
        </div>
      ) : null}

      <JoinReceiptSheet open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <p className="py-12 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        }
      >
        <ReceiptsContent />
      </Suspense>
    </AuthGate>
  );
}
