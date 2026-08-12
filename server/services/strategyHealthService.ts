import {
  createStrategyVersion,
  getBusinessSituations,
  getBusinessTrajectories,
  getCompetitorActivities,
  getMarketSignals,
  getRecentOutcomes,
  getRecommendations,
  getScenarios,
  getStrategies,
  getStrategyVersions,
} from "../db";
import { getDataFreshness } from "./businessMetricEngine";
import { getCrossSignalIntelligence } from "./crossSignalIntelligenceService";
import { getDb } from "../db";
import { strategyHealthSnapshots, strategyReviewEvents } from "../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

export type StrategyHealthState =
  | "HEALTHY"
  | "WATCH"
  | "AT_RISK"
  | "MISALIGNED"
  | "UNDER_REVIEW"
  | "INSUFFICIENT_DATA"
  | "ARCHIVED";

export type ObjectivePerformanceState = "ON_TRACK" | "IMPROVING" | "SLOWING" | "OFF_TRACK" | "UNKNOWN";
export type TrajectoryAlignmentState = "ON_TRACK" | "WATCH" | "AT_RISK" | "MISALIGNED" | "UNKNOWN";
export type AssumptionState = "VALIDATED" | "CHANGED" | "INVALIDATED" | "UNTESTED" | "UNKNOWN";
export type EnvironmentFitState = "STABLE" | "CHANGED" | "ADVERSE" | "UNKNOWN";
export type HistoricalEvidenceState = "POSITIVE" | "MIXED" | "NEGATIVE" | "UNKNOWN";
export type ScenarioAlignmentState = "ALIGNED" | "MIXED" | "CONFLICTING" | "UNKNOWN";
export type ReviewPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AssumptionDetailState = Exclude<AssumptionState, "UNKNOWN"> | "UNKNOWN";

export interface StrategyAssumptionHealth {
  assumption: string;
  state: AssumptionDetailState;
  evidence: string[];
}

export interface StrategyHealthEvidence {
  trajectory?: Record<string, unknown>;
  crossSignals: Array<Record<string, unknown>>;
  marketSignals: Array<Record<string, unknown>>;
  competitorActivities: Array<Record<string, unknown>>;
  situations: Array<Record<string, unknown>>;
  scenarios: Array<Record<string, unknown>>;
  historicalLearning: string[];
  outcomes: Array<Record<string, unknown>>;
}

export interface StrategyHealthCard {
  strategyId: number;
  objective: string;
  targetMetric: string | null;
  metricMapping: string[];
  status: string;
  healthState: StrategyHealthState;
  objectivePerformance: ObjectivePerformanceState;
  trajectoryAlignment: TrajectoryAlignmentState;
  assumptionState: AssumptionState;
  assumptionDetails: StrategyAssumptionHealth[];
  environmentFit: EnvironmentFitState;
  historicalEvidence: HistoricalEvidenceState;
  scenarioAlignment: ScenarioAlignmentState;
  strategicFit: "HIGH" | "MEDIUM" | "LOW";
  dataConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidenceStrength: "HIGH" | "MEDIUM" | "LIMITED";
  reviewPriority: ReviewPriority;
  evidenceSummary: string[];
  reviewQuestions: string[];
  latestImportantChange: string | null;
  dataFreshness: { status: string; label: string; lastUpdate: Date | null; daysSinceLastUpdate: number | null };
  businessTrajectoryState: string;
  historicalLearning: string[];
  activeScenarios: Array<Record<string, unknown>>;
  recentOutcomes: Array<Record<string, unknown>>;
  copilotSummary: string;
  lastEvaluatedAt: Date;
  nextReviewAt: Date | null;
  history: any[];
  versions: any[];
  timeline: Array<{ id: string; eventType: string; title: string; detail: string; occurredAt: Date; relatedId?: number }>;
}

