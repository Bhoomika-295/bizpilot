import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getActionPlansForBusiness: vi.fn(),
  getActionPlanById: vi.fn(),
  getActionPlanEvents: vi.fn(),
  getOutcomesForActionPlan: vi.fn(),
  updateActionPlan: vi.fn(),
  createActionPlanEvent: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import {
  assertTransition,
  buildActionProposal,
  getActionDetailForBusiness,
  getActionQueueForBusiness,
  getDueBucket,
  getExecutionSummary,
  getExecutionRiskSummary,
  evaluateExecutionHealth,
  parseDependencyIds,
  formatActionOutcomeNotes,
  isActionOverdue,
  sortActionQueue,
  transitionAction,
  validateActionDraft,
} from "./services/actionPlanService";

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    businessId: 42,
    title: "Validate retained-customer pricing response",
    description: "Contact five retained customers and record their response to the proposed pricing change.",
    actionType: "REVIEW",
    status: "IN_PROGRESS" as const,
    priority: "HIGH",
    sourceType: "ATTENTION",
    sourceId: 7,
    decisionId: null,
    strategyId: null,
    objectiveId: null,
    situationId: 7,
    opportunityId: null,
    threatId: null,
    ownerUserId: 11,
    createdByUserId: 11,
    dueDate: new Date("2026-08-12T12:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    completedBy: null,
    actualOutcome: null,
    expectedOutcome: "Capture five responses and compare willingness to pay against the baseline.",
    completionNotes: null,
    blockReason: null,
    dependencyIdsJson: null,
    evidence: "Attention item #7: pricing sensitivity is rising.",
    createdAt: new Date("2026-08-10T12:00:00.000Z"),
    updatedAt: new Date("2026-08-10T12:00:00.000Z"),
    ...overrides,
  };
}

