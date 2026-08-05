import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireUser } from "./lib/auth";
import { uniqueGroupInviteCode } from "./lib/invite";

const memberDoc = v.object({
  membershipId: v.id("groupMembers"),
  userId: v.id("users"),
  displayName: v.string(),
  email: v.optional(v.string()),
  isMe: v.boolean(),
  isCreator: v.boolean(),
});

const groupListItem = v.object({
  _id: v.id("groups"),
  name: v.string(),
  inviteCode: v.string(),
  isCreator: v.boolean(),
  memberCount: v.number(),
  members: v.array(memberDoc),
});

function displayName(user: Doc<"users"> | null): string {
  return (
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "Alguém"
  );
}

async function getGroupMembership(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .unique();
}

async function requireGroupMember(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  const membership = await getGroupMembership(ctx, groupId, userId);
  if (!membership) throw new Error("Not a member of this group");
  return membership;
}

async function loadMembers(
  ctx: QueryCtx | MutationCtx,
  group: Doc<"groups">,
  me: Id<"users">,
) {
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", group._id))
    .take(200);
  const members = [];
  for (const m of memberships) {
    const user = await ctx.db.get(m.userId);
    members.push({
      membershipId: m._id,
      userId: m.userId,
      displayName: displayName(user),
      email: user?.email,
      isMe: m.userId === me,
      isCreator: group.creatorId === m.userId,
    });
  }
  members.sort((a, b) => {
    if (a.isCreator !== b.isCreator) return a.isCreator ? -1 : 1;
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, "pt");
  });
  return members;
}

export const listMine = query({
  args: {},
  returns: v.array(groupListItem),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);

    const out = [];
    for (const m of memberships) {
      const group = await ctx.db.get(m.groupId);
      if (!group) continue;
      const members = await loadMembers(ctx, group, userId);
      out.push({
        _id: group._id,
        name: group.name,
        inviteCode: group.inviteCode,
        isCreator: group.creatorId === userId,
        memberCount: members.length,
        members,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    return out;
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.object({
    groupId: v.id("groups"),
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Nome obrigatório");
    const inviteCode = await uniqueGroupInviteCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name,
      creatorId: userId,
      inviteCode,
    });
    await ctx.db.insert("groupMembers", { groupId, userId });
    return { groupId, inviteCode };
  },
});

export const rename = mutation({
  args: { groupId: v.id("groups"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.creatorId !== userId) {
      throw new Error("Only the creator can rename");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Nome obrigatório");
    await ctx.db.patch(args.groupId, { name });
    return null;
  },
});

export const remove = mutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.creatorId !== userId) {
      throw new Error("Only the creator can delete");
    }
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .take(500);
    for (const m of members) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.groupId);
    return null;
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("groupMembers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) throw new Error("Member not found");
    const group = await ctx.db.get(membership.groupId);
    if (!group) throw new Error("Group not found");
    if (group.creatorId !== userId) {
      throw new Error("Only the creator can remove members");
    }
    if (membership.userId === group.creatorId) {
      throw new Error("Cannot remove the creator");
    }
    await ctx.db.delete(args.membershipId);
    return null;
  },
});

/** Paper G4 — membro sai do grupo (criador usa remove). */
export const leave = mutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.creatorId === userId) {
      throw new Error("Criador não pode sair — exclua o grupo");
    }
    const membership = await requireGroupMember(ctx, args.groupId, userId);
    await ctx.db.delete(membership._id);
    return null;
  },
});

export const joinByCode = mutation({
  args: { inviteCode: v.string() },
  returns: v.object({
    groupId: v.id("groups"),
    name: v.string(),
    memberCount: v.number(),
    memberNames: v.array(v.string()),
    alreadyMember: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const code = args.inviteCode.trim().toUpperCase();
    const group = await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!group) throw new Error("Código inválido");

    const existing = await getGroupMembership(ctx, group._id, userId);
    if (!existing) {
      await ctx.db.insert("groupMembers", {
        groupId: group._id,
        userId,
      });
    }

    const members = await loadMembers(ctx, group, userId);
    return {
      groupId: group._id,
      name: group.name,
      memberCount: members.length,
      memberNames: members
        .filter((m) => !m.isMe)
        .map((m) => m.displayName),
      alreadyMember: !!existing,
    };
  },
});

export const inviteByEmail = mutation({
  args: { groupId: v.id("groups"), email: v.string() },
  returns: v.object({ displayName: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    await requireGroupMember(ctx, args.groupId, userId);

    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Email inválido");

    const users = await ctx.db.query("users").take(500);
    const target = users.find((u) => u.email?.toLowerCase() === email);
    if (!target) {
      throw new Error("Nenhum usuário com esse email no Sharezin");
    }
    if (target._id === userId) {
      throw new Error("Você já está no grupo");
    }

    const existing = await getGroupMembership(ctx, args.groupId, target._id);
    if (existing) throw new Error("Essa pessoa já está no grupo");

    await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: target._id,
    });
    return { displayName: displayName(target) };
  },
});
