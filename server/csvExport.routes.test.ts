import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getProductsForBusiness: vi.fn(),
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

describe("Products and Expenses CSV export routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessDataMocks.verifyBusinessOwnership.mockResolvedValue({ id: 42 });
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
    dbMocks.getExpensesForBusiness.mockResolvedValue([
      {
        id: 9,
        businessId: 42,
        category: "Software",
        amount: "99.00",
        description: "Subscription, annual",
        timestamp: 1770112800000,
        source: "manual",
        createdAt: new Date("2026-02-05T10:00:00.000Z"),
      },
    ]);
  });

  it("allows an authenticated owner to export only the requested product and expense tenant", async () => {
    const caller = appRouter.createCaller(createContext(user(7)));

    const products = await caller.products.exportCsv({ businessId: 42 });
    const expenses = await caller.expenses.exportCsv({ businessId: 42 });

    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(1, 7, 42);
    expect(businessDataMocks.verifyBusinessOwnership).toHaveBeenNthCalledWith(2, 7, 42);
    expect(dbMocks.getProductsForBusiness).toHaveBeenCalledWith(42);
    expect(dbMocks.getExpensesForBusiness).toHaveBeenCalledWith(42);
    expect(products.csvContent).toContain("Starter package");
    expect(products.csvContent).toContain('"Includes onboarding, ""support"", and review"');
    expect(expenses.csvContent).toContain("Software");
    expect(expenses.csvContent).toContain('"Subscription, annual"');
  });

  it("rejects product and expense exports for a business the user does not own", async () => {
    businessDataMocks.verifyBusinessOwnership.mockRejectedValue(new Error("not owner"));
    const caller = appRouter.createCaller(createContext(user(7)));

    await expect(caller.products.exportCsv({ businessId: 99 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
    await expect(caller.expenses.exportCsv({ businessId: 99 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });

    expect(dbMocks.getProductsForBusiness).not.toHaveBeenCalled();
    expect(dbMocks.getExpensesForBusiness).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated product and expense export requests", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.products.exportCsv({ businessId: 42 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.expenses.exportCsv({ businessId: 42 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(businessDataMocks.verifyBusinessOwnership).not.toHaveBeenCalled();
  });
});

