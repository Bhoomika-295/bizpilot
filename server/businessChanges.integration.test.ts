import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { businesses, transactions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("business change detection persistence integration", () => {
  let createdBusinessId: number | null = null;
  const createdTransactionIds: number[] = [];

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdTransactionIds.length > 0) {
      await db
        .delete(transactions)
        .where(inArray(transactions.id, createdTransactionIds));
    }
    if (createdBusinessId !== null) {
      await db.delete(businesses).where(eq(businesses.id, createdBusinessId));
    }
  });

  it("changes the protected getChanges output after a persisted transaction update", { timeout: 10000 }, async () => {
    const db = await getDb();
    if (!db) return;

    const [owner] = await db.select().from(users).limit(1);
    if (!owner) return;

    const [businessInsert] = await db.insert(businesses).values({
      userId: owner.id,
      name: `Day5 change integration ${Date.now()}`,
      currency: "USD",
      isDemo: false,
    });
    createdBusinessId = Number(businessInsert.insertId);

    const previousPeriodDate = new Date("2025-12-15T12:00:00.000Z");
    const currentPeriodDate = new Date("2026-01-15T12:00:00.000Z");
    const periodStartDate = new Date("2026-01-01T00:00:00.000Z");
    const periodEndDate = new Date("2026-02-01T00:00:00.000Z");

    const [previousTransactionInsert] = await db.insert(transactions).values({
      businessId: createdBusinessId,
      type: "sale",
      amount: "100.00",
      description: "Day 5 previous-period transaction",
      transactionDate: previousPeriodDate,
      status: "completed",
      source: "integration-test",
      createdAt: previousPeriodDate,
      updatedAt: previousPeriodDate,
    });
    createdTransactionIds.push(Number(previousTransactionInsert.insertId));

    const [currentTransactionInsert] = await db.insert(transactions).values({
      businessId: createdBusinessId,
      type: "sale",
      amount: "100.00",
      description: "Day 5 current-period transaction",
      transactionDate: currentPeriodDate,
      status: "completed",
      source: "integration-test",
      createdAt: currentPeriodDate,
      updatedAt: currentPeriodDate,
    });
    const currentTransactionId = Number(currentTransactionInsert.insertId);
    createdTransactionIds.push(currentTransactionId);

    const caller = appRouter.createCaller({
      user: owner,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    const beforeUpdate = await caller.businessMetrics.getChanges({
      businessId: createdBusinessId,
      periodStartDate,
      periodEndDate,
    });
    expect(beforeUpdate.status).toBe("no_significant_changes");
    expect(beforeUpdate.changes).toHaveLength(0);

    await db
      .update(transactions)
      .set({
        amount: "200.00",
        updatedAt: new Date("2026-01-16T12:00:00.000Z"),
      })
      .where(eq(transactions.id, currentTransactionId));

    const afterUpdate = await caller.businessMetrics.getChanges({
      businessId: createdBusinessId,
      periodStartDate,
      periodEndDate,
    });
    expect(afterUpdate.status).toBe("changes_detected");
    expect(afterUpdate.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "revenue",
          direction: "increase",
          absoluteChange: 100,
          priority: "HIGH",
        }),
      ])
    );
  });
});
