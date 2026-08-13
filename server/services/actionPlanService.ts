import * as db from "../db";
import type { ActionPlan } from "../../drizzle/schema";

export const ACTION_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ExecutionHealth = "HEALTHY" | "AT_RISK" | "BLOCKED" | "OVERDUE" | "UNKNOWN";
export type ActionEventType =
  | "CREATED"
  | "EDITED"
  | "APPROVED"
  | "ASSIGNED"
  | "STARTED"
  | "BLOCKED"
  | "UNBLOCKED"
  | "COMPLETED"
  | "CANCELLED"
  | "REOPENED"
  | "EXPIRED";

const TERMINAL_STATUSES = new Set<ActionStatus>(["COMPLETED", "CANCELLED", "EXPIRED"]);
const PRIORITY_SCORE: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const ALLOWED_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  PROPOSED: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "COMPLETED", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["APPROVED"],
  CANCELLED: ["APPROVED"],
  EXPIRED: ["APPROVED"],
};

export function validateActionDraft(input: {
  title: string;
  description: string;
  expectedOutcome?: string | null;
}) {
  const issues: string[] = [];
  if (input.title.trim().length < 8) issues.push("Title must describe a concrete business action.");
  if (input.description.trim().length < 20) issues.push("Description must retain the evidence and intended next step.");
  if (!input.expectedOutcome?.trim()) issues.push("Expected outcome is required for evidence-based follow-through.");
  return { valid: issues.length === 0, issues };
}

export function isActionOverdue(action: Pick<ActionPlan, "status" | "dueDate">, now = new Date()) {
  return Boolean(action.dueDate && action.dueDate.getTime() < now.getTime() && !TERMINAL_STATUSES.has(action.status as ActionStatus));
}

export function getDueBucket(action: Pick<ActionPlan, "status" | "dueDate">, now = new Date()) {
  if (isActionOverdue(action, now)) return "OVERDUE" as const;
  if (!action.dueDate || TERMINAL_STATUSES.has(action.status as ActionStatus)) return "UNSCHEDULED" as const;
  const daysUntilDue = Math.ceil((action.dueDate.getTime() - now.getTime()) / 86_400_000);
  if (daysUntilDue <= 2) return "DUE_SOON" as const;
  return "SCHEDULED" as const;
}

