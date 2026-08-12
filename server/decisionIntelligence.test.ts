import { describe, expect, it, vi } from "vitest";
import { canTransitionDecision, generateDecisionCandidates, type DecisionContext } from "./services/decisionIntelligenceService";

vi.mock("./db", () => ({
  createDecisionEvent: vi.fn(),
  getAllDecisionCandidates: vi.fn(),
  getDecisionCandidateById: vi.fn(),
  getDecisionCandidates: vi.fn(),
  getDecisionEvents: vi.fn(),
  getDecisionPriorities: vi.fn(),
  getMarketSignals: vi.fn(),
  getOpportunities: vi.fn(),
  getScenarios: vi.fn(),
  getStrategies: vi.fn(),
  upsertDecisionCandidate: vi.fn(),
  updateDecisionCandidateLifecycle: vi.fn(),
}));
vi.mock("./services/businessMetricEngine", () => ({
  calculateBusinessHealthScore: vi.fn(),
  calculateBusinessMetrics: vi.fn(),
  getDataFreshness: vi.fn(),
}));
vi.mock("./services/situationTrendService", () => ({
  getBusinessSituationTrends: vi.fn(),
}));
vi.mock("./services/competitiveIntelligenceService", () => ({
  evaluateCompetitorIntelligence: vi.fn(),
}));

function context(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    businessId: 1,
    situations: [],
    opportunities: [],
    competitors: [],
    marketSignals: [],
    scenarios: [],
    strategies: [],
    decisionPriorities: [],
    healthScore: { score: 72 },
    freshness: { status: "fresh" },
    ...overrides,
  };
}

describe("Decision Intelligence Engine v1 (Day 20)", () => {
  it("creates deterministic, explainable candidates from multiple upstream intelligence sources", () => {
    const input = context({
      situations: [{
        situationId: 11,
        title: "Customer churn risk",
        trendDirection: "WORSENING",
        currentPriority: "HIGH",
        currentStatus: "ACTIVE",
        trendSummary: "Customer churn risk is worsening.",
        durationDays: 14,
        timeline: [{ supportingCount: 3 }],
      } as any],
      opportunities: [{
        id: 21,
        title: "Expansion opportunity",
        category: "REVENUE",
        status: "ACTIVE",
        priority: "HIGH",
        potentialImpact: "HIGH",
        urgency: "HIGH",
        evidenceStrength: "HIGH",
        summary: "Demand supports a possible expansion review.",
        potentialNextStep: "Validate demand before investing.",
        supportingSituationsJson: "[11]",
      }],
      competitors: [{
        competitorId: 31,
        competitorName: "Acme",
        businessRelevance: "HIGH",
        evidenceCount: 3,
        primaryActivity: "PRICING",
        trend: "INCREASING",
        whyItMatters: "Acme pricing activity may affect positioning.",
        timeline: [{ id: 301, title: "Acme price change", description: "Tracked pricing move." }],
      }],
      marketSignals: [{
        id: 41,
        title: "Industry demand signal",
        relevanceLevel: "HIGH",
        importanceScore: 5,
        impactArea: "Revenue",
        explanation: "Demand conditions changed in the target market.",
        source: "Market source",
      }],
      scenarios: [{
        id: 51,
        title: "Pricing sensitivity test",
        scenarioType: "PRICE",
        status: "ACTIVE",
        evidenceQuality: "MEDIUM EVIDENCE",
        description: "Saved pricing assumptions require review.",
        affectedSituationsJson: "[]",
      }],
    });

    const first = generateDecisionCandidates(input);
    const second = generateDecisionCandidates(input);

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first.map((candidate) => candidate.sourceType)).toEqual([
      "SITUATION",
      "COMPETITOR",
      "MARKET_SIGNAL",
      "OPPORTUNITY",
      "SCENARIO",
    ]);
    expect(first[0]).toMatchObject({
      decisionKey: "SITUATION:11",
      urgency: "NOW",
      evidenceStrength: "HIGH",
      potentialImpact: "HIGH",
    });
    expect(first[0].evidenceChain.length).toBeGreaterThanOrEqual(2);
    expect(first[0].whatWeDontKnow.length).toBeGreaterThan(0);
    expect(first[0].actionOptions[0].reversible).toBe("REVERSIBLE");
  });

  it("filters unsupported sources and preserves explicit uncertainty instead of fabricating impact", () => {
    const candidates = generateDecisionCandidates(context({
      competitors: [{
        competitorId: 7,
        competitorName: "Low relevance competitor",
        businessRelevance: "LOW",
        evidenceCount: 5,
        primaryActivity: "MARKETING",
        trend: "STABLE",
        whyItMatters: "Low relevance activity.",
        timeline: [],
      }],
      opportunities: [{ id: 8, title: "Closed opportunity", status: "DISMISSED", priority: "HIGH", potentialImpact: "HIGH" }],
      scenarios: [{ id: 9, title: "Archived scenario", scenarioType: "CUSTOM", status: "ARCHIVED", evidenceQuality: "HIGH" }],
      marketSignals: [{ id: 10, title: "Low signal", relevanceLevel: "LOW", importanceScore: 2 }],
    }));

    expect(candidates).toHaveLength(0);
  });

  it("enforces an explicit lifecycle transition matrix", () => {
    expect(canTransitionDecision("OPEN", "IN_REVIEW")).toBe(true);
    expect(canTransitionDecision("IN_REVIEW", "DECIDED")).toBe(true);
    expect(canTransitionDecision("DEFERRED", "OPEN")).toBe(true);
    expect(canTransitionDecision("DISMISSED", "DECIDED")).toBe(false);
    expect(canTransitionDecision("DECIDED", "OPEN")).toBe(false);
    expect(canTransitionDecision("OPEN", "OPEN")).toBe(true);
  });
});
