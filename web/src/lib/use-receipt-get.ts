"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";

/** Loads receipt; denied/missing → toast + /receipts. */
export function useReceiptGet(receiptId: Id<"receipts">) {
  const router = useRouter();
  const raw = useQuery(api.receipts.get, { receiptId });
  const bounced = useRef(false);

  useEffect(() => {
    if (raw === undefined || raw.access === "ok" || bounced.current) return;
    bounced.current = true;
    if (raw.reason === "removed") {
      toast.error("Você foi removido deste recibo");
    } else if (raw.reason === "not_found") {
      toast.error("Recibo não encontrado");
    }
    router.replace("/receipts");
  }, [raw, router]);

  if (raw === undefined || raw.access !== "ok") return undefined;
  return raw;
}
