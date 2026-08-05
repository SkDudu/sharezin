import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export function assertCreator(
  receipt: Doc<"receipts">,
  userId: Id<"users">,
): void {
  if (receipt.creatorId !== userId) {
    throw new Error("Only the creator can do this");
  }
}

export function assertReceiptOpen(receipt: Doc<"receipts">): void {
  if (receipt.status !== "open") {
    throw new Error("Receipt is closed");
  }
}

/** Creator, or participant active|closed. */
export function assertCanView(
  receipt: Doc<"receipts">,
  userId: Id<"users">,
  participant: Doc<"participants"> | null,
): void {
  if (receipt.creatorId === userId) {
    return;
  }
  if (
    participant &&
    (participant.status === "active" || participant.status === "closed")
  ) {
    return;
  }
  throw new Error("Not allowed to view this receipt");
}

export function assertActiveOpen(
  receipt: Doc<"receipts">,
  participant: Doc<"participants">,
): void {
  assertReceiptOpen(receipt);
  if (participant.status !== "active") {
    throw new Error("Only active participants can add items");
  }
}

export async function getMembership(
  ctx: Ctx,
  receiptId: Id<"receipts">,
  userId: Id<"users">,
): Promise<Doc<"participants"> | null> {
  return await ctx.db
    .query("participants")
    .withIndex("by_receipt_user", (q) =>
      q.eq("receiptId", receiptId).eq("userId", userId),
    )
    .unique();
}
