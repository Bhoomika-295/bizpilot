import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./services/businessDataService", () => ({
  getBusinessTransactions: vi.fn(),
  getBusinessExpenses: vi.fn(),
  getBusinessCustomers: vi.fn(),
  getBusinessDataStats: vi.fn(),
  getLastExpenseDate: vi.fn(),
  getLastTransactionDate: vi.fn(),
}));

import {
  calculateBusinessHealthScore,
  calculateBusinessMetrics,
} from "./services/businessMetricEngine";
import * as dataService from "./services/businessDataService";

const mockedTransactions = vi.mocked(dataService.getBusinessTransactions);
const mockedExpenses = vi.mocked(dataService.getBusinessExpenses);
const mockedCustomers = vi.mocked(dataService.getBusinessCustomers);

const start = new Date("2026-01-01T00:00:00.000Z");
const end = new Date("2026-01-31T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("business metric engine", () => {
  it("calculates period metrics from stored transaction and expense values", async () => {
    mockedTransactions
      .mockResolvedValueOnce([
        { amount: "100.00", customerId: 7 },
        { amount: "200.00", customerId: 7 },
      ] as never)
      .mockResolvedValueOnce([{ amount: "150.00", customerId: 8 }] as never);
    mockedExpenses
      .mockResolvedValueOnce([{ amount: "80.00" }, { amount: "20.00" }] as never)
      .mockResolvedValueOnce([{ amount: "50.00" }] as never);
    mockedCustomers.mockResolvedValueOnce([
      { id: 7 },
      { id: 8 },
    ] as never);

    const metrics = await calculateBusinessMetrics(12, start, end);

    expect(metrics.revenue).toMatchObject({
      value: 300,
      previousValue: 150,
      change: 150,
      percentChange: 100,
      hasData: true,
    });
    expect(metrics.expenses).toMatchObject({
      value: 100,
      previousValue: 50,
      change: 50,
      percentChange: 100,
      hasData: true,
    });
    expect(metrics.estimatedProfit.value).toBe(200);
    expect(metrics.transactionCount.value).toBe(2);
    expect(metrics.customers).toMatchObject({ total: 2, active: 1, inactive: 1 });
    expect(metrics.averageTransactionValue).toBe(150);
  });

  it("returns an honest insufficient-data health state when no records exist", async () => {
    mockedTransactions.mockResolvedValue([] as never);
    mockedExpenses.mockResolvedValue([] as never);
    mockedCustomers.mockResolvedValue([] as never);

    const score = await calculateBusinessHealthScore(12, start, end);

    expect(score).toMatchObject({
      score: 0,
      percentage: 0,
      hasEnoughData: false,
    });
    expect(score.explanation).toContain("Not enough data yet");
  });
});
