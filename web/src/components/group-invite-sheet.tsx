"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Paper G1 — convidar para o grupo (código + email). */
export function GroupInviteSheet({
  open,
  onClose,
  groupId,
  groupName,
  inviteCode,
}: {
  open: boolean;
  onClose: () => void;
  groupId: Id<"groups">;
  groupName: string;
  inviteCode: string;
}) {
  const inviteByEmail = useMutation(api.groups.inviteByEmail);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
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
    if (!open) {
      setEmail("");
      setCopied(false);
      setPending(false);
    }
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast("Código copiado");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await inviteByEmail({ groupId, email });
      toast.success(`${result.displayName} entrou no grupo`);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao convidar");
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

      {/* Mobile sheet */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-invite-title"
        className="absolute inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-7 md:hidden"
      >
        <div className="flex w-full items-center justify-center">
          <div className="h-1 w-9 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <InviteBody
          groupName={groupName}
          inviteCode={inviteCode}
          email={email}
          setEmail={setEmail}
          copied={copied}
          pending={pending}
          onCopy={() => void copy()}
          onInvite={onInvite}
        />
      </div>

      {/* Desktop modal */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-invite-title"
        className="absolute top-1/2 left-1/2 hidden w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-2xl border border-border bg-card p-8 md:flex"
      >
        <InviteBody
          groupName={groupName}
          inviteCode={inviteCode}
          email={email}
          setEmail={setEmail}
          copied={copied}
          pending={pending}
          onCopy={() => void copy()}
          onInvite={onInvite}
          onClose={onClose}
          desktop
        />
      </div>
    </div>
  );
}

function InviteBody({
  groupName,
  inviteCode,
  email,
  setEmail,
  copied,
  pending,
  onCopy,
  onInvite,
  onClose,
  desktop,
}: {
  groupName: string;
  inviteCode: string;
  email: string;
  setEmail: (v: string) => void;
  copied: boolean;
  pending: boolean;
  onCopy: () => void;
  onInvite: (e: React.FormEvent) => void;
  onClose?: () => void;
  desktop?: boolean;
}) {
  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              id="group-invite-title"
              className={cn(
                "font-display font-extrabold tracking-tight text-foreground",
                desktop
                  ? "text-[28px] leading-[34px]"
                  : "text-[26px] leading-8",
              )}
            >
              Convidar para o grupo
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground">
              {groupName} — compartilhe o código ou envie por email.
            </p>
          </div>
          {desktop && onClose ? (
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-primary bg-background",
          desktop ? "p-5" : "p-[18px]",
        )}
      >
        <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Código do grupo
        </p>
        <p
          className={cn(
            "font-mono font-bold tracking-[0.16em] text-primary",
            desktop
              ? "text-3xl leading-10 tracking-[0.18em]"
              : "text-[28px] leading-[34px]",
          )}
        >
          {inviteCode}
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onCopy}
        className="w-full gap-2 font-bold"
      >
        {copied ? (
          <Check className="size-[18px]" strokeWidth={2.2} />
        ) : (
          <Copy className="size-[18px]" strokeWidth={2} />
        )}
        {copied ? "Copiado!" : "Copiar código"}
      </Button>

      <div className="flex w-full items-center gap-3">
        <div className="h-px grow bg-border" />
        <span className="shrink-0 text-xs leading-4 font-semibold tracking-wide text-muted-foreground uppercase">
          ou por email
        </span>
        <div className="h-px grow bg-border" />
      </div>

      <form onSubmit={onInvite} className="flex w-full flex-col gap-2.5">
        <label
          htmlFor="group-invite-email"
          className="text-[13px] leading-4 font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Email
        </label>
        <Input
          id="group-invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bruno@email.com"
          autoComplete="email"
          className="h-[52px] rounded-xl bg-background"
        />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={pending || !email.trim()}
          className="mt-1 h-12 w-full text-[15px] font-semibold"
        >
          {pending ? "Enviando…" : "Enviar convite"}
        </Button>
      </form>
    </>
  );
}
