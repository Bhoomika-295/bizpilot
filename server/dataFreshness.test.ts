import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./services/businessDataService", () => ({
  getBusinessTransactions: vi.fn(),
  getBusinessExpenses: vi.fn(),
  getBusinessCustomers: vi.fn(),
  getBusinessDataStats: vi.fn(),
  getLastCustomerUpdateDate: vi.fn(),
  getLastExpenseUpdateDate: vi.fn(),
  getLastTransactionUpdateDate: vi.fn(),
}));

import {
  classifyDataFreshness,
  getDataFreshness,
} from "./services/businessMetricEngine";
import * as dataService from "./services/businessDataService";

const mockedStats = vi.mocked(dataService.getBusinessDataStats);
const mockedCustomerUpdate = vi.mocked(dataService.getLastCustomerUpdateDate);
const mockedExpenseUpdate = vi.mocked(dataService.getLastExpenseUpdateDate);
const mockedTransactionUpdate = vi.mocked(
  dataService.getLastTransactionUpdateDate
);

const now = new Date("2026-08-11T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mockedStats.mockResolvedValue({
    customers: 0,
    products: 0,
    transactions: 0,
    expenses: 0,
  });
  mockedCustomerUpdate.mockResolvedValue(null);
  mockedExpenseUpdate.mockResolvedValue(null);
  mockedTransactionUpdate.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("data freshness", () => {
  it("classifies an empty dataset honestly", () => {
    expect(classifyDataFreshness(null, now)).toEqual({
      status: "no_data",
      label: "No business data available yet.",
      daysSinceLastUpdate: null,
    });
  });

  it("marks data updated within the last day as up to date", () => {
    expect(
      classifyDataFreshness(new Date("2026-08-11T11:58:00.000Z"), now)
    ).toEqual({
      status: "up_to_date",
      label: "Up to date",
      daysSinceLastUpdate: 0,
    });
  });

  it("marks data older than a day as needing refresh", () => {
    expect(
      classifyDataFreshness(new Date("2026-08-09T12:00:00.000Z"), now)
    ).toEqual({
      status: "needs_refresh",
      label: "Needs refresh",
      daysSinceLastUpdate: 2,
    });
  });

  it("reflects a newer transaction update after a dashboard refresh", async () => {
    mockedTransactionUpdate.mockResolvedValue(
      new Date("2026-08-11T11:59:00.000Z")
    );

    const freshness = await getDataFreshness(42);

    expect(freshness.lastUpdate).toEqual(
      new Date("2026-08-11T11:59:00.000Z")
    );
    expect(freshness.status).toBe("up_to_date");
  });

  it("uses the latest update across customers, transactions, and expenses", async () => {
    mockedStats.mockResolvedValue({
      customers: 3,
      products: 1,
      transactions: 5,
      expenses: 2,
    });
    mockedTransactionUpdate.mockResolvedValue(
      new Date("2026-08-10T09:00:00.000Z")
    );
    mockedExpenseUpdate.mockResolvedValue(
      new Date("2026-08-08T09:00:00.000Z")
    );
    mockedCustomerUpdate.mockResolvedValue(
      new Date("2026-08-11T11:58:00.000Z")
    );

    const freshness = await getDataFreshness(42);

    expect(freshness).toMatchObject({
      status: "up_to_date",
      label: "Up to date",
      lastUpdate: new Date("2026-08-11T11:58:00.000Z"),
      daysSinceLastUpdate: 0,
      dataPoints: {
        customers: 3,
        products: 1,
        transactions: 5,
        expenses: 2,
      },
    });
  });
});
