"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AuthGate } from "@/components/auth-gate";
import { brl, brlWhole } from "@/lib/format";
import { cn } from "@/lib/utils";

function firstName(name?: string | null) {
  if (!name?.trim()) return "você";
  return name.trim().split(/\s+/)[0]!;
}

function initial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function MonthBars({
  data,
  tall,
}: {
  data: { month: string; totalCents: number }[];
  tall?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.totalCents), 1);
  const currentMonth = new Date().getMonth();
  const visible = data.slice(0, Math.max(currentMonth + 1, 1));

  return (
    <div
      className={cn(
        "flex w-full items-end justify-between gap-2 pt-2",
        tall ? "h-[220px]" : "h-[140px]",
      )}
    >
      {visible.map((row, i) => {
        const pct = Math.max(
          (row.totalCents / max) * 100,
          row.totalCents > 0 ? 8 : 2,
        );
        const active = i === visible.length - 1;
        const opacity = active ? 1 : 0.35 + (row.totalCents / max) * 0.4;
        return (
          <div
            key={`${row.month}-${i}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className="w-full rounded-t-sm rounded-b-sm bg-primary"
              style={{ height: `${pct}%`, opacity }}
            />
            <span
              className={cn(
                "text-[10px] leading-3 capitalize",
                active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {row.month.slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardContent() {
  const me = useQuery(api.users.me);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const stats = useQuery(api.receipts.dashboardStats, { year });

  const greeting = useMemo(
    () => `Olá, ${firstName(me?.name)}`,
    [me?.name],
  );

  if (stats === undefined || me === undefined) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Carregando dados…
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-2 pb-28 md:gap-7 md:px-12 md:py-10 md:pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] leading-4 font-medium text-muted-foreground">
            {greeting}
          </p>
          <h1 className="font-display text-2xl leading-[30px] font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-foreground">
            <span className="sr-only">Ano</span>
            <select
              className="appearance-none bg-transparent pr-4 outline-none"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {stats.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 size-3 text-muted-foreground" />
          </label>
          <Link
            href="/profile"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground"
            aria-label="Perfil"
          >
            {initial(me?.name, me?.email)}
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-5 md:flex-row">
        {stats.latestOpen ? (
          <Link
            href={`/receipt/${stats.latestOpen._id}`}
            className="flex flex-col gap-3 rounded-2xl bg-primary p-5 md:min-w-0 md:flex-[1.2]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs leading-4 font-semibold tracking-[0.08em] text-primary-foreground/70 uppercase">
                Recibo aberto
              </span>
              <span className="flex h-6 items-center rounded-full bg-primary-foreground/14 px-2.5 text-[11px] leading-[14px] font-semibold text-primary-foreground">
                {stats.latestOpen.participantCount}{" "}
                {stats.latestOpen.participantCount === 1
                  ? "pessoa"
                  : "pessoas"}
              </span>
            </div>
            <p className="font-display text-[22px] leading-7 font-extrabold tracking-tight text-primary-foreground">
              {stats.latestOpen.title}
            </p>
            <div className="flex items-end justify-between gap-3">
              <p className="font-mono text-[28px] leading-[34px] font-bold tracking-[-0.03em] text-primary-foreground">
                {brl(stats.latestOpen.totalCents)}
              </p>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/14 text-primary-foreground">
                <ArrowRight className="size-[18px]" strokeWidth={2.2} />
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href="/receipt/new"
            className="flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-border bg-card p-5 md:min-w-0 md:flex-[1.2]"
          >
            <span className="text-xs leading-4 font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Recibo aberto
            </span>
            <p className="font-display text-[22px] leading-7 font-extrabold tracking-tight text-foreground">
              Nenhum recibo aberto
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Toque para criar o primeiro
              </p>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowRight className="size-[18px]" strokeWidth={2.2} />
              </span>
            </div>
          </Link>
        )}

        <div className="flex gap-2.5 md:min-w-0 md:flex-1 md:flex-col md:gap-3">
          {(
            [
              ["Total gasto", brlWhole(stats.totalSpentCents)],
              ["Recibos", String(stats.receiptCount)],
              ["Média", brlWhole(stats.averageCents)],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 md:p-5"
            >
              <p className="text-[11px] leading-[14px] text-muted-foreground">
                {label}
              </p>
              <p className="font-mono text-[15px] leading-[18px] font-semibold text-foreground md:text-[22px] md:leading-7">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px] md:min-h-[280px] md:flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] leading-[18px] font-semibold text-foreground">
            Gastos {year}
          </h2>
          <span className="text-xs leading-4 font-medium text-primary">
            Mensal
          </span>
        </div>
        <div className="md:hidden">
          <MonthBars data={stats.byMonth} />
        </div>
        <div className="hidden md:block">
          <MonthBars data={stats.byMonth} tall />
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}
