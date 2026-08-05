import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  assertActiveOpen,
  assertCreator,
  assertReceiptOpen,
  getMembership,
  requireUser,
} from "./lib/auth";

export const add = mutation({
  args: {
    receiptId: v.id("receipts"),
    name: v.string(),
    amountCents: v.number(),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("amountCents must be a positive integer");
    }
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    const participant = await getMembership(ctx, args.receiptId, userId);
    if (!participant) throw new Error("Not a participant");
    assertActiveOpen(receipt, participant);
    return await ctx.db.insert("items", {
      receiptId: args.receiptId,
      participantId: participant._id,
      name: args.name,
      amountCents: args.amountCents,
    });
  },
});

export const requestDelete = mutation({
  args: { itemId: v.id("items") },
  returns: v.id("itemDeleteRequests"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const receipt = await ctx.db.get(item.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertReceiptOpen(receipt);
    const participant = await getMembership(ctx, item.receiptId, userId);
    if (!participant || participant._id !== item.participantId) {
      throw new Error("Only the item owner can request deletion");
    }
    if (item.deletedAt) throw new Error("Item already deleted");
    const existing = await ctx.db
      .query("itemDeleteRequests")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .take(10);
    const pending = existing.find((r) => r.status === "pending");
    if (pending) return pending._id;

    return await ctx.db.insert("itemDeleteRequests", {
      receiptId: item.receiptId,
      itemId: item._id,
      requesterId: userId,
      status: "pending",
    });
  },
});

/** Creator soft-deletes any item on an open receipt (keeps row for audit). */
export const remove = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.deletedAt) throw new Error("Item already deleted");
    const receipt = await ctx.db.get(item.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    assertReceiptOpen(receipt);
    await ctx.db.patch(args.itemId, {
      deletedAt: Date.now(),
      deletedBy: userId,
    });
    return null;
  },
});


export const resolveDeleteRequest = mutation({
  args: {
    requestId: v.id("itemDeleteRequests"),
    approve: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }
    const receipt = await ctx.db.get(request.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);

    if (args.approve) {
      const item = await ctx.db.get(request.itemId);
      if (item && !item.deletedAt) {
        await ctx.db.patch(request.itemId, {
          deletedAt: Date.now(),
          deletedBy: userId,
        });
      }
      await ctx.db.patch(args.requestId, { status: "approved" });
    } else {
      await ctx.db.patch(args.requestId, { status: "rejected" });
    }
    return null;
  },
});
