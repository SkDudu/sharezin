"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "code" | "confirm" | "waiting";

type Preview = {
  title: string;
  inviteCode: string;
  status: "open" | "closed";
  creatorName: string;
  participantCount: number;
};

/** Paper 9a–9c — entrar em recibo com convite (sheet mobile / modal desktop). */
export function JoinReceiptSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const requestJoin = useMutation(api.participants.requestJoin);

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [waiting, setWaiting] = useState<{
    title: string;
    creatorName: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const invitePreview = useQuery(
    api.receipts.getByInviteCode,
    open && lookupCode ? { inviteCode: lookupCode } : "skip",
  );

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
      setStep("code");
      setCode("");
      setLookupCode(null);
      setPreview(null);
      setWaiting(null);
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!lookupCode || invitePreview === undefined) return;
    if (invitePreview === null) {
      toast.error("Código inválido");
      setLookupCode(null);
      return;
    }
    if (invitePreview.status === "closed") {
      toast.error("Este recibo já foi fechado");
      setLookupCode(null);
      return;
    }
    setPreview({
      title: invitePreview.title,
      inviteCode: invitePreview.inviteCode,
      status: invitePreview.status,
      creatorName: invitePreview.creatorName,
      participantCount: invitePreview.participantCount,
    });
    setLookupCode(null);
    setStep("confirm");
  }, [invitePreview, lookupCode]);

  function resetToCode() {
    setStep("code");
    setCode("");
    setLookupCode(null);
    setPreview(null);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast.error("O código tem 6 caracteres");
      return;
    }
    setLookupCode(trimmed);
  }

  async function onRequestJoin() {
    if (!preview) return;
    setPending(true);
    try {
      const result = await requestJoin({
        inviteCode: preview.inviteCode,
      });
      if (result.alreadyMember) {
        onClose();
        router.push(`/receipt/${result.receiptId}`);
        return;
      }
      setWaiting({
        title: result.title,
        creatorName: result.creatorName,
      });
      setStep("waiting");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao pedir entrada");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const searching = lookupCode !== null && invitePreview === undefined;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-[#0C0C0D]/72 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="join-sheet-title"
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-6 rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-7 md:hidden",
          step === "waiting" && "items-center",
        )}
      >
        <div className="flex w-full items-center justify-center">
          <div className="h-1 w-9 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <JoinBody
          step={step}
          code={code}
          setCode={setCode}
          preview={preview}
          waiting={waiting}
          pending={pending || searching}
          onSearch={onSearch}
          onRequestJoin={onRequestJoin}
          onWrongCode={resetToCode}
          onDone={onClose}
          variant="sheet"
        />
      </div>

      {/* Desktop: centered modal */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="join-sheet-title"
        className={cn(
          "absolute top-1/2 left-1/2 hidden w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card md:flex",
          step === "waiting"
            ? "items-center gap-6 px-8 py-10"
            : "gap-7 p-8",
        )}
      >
        <JoinBody
          step={step}
          code={code}
          setCode={setCode}
          preview={preview}
          waiting={waiting}
          pending={pending || searching}
          onSearch={onSearch}
          onRequestJoin={onRequestJoin}
          onWrongCode={resetToCode}
          onDone={onClose}
          variant="modal"
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function JoinBody({
  step,
  code,
  setCode,
  preview,
  waiting,
  pending,
  onSearch,
  onRequestJoin,
  onWrongCode,
  onDone,
  variant,
  onClose,
}: {
  step: Step;
  code: string;
  setCode: (v: string) => void;
  preview: Preview | null;
  waiting: { title: string; creatorName: string } | null;
  pending: boolean;
  onSearch: (e: React.FormEvent) => void;
  onRequestJoin: () => void;
  onWrongCode: () => void;
  onDone: () => void;
  variant: "sheet" | "modal";
  onClose?: () => void;
}) {
  if (step === "waiting" && waiting) {
    return (
      <>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary",
            variant === "modal" ? "size-16" : "size-14",
          )}
        >
          <Clock
            className={cn(
              "text-primary-foreground",
              variant === "modal" ? "size-7" : "size-6",
            )}
            strokeWidth={2}
          />
        </div>

        <div
          className={cn(
            "flex w-full flex-col gap-2",
            variant === "modal" && "items-center gap-2.5 text-center",
          )}
        >
          <h2
            id="join-sheet-title"
            className={cn(
              "font-display font-extrabold tracking-tight text-foreground",
              variant === "modal"
                ? "text-[28px] leading-[34px]"
                : "text-[26px] leading-8",
            )}
          >
            Aguardando aprovação
          </h2>
          <p className="text-[15px] leading-[22px] text-muted-foreground">
            Pedimos entrada em {waiting.title}. {waiting.creatorName} precisa
            aprovar para você ver o recibo.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="text-[13px] leading-4 font-semibold text-foreground">
            Pedido pendente
          </span>
        </div>

        <div
          className={cn(
            "flex w-full flex-col gap-3",
            variant === "modal" && "pt-2",
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onDone}
            className="w-full font-bold"
          >
            Voltar aos recibos
          </Button>
          <p className="text-center text-[13px] leading-[18px] text-muted-foreground">
            Você será notificado quando for aprovado.
          </p>
        </div>
      </>
    );
  }

  if (step === "confirm" && preview) {
    return (
      <>
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h2
                id="join-sheet-title"
                className={cn(
                  "font-display font-extrabold tracking-tight text-foreground",
                  variant === "modal"
                    ? "text-[28px] leading-[34px]"
                    : "text-[26px] leading-8",
                )}
              >
                Confirmar entrada
              </h2>
              <p className="text-[15px] leading-[22px] text-muted-foreground">
                Encontramos este recibo com o código informado.
              </p>
            </div>
            {variant === "modal" && onClose ? (
              <CloseButton onClose={onClose} />
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex w-full flex-col rounded-xl border border-border bg-background",
            variant === "modal" ? "gap-4 p-5" : "gap-3.5 p-[18px]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                "min-w-0 grow font-display font-bold tracking-tight text-foreground",
                variant === "modal"
                  ? "text-xl leading-[26px]"
                  : "text-lg leading-6",
              )}
            >
              {preview.title}
            </p>
            <span className="flex shrink-0 items-center rounded-full bg-primary px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.04em] text-primary-foreground uppercase">
              {preview.status === "open" ? "Aberto" : "Fechado"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm leading-5 text-muted-foreground">
              Criado por {preview.creatorName} · {preview.participantCount}{" "}
              {preview.participantCount === 1 ? "pessoa" : "pessoas"}
            </p>
            <p className="font-mono text-[13px] leading-4 font-medium tracking-[0.08em] text-primary">
              {preview.inviteCode}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={() => void onRequestJoin()}
            className="w-full font-bold"
          >
            {pending ? "Enviando…" : "Pedir para entrar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={pending}
            onClick={onWrongCode}
            className={cn(
              "w-full font-semibold",
              variant === "modal" ? "h-11 text-[15px]" : "h-12 text-[15px]",
            )}
          >
            Código errado
          </Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={onSearch} className="flex w-full flex-col gap-6 md:gap-7">
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              id="join-sheet-title"
              className={cn(
                "font-display font-extrabold tracking-tight text-foreground",
                variant === "modal"
                  ? "text-[28px] leading-[34px]"
                  : "text-[26px] leading-8",
              )}
            >
              Entrar com código
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground">
              Cole o código de 6 caracteres que o dono compartilhou.
            </p>
          </div>
          {variant === "modal" && onClose ? (
            <CloseButton onClose={onClose} />
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <label
          htmlFor="join-invite-code"
          className="text-[13px] leading-4 font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Código do recibo
        </label>
        <input
          id="join-invite-code"
          value={code}
          onChange={(e) => {
            const next = e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 6);
            setCode(next);
          }}
          placeholder="······"
          autoComplete="off"
          autoFocus
          maxLength={6}
          spellCheck={false}
          className={cn(
            "w-full rounded-xl border-[1.5px] border-dashed border-primary bg-background text-center font-mono font-bold text-primary outline-none placeholder:text-primary/35",
            variant === "modal"
              ? "h-[72px] px-5 text-3xl leading-10 tracking-[0.2em]"
              : "h-[68px] px-4 text-[28px] leading-9 tracking-[0.18em]",
          )}
        />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={pending || code.trim().length !== 6}
          className="w-full font-bold"
        >
          {pending ? "Buscando…" : "Buscar recibo"}
        </Button>
        <p className="text-center text-[13px] leading-[18px] text-muted-foreground">
          O dono precisa aprovar sua entrada.
        </p>
      </div>
    </form>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Fechar"
      onClick={onClose}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
    >
      <X className="size-4" strokeWidth={2} />
    </button>
  );
}
