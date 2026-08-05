import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  createAccount,
  retrieveAccount,
  convexAuth,
} from "@convex-dev/auth/server";
import { Scrypt } from "lucia";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // ponytail: Password throws InvalidAccountId → Convex Server Error in console;
    // return null = fail without throw; UI maps !signingIn → mensagem
    ConvexCredentials({
      id: "password",
      async authorize(params, ctx) {
        const flow = params.flow as string;
        const email = params.email as string;
        const secret = params.password as string;

        if (flow === "signUp") {
          if (!secret || secret.length < 8) {
            throw new Error("Invalid password");
          }
          const { user } = await createAccount(ctx, {
            provider: "password",
            account: { id: email, secret },
            profile: {
              email,
              ...(typeof params.name === "string" && params.name
                ? { name: params.name }
                : {}),
            },
          });
          return { userId: user._id };
        }

        if (flow === "signIn") {
          if (!secret) return null;
          try {
            const { user } = await retrieveAccount(ctx, {
              provider: "password",
              account: { id: email, secret },
            });
            return { userId: user._id };
          } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (
              /InvalidAccountId|InvalidSecret|TooManyFailedAttempts/.test(msg)
            ) {
              return null;
            }
            throw e;
          }
        }

        throw new Error('Missing `flow` param, use "signIn" or "signUp"');
      },
      crypto: {
        hashSecret: (password) => new Scrypt().hash(password),
        verifySecret: (password, hash) => new Scrypt().verify(hash, password),
      },
    }),
  ],
});