export function parseDependencyIds(action: Pick<ActionPlan, "dependencyIdsJson">) {
  try {
    const value = action.dependencyIdsJson ? JSON.parse(action.dependencyIdsJson) : [];
    return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}

export interface ExecutionHealthView {
  health: ExecutionHealth;
  reason: string;
  blockedDurationHours: number;
  dependencyIds: number[];
  incompleteDependencyIds: number[];
}

export function evaluateExecutionHealth(
  action: Pick<ActionPlan, "id" | "status" | "priority" | "ownerUserId" | "dueDate" | "blockedAt" | "blockReason" | "actualOutcome" | "dependencyIdsJson">,
  actionsById: Map<number, Pick<ActionPlan, "id" | "status">> = new Map(),
  now = new Date(),
): ExecutionHealthView {
  const dependencyIds = parseDependencyIds(action);
  const incompleteDependencyIds = dependencyIds.filter((id) => {
    const dependency = actionsById.get(id);
    return !dependency || dependency.status !== "COMPLETED";
  });
  const blockedDurationHours = action.blockedAt
    ? Math.max(0, Math.floor((now.getTime() - action.blockedAt.getTime()) / 3_600_000))
    : 0;
  if (action.status === "BLOCKED") {
    return { health: "BLOCKED", reason: action.blockReason || "Action is explicitly blocked; review the recorded blocker.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  if (incompleteDependencyIds.length > 0) {
    return { health: "BLOCKED", reason: `Waiting on incomplete dependencies: ${incompleteDependencyIds.join(", ")}.`, blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  if (isActionOverdue(action, now)) {
    return { health: "OVERDUE", reason: "The action is past its due date and is not in a terminal state.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  if (action.status === "COMPLETED") {
    return { health: action.actualOutcome?.trim() ? "HEALTHY" : "AT_RISK", reason: action.actualOutcome?.trim() ? "Completed with an outcome recorded." : "Completed without a captured actual outcome.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  if (action.status === "PROPOSED") {
    return { health: "UNKNOWN", reason: "Execution health is unknown until the action is approved and owned.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  if (!action.ownerUserId) {
    return { health: "AT_RISK", reason: "No execution owner is assigned.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
  }
  const dueSoon = action.dueDate && action.dueDate.getTime() - now.getTime() <= 2 * 86_400_000;
  return { health: dueSoon ? "AT_RISK" : "HEALTHY", reason: dueSoon ? "Due within two days; confirm progress and evidence." : "Execution is progressing without a detected blocker.", blockedDurationHours, dependencyIds, incompleteDependencyIds };
}

export function getExecutionSummary(actions: ActionPlan[], now = new Date()) {
  const active = actions.filter((action) => !TERMINAL_STATUSES.has(action.status as ActionStatus));
  const completed = actions.filter((action) => action.status === "COMPLETED");
  const completedWithOutcome = completed.filter((action) => Boolean(action.actualOutcome?.trim()));
  const overdue = actions.filter((action) => isActionOverdue(action, now));
  const blocked = actions.filter((action) => action.status === "BLOCKED");
  const outcomes = completed.length === 0 ? "NO_OUTCOMES" : completedWithOutcome.length === completed.length ? "CAPTURED" : "PARTIAL";
  return {
    total: actions.length,
    active: active.length,
    proposed: actions.filter((action) => action.status === "PROPOSED").length,
    approved: actions.filter((action) => action.status === "APPROVED").length,
    inProgress: actions.filter((action) => action.status === "IN_PROGRESS").length,
    blocked: blocked.length,
    completed: completed.length,
    cancelled: actions.filter((action) => action.status === "CANCELLED").length,
    overdue: overdue.length,
    completionRate: actions.length ? Math.round((completed.length / actions.length) * 100) : 0,
    outcomeCaptureRate: completed.length ? Math.round((completedWithOutcome.length / completed.length) * 100) : 0,
    outcomes,
    priorityExposure: active.reduce((max, action) => Math.max(max, PRIORITY_SCORE[action.priority] ?? 0), 0),
    executionHealth: {
      healthy: actions.filter((action) => (action.executionHealth || "UNKNOWN") === "HEALTHY").length,
      atRisk: actions.filter((action) => (action.executionHealth || "UNKNOWN") === "AT_RISK").length,
      blocked: actions.filter((action) => (action.executionHealth || "UNKNOWN") === "BLOCKED").length,
      overdue: actions.filter((action) => (action.executionHealth || "UNKNOWN") === "OVERDUE").length,
      unknown: actions.filter((action) => !["HEALTHY", "AT_RISK", "BLOCKED", "OVERDUE"].includes(action.executionHealth || "UNKNOWN")).length,
    },
  };
}

export function getExecutionRiskSummary(actions: ActionPlan[], now = new Date()) {
  const overdueHighPriority = actions.filter((action) => isActionOverdue(action, now) && ["CRITICAL", "HIGH"].includes(action.priority));
  const blocked = actions.filter((action) => action.status === "BLOCKED");
  if (overdueHighPriority.length > 0) {
    return {
      level: "HIGH" as const,
      message: `${overdueHighPriority.length} high-priority action${overdueHighPriority.length === 1 ? " is" : "s are"} overdue and require review.`,
      actionIds: overdueHighPriority.map((action) => action.id),
    };
  }
  if (blocked.length > 0) {
    return {
      level: "MEDIUM" as const,
      message: `${blocked.length} action${blocked.length === 1 ? " is" : "s are"} blocked; review the recorded dependencies before changing scope.`,
      actionIds: blocked.map((action) => action.id),
    };
  }
  return { level: "LOW" as const, message: "No high-priority execution risk is currently flagged.", actionIds: [] as number[] };
}

export function formatActionOutcomeNotes(input: {
  expectedOutcome?: string | null;
  actualOutcome: string;
  completionNotes: string;
  evidence?: string | null;
}) {
  return `Expected: ${input.expectedOutcome || "Not recorded"}\nActual: ${input.actualOutcome}\nCompletion notes: ${input.completionNotes}${input.evidence ? `\nEvidence: ${input.evidence}` : ""}`;
}

export function sortActionQueue(actions: ActionPlan[], now = new Date()) {
  return [...actions].sort((a, b) => {
    const overdueDelta = Number(isActionOverdue(b, now)) - Number(isActionOverdue(a, now));
    if (overdueDelta !== 0) return overdueDelta;
    const priorityDelta = (PRIORITY_SCORE[b.priority] ?? 0) - (PRIORITY_SCORE[a.priority] ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    const aDue = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });
}

export function assertTransition(from: ActionStatus, to: ActionStatus) {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid action transition from ${from} to ${to}.`);
  }
}

export async function getActionQueueForBusiness(businessId: number, now = new Date()) {
  const actions = await db.getActionPlansForBusiness(businessId);
  const sorted = sortActionQueue(actions, now);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const enriched = sorted.map((action) => {
    const health = evaluateExecutionHealth(action, actionsById, now);
    return { ...action, dueBucket: getDueBucket(action, now), overdue: isActionOverdue(action, now), ...health, executionHealth: health.health, executionHealthReason: health.reason };
  });
  const summary = getExecutionSummary(enriched as ActionPlan[], now);
  return { actions: enriched, summary, generatedAt: now };
}

export async function getActionDetailForBusiness(businessId: number, actionPlanId: number) {
  const action = await db.getActionPlanById(businessId, actionPlanId);
  if (!action) return undefined;
  const history = await db.getActionPlanEvents(businessId, actionPlanId);
  const outcomes = await db.getOutcomesForActionPlan(businessId, actionPlanId);
  const allActions = await db.getActionPlansForBusiness(businessId);
  const health = evaluateExecutionHealth(action, new Map(allActions.map((item) => [item.id, item])), new Date());
  return { action: { ...action, ...health, executionHealth: health.health, executionHealthReason: health.reason }, outcomes, history, dueBucket: getDueBucket(action), overdue: isActionOverdue(action) };
}

export async function transitionAction(
  businessId: number,
  actionPlanId: number,
  actorUserId: number,
  to: ActionStatus,
  details?: Record<string, unknown>
) {
  const action = await db.getActionPlanById(businessId, actionPlanId);
  if (!action) throw new Error("Action not found.");
  const from = action.status as ActionStatus;
  assertTransition(from, to);
  const now = new Date();
  const patch: Record<string, unknown> = { status: to };
  if (to === "IN_PROGRESS") patch.startedAt = action.startedAt ?? now;
  if (to === "BLOCKED") {
    patch.blockedAt = now;
    if (typeof details?.reason === "string") patch.blockReason = details.reason;
  }
  if (to === "COMPLETED") {
    patch.completedAt = now;
    patch.completedBy = actorUserId;
  }
  if (to === "APPROVED" && (from === "COMPLETED" || from === "CANCELLED" || from === "EXPIRED")) {
    patch.completedAt = null;
    patch.completedBy = null;
    patch.blockedAt = null;
    patch.actualOutcome = null;
    patch.completionNotes = null;
  }
  if (to === "IN_PROGRESS" && from === "BLOCKED") patch.blockReason = null;
  await db.updateActionPlan(businessId, actionPlanId, patch as Partial<ActionPlan>);
  await db.createActionPlanEvent({
    businessId,
    actionPlanId,
    eventType: to === "APPROVED" && from !== "PROPOSED" ? "REOPENED" : to,
    previousStatus: from,
    newStatus: to,
    actorUserId,
    detailsJson: details ? JSON.stringify(details) : null,
  });
  return await db.getActionPlanById(businessId, actionPlanId);
}

export function buildActionProposal(input: {
  sourceType: string;
  sourceId?: number;
  title: string;
  summary: string;
  priority?: string;
  expectedOutcome?: string;
  dependencyIds?: number[];
  decisionId?: number;
  strategyId?: number;
  objectiveId?: number;
  situationId?: number;
  opportunityId?: number;
  threatId?: number;
}) {
  const proposal = {
    title: input.title.trim(),
    description: input.summary.trim(),
    actionType: input.sourceType === "DECISION" ? "DECISION_FOLLOW_THROUGH" : input.sourceType === "STRATEGY" ? "STRATEGY_EXECUTION" : "SIGNAL_RESPONSE",
    priority: input.priority ?? "MEDIUM",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    expectedOutcome: input.expectedOutcome?.trim() || "Record the observed result against this evidence-backed action.",
    expectedResult: input.expectedOutcome?.trim() || "Record the observed result against this evidence-backed action.",
    dependencyIdsJson: input.dependencyIds?.length ? JSON.stringify(Array.from(new Set(input.dependencyIds.filter((id) => Number.isInteger(id) && id > 0)))) : null,
    decisionId: input.decisionId,
    strategyId: input.strategyId,
    objectiveId: input.objectiveId,
    situationId: input.situationId,
    opportunityId: input.opportunityId,
    threatId: input.threatId,
  };
  return { ...proposal, validation: validateActionDraft(proposal) };
}