export interface StrategyHealthDerivationInput {
  strategy: {
    id: number;
    objective: string;
    targetMetric?: string | null;
    status?: string | null;
    assumptions?: string | null;
    confidence?: string | number | null;
  };
  trajectories: any[];
  situations?: any[];
  marketSignals?: any[];
  competitorActivities?: any[];
  crossSignal?: { relationships?: any[] } | null;
  scenarios?: any[];
  historical?: {
    completed: number;
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
    insights?: string[];
  };
  outcomes?: any[];
  freshness?: { status: string; label: string; lastUpdate: Date | null; daysSinceLastUpdate: number | null };
  businessTrajectoryState?: string;
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function inferMetric(objective: string, targetMetric?: string | null): string | null {
  if (targetMetric?.trim()) return targetMetric.trim();
  const normalized = objective.toLowerCase();
  if (/retention|churn|customer activity|repeat|loyalty/.test(normalized)) return "activeCustomers";
  if (/margin|cost|expense|efficiency/.test(normalized)) return "expenses";
  if (/order|volume|transaction|demand/.test(normalized)) return "transactionCount";
  if (/revenue|sales|growth|market share|acquisition/.test(normalized)) return "revenue";
  return null;
}

function metricMapping(metric: string | null, objective: string): string[] {
  const normalized = `${metric ?? ""} ${objective}`.toLowerCase();
  if (/retention|churn|customer activity|repeat|loyalty/.test(normalized)) return ["activeCustomers", "retention", "churn"];
  if (/margin|cost|expense|efficiency/.test(normalized)) return ["expenses", "revenue", "margin"];
  if (/order|volume|transaction|demand/.test(normalized)) return ["transactionCount", "revenue", "activeCustomers"];
  if (/revenue|sales|growth|market share|acquisition/.test(normalized)) return ["revenue", "transactionCount", "activeCustomers"];
  return metric ? [metric] : [];
}

function matchingTrajectory(trajectories: any[], metric: string | null, mapping: string[]) {
  if (!metric && mapping.length === 0) return undefined;
  const candidates = [metric, ...mapping].filter(Boolean).map((value) => String(value).toLowerCase());
  return trajectories.find((trajectory) => {
    const key = text(trajectory.metricKey).toLowerCase();
    return candidates.some((candidate) => key === candidate || key.includes(candidate) || candidate.includes(key));
  });
}

function positiveDirection(metric: string | null, objective: string) {
  const normalized = `${metric ?? ""} ${objective}`.toLowerCase();
  return /reduce|lower|decrease|cut|improve margin|cost|expense|churn/.test(normalized) ? "DECLINING" : "IMPROVING";
}

function parseAssumptions(raw: string | null | undefined): string[] {
  const value = text(raw);
  if (!value) return [];
  const parsed = parseJson<unknown>(value, null);
  if (Array.isArray(parsed)) return parsed.map((item) => text(item)).filter(Boolean);
  if (parsed && typeof parsed === "object") return Object.entries(parsed).map(([key, item]) => `${key}: ${text(item)}`).filter(Boolean);
  return value.split(/[\n;|]+/).map((item) => item.trim()).filter(Boolean);
}

function assumptionHealth(assumptions: string[], input: StrategyHealthDerivationInput): StrategyAssumptionHealth[] {
  const market = input.marketSignals ?? [];
  const activities = input.competitorActivities ?? [];
  const trajectories = input.trajectories ?? [];
  const situations = input.situations ?? [];
  return assumptions.map((assumption) => {
    const normalized = assumption.toLowerCase();
    const evidence: string[] = [];
    let state: AssumptionDetailState = "VALIDATED";
    const competitorChanged = /competitor|competition|passive/.test(normalized) && activities.some((activity) => ["INCREASING", "NEW"].includes(upper(activity.activityTrend)) || upper(activity.relevanceLevel) === "HIGH");
    const demandChanged = /demand|market|growth|expansion/.test(normalized) && market.some((signal) => upper(signal.relevanceLevel) === "HIGH" || Number(signal.importanceScore ?? 0) >= 3);
    const costChanged = /cac|acquisition cost|cost|expense|margin/.test(normalized) && trajectories.some((trajectory) => ["expenses", "cost", "cac"].some((key) => text(trajectory.metricKey).toLowerCase().includes(key)) && upper(trajectory.direction) === "IMPROVING");
    const capacityChanged = /capacity|available|operations/.test(normalized) && situations.some((situation) => upper(situation.status) === "ACTIVE" && /capacity|operation|constraint/.test(`${text(situation.title)} ${text(situation.summary)}`.toLowerCase()));
    if (competitorChanged) {
      state = "CHANGED";
      evidence.push("Competitor activity is increasing or newly detected.");
    }
    if (demandChanged) {
      state = state === "CHANGED" ? "INVALIDATED" : "CHANGED";
      evidence.push("Relevant market evidence has changed.");
    }
    if (costChanged) {
      state = state === "CHANGED" ? "INVALIDATED" : "CHANGED";
      evidence.push("Cost-related trajectory is moving against the assumption.");
    }
    if (capacityChanged) {
      state = state === "CHANGED" ? "INVALIDATED" : "CHANGED";
      evidence.push("An active operating situation challenges capacity availability.");
    }
    if (evidence.length === 0) evidence.push("No contradicting evidence was found in the current verified context.");
    return { assumption, state, evidence };
  });
}

function deriveHistorical(input: StrategyHealthDerivationInput): { state: HistoricalEvidenceState; insights: string[] } {
  const historical = input.historical ?? { completed: 0, positive: 0, neutral: 0, negative: 0, unknown: 0, insights: [] };
  if (historical.completed === 0) return { state: "UNKNOWN", insights: historical.insights?.length ? historical.insights : ["No completed strategy outcomes are available yet."] };
  if (historical.positive > historical.negative) return { state: "POSITIVE", insights: historical.insights?.length ? historical.insights : [`${historical.positive} of ${historical.completed} completed outcomes were positive.`] };
  if (historical.negative > historical.positive) return { state: "NEGATIVE", insights: historical.insights?.length ? historical.insights : [`${historical.negative} of ${historical.completed} completed outcomes were negative.`] };
  return { state: "MIXED", insights: historical.insights?.length ? historical.insights : ["Historical outcomes are mixed and should inform review rather than determine it."] };
}

function deriveScenarioAlignment(scenarios: any[], objective: string): ScenarioAlignmentState {
  const active = scenarios.filter((scenario) => !["ARCHIVED", "COMPLETED", "INVALIDATED"].includes(upper(scenario.status)));
  if (active.length === 0) return "UNKNOWN";
  const normalized = objective.toLowerCase();
  let conflicts = 0;
  let aligned = 0;
  for (const scenario of active) {
    const fit = upper(scenario.strategicFit);
    const type = upper(scenario.scenarioType);
    const implication = `${text(scenario.title)} ${text(scenario.description)} ${text(scenario.strategicImplicationsJson)}`.toLowerCase();
    const contradicts = ["LOW", "AT_RISK", "MISALIGNED"].includes(fit) || (/growth|acquisition|expansion/.test(normalized) && /defensive|cost|retention/.test(`${type} ${implication}`)) || (/retention|cost|defensive/.test(normalized) && /aggressive|expansion/.test(`${type} ${implication}`));
    if (contradicts) conflicts += 1;
    else aligned += 1;
  }
  if (conflicts > 0 && aligned > 0) return "MIXED";
  if (conflicts > 0) return "CONFLICTING";
  return "ALIGNED";
}

export function deriveStrategyHealth(input: StrategyHealthDerivationInput): StrategyHealthCard {
  const now = input.now ?? new Date();
  const objective = text(input.strategy.objective, "General strategic objective");
  const metric = inferMetric(objective, input.strategy.targetMetric);
  const mapping = metricMapping(metric, objective);
  const trajectory = matchingTrajectory(input.trajectories, metric, mapping);
  const positiveTrend = positiveDirection(metric, objective);
  const trajectoryDirection = upper(trajectory?.direction);
  const trajectoryStatus = upper(trajectory?.status);
  const improving = trajectoryDirection === positiveTrend || (positiveTrend === "IMPROVING" && trajectoryStatus === "RECOVERING");
  const worsening = positiveTrend === "IMPROVING" ? ["DECLINING", "EARLY_DECLINE", "ACCELERATING_DECLINE"].includes(trajectoryDirection) || ["EARLY_DECLINE", "ACCELERATING_DECLINE"].includes(trajectoryStatus) : ["IMPROVING", "HEALTHY_GROWTH"].includes(trajectoryDirection) || trajectoryStatus === "HEALTHY_GROWTH";
  const objectivePerformance: ObjectivePerformanceState = !trajectory ? "UNKNOWN" : worsening ? "OFF_TRACK" : improving ? "IMPROVING" : trajectoryStatus === "SLOWING_GROWTH" || upper(trajectory?.momentum) === "DECELERATING" ? "SLOWING" : "ON_TRACK";
  const trajectoryAlignment = ((!trajectory || trajectoryStatus === "INSUFFICIENT_DATA" ? "UNKNOWN" : worsening ? "AT_RISK" : trajectory?.volatility === "HIGH" || trajectoryStatus === "SLOWING_GROWTH" ? "WATCH" : improving ? "ON_TRACK" : "WATCH") as TrajectoryAlignmentState);

  const assumptions = assumptionHealth(parseAssumptions(input.strategy.assumptions), input);
  const assumptionState: AssumptionState = assumptions.length === 0 ? "UNTESTED" : assumptions.some((item) => item.state === "INVALIDATED") ? "INVALIDATED" : assumptions.some((item) => item.state === "CHANGED") ? "CHANGED" : "VALIDATED";
  const marketChanged = (input.marketSignals ?? []).some((signal) => upper(signal.relevanceLevel) === "HIGH" || Number(signal.importanceScore ?? 0) >= 3 || upper(signal.sentiment) === "NEGATIVE");
  const competitorChanged = (input.competitorActivities ?? []).some((activity) => ["INCREASING", "NEW"].includes(upper(activity.activityTrend)) || upper(activity.relevanceLevel) === "HIGH");
  const environmentFit: EnvironmentFitState = marketChanged && competitorChanged ? "ADVERSE" : marketChanged || competitorChanged ? "CHANGED" : (input.marketSignals?.length || input.competitorActivities?.length) ? "STABLE" : "UNKNOWN";
  const crossSignals = (input.crossSignal?.relationships ?? []).filter((relationship: any) => {
    const related = Array.isArray(relationship.relatedStrategyIds) && relationship.relatedStrategyIds.includes(input.strategy.id);
    const contradicting = upper(relationship.relationshipType) === "CONTRADICTING" || upper(relationship.signalA?.impact) === "NEGATIVE" || upper(relationship.signalB?.impact) === "NEGATIVE";
    return related || contradicting;
  });
  const crossSignalConflicts = crossSignals.filter((relationship: any) => upper(relationship.relationshipType) === "CONTRADICTING" || upper(relationship.signalA?.impact) === "NEGATIVE" || upper(relationship.signalB?.impact) === "NEGATIVE").length;
  const scenarioAlignment = deriveScenarioAlignment(input.scenarios ?? [], objective);
  const historical = deriveHistorical(input);
  const freshness = input.freshness ?? { status: "unknown", label: "Unknown", lastUpdate: null, daysSinceLastUpdate: null };
  const trajectoryConfidence = upper(trajectory?.confidenceLevel);
  const dataConfidence: StrategyHealthCard["dataConfidence"] = freshness.status === "needs_refresh" || freshness.status === "no_data" || !trajectory || ["LOW", "UNKNOWN"].includes(trajectoryConfidence) ? "LOW" : trajectoryConfidence === "HIGH" && freshness.status === "fresh" ? "HIGH" : "MEDIUM";
  const evidenceStrength: StrategyHealthCard["evidenceStrength"] = dataConfidence === "HIGH" && (trajectory || input.marketSignals?.length || input.competitorActivities?.length) ? "HIGH" : dataConfidence === "MEDIUM" ? "MEDIUM" : "LIMITED";
  const riskCount = [objectivePerformance === "OFF_TRACK", assumptionState === "INVALIDATED", environmentFit === "ADVERSE", crossSignalConflicts >= 2, scenarioAlignment === "CONFLICTING", ["EARLY_WARNING", "DETERIORATING"].includes(upper(input.businessTrajectoryState))].filter(Boolean).length;
  let healthState: StrategyHealthState = "HEALTHY";
  if (upper(input.strategy.status) === "ABANDONED" || upper(input.strategy.status) === "ARCHIVED") healthState = "ARCHIVED";
  else if (!trajectory && dataConfidence === "LOW" && assumptions.length === 0) healthState = "INSUFFICIENT_DATA";
  else if (trajectoryAlignment === "MISALIGNED" || (scenarioAlignment === "CONFLICTING" && environmentFit === "ADVERSE")) healthState = "MISALIGNED";
  else if (riskCount >= 2 || objectivePerformance === "OFF_TRACK" || assumptionState === "INVALIDATED") healthState = "AT_RISK";
  else if (riskCount === 1 || objectivePerformance === "SLOWING" || assumptionState === "CHANGED" || environmentFit === "CHANGED" || scenarioAlignment === "MIXED") healthState = "WATCH";
  const reviewPriority: ReviewPriority = (healthState === "AT_RISK" || healthState === "MISALIGNED") && riskCount >= 3 && evidenceStrength === "HIGH" ? "CRITICAL" : healthState === "AT_RISK" || healthState === "MISALIGNED" ? "HIGH" : healthState === "WATCH" ? "MEDIUM" : "LOW";
  const strategicFit: StrategyHealthCard["strategicFit"] = healthState === "HEALTHY" ? "HIGH" : healthState === "WATCH" ? "MEDIUM" : "LOW";
  const evidenceSummary: string[] = [];
  if (trajectory) evidenceSummary.push(`${trajectory.metricLabel || trajectory.metricKey} is ${text(trajectory.direction, "unknown").toLowerCase()} with ${text(trajectory.momentum, "unknown").toLowerCase()} momentum.`);
  if (objectivePerformance === "OFF_TRACK") evidenceSummary.push(`The mapped objective metric is not moving in the direction required by “${objective}”.`);
  if (assumptions.some((item) => item.state === "CHANGED" || item.state === "INVALIDATED")) evidenceSummary.push(`${assumptions.filter((item) => item.state !== "VALIDATED").length} strategy assumption(s) changed or were invalidated.`);
  if (crossSignalConflicts > 0) evidenceSummary.push(`${crossSignalConflicts} contradicting cross-signal relationship(s) are relevant to this review.`);
  if (marketChanged) evidenceSummary.push("Relevant market conditions have changed in the current evidence window.");
  if (competitorChanged) evidenceSummary.push("Competitor activity is increasing or newly detected.");
  if (scenarioAlignment === "CONFLICTING") evidenceSummary.push("Active scenarios increasingly point away from the current strategic direction.");
  evidenceSummary.push(...historical.insights.slice(0, 2));
  if (freshness.status === "needs_refresh") evidenceSummary.push(`Evidence confidence is reduced because operating data is ${freshness.label.toLowerCase()}.`);
  const dedupedEvidence = Array.from(new Set(evidenceSummary.filter(Boolean)));
  if (dedupedEvidence.length === 0) dedupedEvidence.push("No material contradiction was found in the current verified evidence.");
  const latestImportantChange = dedupedEvidence.find((item) => /changed|increasing|declining|not moving|contradicting|away from|reduced/.test(item)) ?? null;
  const reviewQuestions = [
    `Is the objective “${objective}” still realistic given the current trajectory?`,
    "Have changed assumptions altered the economics or operating feasibility of this strategy?",
    "Does the current market and competitor environment still support this strategy?",
    "Should the strategy continue, be adjusted, or be replaced after explicit review?",
  ];
  const copilotSummary = healthState === "HEALTHY"
    ? `The ${objective} strategy remains supported by the current verified evidence. Continue monitoring its mapped metrics and assumptions.`
    : `The ${objective} strategy may warrant review. ${dedupedEvidence.slice(0, 3).join(" ")}`;
  const activeScenarios = (input.scenarios ?? []).filter((scenario) => !["ARCHIVED", "COMPLETED", "INVALIDATED"].includes(upper(scenario.status))).slice(0, 8).map((scenario) => ({ id: scenario.id, title: scenario.title, status: scenario.status, strategicFit: scenario.strategicFit, scenarioType: scenario.scenarioType }));
  const recentOutcomes = (input.outcomes ?? []).slice(0, 8).map((outcome) => ({ id: outcome.id, metric: outcome.metric, predictedValue: outcome.predictedValue, actualValue: outcome.actualValue, createdAt: outcome.createdAt }));
  return {
    strategyId: input.strategy.id,
    objective,
    targetMetric: metric,
    metricMapping: mapping,
    status: upper(input.strategy.status || "planning"),
    healthState,
    objectivePerformance,
    trajectoryAlignment,
    assumptionState,
    assumptionDetails: assumptions,
    environmentFit,
    historicalEvidence: historical.state,
    scenarioAlignment,
    strategicFit,
    dataConfidence,
    evidenceStrength,
    reviewPriority,
    evidenceSummary: dedupedEvidence,
    reviewQuestions,
    latestImportantChange,
    dataFreshness: freshness,
    businessTrajectoryState: upper(input.businessTrajectoryState || "UNKNOWN"),
    historicalLearning: historical.insights,
    activeScenarios,
    recentOutcomes,
    copilotSummary,
    lastEvaluatedAt: now,
    nextReviewAt: new Date(now.getTime() + 14 * DAY_MS),
    history: [],
    versions: [],
    timeline: [],
  };
}

function historicalSummary(recommendations: any[]) {
  const completed = recommendations.filter((item) => ["completed", "COMPLETED"].includes(String(item.status))).length;
  const positive = recommendations.filter((item) => String(item.outcomeStatus).toLowerCase() === "positive").length;
  const negative = recommendations.filter((item) => String(item.outcomeStatus).toLowerCase() === "negative").length;
  const neutral = recommendations.filter((item) => String(item.outcomeStatus).toLowerCase() === "neutral").length;
  const unknown = Math.max(0, completed - positive - negative - neutral);
  const insights = recommendations.length === 0 ? ["No historical Strategy Copilot outcome records are available yet."] : [`${positive} positive, ${negative} negative, and ${neutral} neutral recorded recommendation outcomes.`];
  return { completed, positive, negative, neutral, unknown, insights };
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue((value as Record<string, unknown>)[key]);
      return result;
    }, {});
  }
  return value;
}

