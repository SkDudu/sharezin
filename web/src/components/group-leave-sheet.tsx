"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Paper G4b / P2 — confirm destructive (sheet mobile / modal desktop). */
export function GroupConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

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

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-[#0C0C0D]/72 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-confirm-title"
        className="absolute inset-x-0 bottom-0 flex flex-col gap-6 rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-7 md:hidden"
      >
        <div className="flex w-full items-center justify-center">
          <div className="h-1 w-9 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <ConfirmBody
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          pendingLabel={pendingLabel}
          pending={pending}
          onCancel={onClose}
          onConfirm={confirm}
        />
      </div>

      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-confirm-title-desktop"
        className="absolute top-1/2 left-1/2 hidden w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-2xl border border-border bg-card p-7 md:flex"
      >
        <ConfirmBody
          titleId="group-confirm-title-desktop"
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          pendingLabel={pendingLabel}
          pending={pending}
          onCancel={onClose}
          onConfirm={confirm}
        />
      </div>
    </div>
  );
}

function ConfirmBody({
  titleId = "group-confirm-title",
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  titleId?: string;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2
          id={titleId}
          className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.03em] text-foreground"
        >
          {title}
        </h2>
        <p className="text-[15px] leading-[22px] text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-[52px] w-full text-base font-bold"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? pendingLabel : confirmLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className={cn(
            "h-[52px] w-full border border-border text-base font-semibold",
          )}
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </>
  );
}

/** Paper G4b — sair do grupo. */
export function GroupLeaveSheet({
  open,
  groupName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  groupName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <GroupConfirmSheet
      open={open}
      title="Sair do grupo?"
      description={`Você deixa ${groupName}. Pode entrar de novo com o código.`}
      confirmLabel="Sair do grupo"
      pendingLabel="Saindo…"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
