import {
  getActionPlansForBusiness,
  getAllDecisionCandidates,
  getOutcomesForBusiness,
} from "../db";
import { evaluateExecutionHealth, type ExecutionHealth } from "./actionPlanService";

type DecisionRow = Awaited<ReturnType<typeof getAllDecisionCandidates>>[number];
type ActionRow = Awaited<ReturnType<typeof getActionPlansForBusiness>>[number];
type OutcomeRow = Awaited<ReturnType<typeof getOutcomesForBusiness>>[number];

export type ChainGapKind =
  | "DECISION_CONTEXT_INCOMPLETE"
  | "FOLLOW_THROUGH_GAP"
  | "OUTCOME_REVIEW_NEEDED"
  | "LEARNING_OPPORTUNITY";

export interface ChainGap {
  kind: ChainGapKind;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  explanation: string;
  decisionId?: number;
  actionId?: number;
  outcomeId?: number;
}

export interface IntelligenceChainNode {
  type: "SIGNAL" | "SITUATION" | "ROOT_CAUSE" | "FORESIGHT" | "STRATEGY" | "DECISION" | "ACTION" | "EXECUTION" | "OUTCOME" | "LESSON" | "MEMORY";
  id: number | null;
  label: string;
  status: string;
  recorded: boolean;
  detail: string;
}

export interface DecisionToOutcomeChain {
  decisionId: number;
  decisionTitle: string;
  decisionStatus: string;
  nodes: IntelligenceChainNode[];
  gaps: ChainGap[];
  actions: Array<{
    id: number;
    title: string;
    status: string;
    executionHealth: ExecutionHealth;
    executionHealthReason: string;
    blockedDurationHours: number;
    hasOutcome: boolean;
    outcomeReviewed: boolean;
  }>;
  outcomes: Array<{
    id: number;
    actionId: number | null;
    varianceStatus: string;
    reviewed: boolean;
    lessonRecorded: boolean;
  }>;
}

export interface BusinessFollowThrough {
  decisionsMade: number;
  decisionsAwaitingExecution: number;
  actionsCreated: number;
  actionsCompleted: number;
  blockedActions: number;
  outcomesRecorded: number;
  outcomesAwaitingReview: number;
  lessonsCreated: number;
  gaps: ChainGap[];
  chains: DecisionToOutcomeChain[];
  executionHealth: Record<ExecutionHealth, number>;
}

function isImportantDecision(decision: DecisionRow) {
  return decision.priority === "HIGH" || decision.urgency === "NOW" || decision.potentialImpact === "HIGH";
}

function hasDecisionContext(decision: DecisionRow) {
  return Boolean(decision.whyMatters?.trim() && decision.evidenceChainJson?.trim() && decision.whatWeKnowJson?.trim());
}

function isReviewed(outcome: OutcomeRow) {
  return Boolean(outcome.reviewedAt && outcome.reviewedByUserId && outcome.decisionEffectiveness);
}

function executionNode(action: ActionRow, health: ReturnType<typeof evaluateExecutionHealth>): IntelligenceChainNode {
  return {
    type: "EXECUTION",
    id: action.id,
    label: health.health === "HEALTHY" ? "Execution progressing" : `Execution ${health.health.toLowerCase().replace("_", " ")}`,
    status: health.health,
    recorded: Boolean(action.startedAt || action.completedAt || action.blockedAt || action.status === "IN_PROGRESS" || action.status === "BLOCKED" || action.status === "COMPLETED"),
    detail: health.reason,
  };
}

