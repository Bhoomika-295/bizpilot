import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateAndDetectOpportunities } from "./services/opportunityService";

vi.mock("./db", () => ({
  getOpportunities: vi.fn(async (businessId: number) => {
    return [
      {
        id: 1,
        businessId,
        title: "Upsell High-Margin Product Lines",
        category: "REVENUE_GROWTH",
        priority: "HIGH",
        summary: "Average transaction value is expanding while active customer count remains stable.",
        evidenceStrength: "HIGH",
        potentialImpact: "HIGH",
        recommendedAction: "Promote top-selling bundle to existing customer segments.",
        supportingSignalsJson: JSON.stringify([{ title: "Retail demand up", source: "GDELT" }]),
        supportingSituationsJson: JSON.stringify([{ title: "Growth Momentum" }]),
        supportingMetricsJson: JSON.stringify([{ label: "Average Transaction Value", value: "₹2,500" }]),
        status: "NEW",
        createdAt: new Date(),
      },
    ];
  }),
  upsertOpportunity: vi.fn(async () => [{ insertId: 2 }]),
  getBusinessMetrics: vi.fn(async () => ({
    revenue: 500000,
    expenses: 300000,
    profit: 200000,
    transactionCount: 200,
    customerCount: 50,
  })),
  getBusinessSituations: vi.fn(async () => [
    { id: 1, title: "Growth Momentum", category: "GROWTH", currentPriority: "HIGH", currentStatus: "ACTIVE" },
  ]),
  getMarketSignals: vi.fn(async () => [
    { id: 1, title: "Market retail demand surge", source: "GDELT", relatedEntity: "Retail", importanceScore: 4 },
  ]),
  getStrategies: vi.fn(async () => []),
  getScenarios: vi.fn(async () => []),
}));

describe("Opportunity Intelligence Engine (Day 18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates and detects opportunities deterministically", async () => {
    const opps = await evaluateAndDetectOpportunities(1);
    expect(opps).toBeDefined();
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBeGreaterThan(0);
    expect(opps[0].title).toBeDefined();
    expect(opps[0].priority).toBeDefined();
  });
});
