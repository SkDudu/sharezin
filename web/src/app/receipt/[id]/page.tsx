"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  Copy,
  FileText,
  Minus,
  MoreVertical,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";

import { AuthGate } from "@/components/auth-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetScrim } from "@/components/sheet-scrim";
import { ReceiptPageSkeleton } from "@/components/ui/skeleton";
import { brl, parseReais, relativeTime } from "@/lib/format";
import { enter } from "@/lib/motion";
import { useReceiptGet } from "@/lib/use-receipt-get";
import { cn } from "@/lib/utils";

type Sheet =
  | null
  | "menu"
  | "add"
  | "confirm-close"
  | { type: "confirm-delete-item"; id: Id<"items">; mine: boolean }
  | { type: "pending-delete"; id: Id<"itemDeleteRequests"> };

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function ReceiptDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const receiptId = params.id as Id<"receipts">;

  const me = useQuery(api.users.me);
  const data = useReceiptGet(receiptId);

  const addItem = useMutation(api.items.add);
  const removeItem = useMutation(api.items.remove);
  const requestDelete = useMutation(api.items.requestDelete);
  const resolveDelete = useMutation(api.items.resolveDeleteRequest);
  const closeReceipt = useMutation(api.receipts.close);
  const closeMine = useMutation(api.participants.closeMine);
  const approveJoin = useMutation(api.participants.approveJoin);
  const rejectJoin = useMutation(api.participants.rejectJoin);
  const setPaid = useMutation(api.participants.setPaid);

  const [tab, setTab] = useState<"history" | "summary">("history");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [copied, setCopied] = useState(false);

  // add form
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("");
  const [adding, setAdding] = useState(false);

  const isCreator = !!(me && data && data.receipt.creatorId === me._id);
  const myParticipant = useMemo(
    () => data?.participants.find((p) => me && p.userId === me._id),
    [data, me],
  );
  const canAdd =
    data?.receipt.status === "open" && myParticipant?.status === "active";

  const nameByParticipant = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.participants ?? []) {
      map.set(
        p._id,
        p.userId === me?._id ? "Você" : p.displayName.split(" ")[0]!,
      );
    }
    return map;
  }, [data, me]);

  const activePeople = useMemo(
    () =>
      (data?.participants ?? []).filter(
        (p) => p.status === "active" || p.status === "closed",
      ).length,
    [data],
  );

  const pendingJoins = useMemo(
    () => (data?.participants ?? []).filter((p) => p.status === "pending"),
    [data],
  );

  const unitCents = parseReais(unit.replace(/^R\$\s?/i, ""));
  const lineTotal =
    unitCents === null ? 0 : unitCents * Math.max(1, qty);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Código copiado");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function onAddItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = itemName.trim();
    if (!trimmed || unitCents === null) {
      toast.error("Nome e valor válidos são obrigatórios");
      return;
    }
    const label = qty > 1 ? `${trimmed} ×${qty}` : trimmed;
    setAdding(true);
    try {
      await addItem({
        receiptId,
        name: label,
        amountCents: lineTotal,
      });
      toast.success(`${label} adicionado`);
      setItemName("");
      setQty(1);
      setUnit("");
      setSheet(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao adicionar");
    } finally {
      setAdding(false);
    }
  }

  async function onDeleteItem(itemId: Id<"items">, mine: boolean) {
    try {
      if (isCreator) {
        await removeItem({ itemId });
        toast.success("Item excluído");
      } else if (mine) {
        await requestDelete({ itemId });
        toast.success("Exclusão pedida");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  if (data === undefined || me == null) {
    return <ReceiptPageSkeleton />;
  }

  const { receipt, participants, items, totals, pendingDeleteRequests } = data;
  const isOpen = receipt.status === "open";
  const myRow = totals.byParticipant.find((r) => r.userId === me._id);
  const myItemCount = myParticipant
    ? items.filter((i) => i.participantId === myParticipant._id && !i.deletedAt)
        .length
    : 0;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-6xl flex-1 flex-col pb-28 md:px-12 md:py-10 md:pb-10",
        enter.fade,
      )}
    >
      {/* Header */}
      <header className="flex items-start gap-3 px-5 pt-3 md:px-0">
        <Link
          href="/receipts"
          aria-label="Voltar"
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
        >
          <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-xl leading-6 font-extrabold tracking-tight text-foreground md:text-3xl md:leading-9">
            {receipt.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant={isOpen ? "default" : "muted"}
              className="h-[22px] px-2.5 text-[10px] tracking-[0.04em]"
            >
              {isOpen ? "Aberto" : "Fechado"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {shortDate(receipt._creationTime)} · {activePeople}{" "}
              {activePeople === 1 ? "pessoa" : "pessoas"}
            </span>
          </div>
        </div>
        {isOpen ? (
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setSheet("menu")}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <MoreVertical className="size-[18px]" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Resumo e PDF"
            onClick={() => router.push(`/receipt/${receiptId}/summary`)}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <FileText className="size-[18px]" />
          </button>
        )}
      </header>

      {/* Total card — mobile stacked / desktop metrics row */}
      <section className="mt-5 px-5 md:mt-8 md:px-0">
        <div className="rounded-2xl border border-border bg-card p-5 md:hidden">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Total da mesa
          </p>
          <p className="font-mono text-[36px] leading-[44px] font-bold tracking-[-0.03em] text-foreground">
            {brl(totals.grandTotalCents)}
          </p>
          <div className="mt-4 flex gap-2">
            {(
              [
                ["Consumo", totals.consumoTotalCents],
                [`Taxa ${receipt.serviceFeePercent}%`, totals.taxaTotalCents],
                ["Cover", totals.coverTotalCents],
              ] as const
            ).map(([label, cents]) => (
              <div
                key={label}
                className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg bg-background px-3 py-2.5"
              >
                <span className="text-[11px] leading-[14px] text-muted-foreground">
                  {label}
                </span>
                <span className="font-mono text-[13px] leading-4 font-semibold text-foreground">
                  {brl(cents)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden gap-3 md:flex">
          {(
            [
              ["Total da mesa", totals.grandTotalCents],
              ["Consumo", totals.consumoTotalCents],
              [`Taxa ${receipt.serviceFeePercent}%`, totals.taxaTotalCents],
              ["Cover", totals.coverTotalCents],
            ] as const
          ).map(([label, cents], i) => (
            <div
              key={label}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border border-border bg-card p-5",
                i === 0 ? "min-w-[280px] flex-[1.2]" : "flex-1",
              )}
            >
              <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {label}
              </span>
              <span
                className={cn(
                  "font-mono font-bold tracking-tight text-foreground",
                  i === 0 ? "text-[32px] leading-10" : "text-xl leading-7",
                )}
              >
                {brl(cents)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Seu total — Paper Histórico indicator */}
      {myRow ? (
        <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-primary/40 bg-primary/12 px-4 py-3.5 md:mx-0 md:mt-4 md:px-5 md:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Seu total
            </p>
            <p className="mt-1 text-[13px] leading-4 text-muted-foreground">
              {myItemCount}{" "}
              {myItemCount === 1 ? "item" : "itens"} · consumo + taxa + cover
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-3">
            <span
              className={cn(
                "text-[10px] font-bold tracking-[0.06em] uppercase md:text-[11px]",
                myRow.paid || !isOpen
                  ? "text-muted-foreground"
                  : "text-primary",
              )}
            >
              {myRow.paid ? "Pago" : isOpen ? "Em aberto" : "Fechado"}
            </span>
            <p className="font-mono text-xl leading-6 font-bold text-primary md:text-2xl md:leading-7">
              {brl(myRow.totalCents)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Invite code */}
      {isOpen ? (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/35 bg-primary/10 px-3.5 py-3 md:mx-0">
          <div className="min-w-0">
            <p className="text-[11px] leading-[14px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Código
            </p>
            <p className="font-mono text-lg leading-[22px] font-bold tracking-[0.1em] text-primary">
              {receipt.inviteCode}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-3.5 text-[13px] font-bold"
            onClick={() => void copyCode(receipt.inviteCode)}
          >
            <Copy className="size-3.5" strokeWidth={2.2} />
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      ) : null}

      {/* Pending joins */}
      {isCreator && pendingJoins.length > 0 ? (
        <section className="mt-5 px-5 md:px-0">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-bold tracking-[0.08em] text-primary uppercase">
              Pedidos de entrada
            </p>
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {pendingJoins.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {pendingJoins.map((p) => (
              <li
                key={p._id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {initialOf(p.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quer entrar · {relativeTime(p._creationTime)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void rejectJoin({ participantId: p._id })}
                >
                  Não
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void approveJoin({ participantId: p._id })}
                >
                  Sim
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Pending deletes */}
      {isCreator && pendingDeleteRequests.length > 0 ? (
        <section className="mt-4 space-y-2 px-5 md:px-0">
          <p className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
            Exclusões pendentes
          </p>
          {pendingDeleteRequests.map((req) => {
            const item = items.find((i) => i._id === req.itemId);
            return (
              <div
                key={req._id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {item?.name ?? "item"} · {item ? brl(item.amountCents) : "—"}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setSheet({ type: "pending-delete", id: req._id })
                  }
                >
                  Ver
                </Button>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Tabs */}
      <div className="mt-5 flex gap-2 px-5 md:px-0">
        {(
          [
            ["history", "Histórico"],
            ["summary", "Resumo"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex h-9 items-center rounded-full px-4 text-[13px] transition-colors",
              tab === key
                ? "bg-primary font-bold text-primary-foreground"
                : "border border-border bg-card font-semibold text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* History */}
      {tab === "history" ? (
        <ul className="mt-2 divide-y divide-border px-5 md:mt-4 md:rounded-2xl md:border md:border-border md:bg-card md:px-6 md:py-2">
          {[...items].reverse().map((item) => {
            const mine = myParticipant?._id === item.participantId;
            const gone = !!item.deletedAt;
            return (
              <li
                key={item._id}
                className={cn(
                  "flex items-center gap-3 py-4",
                  gone && "opacity-55",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[15px] font-semibold text-foreground",
                      gone && "line-through",
                    )}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nameByParticipant.get(item.participantId) ?? "?"} ·{" "}
                    {gone
                      ? `excluído · ${relativeTime(item.deletedAt!)}`
                      : relativeTime(item._creationTime)}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-[15px] font-bold text-foreground",
                    gone && "line-through",
                  )}
                >
                  {brl(item.amountCents)}
                </span>
                {isOpen && !gone && (isCreator || mine) ? (
                  <button
                    type="button"
                    aria-label={isCreator ? "Excluir" : "Pedir exclusão"}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() =>
                      setSheet({
                        type: "confirm-delete-item",
                        id: item._id,
                        mine: !!mine,
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : (
                  <span className="size-8 shrink-0" />
                )}
              </li>
            );
          })}
          {items.length === 0 ? (
            <li className="py-10 text-center text-sm text-muted-foreground">
              Nenhum item ainda.
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="mt-3 flex flex-col gap-3 px-5 md:px-0">
          {totals.byParticipant
            .filter((r) => r.status === "active" || r.status === "closed")
            .map((row) => {
              const p = participants.find((x) => x._id === row.participantId);
              const label =
                row.userId === me._id
                  ? "Você"
                  : (p?.displayName.split(" ")[0] ?? "Convidado");
              const isOwner = row.userId === receipt.creatorId;
              return (
                <div
                  key={row.participantId}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        row.userId === me._id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {initialOf(p?.displayName ?? label)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {label}
                            {isOwner ? " · Criador" : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {brl(row.consumoCents)} + taxa {brl(row.taxaCents)}{" "}
                            + cover {brl(row.coverCents)}
                          </p>
                        </div>
                        <p className="font-mono text-[15px] font-bold text-foreground">
                          {brl(row.totalCents)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {row.paid ? (
                          <Badge
                            variant="success"
                            className="h-5 text-[10px] tracking-wide"
                          >
                            Pago
                          </Badge>
                        ) : row.status === "closed" ? (
                          <Badge
                            variant="success"
                            className="h-5 bg-success/15 text-[10px] tracking-wide text-success"
                          >
                            Conta fechada
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="h-5 text-[10px] tracking-wide"
                          >
                            Em aberto
                          </Badge>
                        )}
                      </div>
                      {isCreator && isOpen && row.status === "active" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!row.paid ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                void setPaid({
                                  participantId: row.participantId,
                                  paid: true,
                                })
                              }
                            >
                              Marcar pago
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void setPaid({
                                  participantId: row.participantId,
                                  paid: false,
                                })
                              }
                            >
                              Desmarcar pago
                            </Button>
                          )}
                          {!isOwner ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/receipt/${receiptId}/participants`,
                                )
                              }
                            >
                              Gerenciar
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

          {isCreator && isOpen ? (
            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="w-full font-bold"
                onClick={() => setSheet("confirm-close")}
              >
                Fechar recibo
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Trava novos itens e pedidos de entrada.
              </p>
            </div>
          ) : null}

          {!isCreator && isOpen && myParticipant?.status === "active" ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => {
                if (!confirm("Fechar sua participação?")) return;
                void closeMine({ receiptId });
              }}
            >
              Fechar minha participação
            </Button>
          ) : null}
        </div>
      )}

      {/* FAB */}
      {canAdd ? (
        <button
          type="button"
          aria-label="Adicionar produto"
          onClick={() => {
            setSheet("add");
          }}
          className="fixed right-5 bottom-6 z-30 flex size-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:right-10 md:bottom-10"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      ) : null}

      {/* Owner menu */}
      <SheetScrim open={sheet === "menu"} onClose={() => setSheet(null)}>
        <div className="flex flex-col gap-1 px-5 pt-3 pb-6">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-neutral-600" />
          {isOpen ? (
            <MenuRow
              icon={<Copy className="size-5" />}
              title="Copiar código"
              onClick={() => {
                void copyCode(receipt.inviteCode);
                setSheet(null);
              }}
            />
          ) : null}
          <MenuRow
            icon={<FileText className="size-5" />}
            title="Resumo do recibo"
            subtitle={isOpen ? "Seus itens e totais" : "Exportar PDF"}
            onClick={() => {
              setSheet(null);
              router.push(`/receipt/${receiptId}/summary`);
            }}
          />
          {isCreator && isOpen ? (
            <MenuRow
              icon={<Users className="size-5" />}
              title="Gerenciar participantes"
              subtitle="Fechar conta ou remover alguém"
              onClick={() => {
                setSheet(null);
                router.push(`/receipt/${receiptId}/participants`);
              }}
            />
          ) : null}
          {isCreator && isOpen ? (
            <MenuRow
              icon={<X className="size-5" />}
              title="Fechar recibo"
              muted
              onClick={() => setSheet("confirm-close")}
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-4 w-full"
            onClick={() => setSheet(null)}
          >
            Cancelar
          </Button>
        </div>
      </SheetScrim>

      {/* Add product */}
      <SheetScrim open={sheet === "add"} onClose={() => setSheet(null)}>
        <form onSubmit={onAddItem} className="flex flex-col gap-5 px-5 pt-3 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-neutral-600 md:hidden" />
              <h2 className="font-display text-[22px] font-extrabold tracking-tight text-foreground">
                Adicionar produto
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setSheet(null)}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-background"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Nome
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ex: Picanha 1kg"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Qtd
              </label>
              <div className="flex h-[52px] items-center justify-between rounded-lg border-[1.5px] border-input bg-card px-2">
                <button
                  type="button"
                  aria-label="Diminuir"
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </button>
                <span className="font-mono text-base font-bold">{qty}</span>
                <button
                  type="button"
                  aria-label="Aumentar"
                  className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  onClick={() => setQty((q) => q + 1)}
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1.4] flex-col gap-2">
              <label className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Valor unitário
              </label>
              <Input
                inputMode="decimal"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="0,00"
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
            <span className="text-sm text-muted-foreground">Total do item</span>
            <span className="font-mono text-base font-bold text-foreground">
              {brl(lineTotal)}
            </span>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={adding}
            className="w-full font-bold"
          >
            {adding ? "Adicionando…" : "Adicionar ao recibo"}
          </Button>
        </form>
      </SheetScrim>

      {/* Confirm close receipt */}
      <SheetScrim
        open={sheet === "confirm-close"}
        onClose={() => setSheet(null)}
      >
        <div className="flex flex-col gap-4 px-5 pt-3 pb-6 text-center">
          <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600" />
          <h2 className="font-display text-[22px] font-extrabold">
            Fechar recibo?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ninguém poderá adicionar itens ou entrar com o código. O histórico
            permanece.
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full font-bold"
            onClick={async () => {
              await closeReceipt({ receiptId });
              setSheet(null);
            }}
          >
            Confirmar fechamento
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
      </SheetScrim>

      {/* Confirm delete history item */}
      <SheetScrim
        open={typeof sheet === "object" && sheet?.type === "confirm-delete-item"}
        onClose={() => setSheet(null)}
      >
        {typeof sheet === "object" && sheet?.type === "confirm-delete-item" ? (
          <div className="flex flex-col gap-4 px-5 pt-3 pb-6 text-center">
            <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600" />
            <h2 className="font-display text-[22px] font-extrabold">
              {isCreator
                ? `Excluir ${items.find((i) => i._id === sheet.id)?.name ?? "item"}?`
                : "Pedir exclusão?"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isCreator
                ? "Some do histórico e dos totais. Essa ação não pode ser desfeita."
                : "Só sai do histórico depois que o criador aprovar."}
            </p>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full font-bold"
              onClick={async () => {
                await onDeleteItem(sheet.id, sheet.mine);
                setSheet(null);
              }}
            >
              {isCreator ? "Excluir item" : "Pedir exclusão"}
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

      {/* Pending delete request detail */}
      <SheetScrim
        open={typeof sheet === "object" && sheet?.type === "pending-delete"}
        onClose={() => setSheet(null)}
      >
        {typeof sheet === "object" && sheet?.type === "pending-delete"
          ? (() => {
              const req = pendingDeleteRequests.find((r) => r._id === sheet.id);
              if (!req) return null;
              const item = items.find((i) => i._id === req.itemId);
              const requester =
                participants.find((p) => p.userId === req.requesterId)
                  ?.displayName ?? "Participante";
              return (
                <div className="flex flex-col gap-4 px-5 pt-3 pb-6">
                  <div className="mx-auto h-1 w-9 rounded-full bg-neutral-600" />
                  <div className="text-center">
                    <h2 className="font-display text-[22px] font-extrabold">
                      Pedido de exclusão
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {requester} pediu · {relativeTime(req._creationTime)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Item
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-foreground">
                      {item?.name ?? "item removido"}
                    </p>
                    <p className="font-mono mt-0.5 text-sm font-bold text-foreground">
                      {item ? brl(item.amountCents) : "—"}
                    </p>
                  </div>
                  <p className="text-center text-sm leading-relaxed text-muted-foreground">
                    Aprovar remove o item do histórico e dos totais.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="w-full font-bold"
                    onClick={async () => {
                      await resolveDelete({
                        requestId: req._id,
                        approve: true,
                      });
                      toast.success("Exclusão aprovada");
                      setSheet(null);
                    }}
                  >
                    Aprovar exclusão
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={async () => {
                      await resolveDelete({
                        requestId: req._id,
                        approve: false,
                      });
                      toast.success("Pedido recusado");
                      setSheet(null);
                    }}
                  >
                    Recusar
                  </Button>
                </div>
              );
            })()
          : null}
      </SheetScrim>
    </div>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onClick,
  muted,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          muted
            ? "bg-secondary text-foreground"
            : "bg-primary/15 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-semibold",
            muted ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function ReceiptPage() {
  return (
    <AuthGate>
      <ReceiptDetailContent />
    </AuthGate>
  );
}
