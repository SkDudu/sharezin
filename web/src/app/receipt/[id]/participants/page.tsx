"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  MoreVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { brl } from "@/lib/format";
import { useReceiptGet } from "@/lib/use-receipt-get";
import { cn } from "@/lib/utils";

// ponytail: SheetScrim duplicated from receipt page; extract if 3rd copy appears
function SheetScrim({
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-card md:rounded-2xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function StatusPill({
  paid,
  status,
}: {
  paid: boolean;
  status: string;
}) {
  if (paid) {
    return (
      <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-[3px] text-[10px] leading-3 font-bold tracking-wide text-success">
        PAGO
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-[3px] text-[10px] leading-3 font-bold tracking-wide text-success">
        CONTA FECHADA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-[3px] text-[10px] leading-3 font-bold tracking-wide text-primary">
      EM ABERTO
    </span>
  );
}

type Sheet =
  | null
  | { type: "actions"; id: Id<"participants"> }
  | { type: "confirm-close"; id: Id<"participants"> }
  | { type: "destino"; id: Id<"participants"> }
  | { type: "pick"; id: Id<"participants"> }
  | { type: "confirm-delete-items"; id: Id<"participants"> }
  | {
      type: "confirm-redistribute";
      id: Id<"participants">;
      toId: Id<"participants">;
    };

function ParticipantsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const receiptId = params.id as Id<"receipts">;

  const me = useQuery(api.users.me);
  const data = useReceiptGet(receiptId);
  const closeOther = useMutation(api.participants.closeOther);
  const removeParticipant = useMutation(api.participants.remove);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [pickTo, setPickTo] = useState<Id<"participants"> | null>(null);
  const [pending, setPending] = useState(false);

  const isCreator =
    data != null && me != null && data.receipt.creatorId === me._id;

  useEffect(() => {
    if (data === undefined || me == null) return;
    if (data.receipt.creatorId !== me._id) {
      router.replace(`/receipt/${receiptId}`);
    }
  }, [data, me, receiptId, router]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.totals.byParticipant.filter(
      (r) => r.status === "active" || r.status === "closed",
    );
  }, [data]);

  const activePeople = useMemo(
    () =>
      (data?.participants ?? []).filter(
        (p) => p.status === "active" || p.status === "closed",
      ).length,
    [data?.participants],
  );

  const selected = useMemo(() => {
    if (!sheet || !data) return null;
    const row = data.totals.byParticipant.find(
      (r) => r.participantId === sheet.id,
    );
    const p = data.participants.find((x) => x._id === sheet.id);
    if (!row || !p) return null;
    const liveItems = data.items.filter(
      (i) => i.participantId === sheet.id && !i.deletedAt,
    );
    const itemCents = liveItems.reduce((s, i) => s + i.amountCents, 0);
    return { row, p, liveItems, itemCents };
  }, [sheet, data]);

  const recipients = useMemo(() => {
    if (!selected || !data) return [];
    return rows.filter((r) => r.participantId !== selected.row.participantId);
  }, [rows, selected, data]);

  if (data === undefined || me == null || !isCreator) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  }

  const { receipt, participants } = data;
  const isOpen = receipt.status === "open";

  async function onCloseAccount(id: Id<"participants">) {
    try {
      await closeOther({ participantId: id });
      toast.success("Conta fechada");
      setSheet(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function onRemove(
    id: Id<"participants">,
    disposition:
      | { kind: "deleteItems" }
      | { kind: "redistribute"; toParticipantId: Id<"participants"> },
  ) {
    setPending(true);
    try {
      await removeParticipant({ participantId: id, disposition });
      toast.success(
        disposition.kind === "redistribute"
          ? "Participante removido · itens transferidos"
          : "Participante removido · itens excluídos",
      );
      setSheet(null);
      setPickTo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setPending(false);
    }
  }

  function statusLine(row: {
    paid: boolean;
    status: string;
    totalCents: number;
  }) {
    const state = row.paid
      ? "pago"
      : row.status === "closed"
        ? "conta fechada"
        : "em aberto";
    return `${brl(row.totalCents)} · ${state}`;
  }

  function itemLabel(count: number) {
    return `${count} ${count === 1 ? "item" : "itens"}`;
  }

  function openDestino(id: Id<"participants">) {
    setPickTo(null);
    setSheet({ type: "destino", id });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col pb-8 md:px-12 md:py-10">
      <header className="flex items-center gap-3 px-5 pt-2 pb-4 md:hidden">
        <Link
          href={`/receipt/${receiptId}`}
          aria-label="Voltar"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card"
        >
          <ChevronLeft className="size-[18px]" strokeWidth={2.5} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="font-display text-[22px] leading-7 font-bold tracking-tight text-foreground">
            Participantes
          </h1>
          <p className="truncate text-[13px] leading-4 text-muted-foreground">
            {receipt.title} · {activePeople}{" "}
            {activePeople === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
      </header>

      <p className="px-5 pb-4 text-sm leading-5 text-muted-foreground md:hidden">
        Como dono, você pode fechar a conta de alguém ou remover do recibo.
      </p>

      <header className="mb-5 hidden flex-col gap-2 md:flex">
        <Link
          href={`/receipt/${receiptId}`}
          className="text-[13px] leading-4 text-muted-foreground hover:text-foreground"
        >
          &lt; Recibos / {receipt.title}
        </Link>
        <div>
          <h1 className="font-display text-3xl leading-10 font-bold tracking-tight text-foreground">
            Participantes
          </h1>
          <p className="mt-1 text-sm leading-[18px] text-muted-foreground">
            {activePeople} {activePeople === 1 ? "pessoa" : "pessoas"} · como
            dono você gerencia contas e remoções
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-2.5 px-5 md:max-w-[720px] md:px-0">
        {rows.map((row) => {
          const p = participants.find((x) => x._id === row.participantId);
          const isOwner = row.userId === receipt.creatorId;
          const label = isOwner
            ? "Você · Criador"
            : (p?.displayName ?? "Convidado");
          const canAct = !isOwner;

          return (
            <li
              key={row.participantId}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span
                className={cn(
                  "font-display flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold",
                  isOwner
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground",
                )}
              >
                {initialOf(p?.displayName ?? label)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-[15px] leading-[18px] font-bold text-foreground">
                  {label}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill paid={row.paid} status={row.status} />
                  {isOwner ? (
                    <span className="text-xs leading-4 text-muted-foreground">
                      Não pode ser removido
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="font-mono shrink-0 text-[15px] leading-[18px] font-bold text-foreground">
                {brl(row.totalCents)}
              </span>
              {canAct ? (
                <button
                  type="button"
                  aria-label={`Ações de ${label}`}
                  className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
                  onClick={() =>
                    setSheet({ type: "actions", id: row.participantId })
                  }
                >
                  <MoreVertical className="size-[18px]" />
                </button>
              ) : (
                <span className="size-8 shrink-0" />
              )}
            </li>
          );
        })}
      </ul>

      {/* 7b · Ações */}
      <SheetScrim
        open={sheet?.type === "actions"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "actions" ? (
          <div className="flex flex-col gap-1 px-3 pt-3 pb-7">
            <div className="flex justify-center pt-1 pb-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-neutral-600" />
            </div>
            <div className="flex items-center gap-3 px-3 pt-2 pb-4">
              <span className="font-display flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-bold">
                {initialOf(selected.p.displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-5 font-bold">
                  {selected.p.displayName}
                </p>
                <p className="font-mono text-[13px] leading-4 text-muted-foreground">
                  {statusLine(selected.row)}
                </p>
              </div>
            </div>

            {selected.row.status === "active" && isOpen ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left hover:bg-muted/40"
                onClick={() =>
                  setSheet({ type: "confirm-close", id: sheet.id })
                }
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check className="size-[18px]" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base leading-5 font-semibold">
                    Fechar conta
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                    Trava novos itens deste participante
                  </span>
                </span>
              </button>
            ) : null}

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left hover:bg-muted/40"
              onClick={() => openDestino(sheet.id)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <Trash2 className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-5 font-semibold text-destructive">
                  Excluir do recibo
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  Decide destino dos itens
                </span>
              </span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-2 h-12 w-full rounded-full"
              onClick={() => setSheet(null)}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </SheetScrim>

      {/* 7c · Confirmar fechar */}
      <SheetScrim
        open={sheet?.type === "confirm-close"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "confirm-close" ? (
          <div className="flex flex-col gap-4 px-5 pt-3 pb-6 text-center">
            <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600 md:hidden" />
            <h2 className="font-display text-[22px] font-extrabold tracking-tight">
              Fechar conta de {selected.p.displayName}?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ele não poderá adicionar novos itens. O total da conta dele
              permanece {brl(selected.row.totalCents)}.
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full font-bold"
              onClick={() => void onCloseAccount(sheet.id)}
            >
              Fechar conta
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setSheet(null)}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </SheetScrim>

      {/* 7d · Destino dos itens */}
      <SheetScrim
        open={sheet?.type === "destino"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "destino" ? (
          <div className="flex flex-col gap-1 px-3 pt-3 pb-7">
            <div className="flex justify-center pt-1 pb-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-neutral-600" />
            </div>
            <div className="flex flex-col gap-2 px-3 pt-2 pb-4">
              <h2 className="font-display text-[22px] leading-7 font-bold tracking-tight">
                Destino dos itens de {selected.p.displayName}
              </h2>
              <p className="text-sm leading-5 text-muted-foreground">
                {selected.p.displayName} tem {itemLabel(selected.liveItems.length)}{" "}
                · {brl(selected.row.totalCents)}. Escolha o que acontece com
                eles ao sair.
              </p>
            </div>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left hover:bg-muted/40"
              onClick={() =>
                setSheet({ type: "confirm-delete-items", id: sheet.id })
              }
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <Trash2 className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-5 font-semibold text-destructive">
                  Excluir itens
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  Some do recibo sem passar pra ninguém
                </span>
              </span>
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left hover:bg-muted/40"
              onClick={() => {
                const first = recipients[0]?.participantId ?? null;
                setPickTo(first);
                setSheet({ type: "pick", id: sheet.id });
              }}
              disabled={recipients.length === 0}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <ArrowLeftRight className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-5 font-semibold">
                  Redistribuir itens
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                  {recipients.length === 0
                    ? "Ninguém disponível pra receber"
                    : `Escolha quem recebe os ${itemLabel(selected.liveItems.length)} pendentes`}
                </span>
              </span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-2 h-12 w-full rounded-full"
              onClick={() => setSheet(null)}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </SheetScrim>

      {/* 7e · Quem recebe */}
      <SheetScrim
        open={sheet?.type === "pick"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "pick" ? (
          <div className="flex flex-col gap-2 px-3 pt-3 pb-7">
            <div className="flex justify-center pt-1 pb-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-neutral-600" />
            </div>
            <div className="flex flex-col gap-1.5 px-3 pb-2">
              <h2 className="font-display text-[22px] leading-7 font-bold tracking-tight">
                Quem recebe os itens?
              </h2>
              <p className="text-sm leading-5 text-muted-foreground">
                {itemLabel(selected.liveItems.length)} de{" "}
                {selected.p.displayName} · {brl(selected.row.totalCents)} passam
                para a pessoa escolhida.
              </p>
            </div>

            <div className="flex flex-col gap-2 px-1">
              {recipients.map((row) => {
                const p = participants.find((x) => x._id === row.participantId);
                const name =
                  row.userId === me._id
                    ? "Você · Criador"
                    : (p?.displayName ?? "Convidado");
                const selectedPick = pickTo === row.participantId;
                // ponytail: preview = soma totais; cover double-count ok until paid flows need precision
                const afterCents = row.totalCents + selected.row.totalCents;
                const sub =
                  row.userId === me._id
                    ? `${brl(row.totalCents)} agora`
                    : row.status === "closed"
                      ? `${brl(row.totalCents)} · conta fechada`
                      : `${brl(row.totalCents)} → ${brl(afterCents)}`;

                return (
                  <button
                    key={row.participantId}
                    type="button"
                    onClick={() => setPickTo(row.participantId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left",
                      selectedPick
                        ? "border-primary border-[1.5px]"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold",
                        row.userId === me._id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground",
                      )}
                    >
                      {initialOf(p?.displayName ?? name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] leading-[18px] font-bold">
                        {name}
                      </span>
                      <span className="font-mono mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {sub}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                        selectedPick
                          ? "border-primary bg-primary"
                          : "border-border bg-transparent",
                      )}
                    >
                      {selectedPick ? (
                        <span className="size-2 rounded-full bg-primary-foreground" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5 px-1 pt-2">
              <Button
                type="button"
                size="lg"
                className="h-[52px] w-full rounded-full font-bold"
                disabled={!pickTo}
                onClick={() => {
                  if (!pickTo) return;
                  setSheet({
                    type: "confirm-redistribute",
                    id: sheet.id,
                    toId: pickTo,
                  });
                }}
              >
                Continuar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-[52px] w-full rounded-full"
                onClick={() => setSheet(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </SheetScrim>

      {/* 7f · Confirmar redistribuir */}
      <SheetScrim
        open={sheet?.type === "confirm-redistribute"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "confirm-redistribute" ? (
          (() => {
            const toP = participants.find((x) => x._id === sheet.toId);
            const toName =
              toP?.userId === me._id
                ? "Você"
                : (toP?.displayName ?? "Participante");
            return (
              <div className="flex flex-col gap-4 px-5 pt-3 pb-6">
                <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600 md:hidden" />
                <div className="flex flex-col gap-2 text-center md:text-left">
                  <h2 className="font-display text-[22px] font-extrabold tracking-tight">
                    Excluir {selected.p.displayName} do recibo?
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selected.p.displayName} sai. Essa ação não pode ser
                    desfeita.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background px-4 py-3.5">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Itens transferidos
                  </p>
                  <div className="flex items-center gap-2.5">
                    <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                      {initialOf(selected.p.displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-[18px] font-semibold">
                        {selected.p.displayName} → {toName}
                      </p>
                      <p className="font-mono text-xs leading-4 text-muted-foreground">
                        {itemLabel(selected.liveItems.length)} ·{" "}
                        {brl(selected.row.totalCents)}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  className="w-full font-bold"
                  disabled={pending}
                  onClick={() =>
                    void onRemove(sheet.id, {
                      kind: "redistribute",
                      toParticipantId: sheet.toId,
                    })
                  }
                >
                  {pending ? "Excluindo…" : "Excluir e transferir"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setSheet(null)}
                >
                  Cancelar
                </Button>
              </div>
            );
          })()
        ) : null}
      </SheetScrim>

      {/* 7g · Confirmar excluir itens */}
      <SheetScrim
        open={sheet?.type === "confirm-delete-items"}
        onClose={() => setSheet(null)}
      >
        {selected && sheet?.type === "confirm-delete-items" ? (
          <div className="flex flex-col gap-4 px-5 pt-3 pb-6">
            <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600 md:hidden" />
            <div className="flex flex-col gap-2 text-center md:text-left">
              <h2 className="font-display text-[22px] font-extrabold tracking-tight">
                Excluir {selected.p.displayName} e os itens?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selected.p.displayName} sai. Os{" "}
                {itemLabel(selected.liveItems.length)} dele somem do recibo. Não
                dá pra desfazer.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background px-4 py-3.5">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Itens excluídos
              </p>
              <div className="flex items-center gap-2.5">
                <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {initialOf(selected.p.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-[18px] font-semibold">
                    {selected.p.displayName} ·{" "}
                    {itemLabel(selected.liveItems.length)}
                  </p>
                  <p className="font-mono text-xs leading-4 text-muted-foreground">
                    {brl(selected.row.totalCents)} removidos
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full font-bold"
              disabled={pending}
              onClick={() =>
                void onRemove(sheet.id, { kind: "deleteItems" })
              }
            >
              {pending ? "Excluindo…" : "Excluir sem redistribuir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setSheet(null)}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </SheetScrim>
    </div>
  );
}

export default function ReceiptParticipantsPage() {
  return (
    <AuthGate>
      <ParticipantsContent />
    </AuthGate>
  );
}
