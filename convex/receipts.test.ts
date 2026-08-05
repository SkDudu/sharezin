import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function seedUser(t: ReturnType<typeof convexTest>, name: string) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { name });
  });
  return {
    userId,
    as: t.withIdentity({ subject: `${userId}|test-session` }),
  };
}

describe("authz checklist", () => {
  test("pending cannot get; closed can get but not add; removed cannot get", async () => {
    const t = convexTest(schema, modules);
    const creator = await seedUser(t, "creator");
    const other = await seedUser(t, "other");

    const { receiptId } = await creator.as.mutation(api.receipts.create, {
      title: "Mesa",
      serviceFeePercent: 10,
      coverPerPersonCents: 100,
    });
    const invite = await t.run(async (ctx) => {
      const r = await ctx.db.get(receiptId);
      return r!.inviteCode;
    });

    const { participantId: pendingId } = await other.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );
    expect(await other.as.query(api.receipts.get, { receiptId })).toEqual({
      access: "denied",
      reason: "forbidden",
    });

    await creator.as.mutation(api.participants.approveJoin, {
      participantId: pendingId,
    });
    await other.as.mutation(api.items.add, {
      receiptId,
      name: "Cerveja",
      amountCents: 1000,
    });
    await other.as.mutation(api.participants.closeMine, { receiptId });

    const closedView = await other.as.query(api.receipts.get, { receiptId });
    expect(closedView.access).toBe("ok");
    if (closedView.access === "ok") {
      expect(closedView.receipt.title).toBe("Mesa");
    }
    await expect(
      other.as.mutation(api.items.add, {
        receiptId,
        name: "Extra",
        amountCents: 100,
      }),
    ).rejects.toThrow(/active/);

    await creator.as.mutation(api.participants.remove, {
      participantId: pendingId,
      disposition: { kind: "deleteItems" },
    });
    expect(await other.as.query(api.receipts.get, { receiptId })).toEqual({
      access: "denied",
      reason: "removed",
    });
  });

  test("non-creator blocked from close/setPaid/approveJoin/resolveDelete", async () => {
    const t = convexTest(schema, modules);
    const creator = await seedUser(t, "creator");
    const member = await seedUser(t, "member");
    const joiner = await seedUser(t, "joiner");

    const { receiptId } = await creator.as.mutation(api.receipts.create, {
      title: "Mesa",
      serviceFeePercent: 0,
      coverPerPersonCents: 0,
    });
    const invite = await t.run(async (ctx) => {
      return (await ctx.db.get(receiptId))!.inviteCode;
    });
    const { participantId: memberPid } = await member.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );
    await creator.as.mutation(api.participants.approveJoin, {
      participantId: memberPid,
    });

    const { participantId: joinPid } = await joiner.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );

    await expect(
      member.as.mutation(api.receipts.close, { receiptId }),
    ).rejects.toThrow(/creator/);
    await expect(
      member.as.mutation(api.participants.setPaid, {
        participantId: memberPid,
        paid: true,
      }),
    ).rejects.toThrow(/creator/);
    await expect(
      member.as.mutation(api.participants.approveJoin, {
        participantId: joinPid,
      }),
    ).rejects.toThrow(/creator/);

    const itemId = await member.as.mutation(api.items.add, {
      receiptId,
      name: "Item",
      amountCents: 500,
    });
    const reqId = await member.as.mutation(api.items.requestDelete, { itemId });
    await expect(
      member.as.mutation(api.items.resolveDeleteRequest, {
        requestId: reqId,
        approve: true,
      }),
    ).rejects.toThrow(/creator/);
  });

  test("remove deleteItems soft-deletes; redistribute moves items", async () => {
    const t = convexTest(schema, modules);
    const creator = await seedUser(t, "creator");
    const member = await seedUser(t, "member");
    const other = await seedUser(t, "other");

    const { receiptId } = await creator.as.mutation(api.receipts.create, {
      title: "Mesa",
      serviceFeePercent: 10,
      coverPerPersonCents: 100,
    });
    const invite = await t.run(async (ctx) => {
      return (await ctx.db.get(receiptId))!.inviteCode;
    });
    const { participantId: memberPid } = await member.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );
    await creator.as.mutation(api.participants.approveJoin, {
      participantId: memberPid,
    });
    const { participantId: otherPid } = await other.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );
    await creator.as.mutation(api.participants.approveJoin, {
      participantId: otherPid,
    });
    await member.as.mutation(api.items.add, {
      receiptId,
      name: "Burger",
      amountCents: 2000,
    });

    await creator.as.mutation(api.participants.remove, {
      participantId: memberPid,
      disposition: {
        kind: "redistribute",
        toParticipantId: otherPid,
      },
    });

    const afterMove = await creator.as.query(api.receipts.get, { receiptId });
    expect(afterMove.access).toBe("ok");
    if (afterMove.access !== "ok") throw new Error("expected ok");
    expect(
      afterMove.totals.byParticipant.find((r) => r.participantId === otherPid)
        ?.consumoCents,
    ).toBe(2000);
    expect(
      afterMove.totals.byParticipant.find((r) => r.participantId === memberPid),
    ).toMatchObject({ status: "removed", consumoCents: 0 });

    await other.as.mutation(api.items.add, {
      receiptId,
      name: "Fries",
      amountCents: 500,
    });
    await creator.as.mutation(api.participants.remove, {
      participantId: otherPid,
      disposition: { kind: "deleteItems" },
    });
    const afterDelete = await creator.as.query(api.receipts.get, { receiptId });
    expect(afterDelete.access).toBe("ok");
    if (afterDelete.access !== "ok") throw new Error("expected ok");
    expect(
      afterDelete.totals.byParticipant.find((r) => r.participantId === otherPid),
    ).toMatchObject({ status: "removed", consumoCents: 0 });

    await creator.as.mutation(api.receipts.close, { receiptId });
    await expect(
      creator.as.mutation(api.receipts.update, {
        receiptId,
        title: "Nope",
      }),
    ).rejects.toThrow(/closed/);
  });

  test("happy path create → join → approve → items → totals → close", async () => {
    const t = convexTest(schema, modules);
    const creator = await seedUser(t, "creator");
    const member = await seedUser(t, "member");

    const { receiptId } = await creator.as.mutation(api.receipts.create, {
      title: "Happy",
      serviceFeePercent: 10,
      coverPerPersonCents: 50,
    });
    const invite = await t.run(async (ctx) => {
      return (await ctx.db.get(receiptId))!.inviteCode;
    });
    const { participantId: pid } = await member.as.mutation(
      api.participants.requestJoin,
      { inviteCode: invite },
    );
    await creator.as.mutation(api.participants.approveJoin, {
      participantId: pid,
    });
    await creator.as.mutation(api.items.add, {
      receiptId,
      name: "A",
      amountCents: 1000,
    });
    await member.as.mutation(api.items.add, {
      receiptId,
      name: "B",
      amountCents: 500,
    });

    const view = await member.as.query(api.receipts.get, { receiptId });
    expect(view.access).toBe("ok");
    if (view.access !== "ok") throw new Error("expected ok");
    expect(view.totals.consumoTotalCents).toBe(1500);
    expect(view.totals.taxaTotalCents).toBe(150);
    expect(view.totals.coverTotalCents).toBe(100);
    expect(view.totals.grandTotalCents).toBe(1750);
    expect(view.participants.every((p) => p.status !== "pending")).toBe(true);

    await creator.as.mutation(api.receipts.close, { receiptId });
    const closed = await creator.as.query(api.receipts.get, { receiptId });
    expect(closed.access).toBe("ok");
    if (closed.access !== "ok") throw new Error("expected ok");
    expect(closed.receipt.status).toBe("closed");
  });
});