describe("Intelligent Action Planning & Execution Loop v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a concrete action and an observable expected outcome", () => {
    expect(validateActionDraft({ title: "Review", description: "Short", expectedOutcome: "" }).valid).toBe(false);
    expect(validateActionDraft({ title: "Validate pricing response", description: "Contact five retained customers and record the response.", expectedOutcome: "Compare response to baseline." }).valid).toBe(true);
  });

  it("sorts overdue actions before higher-priority scheduled actions, then by due date", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const overdue = action({ id: 1, dueDate: new Date("2026-08-11T12:00:00.000Z"), priority: "MEDIUM" });
    const dueSoon = action({ id: 2, dueDate: new Date("2026-08-13T12:00:00.000Z"), priority: "CRITICAL" });
    const later = action({ id: 3, dueDate: new Date("2026-08-20T12:00:00.000Z"), priority: "HIGH" });
    const sorted = sortActionQueue([later, dueSoon, overdue], now);
    expect(sorted.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(isActionOverdue(overdue, now)).toBe(true);
    expect(getDueBucket(overdue, now)).toBe("OVERDUE");
    expect(getDueBucket(dueSoon, now)).toBe("DUE_SOON");
  });

  it("summarizes completion and outcome capture separately", () => {
    const completedWithOutcome = action({ id: 1, status: "COMPLETED", actualOutcome: "Five responses captured." });
    const completedWithoutOutcome = action({ id: 2, status: "COMPLETED", actualOutcome: null });
    const blocked = action({ id: 3, status: "BLOCKED" });
    const summary = getExecutionSummary([completedWithOutcome, completedWithoutOutcome, blocked], new Date("2026-08-12T12:00:00.000Z"));
    expect(summary.completed).toBe(2);
    expect(summary.blocked).toBe(1);
    expect(summary.outcomeCaptureRate).toBe(50);
    expect(summary.outcomes).toBe("PARTIAL");
  });

  it("evaluates blocked duration and incomplete dependencies without inferring causation", () => {
    const now = new Date("2026-08-14T12:00:00.000Z");
    const blocked = action({ status: "BLOCKED", blockedAt: new Date("2026-08-12T12:00:00.000Z"), blockReason: "Awaiting finance approval." });
    const blockedHealth = evaluateExecutionHealth(blocked, new Map([[blocked.id, blocked]]), now);
    expect(blockedHealth.health).toBe("BLOCKED");
    expect(blockedHealth.blockedDurationHours).toBe(48);
    expect(blockedHealth.reason).toContain("finance approval");

    const waiting = action({ id: 2, dependencyIdsJson: JSON.stringify([1, 99]) });
    const dependencyHealth = evaluateExecutionHealth(waiting, new Map([[1, action({ id: 1, status: "IN_PROGRESS" })], [2, waiting]]), now);
    expect(parseDependencyIds(waiting)).toEqual([1, 99]);
    expect(dependencyHealth.health).toBe("BLOCKED");
    expect(dependencyHealth.incompleteDependencyIds).toEqual([1, 99]);
  });

  it("marks completed actions without observed outcomes as at risk", () => {
    const completed = action({ status: "COMPLETED", actualOutcome: null });
    const health = evaluateExecutionHealth(completed, new Map([[completed.id, completed]]), new Date("2026-08-14T12:00:00.000Z"));
    expect(health.health).toBe("AT_RISK");
    expect(health.reason).toContain("without a captured actual outcome");
  });

  it("allows only explicitly supported lifecycle transitions", () => {
    expect(() => assertTransition("PROPOSED", "APPROVED")).not.toThrow();
    expect(() => assertTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
    expect(() => assertTransition("PROPOSED", "COMPLETED")).toThrow("Invalid action transition");
  });

  it("persists a blocked transition and retains the tenant and actor in the event", async () => {
    const stored = action({ status: "IN_PROGRESS" });
    dbMocks.getActionPlanById.mockResolvedValue(stored);
    await transitionAction(42, 1, 11, "BLOCKED", { reason: "Waiting for customer cohort export." });
    expect(dbMocks.getActionPlanById).toHaveBeenCalledWith(42, 1);
    expect(dbMocks.updateActionPlan).toHaveBeenCalledWith(42, 1, expect.objectContaining({ status: "BLOCKED", blockReason: "Waiting for customer cohort export." }));
    expect(dbMocks.createActionPlanEvent).toHaveBeenCalledWith(expect.objectContaining({
      businessId: 42,
      actionPlanId: 1,
      actorUserId: 11,
      previousStatus: "IN_PROGRESS",
      newStatus: "BLOCKED",
      detailsJson: JSON.stringify({ reason: "Waiting for customer cohort export." }),
    }));
  });

  it("keeps queue and detail reads tenant-scoped", async () => {
    const tenantAction = action({ businessId: 42 });
    dbMocks.getActionPlansForBusiness.mockResolvedValue([tenantAction]);
    dbMocks.getActionPlanById.mockResolvedValue(tenantAction);
    dbMocks.getActionPlanEvents.mockResolvedValue([]);
    const queue = await getActionQueueForBusiness(42, new Date("2026-08-12T12:00:00.000Z"));
    const detail = await getActionDetailForBusiness(42, 1);
    expect(dbMocks.getActionPlansForBusiness).toHaveBeenCalledWith(42);
    expect(dbMocks.getActionPlanById).toHaveBeenCalledWith(42, 1);
    expect(queue.actions[0].businessId).toBe(42);
    expect(detail?.action.businessId).toBe(42);
  });

  it("flags only materially important overdue execution risk", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const risk = getExecutionRiskSummary([
      action({ id: 1, priority: "LOW", dueDate: new Date("2026-08-10T12:00:00.000Z") }),
      action({ id: 2, priority: "HIGH", dueDate: new Date("2026-08-10T12:00:00.000Z") }),
    ], now);
    expect(risk.level).toBe("HIGH");
    expect(risk.actionIds).toEqual([2]);
    expect(risk.message).toContain("high-priority");
  });

  it("formats verified expected and actual action evidence for the shared outcome system", () => {
    const notes = formatActionOutcomeNotes({
      expectedOutcome: "Compare conversion against baseline.",
      actualOutcome: "Conversion was unchanged.",
      completionNotes: "Measured from the latest cohort.",
      evidence: "Cohort report dated 2026-08-12.",
    });
    expect(notes).toContain("Expected: Compare conversion against baseline.");
    expect(notes).toContain("Actual: Conversion was unchanged.");
    expect(notes).toContain("Evidence: Cohort report dated 2026-08-12.");
  });

  it("builds source-transparent proposals without autonomous execution", () => {
    const proposal = buildActionProposal({
      sourceType: "DECISION",
      sourceId: 12,
      decisionId: 12,
      title: "Follow through: Review pricing test",
      summary: "Run the pricing test with a defined customer cohort.",
      priority: "HIGH",
      expectedOutcome: "Compare conversion and retention against baseline.",
    });
    expect(proposal.actionType).toBe("DECISION_FOLLOW_THROUGH");
    expect(proposal.sourceType).toBe("DECISION");
    expect(proposal.validation.valid).toBe(true);
  });
});
