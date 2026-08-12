import { describe, expect, it } from "vitest";
import { buildEvidenceFingerprint, buildStrategyTimeline, deriveStrategyHealth, type StrategyHealthDerivationInput } from "./services/strategyHealthService";

const now = new Date("2026-08-12T12:00:00.000Z");

function baseInput(overrides: Partial<StrategyHealthDerivationInput> = {}): StrategyHealthDerivationInput {
  return {
    strategy: {
      id: 12,
      objective: "Grow revenue through customer acquisition",
      targetMetric: null,
      status: "active",
      assumptions: "The market is receptive; competitors remain stable",
      confidence: "0.80",
    },
    trajectories: [
      {
        metricKey: "revenue",
        metricLabel: "Revenue",
        direction: "IMPROVING",
        momentum: "ACCELERATING",
        volatility: "LOW",
        status: "HEALTHY_GROWTH",
        confidenceLevel: "HIGH",
      },
    ],
    situations: [],
    marketSignals: [],
    competitorActivities: [],
    crossSignal: { relationships: [] },
    scenarios: [],
    historical: { completed: 3, positive: 2, neutral: 1, negative: 0, unknown: 0, insights: ["Two completed outcomes were positive."] },
    outcomes: [],
    freshness: { status: "fresh", label: "Fresh", lastUpdate: now, daysSinceLastUpdate: 0 },
    businessTrajectoryState: "IMPROVING",
    now,
    ...overrides,
  };
}

