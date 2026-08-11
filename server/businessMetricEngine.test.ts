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
  detectBusinessChanges,
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

function mockScoreDataset({
  currentTransactions,
  previousTransactions,
  currentExpenses,
  previousExpenses,
  customers,
}: {
  currentTransactions: unknown[];
  previousTransactions: unknown[];
  currentExpenses: unknown[];
  previousExpenses: unknown[];
  customers: unknown[];
}) {
  mockedTransactions
    .mockResolvedValueOnce(currentTransactions as never)
    .mockResolvedValueOnce(previousTransactions as never);
  mockedExpenses
    .mockResolvedValueOnce(currentExpenses as never)
    .mockResolvedValueOnce(previousExpenses as never);
  mockedCustomers.mockResolvedValueOnce(customers as never);
}

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
      hasPreviousData: true,
    });
    expect(metrics.expenses).toMatchObject({
      value: 100,
      previousValue: 50,
      change: 50,
      percentChange: 100,
      hasData: true,
      hasPreviousData: true,
    });
    expect(metrics.estimatedProfit.value).toBe(200);
    expect(metrics.transactionCount.value).toBe(2);
    expect(metrics.customers).toMatchObject({ total: 2, active: 1, inactive: 1 });
    expect(metrics.averageTransactionValue).toBe(150);
  });

  it("calculates a transparent score from actual factors and labels the data basis", async () => {
    mockScoreDataset({
      currentTransactions: [
        { amount: "400.00", customerId: 7 },
        { amount: "200.00", customerId: 8 },
      ],
      previousTransactions: [{ amount: "450.00", customerId: 7 }],
      currentExpenses: [{ amount: "100.00" }],
      previousExpenses: [{ amount: "100.00" }],
      customers: [{ id: 7 }, { id: 8 }],
    });

    const score = await calculateBusinessHealthScore(12, start, end, "real");

    expect(score).toMatchObject({
      score: 95,
      percentage: 95,
      maxScore: 100,
      hasEnoughData: true,
      dataBasis: "real",
    });
    expect(score.factors).toHaveLength(4);
    expect(score.factors.map((factor) => factor.name)).toEqual([
      "Revenue trend",
      "Expense trend",
      "Customer activity",
      "Transaction trend",
    ]);
    expect(score.explanation).toContain("Revenue is increasing strongly.");
  });

  it("changes when stored signals change instead of returning a hardcoded result", async () => {
    mockScoreDataset({
      currentTransactions: [{ amount: "250.00", customerId: 7 }],
      previousTransactions: [{ amount: "300.00", customerId: 7 }],
      currentExpenses: [{ amount: "150.00" }],
      previousExpenses: [{ amount: "100.00" }],
      customers: [{ id: 7 }, { id: 8 }],
    });

    const score = await calculateBusinessHealthScore(12, start, end);

    expect(score.hasEnoughData).toBe(true);
    expect(score.score).toBe(30);
    expect(score.factors.some((factor) => factor.summary === "Revenue is declining.")).toBe(true);
  });

  it("detects meaningful internal changes from current and previous metric periods", () => {
    const result = detectBusinessChanges({
      revenue: {
        value: 1200,
        previousValue: 1000,
        change: 200,
        percentChange: 20,
        hasData: true,
        hasPreviousData: true,
      },
      expenses: {
        value: 900,
        previousValue: 1000,
        change: -100,
        percentChange: -10,
        hasData: true,
        hasPreviousData: true,
      },
      estimatedProfit: {
        value: 300,
        previousValue: 0,
        change: 300,
        percentChange: 0,
        hasData: true,
        hasPreviousData: false,
      },
      transactionCount: {
        value: 12,
        previousValue: 10,
        change: 2,
        percentChange: 20,
        hasData: true,
        hasPreviousData: true,
      },
      customers: {
        total: 4,
        active: 3,
        inactive: 1,
        previousActive: 2,
        activeChange: 1,
        activePercentChange: 50,
        hasData: true,
        hasPreviousData: true,
      },
      averageTransactionValue: 100,
      lastUpdated: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.status).toBe("changes_detected");
    expect(result.thresholdPercent).toBe(5);
    expect(result.changes.map((change) => change.metric)).toEqual([
      "revenue",
      "expenses",
      "transactionCount",
      "customers",
    ]);
    expect(result.changes[0]).toMatchObject({
      direction: "increase",
      absoluteChange: 200,
      percentChange: 20,
    });
  });

  it("does not overstate small period movements", () => {
    const result = detectBusinessChanges({
      revenue: { value: 1040, previousValue: 1000, change: 40, percentChange: 4, hasData: true, hasPreviousData: true },
      expenses: { value: 980, previousValue: 1000, change: -20, percentChange: -2, hasData: true, hasPreviousData: true },
      estimatedProfit: { value: 60, previousValue: 0, change: 60, percentChange: 0, hasData: true, hasPreviousData: false },
      transactionCount: { value: 10, previousValue: 10, change: 0, percentChange: 0, hasData: true, hasPreviousData: true },
      customers: { total: 2, active: 2, inactive: 0, previousActive: 2, activeChange: 0, activePercentChange: 0, hasData: true, hasPreviousData: true },
      averageTransactionValue: 104,
      lastUpdated: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.status).toBe("no_significant_changes");
    expect(result.changes).toEqual([]);
  });

  it("returns an honest insufficient-data state without a comparable baseline", () => {
    const result = detectBusinessChanges({
      revenue: { value: 1000, previousValue: 0, change: 1000, percentChange: 0, hasData: true, hasPreviousData: false },
      expenses: { value: 200, previousValue: 0, change: 200, percentChange: 0, hasData: true, hasPreviousData: false },
      estimatedProfit: { value: 800, previousValue: 0, change: 800, percentChange: 0, hasData: true, hasPreviousData: false },
      transactionCount: { value: 5, previousValue: 0, change: 5, percentChange: 0, hasData: true, hasPreviousData: false },
      customers: { total: 2, active: 2, inactive: 0, previousActive: 0, activeChange: 2, activePercentChange: 0, hasData: true, hasPreviousData: false },
      averageTransactionValue: 200,
      lastUpdated: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "insufficient_data",
      thresholdPercent: 5,
      changes: [],
    });
  });

  it("returns an honest insufficient-data state when no comparable records exist", async () => {
    mockScoreDataset({
      currentTransactions: [],
      previousTransactions: [],
      currentExpenses: [],
      previousExpenses: [],
      customers: [],
    });

    const score = await calculateBusinessHealthScore(12, start, end);

    expect(score).toMatchObject({
      score: null,
      percentage: null,
      maxScore: 100,
      hasEnoughData: false,
      dataBasis: "real",
      factors: [],
    });
    expect(score.explanation).toContain("Not enough data");
  });
});

