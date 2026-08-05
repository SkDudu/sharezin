"use client";

import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { ChevronLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Input } from "@/components/ui/input";

/** Paper P1 — trocar senha (página mobile / modal desktop). */
export function ProfileChangePassword({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const changePassword = useAction(api.account.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPending(false);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha precisa ter no mínimo 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Senha atualizada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar senha");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Mobile: full page */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
        <header className="flex items-center gap-3 px-5 pt-2 pb-4">
          <button
            type="button"
            aria-label="Voltar"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
          </button>
          <h1 className="font-display text-[28px] leading-[34px] font-bold tracking-tight text-foreground">
            Trocar senha
          </h1>
        </header>
        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6"
        >
          <PasswordFields
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            inputClassName="bg-card"
          />
          <div className="min-h-6 flex-1" />
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full text-base"
            disabled={pending}
          >
            {pending ? "Salvando…" : "Salvar senha"}
          </Button>
        </form>
      </div>

      {/* Desktop: centered modal */}
      <div className="fixed inset-0 z-50 hidden items-center justify-center p-10 md:flex">
        <button
          type="button"
          aria-label="Fechar"
          className="absolute inset-0 bg-black/72"
          onClick={onClose}
        />
        <form
          onSubmit={onSubmit}
          role="dialog"
          aria-modal
          aria-labelledby="change-password-title"
          className="relative flex w-full max-w-[520px] flex-col gap-6 rounded-2xl border border-border bg-card p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-xs leading-4 text-muted-foreground">
                Segurança
              </p>
              <h2
                id="change-password-title"
                className="font-display text-[28px] leading-[34px] font-bold tracking-tight text-foreground"
              >
                Trocar senha
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground"
            >
              <X className="size-3.5" strokeWidth={2.2} />
            </button>
          </div>
          <PasswordFields
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            inputClassName="bg-background"
          />
          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-0 flex-1 text-[15px] font-semibold"
              disabled={pending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="min-w-0 flex-[1.4] text-[15px]"
              disabled={pending}
            >
              {pending ? "Salvando…" : "Salvar senha"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function PasswordFields({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  inputClassName,
}: {
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  inputClassName?: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="current-password"
          className="text-[13px] leading-4 font-semibold text-foreground"
        >
          Senha atual
        </label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="new-password"
          className="text-[13px] leading-4 font-semibold text-foreground"
        >
          Nova senha
        </label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className={inputClassName}
        />
        <p className="text-xs leading-4 text-muted-foreground">
          Mínimo 8 caracteres
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirm-password"
          className="text-[13px] leading-4 font-semibold text-foreground"
        >
          Confirmar nova senha
        </label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className={inputClassName}
        />
      </div>
      <Hint>
        Depois de salvar, você continua logado neste dispositivo.
      </Hint>
    </>
  );
}
