"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { enter, exit, io } from "@/lib/motion";
import { useExitPresence } from "@/lib/use-exit-presence";
import { cn } from "@/lib/utils";

type Joined = {
  groupId: Id<"groups">;
  name: string;
  memberCount: number;
  memberNames: string[];
};

function formatMemberList(names: string[]) {
  const others = names.filter(Boolean);
  if (others.length === 0) return "";
  if (others.length === 1) return others[0];
  if (others.length === 2) return `${others[0]} e ${others[1]}`;
  const head = others.slice(0, -1).join(", ");
  return `${head} e ${others[others.length - 1]}`;
}

/** Paper G2–G3 — entrar no grupo por código + sucesso. */
export function GroupJoinSheet({
  open,
  onClose,
  onViewGroup,
}: {
  open: boolean;
  onClose: () => void;
  onViewGroup: (groupId: Id<"groups">) => void;
}) {
  const joinByCode = useMutation(api.groups.joinByCode);
  const [step, setStep] = useState<"code" | "joined">("code");
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState<Joined | null>(null);
  const [pending, setPending] = useState(false);
  const { show, exiting } = useExitPresence(open);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [show, open, onClose]);

  useEffect(() => {
    if (!open) {
      setStep("code");
      setCode("");
      setJoined(null);
      setPending(false);
    }
  }, [open]);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast.error("O código tem 6 caracteres");
      return;
    }
    setPending(true);
    try {
      const result = await joinByCode({ inviteCode: trimmed });
      setJoined({
        groupId: result.groupId,
        name: result.name,
        memberCount: result.memberCount,
        memberNames: result.memberNames,
      });
      setStep("joined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setPending(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50">
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

      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-join-title"
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-7 md:hidden",
          io(exiting, enter.sheet, exit.sheet),
          step === "joined" ? "items-center gap-5" : "gap-6",
        )}
      >
        <div className="flex w-full items-center justify-center">
          <div className="h-1 w-9 shrink-0 rounded-full bg-neutral-600" />
        </div>
        <JoinBody
          step={step}
          code={code}
          setCode={setCode}
          joined={joined}
          pending={pending}
          onJoin={onJoin}
          onView={() => {
            if (!joined) return;
            onViewGroup(joined.groupId);
            onClose();
          }}
          onDone={onClose}
        />
      </div>

      <div
        role="dialog"
        aria-modal
        aria-labelledby="group-join-title"
        className={cn(
          "absolute top-1/2 left-1/2 hidden w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card md:flex",
          io(exiting, enter.modal, exit.modal),
          step === "joined"
            ? "items-center gap-6 px-8 py-10"
            : "gap-7 p-8",
        )}
      >
        <JoinBody
          step={step}
          code={code}
          setCode={setCode}
          joined={joined}
          pending={pending}
          onJoin={onJoin}
          onView={() => {
            if (!joined) return;
            onViewGroup(joined.groupId);
            onClose();
          }}
          onDone={onClose}
          onClose={onClose}
          desktop
        />
      </div>
    </div>
  );
}

function JoinBody({
  step,
  code,
  setCode,
  joined,
  pending,
  onJoin,
  onView,
  onDone,
  onClose,
  desktop,
}: {
  step: "code" | "joined";
  code: string;
  setCode: (v: string) => void;
  joined: Joined | null;
  pending: boolean;
  onJoin: (e: React.FormEvent) => void;
  onView: () => void;
  onDone: () => void;
  onClose?: () => void;
  desktop?: boolean;
}) {
  if (step === "joined" && joined) {
    const others = joined.memberNames.filter((n) => n);
    const withText =
      others.length > 0
        ? ` com ${formatMemberList(others)}`
        : "";

    return (
      <>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary",
            desktop ? "size-16" : "size-14",
          )}
        >
          <Check
            className={cn(
              "text-primary-foreground",
              desktop ? "size-7" : "size-6",
            )}
            strokeWidth={2.5}
          />
        </div>

        <div
          className={cn(
            "flex w-full flex-col items-center gap-2 text-center",
            desktop && "gap-2.5",
          )}
        >
          <h2
            id="group-join-title"
            className={cn(
              "font-display font-extrabold tracking-tight text-foreground",
              desktop
                ? "text-[28px] leading-[34px]"
                : "text-[26px] leading-8",
            )}
          >
            Você entrou
          </h2>
          <p className="text-[15px] leading-[22px] text-muted-foreground">
            Agora faz parte de {joined.name}
            {withText}.
          </p>
        </div>

        <div className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {joined.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-[15px] leading-[18px] font-semibold text-foreground">
              {joined.name}
            </p>
            <p className="text-[13px] leading-4 text-muted-foreground">
              {joined.memberCount}{" "}
              {joined.memberCount === 1 ? "participante" : "participantes"}
            </p>
          </div>
        </div>

        <div className={cn("flex w-full flex-col gap-2.5", desktop && "gap-3 pt-1")}>
          <Button
            type="button"
            size="lg"
            onClick={onView}
            className="w-full font-bold"
          >
            Ver grupo
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onDone}
            className={cn(
              "w-full font-semibold",
              desktop ? "h-11 text-[15px]" : "h-12 text-[15px]",
            )}
          >
            Voltar aos grupos
          </Button>
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={onJoin}
      className={cn("flex w-full flex-col", desktop ? "gap-7" : "gap-6")}
    >
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              id="group-join-title"
              className={cn(
                "font-display font-extrabold tracking-tight text-foreground",
                desktop
                  ? "text-[28px] leading-[34px]"
                  : "text-[26px] leading-8",
              )}
            >
              Entrar no grupo
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground">
              Cole o código de 6 caracteres para entrar na turma.
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

      <div className="flex w-full flex-col gap-2.5">
        <label
          htmlFor="group-join-code"
          className="text-[13px] leading-4 font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Código do grupo
        </label>
        <input
          id="group-join-code"
          value={code}
          onChange={(e) => {
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6),
            );
          }}
          placeholder="······"
          autoComplete="off"
          autoFocus
          maxLength={6}
          spellCheck={false}
          className={cn(
            "w-full rounded-xl border-[1.5px] border-dashed border-primary bg-background text-center font-mono font-bold text-primary outline-none placeholder:text-primary/35",
            desktop
              ? "h-[72px] px-5 text-3xl leading-10 tracking-[0.2em]"
              : "h-[68px] text-[28px] leading-[34px] tracking-[0.18em]",
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
          {pending ? "Entrando…" : "Entrar no grupo"}
        </Button>
        <p className="text-center text-[13px] leading-[18px] text-muted-foreground">
          A entrada é imediata — sem aprovação.
        </p>
      </div>
    </form>
  );
}
