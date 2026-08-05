import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  assertCreator,
  assertReceiptOpen,
  getMembership,
  requireUser,
} from "./lib/auth";
import { uniqueInviteCode } from "./lib/invite";
import { computeTotals } from "./lib/money";

const receiptDoc = v.object({
  _id: v.id("receipts"),
  _creationTime: v.number(),
  creatorId: v.id("users"),
  title: v.string(),
  serviceFeePercent: v.number(),
  coverPerPersonCents: v.number(),
  inviteCode: v.string(),
  status: v.union(v.literal("open"), v.literal("closed")),
});

const participantDoc = v.object({
  _id: v.id("participants"),
  _creationTime: v.number(),
  receiptId: v.id("receipts"),
  userId: v.id("users"),
  status: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("closed"),
    v.literal("removed"),
  ),
  paid: v.boolean(),
  displayName: v.string(),
});

const itemDoc = v.object({
  _id: v.id("items"),
  _creationTime: v.number(),
  receiptId: v.id("receipts"),
  participantId: v.id("participants"),
  name: v.string(),
  amountCents: v.number(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
});

const deleteRequestDoc = v.object({
  _id: v.id("itemDeleteRequests"),
  _creationTime: v.number(),
  receiptId: v.id("receipts"),
  itemId: v.id("items"),
  requesterId: v.id("users"),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
  ),
});

const totalsValidator = v.object({
  byParticipant: v.array(
    v.object({
      participantId: v.id("participants"),
      userId: v.id("users"),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("closed"),
        v.literal("removed"),
      ),
      paid: v.boolean(),
      consumoCents: v.number(),
      taxaCents: v.number(),
      coverCents: v.number(),
      totalCents: v.number(),
    }),
  ),
  consumoTotalCents: v.number(),
  taxaTotalCents: v.number(),
  coverTotalCents: v.number(),
  grandTotalCents: v.number(),
});

export const create = mutation({
  args: {
    title: v.string(),
    serviceFeePercent: v.number(),
    coverPerPersonCents: v.number(),
  },
  returns: v.object({
    receiptId: v.id("receipts"),
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (args.serviceFeePercent < 0 || args.coverPerPersonCents < 0) {
      throw new Error("Amounts must be non-negative");
    }
    if (!Number.isInteger(args.coverPerPersonCents)) {
      throw new Error("coverPerPersonCents must be an integer");
    }
    const inviteCode = await uniqueInviteCode(ctx);
    const receiptId = await ctx.db.insert("receipts", {
      creatorId: userId,
      title: args.title,
      serviceFeePercent: args.serviceFeePercent,
      coverPerPersonCents: args.coverPerPersonCents,
      inviteCode,
      status: "open",
    });
    await ctx.db.insert("participants", {
      receiptId,
      userId,
      status: "active",
      paid: false,
    });
    return { receiptId, inviteCode };
  },
});

export const update = mutation({
  args: {
    receiptId: v.id("receipts"),
    title: v.optional(v.string()),
    serviceFeePercent: v.optional(v.number()),
    coverPerPersonCents: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    assertReceiptOpen(receipt);
    if (args.serviceFeePercent !== undefined && args.serviceFeePercent < 0) {
      throw new Error("serviceFeePercent must be non-negative");
    }
    if (args.coverPerPersonCents !== undefined) {
      if (args.coverPerPersonCents < 0) {
        throw new Error("coverPerPersonCents must be non-negative");
      }
      if (!Number.isInteger(args.coverPerPersonCents)) {
        throw new Error("coverPerPersonCents must be an integer");
      }
    }
    const patch: {
      title?: string;
      serviceFeePercent?: number;
      coverPerPersonCents?: number;
    } = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.serviceFeePercent !== undefined) {
      patch.serviceFeePercent = args.serviceFeePercent;
    }
    if (args.coverPerPersonCents !== undefined) {
      patch.coverPerPersonCents = args.coverPerPersonCents;
    }
    await ctx.db.patch(args.receiptId, patch);
    return null;
  },
});

