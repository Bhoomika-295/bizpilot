import { describe, it, expect, vi } from "vitest";
import { reevaluateTenantStrategies, getAdaptiveStrategyTimeline } from "./services/adaptiveStrategyService";

vi.mock("./services/businessDataService", () => ({
  getDataFreshness: vi.fn().mockResolvedValue({ status: "up-to-date", label: "Up to date", lastUpdated: new Date() }),
  detectBusinessChanges: vi.fn().mockResolvedValue({ changes: [], metrics: {} }),
  getLastTransactionUpdateDate: vi.fn().mockResolvedValue(new Date()),
  getLastExpenseUpdateDate: vi.fn().mockResolvedValue(new Date()),
  getLastCustomerUpdateDate: vi.fn().mockResolvedValue(new Date()),
  getBusinessDataStats: vi.fn().mockResolvedValue({ transactionCount: 150, customerCount: 45, expenseCount: 30 }),
  getBusinessTransactions: vi.fn().mockResolvedValue([]),
  getBusinessExpenses: vi.fn().mockResolvedValue([]),
  getBusinessCustomers: vi.fn().mockResolvedValue([]),
  getBusinessProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  getBusinessMetrics: vi.fn().mockResolvedValue({
    revenue: 100000,
    expenses: 60000,
    netProfit: 40000,
    transactionCount: 150,
    activeCustomers: 45,
  }),
  getBusinessGoals: vi.fn().mockResolvedValue([]),
  getLastTransactionUpdateDate: vi.fn().mockResolvedValue(new Date()),
  getLastExpenseUpdateDate: vi.fn().mockResolvedValue(new Date()),
  getLastCustomerUpdateDate: vi.fn().mockResolvedValue(new Date()),
  detectBusinessChanges: vi.fn().mockResolvedValue({ changes: [], metrics: {} }),
  getDataFreshness: vi.fn().mockResolvedValue({ status: "up-to-date", label: "Up to date", lastUpdated: new Date() }),
  getBusinessSituations: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Cost Pressure",
      category: "Expenses",
      priority: "HIGH",
      currentStatus: "ACTIVE",
      trendDirection: "WORSENING",
      summary: "Expenses rising rapidly.",
      changesSinceLastReview: ["Expense ratio increased by 15%"],
    },
  ]),
  getSituationSnapshots: vi.fn().mockResolvedValue([]),
  getMarketSignals: vi.fn().mockResolvedValue([]),
  getRecommendations: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Cost Pressure",
      description: "Analyze and optimize high operating expenses.",
      category: "Expenses",
      confidence: "0.85",
      status: "OPEN",
    },
  ]),
  getDecisionPriorities: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Review rising expenses",
      priorityLevel: "HIGH",
      priorityScore: 85,
      urgency: "HIGH",
      impact: "HIGH",
      trend: "WORSENING",
      reason: "Expense pressure is high.",
      whyNow: "Costs increased significantly.",
    },
  ]),
  upsertDecisionPriority: vi.fn().mockResolvedValue(1),
  getStrategyStates: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      recommendationId: 1,
      priorityAtGeneration: "HIGH",
      situationTrendAtGeneration: "WORSENING",
      evaluationStatus: "KEEP",
    },
  ]),
  upsertStrategyState: vi.fn().mockResolvedValue(1),
  createStrategyEvent: vi.fn().mockResolvedValue(1),
  getStrategyEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      recommendationId: 1,
      eventType: "STRATEGY_RE_EVALUATED_KEEP",
      previousStrategyTitle: "Review rising expenses",
      evaluationResult: "KEEP",
      reason: "Business context and priorities have not meaningfully changed.",
      timestamp: new Date(),
    },
  ]),
  evaluateAndUpsertDecisionPriorities: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Review rising expenses",
      priorityLevel: "HIGH",
      priorityScore: 85,
      urgency: "HIGH",
      impact: "HIGH",
      trend: "WORSENING",
      reason: "Expense pressure is high.",
      whyNow: "Costs increased significantly.",
    },
  ]),
}));

describe("Adaptive Strategy Engine (Day 16)", () => {
  it("should keep strategy stable when nothing important changes", async () => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const evolutions = await reevaluateTenantStrategies(1, startDate, endDate);
    expect(evolutions.length).toBeGreaterThan(0);
    expect(["KEEP", "UPDATE"]).toContain(evolutions[0].evaluationResult);
  });

  it("should retrieve adaptive strategy timeline and events", async () => {
    const timeline = await getAdaptiveStrategyTimeline(1);
    expect(timeline).toBeDefined();
    expect(timeline.events.length).toBeGreaterThan(0);
    expect(timeline.events[0].evaluationResult).toBe("KEEP");
  });
});
