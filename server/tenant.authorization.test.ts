import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "tenant-test-user",
    email: "tenant@example.com",
    name: "Tenant Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("tenant authorization", () => {
  it("rejects access to a business the user does not own", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.business.get({ businessId: 999999999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  });

  it("rejects health-score access to a business the user does not own", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.businessMetrics.getHealthScore({
        businessId: 999999999,
        periodStartDate: new Date("2026-01-01T00:00:00.000Z"),
        periodEndDate: new Date("2026-01-31T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  });

  it("rejects freshness access to a business the user does not own", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.businessMetrics.getDataFreshness({ businessId: 999999999 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  });

  it("rejects internal change access to a business the user does not own", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.businessMetrics.getChanges({
        businessId: 999999999,
        periodStartDate: new Date("2026-01-01T00:00:00.000Z"),
        periodEndDate: new Date("2026-01-31T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  });

  it("rejects competitor list access to a business the user does not own", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.competitors.list({ businessId: 999999999 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  });

  it("does not expose missing records through record-scoped routes", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.customers.get({ customerId: 999999999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Record not found.",
    });

    await expect(caller.competitors.get({ competitorId: 999999999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Record not found.",
    });
  });
});