export function buildDecisionToOutcomeChains(input: {
  decisions: DecisionRow[];
  actions: ActionRow[];
  outcomes: OutcomeRow[];
  now?: Date;
}): DecisionToOutcomeChain[] {
  const now = input.now ?? new Date();
  const actionsById = new Map(input.actions.map((action) => [action.id, action]));
  const outcomesByActionId = new Map<number, OutcomeRow[]>();
  for (const outcome of input.outcomes) {
    if (outcome.actionPlanId === null) continue;
    const existing = outcomesByActionId.get(outcome.actionPlanId) ?? [];
    existing.push(outcome);
    outcomesByActionId.set(outcome.actionPlanId, existing);
  }

  return input.decisions.map((decision) => {
    const decisionActions = input.actions.filter((action) => action.decisionId === decision.id);
    const gaps: ChainGap[] = [];
    if (!hasDecisionContext(decision)) {
      gaps.push({ kind: "DECISION_CONTEXT_INCOMPLETE", severity: "MEDIUM", title: "Decision context incomplete", explanation: "The decision is recorded, but its rationale or evidence context is not fully recorded.", decisionId: decision.id });
    }
    if (isImportantDecision(decision) && decisionActions.length === 0 && !["DISMISSED", "EXPIRED"].includes(decision.status)) {
      gaps.push({ kind: "FOLLOW_THROUGH_GAP", severity: "HIGH", title: "Follow-through gap", explanation: "An important decision has no corresponding action record. No action was created automatically.", decisionId: decision.id });
    }

    const actionViews = decisionActions.map((action) => {
      const health = evaluateExecutionHealth(action, actionsById, now);
      const actionOutcomes = outcomesByActionId.get(action.id) ?? [];
      const latestOutcome = actionOutcomes[0];
      if (action.status === "COMPLETED" && !latestOutcome) {
        gaps.push({ kind: "OUTCOME_REVIEW_NEEDED", severity: "HIGH", title: "Outcome review needed", explanation: "The action is completed, but no observed outcome has been recorded.", decisionId: decision.id, actionId: action.id });
      }
      if (latestOutcome && !isReviewed(latestOutcome)) {
        gaps.push({ kind: "OUTCOME_REVIEW_NEEDED", severity: "MEDIUM", title: "Outcome review needed", explanation: "An observed outcome exists but has not received a human-confirmed review.", decisionId: decision.id, actionId: action.id, outcomeId: latestOutcome.id });
      }
      if (latestOutcome && isReviewed(latestOutcome) && !latestOutcome.lessonMemoryId) {
        gaps.push({ kind: "LEARNING_OPPORTUNITY", severity: "LOW", title: "Learning opportunity", explanation: "A meaningful reviewed outcome has no linked lesson memory yet.", decisionId: decision.id, actionId: action.id, outcomeId: latestOutcome.id });
      }
      return {
        id: action.id,
        title: action.title,
        status: action.status,
        executionHealth: health.health,
        executionHealthReason: health.reason,
        blockedDurationHours: health.blockedDurationHours,
        hasOutcome: actionOutcomes.length > 0,
        outcomeReviewed: actionOutcomes.some(isReviewed),
      };
    });

    const chainOutcomes = decisionActions.flatMap((action) => (outcomesByActionId.get(action.id) ?? []).map((outcome) => ({
      id: outcome.id,
      actionId: outcome.actionPlanId,
      varianceStatus: outcome.varianceStatus,
      reviewed: isReviewed(outcome),
      lessonRecorded: Boolean(outcome.lessonMemoryId),
    })));

    const nodes: IntelligenceChainNode[] = [
      { type: "DECISION", id: decision.id, label: decision.title, status: decision.status, recorded: true, detail: decision.whyMatters },
      ...decisionActions.flatMap((action) => {
        const health = evaluateExecutionHealth(action, actionsById, now);
        const actionOutcomes = outcomesByActionId.get(action.id) ?? [];
        return [
          { type: "ACTION" as const, id: action.id, label: action.title, status: action.status, recorded: true, detail: action.expectedResult || action.expectedOutcome || "Expected result not recorded." },
          executionNode(action, health),
          ...actionOutcomes.map((outcome) => ({ type: "OUTCOME" as const, id: outcome.id, label: outcome.actualResultSummary || outcome.actualResultSummary || "Observed outcome recorded", status: outcome.varianceStatus, recorded: true, detail: outcome.notes || "Outcome source details are not recorded." })),
          ...actionOutcomes.filter((outcome) => Boolean(outcome.lessonMemoryId)).map((outcome) => ({ type: "LESSON" as const, id: outcome.lessonMemoryId, label: "Lesson recorded", status: "RECORDED", recorded: true, detail: "Linked through the reviewed outcome." })),
        ];
      }),
    ];

    return {
      decisionId: decision.id,
      decisionTitle: decision.title,
      decisionStatus: decision.status,
      nodes,
      gaps,
      actions: actionViews,
      outcomes: chainOutcomes,
    };
  });
}

export function summarizeBusinessFollowThrough(chains: DecisionToOutcomeChain[]): BusinessFollowThrough {
  const actions = chains.flatMap((chain) => chain.actions);
  const outcomes = chains.flatMap((chain) => chain.outcomes);
  const gaps = chains.flatMap((chain) => chain.gaps);
  const executionHealth: Record<ExecutionHealth, number> = { HEALTHY: 0, AT_RISK: 0, BLOCKED: 0, OVERDUE: 0, UNKNOWN: 0 };
  for (const action of actions) executionHealth[action.executionHealth] += 1;
  const decisionsMade = chains.filter((chain) => ["DECIDED", "IN_REVIEW"].includes(chain.decisionStatus)).length;
  return {
    decisionsMade,
    decisionsAwaitingExecution: gaps.filter((gap) => gap.kind === "FOLLOW_THROUGH_GAP").length,
    actionsCreated: actions.length,
    actionsCompleted: actions.filter((action) => action.status === "COMPLETED").length,
    blockedActions: actions.filter((action) => action.executionHealth === "BLOCKED").length,
    outcomesRecorded: outcomes.length,
    outcomesAwaitingReview: gaps.filter((gap) => gap.kind === "OUTCOME_REVIEW_NEEDED").length,
    lessonsCreated: outcomes.filter((outcome) => outcome.lessonRecorded).length,
    gaps,
    chains,
    executionHealth,
  };
}

export async function getBusinessFollowThrough(businessId: number): Promise<BusinessFollowThrough> {
  const [decisions, actions, outcomes] = await Promise.all([
    getAllDecisionCandidates(businessId),
    getActionPlansForBusiness(businessId),
    getOutcomesForBusiness(businessId),
  ]);
  return summarizeBusinessFollowThrough(buildDecisionToOutcomeChains({ decisions, actions, outcomes }));
}

export function getMorningFollowThrough(followThrough: BusinessFollowThrough) {
  return followThrough.gaps
    .filter((gap) => gap.severity === "HIGH")
    .slice(0, 6)
    .map((gap) => ({ title: gap.title, detail: gap.explanation, kind: gap.kind, decisionId: gap.decisionId, actionId: gap.actionId, outcomeId: gap.outcomeId }));
}
