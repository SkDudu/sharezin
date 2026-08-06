"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enter, exit, io } from "@/lib/motion";
import { useExitPresence } from "@/lib/use-exit-presence";
import { cn } from "@/lib/utils";

/** Desktop modal — criar grupo (Paper: CTA “Novo grupo” na sidebar). */
export function GroupCreateModal({
  open,
  onClose,
  onCreated,
  onJoinInstead,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: Id<"groups">) => void;
  onJoinInstead?: () => void;
}) {
  const create = useMutation(api.groups.create);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { show, exiting } = useExitPresence(open);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [show, open, onClose]);

  useEffect(() => {
    if (!open) {
      setName("");
      setPending(false);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Nome obrigatório");
      return;
    }
    setPending(true);
    try {
      const { groupId } = await create({ name: trimmed });
      onCreated(groupId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setPending(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 hidden items-center justify-center md:flex">
      <button
        type="button"
        aria-label="Fechar"
        className={cn(
          "absolute inset-0 bg-[#0C0C0D]/72 backdrop-blur-[2px]",
          io(exiting, enter.scrim, exit.scrim),
        )}
        onClick={onClose}
        disabled={exiting}
      />
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal
        aria-labelledby="group-create-title"
        className={cn(
          "relative flex w-full max-w-[440px] flex-col gap-6 rounded-2xl border border-border bg-card p-8",
          io(exiting, enter.modal, exit.modal),
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              id="group-create-title"
              className="font-display text-[28px] leading-[34px] font-extrabold tracking-tight text-foreground"
            >
              Novo grupo
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground">
              Turma fixa pra vários recibos.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <label
            htmlFor="group-create-name"
            className="text-[13px] leading-4 font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Nome do grupo
          </label>
          <Input
            ref={inputRef}
            id="group-create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Turma do Churrasco"
            className="h-12 rounded-xl bg-background"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full font-bold"
          >
            {pending ? "Criando…" : "Criar grupo"}
          </Button>
          {onJoinInstead ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onJoinInstead();
              }}
              className="text-center text-[13px] leading-[18px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Entrar com código
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
