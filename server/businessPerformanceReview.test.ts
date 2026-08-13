import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./services/businessDataService", () => ({
  getBusinessTransactions: vi.fn(),
  getBusinessExpenses: vi.fn(),
  getBusinessCustomers: vi.fn(),
  getBusinessDataStats: vi.fn(),
  getLastCustomerUpdateDate: vi.fn(),
  getLastExpenseUpdateDate: vi.fn(),
  getLastTransactionUpdateDate: vi.fn(),
}));

vi.mock("./db", () => ({
  getBusinessSituations: vi.fn(),
  getActionPlansForBusiness: vi.fn(),
  getRecentOutcomes: vi.fn(),
  getBusinessMemoriesForBusiness: vi.fn(),
}));

import { generatePerformanceReviewSnapshot } from "./services/businessMetricEngine";
import * as dataService from "./services/businessDataService";
import * as db from "./db";

const mockedTransactions = vi.mocked(dataService.getBusinessTransactions);
const mockedExpenses = vi.mocked(dataService.getBusinessExpenses);
const mockedCustomers = vi.mocked(dataService.getBusinessCustomers);
const mockedStats = vi.mocked(dataService.getBusinessDataStats);
const mockedLastCustomer = vi.mocked(dataService.getLastCustomerUpdateDate);
const mockedLastExpense = vi.mocked(dataService.getLastExpenseUpdateDate);
const mockedLastTransaction = vi.mocked(dataService.getLastTransactionUpdateDate);
const mockedSituations = vi.mocked(db.getBusinessSituations);
const mockedActions = vi.mocked(db.getActionPlansForBusiness);
const mockedOutcomes = vi.mocked(db.getRecentOutcomes);
const mockedMemories = vi.mocked(db.getBusinessMemoriesForBusiness);

const periodStart = new Date("2026-01-01T00:00:00.000Z");
const periodEnd = new Date("2026-01-31T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockedSituations.mockResolvedValue([] as never);
  mockedActions.mockResolvedValue([] as never);
  mockedOutcomes.mockResolvedValue([] as never);
  mockedMemories.mockResolvedValue([] as never);
  mockedStats.mockResolvedValue({} as never);
});

describe("business performance review", () => {
  it("ranks verified KPI movement before possible situation context and preserves non-causal language", async () => {
    mockedTransactions
      .mockResolvedValueOnce([{ amount: "1200.00", customerId: 1 }] as never)
      .mockResolvedValueOnce([{ amount: "1000.00", customerId: 1 }] as never);
    mockedExpenses
      .mockResolvedValueOnce([{ amount: "400.00" }] as never)
      .mockResolvedValueOnce([{ amount: "500.00" }] as never);
    mockedCustomers.mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as never);
    const currentUpdate = new Date();
    mockedLastTransaction.mockResolvedValue(currentUpdate);
    mockedLastExpense.mockResolvedValue(new Date(currentUpdate.getTime() - 60_000));
    mockedLastCustomer.mockResolvedValue(new Date(currentUpdate.getTime() - 120_000));
    mockedSituations.mockResolvedValue([{ id: 44, title: "Retention pressure", priority: "HIGH", summary: "Customer retention needs review." }] as never);

    const review = await generatePerformanceReviewSnapshot(12, periodStart, periodEnd);

    expect(review.freshness.status).toBe("up_to_date");
    expect(review.kpis.find((kpi) => kpi.metricKey === "revenue")).toMatchObject({
      healthStatus: "HEALTHY",
      targetValue: null,
      targetComparison: null,
      distanceToTarget: null,
    });
    expect(review.positiveChanges.some((change) => change.includes("Revenue"))).toBe(true);
    expect(review.positiveChanges.some((change) => change.includes("Expenses"))).toBe(true);
    expect(review.drivers[0]).toMatchObject({
      relatedKpi: "revenue",
      driverType: "SUPPORTED_DRIVER",
      confidence: "HIGH",
      sourceReference: "transactions table",
    });
    expect(review.drivers[0].summary).toContain("not a causal explanation");
    expect(review.drivers.some((driver) => driver.driverType === "POSSIBLE_DRIVER")).toBe(true);
    expect(review.drivers.every((driver) => (driver.supportingEvidence ?? []).length > 0)).toBe(true);
  });

  it("keeps missing data explicit and does not invent performance drivers or targets", async () => {
    mockedTransactions.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    mockedExpenses.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    mockedCustomers.mockResolvedValueOnce([] as never);
    mockedLastTransaction.mockResolvedValue(null);
    mockedLastExpense.mockResolvedValue(null);
    mockedLastCustomer.mockResolvedValue(null);

    const review = await generatePerformanceReviewSnapshot(12, periodStart, periodEnd);

    expect(review.freshness).toMatchObject({ status: "no_data", label: "No business data available yet.", lastUpdate: null });
    expect(review.kpis.filter((kpi) => kpi.healthStatus === "UNKNOWN").length).toBeGreaterThanOrEqual(5);
    expect(review.kpis.every((kpi) => kpi.targetValue === null && kpi.distanceToTarget === null)).toBe(true);
    expect(review.drivers).toEqual([]);
    expect(review.positiveChanges).toEqual([]);
    expect(review.negativeChanges).toEqual([]);
  });
});
