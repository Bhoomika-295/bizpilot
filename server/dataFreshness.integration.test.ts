import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { businesses, transactions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getDataFreshness } from "./services/businessMetricEngine";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * This test uses a uniquely named, short-lived tenant and removes every row it
 * creates in the finally block. It is intentionally skipped when no database
 * connection is available, so the regular unit suite remains deterministic.
 */
describeIfDatabase("data freshness persistence integration", () => {
  let createdBusinessId: number | null = null;
  let createdTransactionId: number | null = null;

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdTransactionId !== null) {
      await db.delete(transactions).where(eq(transactions.id, createdTransactionId));
    }
    if (createdBusinessId !== null) {
      await db.delete(businesses).where(eq(businesses.id, createdBusinessId));
    }
  });

  it("reads the newer persisted transaction update as the dashboard timestamp", async () => {
    const db = await getDb();
    if (!db) return;

    const [owner] = await db.select({ id: users.id }).from(users).limit(1);
    if (!owner) return;

    const uniqueName = `Day4 freshness integration ${Date.now()}`;
    const [businessInsert] = await db.insert(businesses).values({
      userId: owner.id,
      name: uniqueName,
      currency: "USD",
      isDemo: false,
    });
    createdBusinessId = Number(businessInsert.insertId);

    const nowSeconds = Math.floor(Date.now() / 1000) * 1000;
    const initialUpdate = new Date(nowSeconds - 60_000);
    const [transactionInsert] = await db.insert(transactions).values({
      businessId: createdBusinessId,
      type: "sale",
      amount: "125.00",
      description: "Day 4 freshness integration record",
      transactionDate: initialUpdate,
      status: "completed",
      source: "integration-test",
      createdAt: initialUpdate,
      updatedAt: initialUpdate,
    });
    createdTransactionId = Number(transactionInsert.insertId);

    const beforeUpdate = await getDataFreshness(createdBusinessId);
    expect(beforeUpdate.lastUpdate?.getTime()).toBe(initialUpdate.getTime());

    const newerUpdate = new Date(nowSeconds + 60_000);
    await db
      .update(transactions)
      .set({ updatedAt: newerUpdate })
      .where(eq(transactions.id, createdTransactionId));

    const afterUpdate = await getDataFreshness(createdBusinessId);
    expect(afterUpdate.lastUpdate?.getTime()).toBeGreaterThan(
      beforeUpdate.lastUpdate?.getTime() ?? 0
    );
    expect(afterUpdate.lastUpdate?.getTime()).toBe(newerUpdate.getTime());
  });
});
