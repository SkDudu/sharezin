import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  assertCreator,
  assertReceiptOpen,
  getMembership,
  requireUser,
} from "./lib/auth";

export const requestJoin = mutation({
  args: { inviteCode: v.string() },
  returns: v.object({
    participantId: v.id("participants"),
    receiptId: v.id("receipts"),
    title: v.string(),
    creatorName: v.string(),
    alreadyMember: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const code = args.inviteCode.trim().toUpperCase();
    let receipt = await ctx.db
      .query("receipts")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!receipt) {
      receipt = await ctx.db
        .query("receipts")
        .withIndex("by_invite_code", (q) =>
          q.eq("inviteCode", args.inviteCode.trim().toLowerCase()),
        )
        .unique();
    }
    if (!receipt) throw new Error("Invalid invite code");
    assertReceiptOpen(receipt);

    const creator = await ctx.db.get(receipt.creatorId);
    const creatorName =
      creator?.name?.trim().split(/\s+/)[0] ||
      creator?.email?.split("@")[0] ||
      "O dono";

    const existing = await getMembership(ctx, receipt._id, userId);
    if (existing) {
      if (existing.status === "pending") {
        return {
          participantId: existing._id,
          receiptId: receipt._id,
          title: receipt.title,
          creatorName,
          alreadyMember: false,
        };
      }
      if (existing.status === "removed") {
        await ctx.db.patch(existing._id, { status: "pending", paid: false });
        return {
          participantId: existing._id,
          receiptId: receipt._id,
          title: receipt.title,
          creatorName,
          alreadyMember: false,
        };
      }
      if (existing.status === "active" || existing.status === "closed") {
        return {
          participantId: existing._id,
          receiptId: receipt._id,
          title: receipt.title,
          creatorName,
          alreadyMember: true,
        };
      }
      throw new Error("Already a member of this receipt");
    }

    const participantId = await ctx.db.insert("participants", {
      receiptId: receipt._id,
      userId,
      status: "pending",
      paid: false,
    });
    return {
      participantId,
      receiptId: receipt._id,
      title: receipt.title,
      creatorName,
      alreadyMember: false,
    };
  },
});

export const approveJoin = mutation({
  args: { participantId: v.id("participants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const receipt = await ctx.db.get(participant.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    if (participant.status !== "pending") {
      throw new Error("Participant is not pending");
    }
    await ctx.db.patch(args.participantId, { status: "active" });
    return null;
  },
});

export const rejectJoin = mutation({
  args: { participantId: v.id("participants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const receipt = await ctx.db.get(participant.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    if (participant.status !== "pending") {
      throw new Error("Participant is not pending");
    }
    await ctx.db.delete(args.participantId);
    return null;
  },
});

export const closeMine = mutation({
  args: { receiptId: v.id("receipts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await getMembership(ctx, args.receiptId, userId);
    if (!participant || participant.status !== "active") {
      throw new Error("No active participation to close");
    }
    await ctx.db.patch(participant._id, { status: "closed" });
    return null;
  },
});

export const closeOther = mutation({
  args: { participantId: v.id("participants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const receipt = await ctx.db.get(participant.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    if (participant.status !== "active") {
      throw new Error("Participant is not active");
    }
    await ctx.db.patch(args.participantId, { status: "closed" });
    return null;
  },
});

export const remove = mutation({
  args: {
    participantId: v.id("participants"),
    disposition: v.union(
      v.object({ kind: v.literal("deleteItems") }),
      v.object({
        kind: v.literal("redistribute"),
        toParticipantId: v.id("participants"),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const receipt = await ctx.db.get(participant.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    if (participant.userId === receipt.creatorId) {
      throw new Error("Cannot remove the creator");
    }
    if (participant.status !== "active" && participant.status !== "closed") {
      throw new Error("Participant cannot be removed");
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_participant", (q) =>
        q.eq("participantId", args.participantId),
      )
      .collect();
    const live = items.filter((i) => !i.deletedAt);

    if (args.disposition.kind === "redistribute") {
      const to = await ctx.db.get(args.disposition.toParticipantId);
      if (!to || to.receiptId !== participant.receiptId) {
        throw new Error("Target participant not found");
      }
      if (to._id === participant._id) {
        throw new Error("Cannot redistribute to the same participant");
      }
      if (to.status !== "active" && to.status !== "closed") {
        throw new Error("Target participant is not active");
      }
      for (const item of live) {
        await ctx.db.patch(item._id, { participantId: to._id });
      }
    } else {
      const now = Date.now();
      for (const item of live) {
        await ctx.db.patch(item._id, {
          deletedAt: now,
          deletedBy: userId,
        });
        const reqs = await ctx.db
          .query("itemDeleteRequests")
          .withIndex("by_item", (q) => q.eq("itemId", item._id))
          .take(10);
        for (const req of reqs) {
          if (req.status === "pending") {
            await ctx.db.patch(req._id, { status: "rejected" });
          }
        }
      }
    }

    await ctx.db.patch(args.participantId, { status: "removed" });
    return null;
  },
});

export const setPaid = mutation({
  args: {
    participantId: v.id("participants"),
    paid: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const receipt = await ctx.db.get(participant.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    await ctx.db.patch(args.participantId, { paid: args.paid });
    return null;
  },
});
