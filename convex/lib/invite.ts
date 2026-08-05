import type { MutationCtx } from "../_generated/server";

/** Paper: 6-char codes, skip ambiguous I/O/0/1. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function uniqueInviteCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const existing = await ctx.db
      .query("receipts")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Could not generate invite code");
}

export async function uniqueGroupInviteCode(
  ctx: MutationCtx,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Could not generate group invite code");
}
