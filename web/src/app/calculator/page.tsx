"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, parseReais } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; amountCents: number };

// ponytail: browser-only draft; Convex receipts when user saves
const STORAGE_KEY = "sharezin:calc";

export default function CalculatorPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [feePercent, setFeePercent] = useState("10");
  const [cover, setCover] = useState("0");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as {
          items?: Item[];
          feePercent?: string;
          cover?: string;
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate draft from localStorage once
        if (Array.isArray(data.items)) setItems(data.items);
        if (typeof data.feePercent === "string") setFeePercent(data.feePercent);
        if (typeof data.cover === "string") setCover(data.cover);
      }
    } catch {
      // corrupt draft — start empty
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, feePercent, cover }),
    );
  }, [ready, items, feePercent, cover]);

  const consumoCents = items.reduce((s, i) => s + i.amountCents, 0);
  const fee = Number(feePercent.replace(",", ".")) || 0;
  const coverCents = Math.max(
    0,
    Math.round((Number(cover.replace(",", ".")) || 0) * 100),
  );
  const taxaCents = Math.round((consumoCents * fee) / 100);
  const totalCents = consumoCents + taxaCents + coverCents;

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseReais(amount);
    const trimmed = name.trim();
    if (!trimmed || cents === null) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, amountCents: cents },
    ]);
    setName("");
    setAmount("");
  }

  function clearDraft() {
    setItems([]);
    setName("");
    setAmount("");
    setFeePercent("10");
    setCover("0");
    localStorage.removeItem(STORAGE_KEY);
  }

  const hasDraft = items.length > 0 || feePercent !== "10" || cover !== "0";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Sharezin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Calculadora
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasDraft}
          onClick={clearDraft}
        >
          Limpar
        </Button>
      </header>

      <form
        onSubmit={addItem}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="item-name" className="text-sm font-medium">
            Consumo
          </label>
          <Input
            id="item-name"
            placeholder="Ex: cerveja"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-28">
          <label htmlFor="item-amount" className="text-sm font-medium">
            Valor (R$)
          </label>
          <Input
            id="item-amount"
            inputMode="decimal"
            placeholder="12,50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="sm:mb-px">
          Adicionar
        </Button>
      </form>

      <ul className="mt-6 divide-y divide-border">
        {items.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            Nenhum consumo ainda.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="min-w-0 truncate text-sm">{item.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm tabular-nums">
                  {brl(item.amountCents)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={`Remover ${item.name}`}
                  onClick={() =>
                    setItems((prev) => prev.filter((i) => i.id !== item.id))
                  }
                >
                  Remover
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fee" className="text-sm font-medium">
            Taxa de serviço (%)
          </label>
          <Input
            id="fee"
            inputMode="decimal"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cover" className="text-sm font-medium">
            Cover (R$)
          </label>
          <Input
            id="cover"
            inputMode="decimal"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
          />
        </div>
      </div>

      <dl className="mt-8 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Consumo</dt>
          <dd className="tabular-nums">{brl(consumoCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Taxa</dt>
          <dd className="tabular-nums">{brl(taxaCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Cover</dt>
          <dd className="tabular-nums">{brl(coverCents)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{brl(totalCents)}</dd>
        </div>
      </dl>

      {/* ponytail: save-as-receipt deferred */}
      {!isLoading && !isAuthenticated ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Quer guardar o recibo?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Entre na conta
          </Link>
        </p>
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link
            href="/receipt/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Criar recibo no app
          </Link>
        </p>
      )}
    </div>
  );
}
