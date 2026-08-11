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
  getSignalPriority,
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

  it("assigns LOW priority below the 10% magnitude threshold", () => {
    expect(getSignalPriority(9.99)).toBe("LOW");
    expect(getSignalPriority(-9.99)).toBe("LOW");
  });

  it("assigns MEDIUM priority from 10% through 19.99% magnitude", () => {
    expect(getSignalPriority(10)).toBe("MEDIUM");
    expect(getSignalPriority(-19.99)).toBe("MEDIUM");
  });

  it("assigns HIGH priority at or above the 20% magnitude threshold", () => {
    expect(getSignalPriority(20)).toBe("HIGH");
    expect(getSignalPriority(-25)).toBe("HIGH");
  });

  it("includes priority on detected changes based only on magnitude", () => {
    const result = detectBusinessChanges({
      revenue: { value: 900, previousValue: 1000, change: -100, percentChange: -10, hasData: true, hasPreviousData: true },
      expenses: { value: 1250, previousValue: 1000, change: 250, percentChange: 25, hasData: true, hasPreviousData: true },
      estimatedProfit: { value: 0, previousValue: 0, change: 0, percentChange: 0, hasData: true, hasPreviousData: true },
      transactionCount: { value: 10, previousValue: 10, change: 0, percentChange: 0, hasData: true, hasPreviousData: true },
      customers: { total: 1, active: 1, inactive: 0, previousActive: 1, activeChange: 0, activePercentChange: 0, hasData: true, hasPreviousData: true },
      averageTransactionValue: 90,
      lastUpdated: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: "revenue", priority: "MEDIUM" }),
      expect.objectContaining({ metric: "expenses", priority: "HIGH" }),
    ]));
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

  it("generates correct briefing for revenue increase and expense increase with priority ordering", async () => {
    const { generateBusinessIntelligenceBriefing } = await import("./services/businessMetricEngine");
    const mockMetrics = {
      revenue: { value: 1140, previousValue: 1000, change: 140, percentChange: 14, hasData: true, hasPreviousData: true },
      expenses: { value: 560, previousValue: 500, change: 60, percentChange: 12, hasData: true, hasPreviousData: true },
      estimatedProfit: { value: 580, previousValue: 500, change: 80, percentChange: 16, hasData: true, hasPreviousData: true },
      transactionCount: { value: 12, previousValue: 10, change: 2, percentChange: 20, hasData: true, hasPreviousData: true },
      customers: { total: 10, active: 8, inactive: 2, previousActive: 8, activeChange: 0, activePercentChange: 0, hasData: true, hasPreviousData: true },
      averageTransactionValue: 95,
      lastUpdated: new Date(),
    };
    const changes = {
      status: "changes_detected" as const,
      thresholdPercent: 5,
      periodLabel: "Current period vs previous comparable period",
      changes: [
        { metric: "revenue" as const, label: "Revenue", direction: "increase" as const, percentChange: 14, absoluteChange: 140, priority: "MEDIUM" as const, summary: "Revenue increased 14%" },
        { metric: "expenses" as const, label: "Expenses", direction: "increase" as const, percentChange: 12, absoluteChange: 60, priority: "MEDIUM" as const, summary: "Expenses increased 12%" },
        { metric: "transactionCount" as const, label: "Transaction count", direction: "increase" as const, percentChange: 20, absoluteChange: 2, priority: "HIGH" as const, summary: "Transaction count increased 20%" },
      ],
    };

    const briefing = generateBusinessIntelligenceBriefing(mockMetrics, changes);
    expect(briefing.status).toBe("ready");
    expect(briefing.items[0].metric).toBe("transactionCount"); // HIGH priority first
    expect(briefing.items[0].priority).toBe("HIGH");
    expect(briefing.items[1].metric).toBe("revenue"); // MEDIUM priority next
    expect(briefing.items[1].explanation).toContain("Revenue is growing");
    expect(briefing.items[1].currentValue).toBe(1140);
    expect(briefing.items[1].previousValue).toBe(1000);
  });

  it("produces correct insufficient data briefing when history is missing", async () => {
    const { generateBusinessIntelligenceBriefing } = await import("./services/businessMetricEngine");
    const mockMetrics = {
      revenue: { value: 1000, previousValue: 0, change: 1000, percentChange: 0, hasData: true, hasPreviousData: false },
      expenses: { value: 500, previousValue: 0, change: 500, percentChange: 0, hasData: true, hasPreviousData: false },
      estimatedProfit: { value: 500, previousValue: 0, change: 500, percentChange: 0, hasData: true, hasPreviousData: false },
      transactionCount: { value: 10, previousValue: 0, change: 10, percentChange: 0, hasData: true, hasPreviousData: false },
      customers: { total: 10, active: 8, inactive: 2, previousActive: 0, activeChange: 0, activePercentChange: 0, hasData: true, hasPreviousData: false },
      averageTransactionValue: 100,
      lastUpdated: new Date(),
    };
    const changes = {
      status: "insufficient_data" as const,
      thresholdPercent: 5,
      periodLabel: "Current period vs previous comparable period",
      changes: [],
    };

    const briefing = generateBusinessIntelligenceBriefing(mockMetrics, changes);
    expect(briefing.status).toBe("insufficient_data");
    expect(briefing.headlineSummary[0]).toContain("Not enough historical data");
  });
});

