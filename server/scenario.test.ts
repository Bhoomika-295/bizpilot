import { describe, it, expect, vi } from "vitest";
import { simulateAndCreateScenario } from "./services/scenarioService";

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  getBusinessMetrics: vi.fn().mockResolvedValue({
    revenue: 1200000,
    expenses: 700000,
    profit: 500000,
    transactionCount: 200,
    customerCount: 50,
  }),
  getBusinessSituations: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Revenue Growth",
      category: "Growth",
      priority: "HIGH",
      currentStatus: "ACTIVE",
      trendDirection: "IMPROVING",
      summary: "Revenue is scaling well.",
    },
  ]),
  getDecisionPriorities: vi.fn().mockResolvedValue([]),
  getRecommendations: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessId: 1,
      title: "Expand high-margin offerings",
      description: "Focus on profitable product tiers.",
      category: "Growth",
      confidence: "0.90",
      status: "OPEN",
    },
  ]),
  upsertScenario: vi.fn().mockResolvedValue(101),
}));

describe("Scenario Intelligence Engine (Day 17)", () => {
  it("should simulate a price change scenario and produce range-based estimates", async () => {
    const scenarioId = await simulateAndCreateScenario(1, {
      title: "Test Price Increase +10%",
      description: "Testing 10% price increase simulation",
      scenarioType: "PRICE_CHANGE",
      assumptions: { priceChangePct: 10 },
    });

    expect(scenarioId).toBe(101);
  });

  it("should simulate a marketing spend scenario", async () => {
    const scenarioId = await simulateAndCreateScenario(1, {
      title: "Test Marketing Spend Expansion",
      description: "Testing marketing budget increase",
      scenarioType: "MARKETING_CHANGE",
      assumptions: { marketingSpendNew: 80000 },
    });

    expect(scenarioId).toBe(101);
  });
});
