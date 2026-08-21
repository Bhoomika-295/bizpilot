import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getCustomersForBusiness: vi.fn(),
  getProductsForBusiness: vi.fn(),
  getTransactionsForBusiness: vi.fn(),
  getExpensesForBusiness: vi.fn(),
}));

const businessDataMocks = vi.hoisted(() => ({
  verifyBusinessOwnership: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./services/businessDataService", () => businessDataMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user?: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function user(id: number): AuthenticatedUser {
  return {
    id,
    openId: `csv-export-user-${id}`,
    email: `user-${id}@example.com`,
    name: `CSV Export User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("CSV export routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessDataMocks.verifyBusinessOwnership.mockResolvedValue({ id: 42 });
    dbMocks.getCustomersForBusiness.mockResolvedValue([
      {
        id: 2,
        businessId: 42,
        name: "Customer One",
        email: "customer@example.com",
        phone: null,
        status: "active",
        totalSpent: "125.00",
        createdAt: new Date("2026-02-01T10:00:00.000Z"),
      },
    ]);
    dbMocks.getProductsForBusiness.mockResolvedValue([
      {
        id: 3,
        businessId: 42,
        name: "Starter package",
        description: "Includes onboarding, \"support\", and review",
        price: "1250.00",
        cost: "400.00",
        category: "Services",
        createdAt: new Date("2026-02-03T10:00:00.000Z"),
        updatedAt: new Date("2026-02-04T10:00:00.000Z"),
      },
    ]);
    dbMocks.getTransactionsForBusiness.mockResolvedValue([
      {
        id: 4,
        businessId: 42,
        type: "sale",
        amount: "250.00",
        source: "manual",
        timestamp: Date.parse("2026-08-11T12:00:00.000Z"),
        customerId: 2,
        productId: 3,
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
      },
    ]);
    dbMocks.getExpensesForBusiness.mockResolvedValue([
      {
        id: 9,
        businessId: 42,
        category: "Software",
        amount: "99.00",
        description: "Subscription, annual",
        timestamp: Date.parse("2026-08-11T12:00:00.000Z"),
        source: "manual",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
      },
    ]);
  });

  it("keeps all four exports working without filters", async () => {
    const caller = appRouter.createCaller(createContext(user(7)));

    const customers = await caller.customers.exportCsv({ businessId: 42 });
    const products = await caller.products.exportCsv({ businessId: 42 });
    const transactions = await caller.transactions.exportCsv({ businessId: 42 });
    const expenses = await caller.expenses.exportCsv({ businessId: 42 });

    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenCalledTimes(4);
    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(1, 7, 42);
    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(2, 7, 42);
    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(3, 7, 42);
    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(4, 7, 42);
    expect(dbMocks.getCustomersForBusiness).toHaveBeenCalledWith(42);
    expect(dbMocks.getProductsForBusiness).toHaveBeenCalledWith(42);
    expect(dbMocks.getTransactionsForBusiness).toHaveBeenCalledWith(42, undefined, undefined);
    expect(dbMocks.getExpensesForBusiness).toHaveBeenCalledWith(42, undefined, undefined);
    expect(customers.csvContent).toContain("Customer One");
    expect(products.csvContent).toContain('"Includes onboarding, ""support"", and review"');
    expect(transactions.csvContent).toContain("250.00");
    expect(expenses.csvContent).toContain('"Subscription, annual"');
  });

  it("passes start-only, end-only, and inclusive both-date ranges to the database helpers", async () => {
    const caller = appRouter.createCaller(createContext(user(7)));

    await caller.transactions.exportCsv({ businessId: 42, startDate: "2026-08-10" });
    expect(dbMocks.getTransactionsForBusiness).toHaveBeenLastCalledWith(42, undefined, {
      startTimestamp: Date.parse("2026-08-10T00:00:00.000Z"),
    });

    await caller.transactions.exportCsv({ businessId: 42, endDate: "2026-08-10" });
    expect(dbMocks.getTransactionsForBusiness).toHaveBeenLastCalledWith(42, undefined, {
      endTimestamp: Date.parse("2026-08-10T23:59:59.999Z"),
    });

    await caller.transactions.exportCsv({
      businessId: 42,
      startDate: "2026-08-10",
      endDate: "2026-08-12",
    });
    expect(dbMocks.getTransactionsForBusiness).toHaveBeenLastCalledWith(42, undefined, {
      startTimestamp: Date.parse("2026-08-10T00:00:00.000Z"),
      endTimestamp: Date.parse("2026-08-12T23:59:59.999Z"),
    });

    await caller.expenses.exportCsv({
      businessId: 42,
      startDate: "2026-08-10",
      endDate: "2026-08-12",
    });
    expect(dbMocks.getExpensesForBusiness).toHaveBeenLastCalledWith(42, undefined, {
      startTimestamp: Date.parse("2026-08-10T00:00:00.000Z"),
      endTimestamp: Date.parse("2026-08-12T23:59:59.999Z"),
    });
  });

  it("returns a header-only CSV when a valid range has no matching records", async () => {
    dbMocks.getTransactionsForBusiness.mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(createContext(user(7)));

    const result = await caller.transactions.exportCsv({
      businessId: 42,
      startDate: "2030-01-01",
      endDate: "2030-01-31",
    });

    expect(result.csvContent).toBe(
      '"ID","Type","Amount","Transaction Date","Customer ID","Product ID","Status","Created At"\r\n',
    );
  });

  it("rejects invalid dates and reversed ranges with clear validation errors", async () => {
    const caller = appRouter.createCaller(createContext(user(7)));

    await expect(
      caller.transactions.exportCsv({ businessId: 42, startDate: "2026-02-30" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "startDate must be a valid calendar date.",
    });
    await expect(
      caller.expenses.exportCsv({ businessId: 42, endDate: "08/10/2026" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "endDate must be a valid date in YYYY-MM-DD format.",
    });
    await expect(
      caller.expenses.exportCsv({ businessId: 42, startDate: "2026-08-12", endDate: "2026-08-10" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "startDate must be on or before endDate.",
    });

    expect(dbMocks.getTransactionsForBusiness).not.toHaveBeenCalled();
    expect(dbMocks.getExpensesForBusiness).not.toHaveBeenCalled();
  });

  it("rejects product and expense exports for a business the user does not own", async () => {
    businessDataMocks.verifyBusinessOwnership.mockRejectedValue(new Error("not owner"));
    const caller = appRouter.createCaller(createContext(user(7)));

    await expect(caller.products.exportCsv({ businessId: 99 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
    await expect(caller.expenses.exportCsv({ businessId: 99, startDate: "2026-01-01" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
    await expect(caller.transactions.exportCsv({ businessId: 99, endDate: "2026-01-31" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });

    expect(dbMocks.getProductsForBusiness).not.toHaveBeenCalled();
    expect(dbMocks.getExpensesForBusiness).not.toHaveBeenCalled();
    expect(dbMocks.getTransactionsForBusiness).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated exports, including filtered requests", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.customers.exportCsv({ businessId: 42 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.products.exportCsv({ businessId: 42 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.transactions.exportCsv({ businessId: 42, startDate: "2026-01-01" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.expenses.exportCsv({ businessId: 42, endDate: "2026-01-31" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(businessDataMocks.verifyBusinessOwnership).not.toHaveBeenCalled();
  });
});

