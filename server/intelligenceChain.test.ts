import { describe, expect, it } from "vitest";
import { buildDecisionToOutcomeChains, summarizeBusinessFollowThrough } from "./services/intelligenceChainService";

function decision(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    businessId: 42,
    decisionKey: "pricing-response",
    title: "Respond to rising pricing sensitivity",
    category: "MARKET",
    priority: "HIGH",
    priorityScore: 85,
    urgency: "NOW",
    potentialImpact: "HIGH",
    evidenceStrength: "HIGH",
    confidence: "MEDIUM",
    sourceType: "SITUATION",
    evidenceChainJson: "[{\"source\":\"situation:7\"}]",
    whyMatters: "Retention risk is increasing.",
    whatWeKnowJson: "[\"Recent cohort response is below baseline.\"]",
    whatWeDontKnowJson: "[\"Long-term elasticity is unknown.\"]",
    potentialConsequences: "Protect retention while testing price response.",
    reversibility: "PARTIAL",
    actionOptionsJson: "[{\"label\":\"Test\"}]",
    status: "DECIDED",
    ...overrides,
  } as any;
}

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    businessId: 42,
    title: "Run a retained-customer pricing test",
    description: "Measure response against the baseline cohort.",
    actionType: "REVIEW",
    status: "IN_PROGRESS",
    priority: "HIGH",
    sourceType: "DECISION",
    sourceId: 1,
    decisionId: 1,
    strategyId: null,
    dependencyIdsJson: null,
    expectedResult: "Capture and compare five customer responses.",
    expectedOutcome: "Capture and compare five customer responses.",
    executionHealth: "UNKNOWN",
    executionHealthReason: null,
    blockedDurationHours: 0,
    lastExecutionReviewAt: null,
    ownerUserId: 11,
    dueDate: new Date("2026-08-20T12:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    blockedAt: null,
    actualOutcome: null,
    blockReason: null,
    createdAt: new Date("2026-08-10T12:00:00.000Z"),
    updatedAt: new Date("2026-08-10T12:00:00.000Z"),
    ...overrides,
  } as any;
}

function outcome(overrides: Record<string, unknown> = {}) {
  return {
    id: 21,
    businessId: 42,
    actionPlanId: 10,
    decisionId: 1,
    expectedResult: "Capture and compare five customer responses.",
    actualResultSummary: "Five responses captured; willingness to pay was unchanged.",
    varianceStatus: "MATCHED",
    decisionEffectiveness: null,
    reviewConfidence: null,
    reviewedByUserId: null,
    reviewedAt: null,
    lessonMemoryId: null,
    notes: "Cohort report dated 2026-08-20.",
    updatedAt: new Date("2026-08-20T12:00:00.000Z"),
    ...overrides,
  } as any;
}

describe("Decision-to-Outcome intelligence chain", () => {
  it("flags an important decision with no action as a follow-through gap", () => {
    const [chain] = buildDecisionToOutcomeChains({ decisions: [decision()], actions: [], outcomes: [] });
    expect(chain.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "FOLLOW_THROUGH_GAP", severity: "HIGH", decisionId: 1 }),
    ]));
  });

  it("keeps dependency blocking explicit without inferring causation", () => {
    const [chain] = buildDecisionToOutcomeChains({
      decisions: [decision()],
      actions: [
        action({ id: 10, status: "IN_PROGRESS" }),
        action({ id: 11, title: "Publish the test offer", dependencyIdsJson: "[10]", status: "APPROVED" }),
      ],
      outcomes: [],
      now: new Date("2026-08-15T12:00:00.000Z"),
    });
    const dependentAction = chain.actions.find((item) => item.id === 11);
    expect(dependentAction?.executionHealth).toBe("BLOCKED");
    expect(dependentAction?.executionHealthReason).toContain("dependencies");
    expect(chain.gaps.some((gap) => gap.kind === "FOLLOW_THROUGH_GAP")).toBe(false);
  });

  it("flags completed outcomes for human review and reviewed outcomes without lessons as learning opportunities", () => {
    const [pendingChain] = buildDecisionToOutcomeChains({
      decisions: [decision()],
      actions: [action({ status: "COMPLETED", completedAt: new Date("2026-08-20T12:00:00.000Z"), actualOutcome: "Five responses captured." })],
      outcomes: [outcome()],
    });
    expect(pendingChain.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "OUTCOME_REVIEW_NEEDED", outcomeId: 21 }),
    ]));

    const [reviewedChain] = buildDecisionToOutcomeChains({
      decisions: [decision()],
      actions: [action({ status: "COMPLETED", completedAt: new Date("2026-08-20T12:00:00.000Z"), actualOutcome: "Five responses captured." })],
      outcomes: [outcome({ decisionEffectiveness: "EFFECTIVE", reviewConfidence: "HIGH", reviewedByUserId: 11, reviewedAt: new Date("2026-08-21T12:00:00.000Z") })],
    });
    expect(reviewedChain.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "LEARNING_OPPORTUNITY", outcomeId: 21 }),
    ]));
  });

  it("summarizes action health, review backlog, and recorded lessons from the same chains", () => {
    const chains = buildDecisionToOutcomeChains({
      decisions: [decision()],
      actions: [action({ status: "COMPLETED", completedAt: new Date("2026-08-20T12:00:00.000Z"), actualOutcome: "Measured." })],
      outcomes: [outcome({ decisionEffectiveness: "EFFECTIVE", reviewConfidence: "HIGH", reviewedByUserId: 11, reviewedAt: new Date("2026-08-21T12:00:00.000Z"), lessonMemoryId: 99 })],
    });
    const summary = summarizeBusinessFollowThrough(chains);
    expect(summary.decisionsMade).toBe(1);
    expect(summary.actionsCompleted).toBe(1);
    expect(summary.outcomesRecorded).toBe(1);
    expect(summary.lessonsCreated).toBe(1);
    expect(summary.outcomesAwaitingReview).toBe(0);
  });
});
