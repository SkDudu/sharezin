import type { Doc, Id } from "../_generated/dataModel";

export type ParticipantTotal = {
  participantId: Id<"participants">;
  userId: Id<"users">;
  status: Doc<"participants">["status"];
  paid: boolean;
  consumoCents: number;
  taxaCents: number;
  coverCents: number;
  totalCents: number;
};

export type TotalsResult = {
  byParticipant: ParticipantTotal[];
  consumoTotalCents: number;
  taxaTotalCents: number;
  coverTotalCents: number;
  grandTotalCents: number;
};

export function computeTotals(
  receipt: Doc<"receipts">,
  participants: Doc<"participants">[],
  items: Doc<"items">[],
): TotalsResult {
  const consumoByParticipant = new Map<Id<"participants">, number>();
  for (const item of items) {
    if (item.deletedAt) continue;
    consumoByParticipant.set(
      item.participantId,
      (consumoByParticipant.get(item.participantId) ?? 0) + item.amountCents,
    );
  }

  const rows: ParticipantTotal[] = [];
  for (const p of participants) {
    if (
      p.status !== "active" &&
      p.status !== "closed" &&
      p.status !== "removed"
    ) {
      continue;
    }
    const consumoCents = consumoByParticipant.get(p._id) ?? 0;
    const taxaCents = Math.round(
      (consumoCents * receipt.serviceFeePercent) / 100,
    );
    const coverCents =
      p.status === "removed" || p.paid ? 0 : receipt.coverPerPersonCents;
    rows.push({
      participantId: p._id,
      userId: p.userId,
      status: p.status,
      paid: p.paid,
      consumoCents,
      taxaCents,
      coverCents,
      totalCents: consumoCents + taxaCents + coverCents,
    });
  }

  // ponytail: absorb tax rounding drift on last cover-eligible (else last row)
  const consumoTotalCents = rows.reduce((s, r) => s + r.consumoCents, 0);
  const expectedTax = Math.round(
    (consumoTotalCents * receipt.serviceFeePercent) / 100,
  );
  const taxSum = rows.reduce((s, r) => s + r.taxaCents, 0);
  const taxDiff = expectedTax - taxSum;
  if (taxDiff !== 0 && rows.length > 0) {
    let idx = rows.length - 1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (
        (rows[i].status === "active" || rows[i].status === "closed") &&
        !rows[i].paid
      ) {
        idx = i;
        break;
      }
    }
    rows[idx].taxaCents += taxDiff;
    rows[idx].totalCents += taxDiff;
  }

  const taxaTotalCents = rows.reduce((s, r) => s + r.taxaCents, 0);
  const coverTotalCents = rows.reduce((s, r) => s + r.coverCents, 0);
  return {
    byParticipant: rows,
    consumoTotalCents,
    taxaTotalCents,
    coverTotalCents,
    grandTotalCents: consumoTotalCents + taxaTotalCents + coverTotalCents,
  };
}

/** Minimal self-check for the money path. */
export function assertMoneySelfCheck(): void {
  const receipt = {
    serviceFeePercent: 10,
    coverPerPersonCents: 100,
  } as Doc<"receipts">;
  const p1 = {
    _id: "p1" as Id<"participants">,
    userId: "u1" as Id<"users">,
    status: "active" as const,
    paid: false,
  } as Doc<"participants">;
  const p2 = {
    _id: "p2" as Id<"participants">,
    userId: "u2" as Id<"users">,
    status: "active" as const,
    paid: false,
  } as Doc<"participants">;
  const items = [
    {
      participantId: p1._id,
      amountCents: 1000,
    } as Doc<"items">,
    {
      participantId: p2._id,
      amountCents: 500,
    } as Doc<"items">,
    {
      participantId: p1._id,
      amountCents: 9999,
      deletedAt: 1,
    } as Doc<"items">,
  ];
  const t = computeTotals(receipt, [p1, p2], items);
  if (t.byParticipant[0].taxaCents !== 100) throw new Error("tax p1");
  if (t.byParticipant[0].coverCents !== 100) throw new Error("cover p1");
  if (t.byParticipant[0].totalCents !== 1200) throw new Error("total p1");
  if (t.byParticipant[1].totalCents !== 650) throw new Error("total p2");
  if (t.grandTotalCents !== 1850) throw new Error("grand");
}

assertMoneySelfCheck();
