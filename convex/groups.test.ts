import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function seedUser(
  t: ReturnType<typeof convexTest>,
  name: string,
  email?: string,
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { name, email });
  });
  return {
    userId,
    as: t.withIdentity({ subject: `${userId}|test-session` }),
  };
}

describe("groups", () => {
  test("create → invite by email → join by code", async () => {
    const t = convexTest(schema, modules);
    const ana = await seedUser(t, "Ana", "ana@test.com");
    const bruno = await seedUser(t, "Bruno", "bruno@test.com");
    const carla = await seedUser(t, "Carla", "carla@test.com");

    const { groupId, inviteCode } = await ana.as.mutation(api.groups.create, {
      name: "Turma do Churrasco",
    });
    expect(inviteCode).toHaveLength(6);

    await ana.as.mutation(api.groups.inviteByEmail, {
      groupId,
      email: "bruno@test.com",
    });

    const joined = await carla.as.mutation(api.groups.joinByCode, {
      inviteCode,
    });
    expect(joined.name).toBe("Turma do Churrasco");
    expect(joined.memberCount).toBe(3);
    expect(joined.alreadyMember).toBe(false);

    const list = await ana.as.query(api.groups.listMine, {});
    expect(list).toHaveLength(1);
    expect(list[0].memberCount).toBe(3);

    await expect(
      bruno.as.mutation(api.groups.rename, {
        groupId,
        name: "Nope",
      }),
    ).rejects.toThrow(/creator/);

    await ana.as.mutation(api.groups.rename, {
      groupId,
      name: "Churras",
    });
    const renamed = await ana.as.query(api.groups.listMine, {});
    expect(renamed[0].name).toBe("Churras");
  });
});
