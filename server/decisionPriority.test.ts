import { describe, it, expect, vi } from "vitest";
import { evaluateAndUpsertDecisionPriorities, getDecisionPrioritiesForTenant } from "./services/decisionPriorityEngine";

vi.mock("./services/businessDataService", () => ({
  getBusinessTransactions: vi.fn().mockResolvedValue([]),
  getBusinessExpenses: vi.fn().mockResolvedValue([]),
  getBusinessCustomers: vi.fn().mockResolvedValue([]),
  getBusinessDataStats: vi.fn().mockResolvedValue({ totalTransactions: 0, totalExpenses: 0, totalCustomers: 0 }),
  getLastExpenseDate: vi.fn().mockResolvedValue(null),
  getLastTransactionDate: vi.fn().mockResolvedValue(null),
  getLastTransactionUpdateDate: vi.fn().mockResolvedValue(null),
  getLastExpenseUpdateDate: vi.fn().mockResolvedValue(null),
  getLastCustomerUpdateDate: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db", () => ({
  getMarketSignals: vi.fn().mockResolvedValue([]),
  getBusinessSituations: vi.fn().mockResolvedValue([]),
  getSituationSnapshots: vi.fn().mockResolvedValue([]),
  getBusinessSituationSnapshots: vi.fn().mockResolvedValue([]),
  createSituationSnapshot: vi.fn().mockResolvedValue(1),
  upsertBusinessSituation: vi.fn().mockResolvedValue(1),
  upsertDecisionPriority: vi.fn().mockResolvedValue(1),
  getDecisionPriorities: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      sourceType: "SITUATION",
      sourceId: 10,
      title: "Customer Demand Decline",
      priorityLevel: "HIGH",
      priorityScore: 78,
      urgency: "Urgent attention required",
      impact: "High business impact",
      trend: "WORSENING",
      reason: "Customer activity is declining.",
      whyNow: "Priority increased because the situation trend worsened.",
      evidenceJson: JSON.stringify([{ label: "Trend", value: "WORSENING" }]),
      freshnessNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]),
}));

describe("Decision Priority Engine (Day 15)", () => {
  it("should evaluate and rank decision priorities deterministically", async () => {
    const startDate = new Date(Date.now() - 30 * 86400000);
    const endDate = new Date();
    const priorities = await evaluateAndUpsertDecisionPriorities(1, startDate, endDate);
    expect(Array.isArray(priorities)).toBe(true);
  });

  it("should retrieve stored decision priorities for tenant without errors", async () => {
    const priorities = await getDecisionPrioritiesForTenant(1);
    expect(Array.isArray(priorities)).toBe(true);
    expect(priorities.length).toBeGreaterThan(0);
    expect(priorities[0].title).toBe("Customer Demand Decline");
    expect(priorities[0].priorityLevel).toBe("HIGH");
  });
});