async function loadMine(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"receipts">[]> {
  const created = await ctx.db
    .query("receipts")
    .withIndex("by_creator", (q) => q.eq("creatorId", userId))
    .take(100);
  const memberships = await ctx.db
    .query("participants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(100);
  const byId = new Map(created.map((r) => [r._id, r]));
  for (const m of memberships) {
    if (m.status !== "active" && m.status !== "closed") continue;
    if (byId.has(m.receiptId)) continue;
    const receipt = await ctx.db.get(m.receiptId);
    if (receipt) byId.set(receipt._id, receipt);
  }
  return [...byId.values()];
}

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("receipts"),
      _creationTime: v.number(),
      creatorId: v.id("users"),
      title: v.string(),
      serviceFeePercent: v.number(),
      coverPerPersonCents: v.number(),
      inviteCode: v.string(),
      status: v.union(v.literal("open"), v.literal("closed")),
      isCreator: v.boolean(),
      participantCount: v.number(),
      totalCents: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const receipts = await loadMine(ctx, userId);
    const enriched = [];
    for (const receipt of receipts) {
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .take(200);
      const items = await ctx.db
        .query("items")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .take(500);
      const totals = computeTotals(receipt, participants, items);
      enriched.push({
        ...receipt,
        isCreator: receipt.creatorId === userId,
        participantCount: participants.filter(
          (p) => p.status === "active" || p.status === "closed",
        ).length,
        totalCents: totals.grandTotalCents,
      });
    }
    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** Stats + 12-month series for a selected year. */
export const dashboardStats = query({
  args: { year: v.number() },
  returns: v.object({
    totalSpentCents: v.number(),
    receiptCount: v.number(),
    averageCents: v.number(),
    openCount: v.number(),
    years: v.array(v.number()),
    latestOpen: v.union(
      v.object({
        _id: v.id("receipts"),
        title: v.string(),
        totalCents: v.number(),
        participantCount: v.number(),
      }),
      v.null(),
    ),
    byMonth: v.array(
      v.object({
        month: v.string(),
        totalCents: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const receipts = await loadMine(ctx, userId);
    const year = Math.trunc(args.year);

    const monthKeys: string[] = [];
    const monthLabels: string[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1);
      monthKeys.push(`${year}-${m}`);
      monthLabels.push(
        d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      );
    }
    const bucket = new Map(monthKeys.map((k) => [k, 0]));
    const yearSet = new Set<number>([new Date().getFullYear()]);

    let totalSpentCents = 0;
    let receiptCount = 0;
    let openCount = 0;
    let latestOpenId: Id<"receipts"> | null = null;
    let latestOpenTitle = "";
    let latestTime = -1;

    for (const receipt of receipts) {
      const created = new Date(receipt._creationTime);
      yearSet.add(created.getFullYear());

      if (receipt.status === "open") {
        openCount += 1;
        if (receipt._creationTime > latestTime) {
          latestTime = receipt._creationTime;
          latestOpenId = receipt._id;
          latestOpenTitle = receipt.title;
        }
      }

      if (created.getFullYear() !== year) continue;

      const participants = await ctx.db
        .query("participants")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .take(200);
      const items = await ctx.db
        .query("items")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .take(500);
      const totals = computeTotals(receipt, participants, items);
      const mine = totals.byParticipant.find((r) => r.userId === userId);
      if (!mine) continue;

      receiptCount += 1;
      totalSpentCents += mine.totalCents;
      const key = `${year}-${created.getMonth()}`;
      bucket.set(key, (bucket.get(key) ?? 0) + mine.totalCents);
    }

    let latestOpen: {
      _id: Id<"receipts">;
      title: string;
      totalCents: number;
      participantCount: number;
    } | null = null;

    if (latestOpenId) {
      const receipt = await ctx.db.get(latestOpenId);
      if (receipt) {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_receipt", (q) => q.eq("receiptId", latestOpenId))
          .take(200);
        const items = await ctx.db
          .query("items")
          .withIndex("by_receipt", (q) => q.eq("receiptId", latestOpenId))
          .take(500);
        const totals = computeTotals(receipt, participants, items);
        latestOpen = {
          _id: latestOpenId,
          title: latestOpenTitle,
          totalCents: totals.grandTotalCents,
          participantCount: participants.filter(
            (p) => p.status === "active" || p.status === "closed",
          ).length,
        };
      }
    }

    return {
      totalSpentCents,
      receiptCount,
      averageCents:
        receiptCount === 0 ? 0 : Math.round(totalSpentCents / receiptCount),
      openCount,
      years: [...yearSet].sort((a, b) => b - a),
      latestOpen,
      byMonth: monthKeys.map((key, i) => ({
        month: monthLabels[i]!,
        totalCents: bucket.get(key) ?? 0,
      })),
    };
  },
});

const getOk = v.object({
  access: v.literal("ok"),
  receipt: receiptDoc,
  participants: v.array(participantDoc),
  items: v.array(itemDoc),
  totals: totalsValidator,
  pendingDeleteRequests: v.array(deleteRequestDoc),
});

const getDenied = v.object({
  access: v.literal("denied"),
  reason: v.union(
    v.literal("not_found"),
    v.literal("removed"),
    v.literal("forbidden"),
  ),
});

export const get = query({
  args: { receiptId: v.id("receipts") },
  returns: v.union(getOk, getDenied),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return { access: "denied" as const, reason: "not_found" as const };
    const me = await getMembership(ctx, args.receiptId, userId);
    if (receipt.creatorId !== userId) {
      if (me?.status === "removed") {
        return { access: "denied" as const, reason: "removed" as const };
      }
      if (me?.status !== "active" && me?.status !== "closed") {
        return { access: "denied" as const, reason: "forbidden" as const };
      }
    }

    const isCreator = receipt.creatorId === userId;
    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .take(200);

    const participants = isCreator
      ? allParticipants
      : allParticipants.filter(
          (p) => p.status === "active" || p.status === "closed",
        );

    const participantsWithNames = [];
    for (const p of participants) {
      const user = await ctx.db.get(p.userId);
      const displayName =
        user?.name?.trim() ||
        user?.email?.split("@")[0] ||
        "Convidado";
      participantsWithNames.push({ ...p, displayName });
    }

    const allItems = await ctx.db
      .query("items")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .take(500);

    const visibleParticipantIds = new Set(participants.map((p) => p._id));
    // totals always from full set (removed items count); filter display items
    const totals = computeTotals(receipt, allParticipants, allItems);
    const items = isCreator
      ? allItems
      : allItems.filter((i) => visibleParticipantIds.has(i.participantId));

    const visibleTotals = isCreator
      ? totals
      : (() => {
          const byParticipant = totals.byParticipant.filter(
            (t) => t.status === "active" || t.status === "closed",
          );
          const consumoTotalCents = byParticipant.reduce(
            (s, r) => s + r.consumoCents,
            0,
          );
          const taxaTotalCents = byParticipant.reduce(
            (s, r) => s + r.taxaCents,
            0,
          );
          const coverTotalCents = byParticipant.reduce(
            (s, r) => s + r.coverCents,
            0,
          );
          return {
            byParticipant,
            consumoTotalCents,
            taxaTotalCents,
            coverTotalCents,
            grandTotalCents: consumoTotalCents + taxaTotalCents + coverTotalCents,
          };
        })();

    const pendingDeleteRequests = isCreator
      ? await ctx.db
          .query("itemDeleteRequests")
          .withIndex("by_receipt_status", (q) =>
            q.eq("receiptId", args.receiptId).eq("status", "pending"),
          )
          .take(100)
      : [];

    return {
      access: "ok" as const,
      receipt,
      participants: participantsWithNames,
      items,
      totals: visibleTotals,
      pendingDeleteRequests,
    };
  },
});

export const close = mutation({
  args: { receiptId: v.id("receipts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");
    assertCreator(receipt, userId);
    await ctx.db.patch(args.receiptId, { status: "closed" });
    return null;
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  returns: v.union(
    v.object({
      receiptId: v.id("receipts"),
      title: v.string(),
      inviteCode: v.string(),
      status: v.union(v.literal("open"), v.literal("closed")),
      creatorName: v.string(),
      participantCount: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const code = args.inviteCode.trim().toUpperCase();
    const receipt = await ctx.db
      .query("receipts")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!receipt) {
      // legacy lowercase codes
      const legacy = await ctx.db
        .query("receipts")
        .withIndex("by_invite_code", (q) =>
          q.eq("inviteCode", args.inviteCode.trim().toLowerCase()),
        )
        .unique();
      if (!legacy) return null;
      return enrichInvitePreview(ctx, legacy);
    }
    return enrichInvitePreview(ctx, receipt);
  },
});

async function enrichInvitePreview(
  ctx: QueryCtx,
  receipt: Doc<"receipts">,
) {
  const creator = await ctx.db.get(receipt.creatorId);
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
    .take(200);
  return {
    receiptId: receipt._id,
    title: receipt.title,
    inviteCode: receipt.inviteCode,
    status: receipt.status,
    creatorName:
      creator?.name?.trim().split(/\s+/)[0] ||
      creator?.email?.split("@")[0] ||
      "Alguém",
    participantCount: participants.filter(
      (p) => p.status === "active" || p.status === "closed",
    ).length,
  };
}
