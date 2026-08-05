"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AuthGate } from "@/components/auth-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, brlAmount, relativeTime } from "@/lib/format";
import { useReceiptGet } from "@/lib/use-receipt-get";
import { cn } from "@/lib/utils";

function dateCode(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR");
}

type CupomItem = {
  _id: string;
  name: string;
  amountCents: number;
  _creationTime: number;
};

type CupomTotals = {
  consumoCents: number;
  taxaCents: number;
  coverCents: number;
  totalCents: number;
  paid: boolean;
};

function ParticipantCupom({
  title,
  inviteCode,
  createdAt,
  roleLine,
  feePercent,
  items,
  totals,
  className,
}: {
  title: string;
  inviteCode: string;
  createdAt: number;
  roleLine: string;
  feePercent: number;
  items: CupomItem[];
  totals: CupomTotals;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col bg-white px-[22px] pt-7 pb-6 text-neutral-950 shadow-[0_12px_40px_rgba(0,0,0,0.35)] print:max-w-[420px] print:shadow-none",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1.5 pb-4">
        <p className="font-display text-center text-[22px] leading-[26px] font-extrabold tracking-tight">
          SHAREZIN
        </p>
        <p className="font-mono text-center text-[11px] leading-[14px] font-medium tracking-[0.12em] text-neutral-500 uppercase">
          CUPOM DO PARTICIPANTE
        </p>
      </div>

      <div className="flex flex-col gap-1 pb-3.5">
        <p className="font-display text-lg leading-[22px] font-bold tracking-tight">
          {title}
        </p>
        <p className="font-mono text-xs leading-4 text-neutral-500">
          {dateCode(createdAt)} · {inviteCode}
        </p>
        <p className="pt-1 text-[13px] leading-4 font-medium">{roleLine}</p>
      </div>

      <div className="mb-3 h-px w-full border-t border-dashed border-neutral-300" />

      <div className="flex items-center gap-2 pb-2">
        <span className="font-mono min-w-0 grow text-[11px] leading-[14px] font-medium tracking-[0.08em] text-neutral-500">
          ITEM
        </span>
        <span className="font-mono w-9 shrink-0 text-right text-[11px] leading-[14px] font-medium tracking-[0.08em] text-neutral-500">
          QTD
        </span>
        <span className="font-mono w-16 shrink-0 text-right text-[11px] leading-[14px] font-medium tracking-[0.08em] text-neutral-500">
          VALOR
        </span>
      </div>

      <div className="flex flex-col gap-2.5 pb-3.5">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum item seu neste recibo.</p>
        ) : (
          items.map((item) => (
            <div key={item._id} className="flex items-start gap-2">
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <p className="truncate text-sm leading-[18px] font-medium">
                  {item.name}
                </p>
                <p className="font-mono text-[11px] leading-[14px] text-neutral-500">
                  {relativeTime(item._creationTime)}
                </p>
              </div>
              {/* ponytail: qty baked into name; amount is line total */}
              <span className="font-mono w-9 shrink-0 text-right text-[13px] leading-[18px] font-medium">
                1
              </span>
              <span className="font-mono w-16 shrink-0 text-right text-[13px] leading-[18px] font-medium">
                {brlAmount(item.amountCents)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mb-3 h-px w-full border-t border-dashed border-neutral-300" />

      <div className="flex flex-col gap-2 pb-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] leading-4 text-neutral-500">Consumo</span>
          <span className="font-mono text-[13px] leading-4 font-medium">
            {brl(totals.consumoCents)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] leading-4 text-neutral-500">
            Taxa {feePercent}%
          </span>
          <span className="font-mono text-[13px] leading-4 font-medium">
            {brl(totals.taxaCents)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] leading-4 text-neutral-500">Cover</span>
          <span className="font-mono text-[13px] leading-4 font-medium">
            {brl(totals.coverCents)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t-2 border-neutral-950 pt-3 pb-4">
        <span className="font-display text-sm leading-[18px] font-bold tracking-[0.04em]">
          TOTAL A PAGAR
        </span>
        <span className="font-mono text-xl leading-6 font-bold">
          {brl(totals.totalCents)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1 pt-1">
        <p className="font-mono text-center text-[11px] leading-[14px] text-neutral-500">
          Status: {totals.paid ? "PAGO" : "EM ABERTO"}
        </p>
        <p className="text-center text-xs leading-4 text-neutral-500">
          Obrigado · gerado pelo Sharezin
        </p>
      </div>
    </div>
  );
}

function ExportButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      size="lg"
      className={cn("h-[52px] w-full gap-2 rounded-full font-bold", className)}
      onClick={() => window.print()}
    >
      <FileText className="size-[18px]" />
      Exportar PDF
    </Button>
  );
}

function SummaryContent() {
  const params = useParams<{ id: string }>();
  const receiptId = params.id as Id<"receipts">;

  const me = useQuery(api.users.me);
  const data = useReceiptGet(receiptId);

  if (data === undefined || me == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  }

  const { receipt, participants, items, totals } = data;
  const myParticipant = participants.find((p) => p.userId === me._id);
  const myRow = totals.byParticipant.find((r) => r.userId === me._id);
  const isCreator = receipt.creatorId === me._id;

  const myItems = myParticipant
    ? items.filter((i) => i.participantId === myParticipant._id && !i.deletedAt)
    : [];

  const cupomTotals: CupomTotals = myRow
    ? {
        consumoCents: myRow.consumoCents,
        taxaCents: myRow.taxaCents,
        coverCents: myRow.coverCents,
        totalCents: myRow.totalCents,
        paid: myRow.paid,
      }
    : {
        consumoCents: 0,
        taxaCents: 0,
        coverCents: 0,
        totalCents: 0,
        paid: false,
      };

  const roleLine = isCreator ? "Você · Criador" : "Você";
  const itemCount = myItems.length;
  const itemLabel = `${itemCount} ${itemCount === 1 ? "item" : "itens"}`;

  const cupomProps = {
    title: receipt.title,
    inviteCode: receipt.inviteCode,
    createdAt: receipt._creationTime,
    roleLine,
    feePercent: receipt.serviceFeePercent,
    items: myItems,
    totals: cupomTotals,
  };

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col pb-8 md:px-12 md:py-10">
      {/* Mobile header */}
      <header className="flex items-center justify-between gap-3 px-5 pt-2 pb-4 md:hidden print:hidden">
        <Link
          href={`/receipt/${receiptId}`}
          aria-label="Voltar"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary"
        >
          <ChevronLeft className="size-[18px]" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <h1 className="font-display text-lg leading-[22px] font-bold tracking-tight text-foreground">
            Resumo do recibo
          </h1>
          <p className="truncate text-[13px] leading-4 text-muted-foreground">
            Seus pedidos · {receipt.title}
          </p>
        </div>
        <span className="size-10 shrink-0" />
      </header>

      {/* Desktop header */}
      <header className="mb-8 hidden items-start justify-between gap-6 print:hidden md:flex">
        <div className="min-w-0 flex-1">
          <Link
            href={`/receipt/${receiptId}`}
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            &lt; Recibos / {receipt.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-10 font-extrabold tracking-tight text-foreground">
              Resumo do recibo
            </h1>
            {cupomTotals.paid ? (
              <Badge variant="success" className="h-6 px-3">
                PAGO
              </Badge>
            ) : (
              <Badge variant="muted" className="h-6 px-3">
                Em aberto
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLine} · {itemLabel} · {receipt.title}
          </p>
        </div>
        <ExportButton className="h-12 w-auto shrink-0 px-6" />
      </header>

      {/* Desktop metrics */}
      <section className="mb-6 hidden gap-3 print:hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Total a pagar
          </p>
          <p className="font-mono mt-2 text-[28px] leading-9 font-bold text-foreground">
            {brl(cupomTotals.totalCents)}
          </p>
        </div>
        {(
          [
            ["Consumo", cupomTotals.consumoCents],
            [`Taxa ${receipt.serviceFeePercent}%`, cupomTotals.taxaCents],
            ["Cover", cupomTotals.coverCents],
          ] as const
        ).map(([label, cents]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="font-mono mt-2 text-xl font-bold text-foreground">
              {brl(cents)}
            </p>
          </div>
        ))}
      </section>

      {/* Print-only cupom — screen layouts hide under md / print:hidden */}
      <div className="hidden print:flex print:justify-center print:p-0">
        <ParticipantCupom {...cupomProps} className="max-w-[420px]" />
      </div>

      {/* Mobile cupom */}
      <div className="flex flex-1 flex-col items-center px-5 pb-4 print:hidden md:hidden">
        <ParticipantCupom {...cupomProps} className="max-w-[350px]" />
      </div>

      {/* Desktop workspace */}
      <section className="hidden gap-4 print:hidden md:grid md:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Seus pedidos
            </h2>
            <span className="text-xs text-muted-foreground">{itemLabel}</span>
          </div>
          <div className="mb-2 flex gap-3 border-b border-border pb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            <span className="min-w-0 flex-1">Item</span>
            <span className="w-24 shrink-0">Quando</span>
            <span className="w-12 shrink-0 text-right">Qtd</span>
            <span className="w-24 shrink-0 text-right">Valor</span>
          </div>
          <ul className="divide-y divide-border">
            {myItems.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Nenhum item seu neste recibo.
              </li>
            ) : (
              myItems.map((item) => (
                <li
                  key={item._id}
                  className="flex items-center gap-3 py-3.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.name}
                  </span>
                  <span className="font-mono w-24 shrink-0 text-muted-foreground">
                    {relativeTime(item._creationTime)}
                  </span>
                  <span className="font-mono w-12 shrink-0 text-right">1</span>
                  <span className="font-mono w-24 shrink-0 text-right font-semibold">
                    {brl(item.amountCents)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Pré-visualização PDF
            </p>
            <span className="text-[11px] text-muted-foreground">A4</span>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-auto rounded-xl bg-neutral-950/40 p-4 dark:bg-black/40">
            <ParticipantCupom
              {...cupomProps}
              className="max-w-[300px] scale-[0.92] origin-top"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            O PDF usa este cupom com os seus itens
          </p>
        </div>
      </section>

      {/* Mobile footer CTA */}
      <footer className="flex flex-col gap-2.5 px-5 pt-3 print:hidden md:hidden">
        <ExportButton />
        <p className="text-center text-xs leading-4 text-muted-foreground">
          Salva o cupom dos seus itens neste recibo
        </p>
      </footer>
    </div>
  );
}

export default function ReceiptSummaryPage() {
  return (
    <AuthGate>
      <SummaryContent />
    </AuthGate>
  );
}