describe("Strategy Health v2 (Day 27)", () => {
  it("maps an objective to verified metrics and remains deterministic", () => {
    const first = deriveStrategyHealth(baseInput());
    const second = deriveStrategyHealth(baseInput());

    expect(first.targetMetric).toBe("revenue");
    expect(first.metricMapping).toContain("revenue");
    expect(first.healthState).toBe("HEALTHY");
    expect(first.objectivePerformance).toBe("IMPROVING");
    expect(first.reviewPriority).toBe("LOW");
    expect(first.evidenceSummary).toEqual(second.evidenceSummary);
    expect(first.copilotSummary).toBe(second.copilotSummary);
  });

  it("raises an evidence-backed critical review when trajectory, assumptions, environment, and scenarios conflict", () => {
    const card = deriveStrategyHealth(baseInput({
      trajectories: [{ metricKey: "revenue", metricLabel: "Revenue", direction: "DECLINING", momentum: "DECELERATING", volatility: "HIGH", status: "ACCELERATING_DECLINE", confidenceLevel: "HIGH" }],
      marketSignals: [{ relevanceLevel: "HIGH", importanceScore: 5, sentiment: "NEGATIVE", title: "Demand pressure" }],
      competitorActivities: [{ activityTrend: "INCREASING", relevanceLevel: "HIGH", title: "Competitor discounting" }],
      situations: [{ status: "ACTIVE", title: "Capacity constraint", summary: "Operating capacity is constrained." }],
      scenarios: [{ id: 90, status: "ACTIVE", strategicFit: "LOW", scenarioType: "DEFENSIVE", title: "Defensive retrenchment", description: "Protect cash while growth is under pressure." }],
      crossSignal: { relationships: [{ relationshipType: "CONTRADICTING", signalA: { impact: "NEGATIVE" }, signalB: { impact: "NEGATIVE" } }, { relationshipType: "CONTRADICTING", signalA: { impact: "NEGATIVE" }, signalB: { impact: "NEGATIVE" } }] },
      freshness: { status: "fresh", label: "Fresh", lastUpdate: now, daysSinceLastUpdate: 0 },
      businessTrajectoryState: "DETERIORATING",
    }));

    expect(["AT_RISK", "MISALIGNED"]).toContain(card.healthState);
    expect(["HIGH", "CRITICAL"]).toContain(card.reviewPriority);
    expect(card.objectivePerformance).toBe("OFF_TRACK");
    expect(card.assumptionState).toBe("CHANGED");
    expect(card.environmentFit).toBe("ADVERSE");
    expect(card.scenarioAlignment).toBe("CONFLICTING");
    expect(card.evidenceSummary.some((item) => item.includes("Competitor"))).toBe(true);
    expect(card.evidenceSummary.join(" ")).not.toContain("caused");
  });

  it("does not invent health conclusions when neither mapped telemetry nor assumptions exist", () => {
    const card = deriveStrategyHealth(baseInput({
      strategy: { id: 13, objective: "Explore a new strategic direction", targetMetric: null, status: "planning", assumptions: null, confidence: null },
      trajectories: [],
      historical: { completed: 0, positive: 0, neutral: 0, negative: 0, unknown: 0 },
      freshness: { status: "no_data", label: "No data", lastUpdate: null, daysSinceLastUpdate: null },
      businessTrajectoryState: "UNKNOWN",
    }));

    expect(card.healthState).toBe("INSUFFICIENT_DATA");
    expect(card.objectivePerformance).toBe("UNKNOWN");
    expect(card.assumptionState).toBe("UNTESTED");
    expect(card.dataConfidence).toBe("LOW");
    expect(card.evidenceStrength).toBe("LIMITED");
    expect(card.historicalEvidence).toBe("UNKNOWN");
    expect(card.evidenceSummary.join(" ")).toContain("No completed strategy outcomes");
  });

  it("treats a cost-reduction objective as off track when expenses are rising", () => {
    const card = deriveStrategyHealth(baseInput({
      strategy: { id: 14, objective: "Reduce operating expenses", targetMetric: "expenses", status: "active", assumptions: "Operating costs remain controlled", confidence: "0.75" },
      trajectories: [{ metricKey: "expenses", metricLabel: "Operating cost", direction: "IMPROVING", momentum: "ACCELERATING", volatility: "LOW", status: "HEALTHY_GROWTH", confidenceLevel: "HIGH" }],
    }));

    expect(card.targetMetric).toBe("expenses");
    expect(card.objectivePerformance).toBe("OFF_TRACK");
    expect(card.healthState).toBe("AT_RISK");
  });

  it("keeps the evidence fingerprint stable when source records are reordered", () => {
    const input = {
      strategy: { id: 12, objective: "Grow revenue", targetMetric: "revenue", status: "active", assumptions: "Market remains receptive", updatedAt: now },
      trajectories: [{ id: 1, metricKey: "revenue", direction: "IMPROVING", status: "HEALTHY_GROWTH" }],
      situations: [{ id: 2, title: "Capacity", status: "ACTIVE" }],
      marketSignals: [{ id: 3, title: "Demand", relevanceLevel: "HIGH" }],
      competitorActivities: [{ id: 4, activityTrend: "STABLE", relevanceLevel: "LOW" }],
      crossSignal: { relationships: [{ id: 5, relationshipType: "SUPPORTING" }] },
      scenarios: [{ id: 6, status: "ACTIVE", strategicFit: "HIGH" }],
      recommendations: [{ id: 7, status: "COMPLETED", outcomeStatus: "positive" }],
      outcomes: [{ id: 8, strategyId: 12, metric: "revenue", actualValue: "100" }],
      freshness: { status: "fresh", label: "Fresh", lastUpdate: now, daysSinceLastUpdate: 0 },
      businessTrajectoryState: "IMPROVING",
    };

    expect(buildEvidenceFingerprint(input)).toBe(buildEvidenceFingerprint({ ...input, trajectories: [...input.trajectories].reverse(), marketSignals: [...input.marketSignals].reverse() }));
  });

  it("retains created, reviewed, revised, and observed outcome events in chronological order", () => {
    const timeline = buildStrategyTimeline(
      { id: 12, objective: "Grow revenue", createdAt: new Date("2026-08-01T00:00:00.000Z") },
      [{ id: 2, eventType: "STRATEGY_REVIEW_ADJUST", reviewerDecision: "ADJUST", reason: "Demand changed", timestamp: new Date("2026-08-03T00:00:00.000Z") }],
      [{ id: 3, versionNumber: 2, versionStatus: "DRAFT", changeReasonCategory: "MARKET_CHANGE", rationale: "Demand changed", createdAt: new Date("2026-08-04T00:00:00.000Z") }],
      [{ id: 4, metric: "revenue", actualValue: "120", createdAt: new Date("2026-08-05T00:00:00.000Z") }],
    );

    expect(timeline.map((event) => event.eventType)).toEqual(["STRATEGY_CREATED", "STRATEGY_REVIEW_ADJUST", "STRATEGY_VERSION", "OUTCOME_OBSERVED"]);
    expect(timeline[3].detail).toContain("120");
  });
});
