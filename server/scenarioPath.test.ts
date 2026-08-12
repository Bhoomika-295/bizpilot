import { describe, expect, it } from "vitest";
import {
  allowedScenarioTransition,
  buildScenarioScorecard,
  compareScenarioScorecards,
  scenarioAssumptionStatus,
  scenarioExplanation,
  scenarioPathSummaryForCard,
  scenarioToDecisionDraftPayload,
  type ScenarioContext,
  type ScenarioPathInput,
} from "./services/scenarioPathService";

describe("Strategic Scenario Simulation & Path Comparison v2 (Day 25)", () => {
  const baseContext: ScenarioContext = {
    trajectory: {
      state: "EARLY_WARNING",
      confidenceLevel: "HIGH",
      supportingSignals: ["Revenue momentum softened", "Customer retention warning"],
      trajectories: [
        { metricKey: "revenue", evidenceCount: 4 },
        { metricKey: "customers", evidenceCount: 3 },
      ],
    } as any,
    relationships: [
      {
        relationshipType: "CONVERGING",
        strength: "HIGH",
        freshness: "FRESH",
        explanation: "Revenue and retention signals are moving together.",
      },
    ],
    situations: [{ id: 10, status: "ACTIVE", title: "Retention pressure" }],
    opportunities: [
      { id: 20, status: "OPEN", title: "Retention recovery program" },
      { id: 21, status: "ACTIVE", title: "Customer expansion" },
    ],
    strategies: [{ id: 30, status: "ACTIVE", title: "Customer retention", category: "CUSTOMERS" }],
    outcomes: [{ id: 40, status: "COMPLETED", title: "Retention recovery", summary: "Retention improved after targeted support." }],
    decisions: [{ id: 50, status: "OPEN", title: "Review retention investment" }],
  };

  const baseline: ScenarioPathInput & { scenarioId: number } = {
    businessId: 7,
    scenarioId: 101,
    pathKind: "BASELINE",
    pathKey: "BASELINE",
    title: "Continue current operating plan",
    objective: "Maintain current operating plan",
    assumptions: [],
    affectedAreas: ["customers"],
    expectedDirection: { retention: "remain stable" },
    actions: [],
  };

  const alternative: ScenarioPathInput & { scenarioId: number } = {
    businessId: 7,
    scenarioId: 102,
    pathKind: "ALTERNATIVE",
    pathKey: "RETENTION_RECOVERY",
    title: "Invest in retention recovery",
    objective: "Stabilize retention and recover customer value",
    assumptions: [
      {
        key: "customer-adoption",
        label: "Customers adopt the recovery program",
        value: "At least 40% participation",
        confidence: "MEDIUM",
        evidence: ["Recent retention recovery outcome"],
        invalidationSignal: "retention deteriorates",
      },
      {
        key: "execution-capacity",
        label: "Team capacity is available",
        value: "Two operators assigned",
        confidence: "MEDIUM",
        evidence: ["Capacity planning note"],
      },
    ],
    affectedAreas: ["customers", "retention"],
    expectedDirection: { retention: "improve" },
    actions: ["Launch recovery program", "Review weekly retention cohort"],
  };

  it("produces transparent, deterministic scorecards for baseline and alternative paths", () => {
    const baselineScore = buildScenarioScorecard(baseline, baseContext);
    const alternativeScore = buildScenarioScorecard(alternative, baseContext);

    expect(baselineScore.pathKind).toBe("BASELINE");
    expect(baselineScore.risk).toBe("HIGH");
    expect(alternativeScore.pathKind).toBe("ALTERNATIVE");
    expect(alternativeScore.trajectoryAlignment).toBe("MEDIUM");
    expect(alternativeScore.evidenceCount).toBeGreaterThan(0);
    expect(alternativeScore.interpretation).toContain("assumption");
    expect(alternativeScore.interpretation).not.toContain("caused");
  });

  it("ranks a path comparison deterministically and exposes a compact card summary", () => {
    const baselineScore = buildScenarioScorecard(baseline, baseContext);
    const alternativeScore = buildScenarioScorecard(alternative, baseContext);
    const scenarios = [baselineScore, alternativeScore];
    const ranked = [...scenarios].sort(compareScenarioScorecards);
    const rankedAgain = [...scenarios].sort(compareScenarioScorecards);
    const summary = scenarioPathSummaryForCard({
      businessId: 7,
      comparisonKey: "business:7:strategic-paths",
      title: "Strategic Paths",
      baselineScenarioId: 101,
      scenarios,
      recommendedReviewOrder: [102, 101],
      interpretation: "Review the alternative path before retaining the baseline.",
      uncertainty: "MEDIUM",
      updatedAt: new Date("2026-08-12T00:00:00Z"),
    });

    expect(ranked.map((item) => item.title)).toEqual(rankedAgain.map((item) => item.title));
    expect(new Set(ranked.map((item) => item.pathKey)).size).toBe(2);
    expect(summary).toHaveLength(2);
    expect(summary[0]).toHaveProperty("scenarioId");
    expect(summary[0]).toHaveProperty("interpretation");
  });

  it("classifies assumption support without inventing evidence", () => {
    expect(scenarioAssumptionStatus(alternative.assumptions[0])).toBe("SUPPORTED");
    expect(scenarioAssumptionStatus({
      key: "unsupported",
      label: "Unverified capacity",
      value: "Unknown",
      confidence: "LOW",
    })).toBe("UNSUPPORTED");
    expect(scenarioAssumptionStatus({
      key: "watch",
      label: "Watch adoption",
      value: "Unknown",
      confidence: "LOW",
      evidence: ["One early observation"],
    })).toBe("WATCH");
  });

  it("creates an explainable decision-draft payload from a scorecard", () => {
    const scorecard = buildScenarioScorecard(alternative, baseContext);
    const payload = scenarioToDecisionDraftPayload(scorecard);
    const explanation = scenarioExplanation(scorecard);

    expect(payload.title).toBe("Review Invest in retention recovery");
    expect(payload.options).toContain("Compare paths");
    expect(explanation).toContain("Why this scenario exists");
    expect(explanation).toContain("What we do not know");
  });

  it("enforces the scenario lifecycle transition rules", () => {
    expect(allowedScenarioTransition("DRAFT", "ACTIVE")).toBe(true);
    expect(allowedScenarioTransition("ACTIVE", "UNDER_REVIEW")).toBe(true);
    expect(allowedScenarioTransition("UNDER_REVIEW", "SELECTED")).toBe(true);
    expect(allowedScenarioTransition("SELECTED", "COMPLETED")).toBe(true);
    expect(allowedScenarioTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(allowedScenarioTransition("ARCHIVED", "ACTIVE")).toBe(false);
  });
});
