"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";

import { LogoLockup, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export type AuthMode = "signIn" | "signUp" | "reset";

const copy = {
  signIn: {
    title: "Bem-vindo de volta",
    subtitle: "Entre para dividir contas com seu grupo.",
    submit: "Entrar",
    pending: "Entrando…",
    footerLead: "Novo por aqui?",
    footerLink: { href: "/register", label: "Criar conta" },
  },
  signUp: {
    title: "Criar conta",
    subtitle: "Preencha os dados para começar a dividir recibos.",
    submit: "Criar Conta",
    pending: "Criando…",
    footerLead: "Já tem conta?",
    footerLink: { href: "/login", label: "Entrar" },
  },
  reset: {
    title: "Esqueceu a senha?",
    subtitle: "Informe seu email e enviamos um link para redefinir.",
    submit: "Enviar link",
    pending: "Enviando…",
    footerLead: "Lembrou?",
    footerLink: { href: "/login", label: "Voltar ao login" },
  },
} as const;

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[13px] leading-4 font-medium text-foreground"
        >
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

function ReceiptPreview() {
  return (
    <div className="flex w-[280px] flex-col gap-4 rounded-2xl bg-primary p-6">
      <p className="text-xs leading-4 font-medium text-primary-foreground/70">
        Churrasco Sábado
      </p>
      <p className="font-mono text-3xl leading-10 font-bold tracking-tight text-primary-foreground">
        R$ 386,40
      </p>
      <div className="flex gap-2">
        <span className="flex h-7 items-center rounded-full bg-primary-foreground/14 px-3 text-xs font-semibold text-primary-foreground">
          4 pessoas
        </span>
        <span className="flex h-7 items-center rounded-full bg-primary-foreground/14 px-3 text-xs font-semibold text-primary-foreground">
          Aberto
        </span>
      </div>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  // ponytail: don't unmount form when auth flickers isLoading (mobile loses pending)
  const booted = useRef(false);
  if (!isLoading) booted.current = true;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const t = copy[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  if (isLoading && !booted.current) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ponytail: length stays on Convex Password; client only rejects blank
    if (mode !== "reset" && password.trim() === "") {
      toast.error("Informe a senha");
      return;
    }
    if (mode === "signUp") {
      if (password.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres");
        return;
      }
      if (password !== confirm) {
        toast.error("As senhas não coincidem");
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "reset") {
        // ponytail: needs Password({ reset }) + email provider; UI still ships
        try {
          await signIn("password", { email, flow: "reset" });
        } catch {
          /* always show success copy — don't leak account existence */
        }
        setResetSent(true);
        return;
      }

      const result = await signIn("password", {
        email,
        password,
        flow: mode,
        ...(mode === "signUp" && name ? { name } : {}),
      });
      // ponytail: Password can resolve { signingIn: false } instead of throw
      if (!result.signingIn) {
        toast.error("Credenciais incorretas, tente novamente");
      } else {
        router.replace("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        /InvalidAccountId|InvalidSecret|Invalid credentials/.test(msg)
          ? "Credenciais incorretas, tente novamente"
          : /Invalid password|InvalidPassword/.test(msg)
            ? "A senha deve ter pelo menos 8 caracteres"
            : "Não foi possível autenticar. Tente novamente",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid overflow-auto bg-background md:grid-cols-[minmax(22rem,480px)_1fr]">
      <div className="relative flex flex-col justify-start px-6 pt-6 pb-10 sm:justify-center sm:px-10 md:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-16 size-[220px] rounded-full bg-primary/15 blur-3xl md:hidden"
        />

        <div className="relative mx-auto flex w-full max-w-[336px] flex-col gap-8">
          {/* Mobile brand + theme */}
          <div className="flex flex-col gap-4 md:gap-3.5">
            <div className="flex items-center justify-between md:hidden">
              <LogoLockup markSize={28} />
              <ThemeToggle />
            </div>

            <div className="flex flex-col gap-2.5 md:gap-3.5">
              <div className="hidden items-center gap-2 md:flex">
                <LogoMark size={20} />
                <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  Sharezin
                </p>
              </div>
              <h1 className="font-display text-[36px] leading-[1.1] font-extrabold tracking-[-0.03em] text-foreground md:text-4xl md:leading-[1.08]">
                {t.title}
              </h1>
              <p className="text-[15px] leading-normal text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
          </div>

          {mode === "reset" && resetSent ? (
            <Hint>
              Se existir conta para <strong>{email}</strong>, enviamos o link.
              Expira em 15 minutos — confira também o spam.
            </Hint>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              {mode === "signUp" ? (
                <Field id="name" label="Nome">
                  <InputGroup>
                    <InputGroupInput
                      id="name"
                      autoComplete="name"
                      placeholder="Ana Silva"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </InputGroup>
                </Field>
              ) : null}

              <Field id="email" label="Email">
                <InputGroup>
                  <InputGroupInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </InputGroup>
              </Field>

              {mode !== "reset" ? (
                <Field
                  id="password"
                  label="Senha"
                  hint={
                    mode === "signIn" ? (
                      <Link
                        href="/forgot"
                        className="text-[13px] leading-4 font-medium text-muted-foreground hover:text-foreground"
                      >
                        Esqueceu?
                      </Link>
                    ) : null
                  }
                >
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "signIn" ? "current-password" : "new-password"
                      }
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        className="size-9 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              ) : null}

              {mode === "signUp" ? (
                <Field id="confirm" label="Confirmar senha">
                  <InputGroup>
                    <InputGroupInput
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </InputGroup>
                </Field>
              ) : null}

              {mode === "reset" ? (
                <p className="text-[13px] leading-[1.45] text-muted-foreground">
                  O link expira em 15 minutos. Confira também o spam.
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="w-full font-semibold active:scale-[0.98]"
              >
                {pending ? t.pending : t.submit}
              </Button>
            </form>
          )}

          <p className="flex items-center justify-center gap-1.5 pt-2 text-sm text-muted-foreground">
            {t.footerLead}{" "}
            <Link
              href={t.footerLink.href}
              className="font-semibold text-primary"
            >
              {t.footerLink.label}
            </Link>
          </p>
        </div>
      </div>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-card md:flex md:flex-col md:justify-between md:px-16 md:py-14"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[120px] -right-20 size-[420px] rounded-full bg-primary opacity-[0.14]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-[100px] size-[380px] rounded-full bg-primary opacity-[0.08]"
        />

        <div className="relative flex items-start justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Divida · Calcule · Feche
          </p>
          <ThemeToggle className="relative" />
        </div>

        <div className="relative flex max-w-[520px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-[48px] leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
              Cada um paga o que consumiu.
            </h2>
            <p className="max-w-[380px] text-base leading-[1.55] text-muted-foreground">
              Itens individuais, taxa proporcional e cover dividido — o recibo
              fecha sozinho.
            </p>
          </div>
          <ReceiptPreview />
        </div>
      </aside>
    </div>
  );
}
