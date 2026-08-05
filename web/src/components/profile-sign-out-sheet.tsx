"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Paper P2 — confirmar sair (bottom sheet mobile / modal desktop). */
export function ProfileSignOutSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
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

      {/* Mobile bottom sheet */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="sign-out-title"
        className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-2xl border-t border-border bg-card px-5 pt-4 pb-7 md:hidden"
      >
        <div className="flex w-full justify-center pt-1">
          <div className="h-1 w-10 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <SignOutBody
          pending={pending}
          onCancel={onClose}
          onConfirm={confirm}
        />
      </div>

      {/* Desktop centered modal */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="sign-out-title-desktop"
        className="absolute top-1/2 left-1/2 hidden w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-card px-5 pt-4 pb-7 md:flex"
      >
        <div className="flex w-full justify-center pt-1">
          <div className="h-1 w-10 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <SignOutBody
          titleId="sign-out-title-desktop"
          pending={pending}
          onCancel={onClose}
          onConfirm={confirm}
        />
      </div>
    </div>
  );
}

function SignOutBody({
  titleId = "sign-out-title",
  pending,
  onCancel,
  onConfirm,
}: {
  titleId?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2
          id={titleId}
          className="font-display text-[22px] leading-7 font-bold tracking-tight text-foreground"
        >
          Sair da conta?
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Você vai precisar entrar de novo para ver seus recibos e grupos.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="w-full text-[15px]"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Saindo…" : "Sair"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn("w-full text-[15px] font-semibold")}
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </>
  );
}
