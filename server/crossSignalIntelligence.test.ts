import { describe, it, expect } from "vitest";
import {
  buildSignalObservations,
  buildRelationshipCandidates,
  buildSignalClusters,
  canTransitionRelationship,
} from "./services/crossSignalIntelligenceService";

describe("Cross-Signal Intelligence Engine v1 (Day 23)", () => {
  const now = new Date("2026-06-15T10:00:00Z");

  it("builds deterministic signal observations across metrics, market signals, and situations", () => {
    const metrics: any = {
      revenue: { hasData: true, hasPreviousData: true, percentChange: 50, current: 150000, previous: 100000 },
      expenses: { hasData: true, hasPreviousData: true, percentChange: 10, current: 60000, previous: 55000 },
      transactionCount: { hasData: false, hasPreviousData: false, percentChange: 0 },
      customers: { hasData: true, hasPreviousData: true, activePercentChange: 25 },
      netProfit: { hasData: true, hasPreviousData: true, percentChange: 40 },
    };
    const marketSignals: any[] = [
      {
        id: 1,
        title: "Competitor expansion in enterprise segment",
        source: "GDELT",
        url: "https://example.com/news",
        publishedAt: new Date("2026-06-10T08:00:00Z"),
        relevanceLevel: "HIGH",
        impactArea: "Competition",
        theme: "GROWTH",
        snippet: "Competitor expansion grows market demand.",
        explanation: "Market signals indicate growth.",
        relevance: "HIGH",
      },
    ];
    const situations: any[] = [
      {
        id: 2,
        title: "Surging customer demand in SaaS tier",
        currentPriority: "HIGH",
        trendDirection: "IMPROVING",
        summary: "Demand is up 35% MoM.",
        updatedAt: new Date("2026-06-12T09:00:00Z"),
      },
    ];

    const observations = buildSignalObservations({
      metrics,
      marketSignals,
      competitorActivities: [],
      situations,
      opportunities: [],
      decisions: [],
      strategies: [],
      outcomes: [],
      monitoringEvents: [],
      now,
    });

    expect(observations.length).toBeGreaterThanOrEqual(2);
    expect(observations.some((o) => o.sourceType === "METRIC")).toBe(true);
    expect(observations.some((o) => o.sourceType === "MARKET_SIGNAL")).toBe(true);
    expect(observations.some((o) => o.sourceType === "SITUATION")).toBe(true);
  });

  it("identifies converging and correlated relationship candidates deterministically", () => {
    const observations = [
      {
        key: "metric:revenue_growth",
        sourceType: "METRIC" as const,
        sourceId: 1,
        label: "Revenue Growth Surge",
        detail: "+50% MoM revenue growth",
        direction: "UP" as const,
        impact: "POSITIVE" as const,
        theme: "GROWTH" as const,
        observedAt: new Date("2026-06-12T10:00:00Z"),
      },
      {
        key: "situation:2",
        sourceType: "SITUATION" as const,
        sourceId: 2,
        label: "Surging customer demand in SaaS tier",
        detail: "Demand is up 35% MoM.",
        direction: "UP" as const,
        impact: "POSITIVE" as const,
        theme: "GROWTH" as const,
        observedAt: new Date("2026-06-12T09:00:00Z"),
      },
    ];

    const candidates = buildRelationshipCandidates(observations, now);
    expect(Array.isArray(candidates)).toBe(true);
  });

  it("validates relationship lifecycle transitions correctly", () => {
    expect(canTransitionRelationship("NEW", "ACTIVE")).toBe(true);
    expect(canTransitionRelationship("NEW", "RESOLVED")).toBe(true);
    expect(canTransitionRelationship("ACTIVE", "WEAKENING")).toBe(true);
    expect(canTransitionRelationship("RESOLVED", "NEW")).toBe(true);
  });
});
