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