function deterministicFingerprint(value: unknown): string {
  const serialized = JSON.stringify(stableValue(value));
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compactRecords(records: any[], keys: string[]) {
  return records.map((record) => keys.reduce<Record<string, unknown>>((result, key) => {
    result[key] = record?.[key] instanceof Date ? record[key].toISOString() : record?.[key] ?? null;
    return result;
  }, {})).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function buildEvidenceFingerprint(input: {
  strategy: any;
  trajectories: any[];
  situations: any[];
  marketSignals: any[];
  competitorActivities: any[];
  crossSignal: { relationships?: any[] } | null;
  scenarios: any[];
  recommendations: any[];
  outcomes: any[];
  freshness: any;
  businessTrajectoryState: string;
}) {
  return deterministicFingerprint({
    strategy: compactRecords([input.strategy], ["id", "objective", "targetMetric", "status", "assumptions", "updatedAt"]),
    trajectories: compactRecords(input.trajectories, ["id", "metricKey", "direction", "momentum", "status", "confidenceLevel", "volatility", "updatedAt"]),
    situations: compactRecords(input.situations, ["id", "title", "status", "severity", "updatedAt"]),
    marketSignals: compactRecords(input.marketSignals, ["id", "title", "relevanceLevel", "importanceScore", "sentiment", "discoveredAt"]),
    competitorActivities: compactRecords(input.competitorActivities, ["id", "activityTrend", "relevanceLevel", "detectedAt", "updatedAt"]),
    crossSignals: compactRecords(input.crossSignal?.relationships ?? [], ["id", "relationshipType", "strength", "confidence", "updatedAt"]),
    scenarios: compactRecords(input.scenarios, ["id", "status", "strategicFit", "scenarioType", "updatedAt"]),
    recommendations: compactRecords(input.recommendations, ["id", "status", "outcomeStatus", "updatedAt"]),
    outcomes: compactRecords(input.outcomes, ["id", "strategyId", "metric", "predictedValue", "actualValue", "updatedAt"]),
    freshness: stableValue(input.freshness),
    businessTrajectoryState: input.businessTrajectoryState,
  });
}

function asDate(value: unknown, fallback = new Date(0)) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function reviveCachedCard(snapshotJson: string | null): StrategyHealthCard | null {
  if (!snapshotJson) return null;
  try {
    const card = JSON.parse(snapshotJson) as StrategyHealthCard;
    if (!card || typeof card.strategyId !== "number") return null;
    card.lastEvaluatedAt = asDate(card.lastEvaluatedAt);
    card.nextReviewAt = card.nextReviewAt ? asDate(card.nextReviewAt) : null;
    card.dataFreshness = {
      ...card.dataFreshness,
      lastUpdate: card.dataFreshness?.lastUpdate ? asDate(card.dataFreshness.lastUpdate) : null,
    };
    card.history = Array.isArray(card.history) ? card.history : [];
    card.versions = Array.isArray(card.versions) ? card.versions : [];
    card.timeline = Array.isArray(card.timeline) ? card.timeline.map((event) => ({ ...event, occurredAt: asDate(event.occurredAt) })) : [];
    return card;
  } catch {
    return null;
  }
}

export function buildStrategyTimeline(strategy: any, history: any[], versions: any[], outcomes: any[]) {
  const timeline: StrategyHealthCard["timeline"] = [];
  if (strategy.createdAt) {
    timeline.push({ id: `strategy-created-${strategy.id}`, eventType: "STRATEGY_CREATED", title: "Strategy created", detail: text(strategy.objective, "Initial strategic objective"), occurredAt: asDate(strategy.createdAt), relatedId: strategy.id });
  }
  for (const event of history) {
    const decision = upper(event.reviewerDecision || event.eventType).replace(/^STRATEGY_REVIEW_/, "");
    timeline.push({ id: `review-${event.id}`, eventType: event.eventType, title: decision ? `Strategy reviewed: ${decision}` : "Strategy reviewed", detail: text(event.reason, "Human review event recorded."), occurredAt: asDate(event.timestamp || event.createdAt), relatedId: event.id });
  }
  for (const version of versions) {
    timeline.push({ id: `version-${version.id}`, eventType: "STRATEGY_VERSION", title: `Strategy version ${version.versionNumber} created`, detail: `${text(version.versionStatus, "DRAFT")} · ${text(version.changeReasonCategory, "Reason recorded")}`, occurredAt: asDate(version.createdAt), relatedId: version.id });
  }
  for (const outcome of outcomes) {
    const metric = text(outcome.metric, "tracked metric");
    const actual = outcome.actualValue === null || outcome.actualValue === undefined ? "pending" : String(outcome.actualValue);
    timeline.push({ id: `outcome-${outcome.id}`, eventType: "OUTCOME_OBSERVED", title: "Outcome observed", detail: `${metric}: actual value ${actual}`, occurredAt: asDate(outcome.createdAt || outcome.updatedAt), relatedId: outcome.id });
  }
  return timeline.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
}

export async function evaluateStrategyHealthForBusiness(businessId: number): Promise<StrategyHealthCard[]> {
  const [strategies, trajectories, situations, crossSignal, marketSignals, competitorActivities, scenarios, recommendations, outcomes, freshness] = await Promise.all([
    getStrategies(businessId),
    getBusinessTrajectories(businessId, { limit: 50 }),
    getBusinessSituations(businessId),
    getCrossSignalIntelligence(businessId, 15),
    getMarketSignals(businessId, 20),
    getCompetitorActivities(businessId),
    getScenarios(businessId),
    getRecommendations(businessId),
    getRecentOutcomes(businessId, 20),
    getDataFreshness(businessId),
  ]);
  if (strategies.length === 0) return [];
  const db = await getDb();
  const now = new Date();
  const historical = historicalSummary(recommendations);
  const businessTrajectoryState = trajectories.some((item: any) => ["EARLY_DECLINE", "ACCELERATING_DECLINE"].includes(upper(item.status))) ? "EARLY_WARNING" : trajectories.some((item: any) => upper(item.status) === "HEALTHY_GROWTH") ? "IMPROVING" : "STABLE";
  const cards: StrategyHealthCard[] = [];
  for (const strategy of strategies) {
    const strategyOutcomes = outcomes.filter((outcome: any) => outcome.strategyId === strategy.id);
    const fingerprint = buildEvidenceFingerprint({ strategy, trajectories, situations, marketSignals, competitorActivities, crossSignal, scenarios, recommendations, outcomes: strategyOutcomes, freshness, businessTrajectoryState });
    let card: StrategyHealthCard;
    let history: any[] = [];
    let versions: any[] = [];
    if (db) {
      try {
        const latest = await db.select().from(strategyHealthSnapshots).where(and(eq(strategyHealthSnapshots.businessId, businessId), eq(strategyHealthSnapshots.strategyId, strategy.id))).orderBy(desc(strategyHealthSnapshots.lastEvaluatedAt), desc(strategyHealthSnapshots.id)).limit(1);
        const latestSnapshot = latest[0];
        const snapshotAge = latestSnapshot?.lastEvaluatedAt ? now.getTime() - asDate(latestSnapshot.lastEvaluatedAt).getTime() : Number.POSITIVE_INFINITY;
        const cachedCard = latestSnapshot && latestSnapshot.evidenceFingerprint === fingerprint && snapshotAge < DAY_MS ? reviveCachedCard(latestSnapshot.snapshotJson) : null;
        card = cachedCard ?? deriveStrategyHealth({ strategy, trajectories, situations, marketSignals, competitorActivities, crossSignal, scenarios, historical, outcomes: strategyOutcomes, freshness, businessTrajectoryState, now });
        history = await db.select().from(strategyReviewEvents).where(and(eq(strategyReviewEvents.businessId, businessId), eq(strategyReviewEvents.strategyId, strategy.id))).orderBy(desc(strategyReviewEvents.timestamp), desc(strategyReviewEvents.id)).limit(20);
        versions = await getStrategyVersions(businessId, strategy.id, 20);
        card.history = history;
        card.versions = versions;
        card.timeline = buildStrategyTimeline(strategy, history, versions, strategyOutcomes);
        const shouldPersist = !cachedCard && (!latestSnapshot || latestSnapshot.evidenceFingerprint !== fingerprint || snapshotAge >= DAY_MS);
        if (shouldPersist) {
          await db.insert(strategyHealthSnapshots).values({ businessId, strategyId: strategy.id, healthState: card.healthState, objectivePerformance: card.objectivePerformance, trajectoryAlignment: card.trajectoryAlignment, assumptionState: card.assumptionState, environmentFit: card.environmentFit, historicalEvidence: card.historicalEvidence, strategicFit: card.strategicFit, dataConfidence: card.dataConfidence, reviewPriority: card.reviewPriority, evidenceSummaryJson: JSON.stringify(card.evidenceSummary), reviewQuestionsJson: JSON.stringify(card.reviewQuestions), evidenceFingerprint: fingerprint, snapshotJson: JSON.stringify(card), lastEvaluatedAt: now, nextReviewAt: card.nextReviewAt });
        } else if (latestSnapshot) {
          card.lastEvaluatedAt = asDate(latestSnapshot.lastEvaluatedAt);
          card.nextReviewAt = latestSnapshot.nextReviewAt;
        }
      } catch (error) {
        console.error("[StrategyHealth] Persistence read/write failed", error instanceof Error ? error.message : "unknown error");
        card = deriveStrategyHealth({ strategy, trajectories, situations, marketSignals, competitorActivities, crossSignal, scenarios, historical, outcomes: strategyOutcomes, freshness, businessTrajectoryState, now });
        card.history = history;
        card.versions = versions;
        card.timeline = buildStrategyTimeline(strategy, history, versions, strategyOutcomes);
      }
    } else {
      card = deriveStrategyHealth({ strategy, trajectories, situations, marketSignals, competitorActivities, crossSignal, scenarios, historical, outcomes: strategyOutcomes, freshness, businessTrajectoryState, now });
      card.timeline = buildStrategyTimeline(strategy, history, versions, strategyOutcomes);
    }
    cards.push(card);
  }
  return cards;
}

export async function recordStrategyReviewAction(
  businessId: number,
  strategyId: number,
  action: "CONTINUE" | "ADJUST" | "REPLACE" | "PAUSE" | "ARCHIVE",
  details: {
    reason: string;
    changeReasonCategory?: string;
    evidenceSummary?: string[];
    proposedObjective?: string;
    proposedTargetMetric?: string;
    proposedActions?: string;
    expectedOutcome?: string;
    assumptions?: string;
    risks?: string;
    confidence?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const strategy = (await getStrategies(businessId)).find((item) => item.id === strategyId);
  if (!strategy) throw new Error("Strategy not found for this business");
  const reviewPriority = action === "REPLACE" || action === "ARCHIVE" ? "HIGH" : action === "PAUSE" ? "MEDIUM" : "LOW";
  const result = await db.insert(strategyReviewEvents).values({ businessId, strategyId, eventType: `STRATEGY_REVIEW_${action}`, reviewPriority, reason: details.reason, evidenceJson: details.evidenceSummary?.length ? JSON.stringify(details.evidenceSummary) : null, reviewerDecision: action, changeReasonCategory: details.changeReasonCategory || "EXECUTIVE_DECISION" });
  const eventId = result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
  if (["ADJUST", "REPLACE"].includes(action)) {
    const existingVersions = await getStrategyVersions(businessId, strategyId, 100);
    const nextVersion = existingVersions.reduce((max, version) => Math.max(max, Number(version.versionNumber) || 0), 0) + 1;
    await createStrategyVersion({ businessId, strategyId, versionNumber: nextVersion, objective: details.proposedObjective || strategy.objective, targetMetric: details.proposedTargetMetric || strategy.targetMetric, proposedActions: details.proposedActions || strategy.proposedActions, expectedOutcome: details.expectedOutcome || strategy.expectedOutcome, timeframe: strategy.timeframe, assumptions: details.assumptions || strategy.assumptions, risks: details.risks || strategy.risks, confidence: details.confidence !== undefined ? String(details.confidence) : strategy.confidence, changeReasonCategory: details.changeReasonCategory || "EXECUTIVE_DECISION", rationale: details.reason, evidenceJson: details.evidenceSummary?.length ? JSON.stringify(details.evidenceSummary) : null, reviewEventId: eventId, versionStatus: action === "REPLACE" ? "PROPOSED" : "DRAFT" });
  }
  return eventId ?? 1;
}
