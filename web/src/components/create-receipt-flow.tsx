"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, ChevronDown, ChevronLeft, Copy, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Input } from "@/components/ui/input";
import { parseNonNegReais } from "@/lib/format";
import { enter } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Created = {
  receiptId: Id<"receipts">;
  inviteCode: string;
};

function InviteSuccess({
  created,
  onGo,
}: {
  created: Created;
  onGo: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.inviteCode);
      setCopied(true);
      toast("Código copiado");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex w-full max-w-[340px] flex-col gap-5 rounded-2xl border border-border bg-card px-6 py-7">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15">
          <Check className="size-6 text-primary" strokeWidth={2.5} />
        </div>
        <h2 className="font-display text-[22px] leading-7 font-bold text-foreground">
          Recibo criado
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Compartilhe o código para a mesa entrar.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border bg-background p-4">
        <p className="text-[11px] leading-[14px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Código
        </p>
        <p className="font-mono text-3xl leading-10 font-bold tracking-[0.12em] text-primary">
          {created.inviteCode}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          size="lg"
          onClick={copy}
          className="w-full gap-2 text-[15px] font-bold"
        >
          <Copy className="size-4" strokeWidth={2.2} />
          {copied ? "Copiado!" : "Copiar código"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onGo}
          className="w-full text-sm font-semibold"
        >
          Ir para o recibo
        </Button>
      </div>
    </div>
  );
}

function CreateForm({
  variant,
  onCancel,
  onCreated,
}: {
  variant: "page" | "modal";
  onCancel: () => void;
  onCreated: (created: Created) => void;
}) {
  const create = useMutation(api.receipts.create);
  const [title, setTitle] = useState("");
  const [fee, setFee] = useState("10");
  const [cover, setCover] = useState("0");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Nome obrigatório");
      return;
    }
    const feeNum = Number(fee.replace(",", "."));
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      toast.error("Taxa inválida");
      return;
    }
    const coverCents = parseNonNegReais(cover);
    if (coverCents === null) {
      toast.error("Cover inválido");
      return;
    }
    setPending(true);
    try {
      const result = await create({
        title: trimmed,
        serviceFeePercent: feeNum,
        coverPerPersonCents: coverCents,
      });
      onCreated(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setPending(false);
    }
  }

  const inputSurface =
    variant === "modal" ? "bg-background" : "bg-card";

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex w-full flex-col gap-5",
        variant === "modal" && "gap-6",
      )}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="title"
          className="text-[13px] leading-4 font-semibold text-foreground"
        >
          Nome do recibo *
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Churrasco Sábado"
          required
          className={cn("font-sans", inputSurface)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="group"
          className="text-[13px] leading-4 font-semibold text-foreground"
        >
          Grupo
        </label>
        <div className="relative">
          <select
            id="group"
            disabled
            defaultValue=""
            className={cn(
              "h-[52px] w-full appearance-none rounded-lg border-[1.5px] border-input px-4 pr-10 text-[15px] text-muted-foreground outline-none",
              inputSurface,
            )}
          >
            <option value="">Nenhum (em breve)</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <p className="text-xs leading-4 text-muted-foreground">
          Opcional — não adiciona participantes automaticamente
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor="fee"
            className="text-[13px] leading-4 font-semibold text-foreground"
          >
            Taxa %
          </label>
          <Input
            id="fee"
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className={cn("font-mono", inputSurface)}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor="cover"
            className="text-[13px] leading-4 font-semibold text-foreground"
          >
            Cover R$
          </label>
          <Input
            id="cover"
            inputMode="decimal"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            className={cn("font-mono", inputSurface)}
          />
        </div>
      </div>

      <Hint className="border-primary/22 bg-primary/10 py-3.5 text-[13px] leading-[18px] text-muted-foreground">
        Depois de criar, você recebe um código para convidar a mesa.
      </Hint>

      {variant === "page" ? (
        <>
          <div className="min-h-6 flex-1" />
          <Button
            type="submit"
            disabled={pending}
            className="h-14 w-full text-base font-bold"
          >
            {pending ? "Criando…" : "Criar recibo"}
          </Button>
        </>
      ) : (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="flex-1 text-[15px] font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="flex-[1.4] text-[15px] font-bold"
          >
            {pending ? "Criando…" : "Criar recibo"}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Paper create-receipt flow — mobile page + desktop modal + invite success. */
export function CreateReceiptFlow() {
  const router = useRouter();
  const [created, setCreated] = useState<Created | null>(null);

  function goToReceipt(id: Id<"receipts">) {
    router.replace(`/receipt/${id}`);
  }

  function cancel() {
    router.push("/receipts");
  }

  return (
    <>
      {/* Mobile: full page */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex items-center gap-3 px-5 py-3">
          <Link
            href="/receipts"
            aria-label="Voltar"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
          </Link>
          <h1 className="font-display text-[22px] leading-[34px] font-extrabold tracking-tight text-foreground">
            Novo recibo
          </h1>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-2 pb-6">
          <CreateForm
            variant="page"
            onCancel={cancel}
            onCreated={setCreated}
          />
        </div>

        {created ? (
          <div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center bg-background/72 p-6 backdrop-blur-[2px]",
              enter.scrim,
            )}
          >
            <div className={enter.modal}>
              <InviteSuccess
                created={created}
                onGo={() => goToReceipt(created.receiptId)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop: modal over app chrome */}
      <div
        className={cn(
          "fixed inset-0 z-50 hidden items-center justify-center bg-black/72 p-10 md:flex",
          enter.scrim,
        )}
      >
        {created ? (
          <div className={enter.modal}>
            <InviteSuccess
              created={created}
              onGo={() => goToReceipt(created.receiptId)}
            />
          </div>
        ) : (
          <div
            role="dialog"
            aria-modal
            aria-labelledby="create-receipt-title"
            className={cn(
              "flex w-full max-w-[520px] flex-col gap-6 rounded-2xl border border-border bg-card p-8",
              enter.modal,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xs leading-4 text-muted-foreground">
                  Novo recibo
                </p>
                <h2
                  id="create-receipt-title"
                  className="font-display text-[28px] leading-[34px] font-bold tracking-tight text-foreground"
                >
                  Criar recibo
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={cancel}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground"
              >
                <X className="size-3.5" strokeWidth={2.2} />
              </button>
            </div>
            <CreateForm
              variant="modal"
              onCancel={cancel}
              onCreated={setCreated}
            />
          </div>
        )}
      </div>
    </>
  );
}
