import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  receipts: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    serviceFeePercent: v.number(),
    coverPerPersonCents: v.number(),
    inviteCode: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
  })
    .index("by_creator", ["creatorId"])
    .index("by_invite_code", ["inviteCode"]),

  participants: defineTable({
    receiptId: v.id("receipts"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("closed"),
      v.literal("removed"),
    ),
    paid: v.boolean(),
  })
    .index("by_receipt", ["receiptId"])
    .index("by_user", ["userId"])
    .index("by_receipt_user", ["receiptId", "userId"]),

  items: defineTable({
    receiptId: v.id("receipts"),
    participantId: v.id("participants"),
    name: v.string(),
    amountCents: v.number(),
    // ponytail: soft-delete for audit trail; absent = active
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
  })
    .index("by_receipt", ["receiptId"])
    .index("by_participant", ["participantId"]),

  itemDeleteRequests: defineTable({
    receiptId: v.id("receipts"),
    itemId: v.id("items"),
    requesterId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  })
    .index("by_receipt_status", ["receiptId", "status"])
    .index("by_item", ["itemId"]),

  groups: defineTable({
    name: v.string(),
    creatorId: v.id("users"),
    inviteCode: v.string(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_invite_code", ["inviteCode"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),
});
