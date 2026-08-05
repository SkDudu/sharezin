import {
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";

import { api } from "./_generated/api";
import { action } from "./_generated/server";

/** Logged-in password change — verify current, set new. Keeps session. */
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const me = await ctx.runQuery(api.users.me, {});
    if (!me?.email) throw new Error("Email não encontrado");

    if (args.newPassword.length < 8) {
      throw new Error("A nova senha precisa ter no mínimo 8 caracteres");
    }

    let retrieved;
    try {
      retrieved = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: me.email, secret: args.currentPassword },
      });
    } catch {
      throw new Error("Senha atual incorreta");
    }

    if (retrieved.user._id !== userId) {
      throw new Error("Senha atual incorreta");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: me.email, secret: args.newPassword },
    });
    return null;
  },
});
