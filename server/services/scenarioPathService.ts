import type { Scenario } from "../../drizzle/schema";
import {
  createScenarioHistory,
  getDecisionCandidates,
  getOpportunities,
  getRecentOutcomes,
  getScenarioById,
  getScenarioComparisons,
  getScenarioHistory,
  getScenarios,
  getStrategies,
  getBusinessSituations,
  upsertDecisionCandidate,
  upsertScenario,
  upsertScenarioComparison,
  updateScenario,
  type DecisionCandidateWrite,
} from "../db";
import { getCrossSignalIntelligence } from "./crossSignalIntelligenceService";
import {
  getBusinessTrajectoryIntelligence,
  type BusinessTrajectorySummary,
} from "./businessTrajectoryService";

export type ScenarioPathKind = "BASELINE" | "ALTERNATIVE";
export type ScenarioLifecycleStatus =
  | "DRAFT"
  | "ACTIVE"
  | "UNDER_REVIEW"
  | "SELECTED"
  | "COMPLETED"
  | "INVALIDATED"
  | "ARCHIVED";
export type ScenarioScore = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type AssumptionSource = "USER_PROVIDED" | "HISTORICAL" | "SYSTEM_DERIVED" | "UNKNOWN";

export interface ScenarioAssumptionInput {
  key: string;
  label: string;
  value: string;
  baselineValue?: string;
  source?: AssumptionSource;
  evidence?: string[];
  confidence?: ScenarioScore;
  invalidationSignal?: string;
}

export interface ScenarioPathInput {
  businessId: number;
  pathKind: ScenarioPathKind;
  pathKey?: string;
  title: string;
  objective?: string;
  description?: string;
  scenarioType?: string;
  actions?: string[];
  assumptions: ScenarioAssumptionInput[];
  affectedAreas?: string[];
  expectedDirection?: Record<string, string>;
  expectedOutcome?: string;
  timeHorizon?: string;
}

export interface ScenarioRelationshipContext {
  relationshipType?: string;
  strength?: string;
  freshness?: string;
  explanation?: string;
  signalAKey?: string;
  signalBKey?: string;
}

export interface ScenarioContext {
  trajectory?: BusinessTrajectorySummary | null;
  relationships?: ScenarioRelationshipContext[];
  situations?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  strategies?: Array<Record<string, unknown>>;
  outcomes?: Array<Record<string, unknown>>;
  decisions?: Array<Record<string, unknown>>;
}

export interface ScenarioScorecard {
  scenarioId?: number;
  pathKey: string;
  pathKind: ScenarioPathKind;
  title: string;
  potentialImpact: ScenarioScore;
  risk: ScenarioScore;
  strategicFit: ScenarioScore;
  trajectoryAlignment: ScenarioScore;
  evidenceStrength: ScenarioScore;
  uncertainty: ScenarioScore;
  reversibility: ScenarioScore;
  opportunityCost: ScenarioScore;
  evidenceCount: number;
  supportingEvidence: string[];
  risks: string[];
  opportunities: string[];
  tradeOffs: string[];
  interpretation: string;
}

export interface ScenarioComparisonView {
  businessId: number;
  comparisonKey: string;
  title: string;
  baselineScenarioId: number | null;
  scenarios: ScenarioScorecard[];
  recommendedReviewOrder: number[];
  interpretation: string;
  uncertainty: ScenarioScore;
  updatedAt: Date;
}

export interface ScenarioLearningRecord {
  expectedOutcome: string;
  actualOutcome?: string;
  assumptionsHeld: string[];
  assumptionsFailed: string[];
  unknownFactors: string[];
  explainableLesson: string;
  deviationState: "ON_TRACK" | "DEVIATING" | "STRONGLY_DEVIATING" | "UNKNOWN";
  variancePercentage?: number;
}

export interface ScenarioDetailView {
  scenario: Scenario;
  assumptions: ScenarioAssumptionInput[];
  actions: string[];
  affectedAreas: string[];
  expectedDirection: Record<string, string>;
  risks: string[];
  opportunities: string[];
  evidence: string[];
  strategicImplications: string[];
  scorecard: ScenarioScorecard;
  trajectory: BusinessTrajectorySummary | null;
  historicalAnalogues: Array<{
    matchType: "SIMILAR" | "IDENTICAL";
    description: string;
    whatWasDone: string;
    whatHappened: string;
    lesson: string;
    relevanceNow: string;
  }>;
  learning: ScenarioLearningRecord | null;
  history: Awaited<ReturnType<typeof getScenarioHistory>>;
}

const ACTIVE_STATUSES = new Set(["NEW", "ACTIVE", "MONITORING", "OPEN", "IN_REVIEW"]);
const HIGH_SIGNAL_TYPES = new Set(["CONVERGING", "SEQUENTIAL"]);

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreRank(value: ScenarioScore): number {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : value === "LOW" ? 1 : 0;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function asText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function evidenceStrength(context: ScenarioContext): ScenarioScore {
  const trajectory = context.trajectory;
  const relationshipCount = (context.relationships ?? []).filter((item) => normalizeText(item.freshness) !== "stale").length;
  const trajectoryEvidence = trajectory?.trajectories.reduce((sum, item) => sum + item.evidenceCount, 0) ?? 0;
  const total = trajectoryEvidence + relationshipCount + (context.situations?.length ?? 0) + (context.opportunities?.length ?? 0);
  if (total >= 7 && trajectory?.confidenceLevel === "HIGH") return "HIGH";
  if (total >= 3) return "MEDIUM";
  return total > 0 ? "LOW" : "UNKNOWN";
}

function strategicFitFor(input: ScenarioPathInput, context: ScenarioContext): { score: ScenarioScore; reason: string } {
  const areas = (input.affectedAreas ?? []).map(normalizeText);
  const activeStrategies = (context.strategies ?? []).filter((strategy) => ACTIVE_STATUSES.has(normalizeText(strategy.status)));
  if (input.pathKind === "BASELINE") {
    return activeStrategies.length > 0
      ? { score: "HIGH", reason: "The current path preserves active strategy context without introducing a new strategic dependency." }
      : { score: "MEDIUM", reason: "The current path remains available, but there is limited active strategy context to confirm fit." };
  }
  const matches = activeStrategies.filter((strategy) => {
    const text = normalizeText(`${strategy.title ?? ""} ${strategy.description ?? ""} ${strategy.category ?? ""}`);
    return areas.some((area) => area && text.includes(area));
  });
  if (matches.length > 0) {
    return { score: "HIGH", reason: `The path overlaps with ${matches.length} active strategic theme${matches.length === 1 ? "" : "s"}.` };
  }
  return activeStrategies.length > 0
    ? { score: "MEDIUM", reason: "The path is plausible but its alignment with active strategies is not directly evidenced." }
    : { score: "UNKNOWN", reason: "No active strategy context is available to assess fit." };
}

function trajectoryAlignmentFor(input: ScenarioPathInput, context: ScenarioContext): { score: ScenarioScore; reason: string } {
  const trajectory = context.trajectory;
  if (!trajectory) return { score: "UNKNOWN", reason: "No current trajectory summary is available." };
  if (input.pathKind === "BASELINE") {
    return trajectory.state === "UNKNOWN"
      ? { score: "UNKNOWN", reason: "The current path cannot be assessed without an established trajectory." }
      : { score: trajectory.state === "DETERIORATING" || trajectory.state === "EARLY_WARNING" ? "LOW" : "MEDIUM", reason: `The current path carries forward the present ${trajectory.state.toLowerCase().replaceAll("_", " ")} trajectory.` };
  }
  const directionText = normalizeText(Object.values(input.expectedDirection ?? {}).join(" "));
  const positive = ["improving", "growth", "increase", "recover", "stabilize"].some((token) => directionText.includes(token));
  const negative = ["decline", "reduce", "retention", "defensive", "cost"].some((token) => directionText.includes(token));
  if (positive && ["IMPROVING", "RECOVERING"].includes(trajectory.state)) {
    return { score: "HIGH", reason: "The expected direction is consistent with the current improving or recovering trajectory." };
  }
  if (negative && ["EARLY_WARNING", "DETERIORATING", "VOLATILE"].includes(trajectory.state)) {
    return { score: "HIGH", reason: "The path addresses the direction of the current warning or deteriorating trajectory." };
  }
  if (trajectory.state === "UNKNOWN") return { score: "UNKNOWN", reason: "The current trajectory is not established strongly enough for alignment." };
  return { score: "MEDIUM", reason: "The path is directionally plausible, but current trajectory evidence is mixed or not directly matched." };
}

function scenarioRisk(input: ScenarioPathInput, context: ScenarioContext): { score: ScenarioScore; reasons: string[] } {
  if (input.pathKind === "BASELINE") {
    const state = context.trajectory?.state;
    if (["DETERIORATING", "EARLY_WARNING"].includes(state ?? "")) {
      return { score: "HIGH", reasons: ["The current path leaves the active warning condition largely unchanged."] };
    }
    return { score: "MEDIUM", reasons: ["The current path avoids execution risk but retains opportunity cost if conditions change."] };
  }
  const assumptionRisk = input.assumptions.filter((assumption) => assumption.confidence === "LOW" || !assumption.evidence?.length).length;
  const relationshipRisk = (context.relationships ?? []).filter((relationship) => HIGH_SIGNAL_TYPES.has(String(relationship.relationshipType))).length;
  const riskReasons = input.assumptions
    .filter((assumption) => assumption.confidence === "LOW" || !assumption.evidence?.length)
    .map((assumption) => `Assumption uncertainty: ${assumption.label}.`);
  if (assumptionRisk >= 2 || relationshipRisk >= 2) {
    return { score: "HIGH", reasons: unique([...riskReasons, "Several inputs remain uncertain or show interacting signal pressure."]) };
  }
  if (assumptionRisk === 1 || relationshipRisk === 1) {
    return { score: "MEDIUM", reasons: unique([...riskReasons, "At least one material assumption or related signal requires monitoring."]) };
  }
  return { score: "LOW", reasons: ["No high-risk assumption pattern was detected from the available evidence."] };
}

function scenarioOpportunity(input: ScenarioPathInput, context: ScenarioContext): { score: ScenarioScore; items: string[] } {
  const openOpportunities = (context.opportunities ?? []).filter((item) => ACTIVE_STATUSES.has(normalizeText(item.status)));
  if (input.pathKind === "BASELINE") {
    return { score: openOpportunities.length > 0 ? "LOW" : "UNKNOWN", items: openOpportunities.length > 0 ? ["The path preserves flexibility but may defer open opportunities."] : [] };
  }
  const items = openOpportunities.slice(0, 3).map((item) => `Open opportunity context: ${String(item.title ?? "Opportunity")}.`);
  if (items.length >= 2) return { score: "HIGH", items };
  if (items.length === 1) return { score: "MEDIUM", items };
  return { score: "LOW", items: ["No directly linked opportunity evidence is available; upside remains conditional."] };
}

function historicalAnalogues(input: ScenarioPathInput, context: ScenarioContext): Array<{
  matchType: "SIMILAR" | "IDENTICAL";
  description: string;
  whatWasDone: string;
  whatHappened: string;
  lesson: string;
  relevanceNow: string;
}> {
  const scenarioText = normalizeText(`${input.title} ${input.objective ?? ""} ${(input.affectedAreas ?? []).join(" ")} ${(input.scenarioType ?? "")}`);
  const analogues: Array<{
    matchType: "SIMILAR" | "IDENTICAL";
    description: string;
    whatWasDone: string;
    whatHappened: string;
    lesson: string;
    relevanceNow: string;
  }> = [];

  for (const outcome of (context.outcomes ?? []).slice(0, 10)) {
    const outcomeText = normalizeText(`${outcome.title ?? ""} ${outcome.summary ?? ""} ${outcome.category ?? ""} ${outcome.status ?? ""}`);
    const titleMatch = normalizeText(outcome.title ?? "").includes(normalizeText(input.scenarioType ?? ""));
    const tokens = scenarioText.split(/\s+/).filter((token) => token.length > 4);
    const matchedTokens = tokens.filter((token) => outcomeText.includes(token));
    
    if (titleMatch || matchedTokens.length >= 2) {
      const matchType = titleMatch && matchedTokens.length >= 3 ? "IDENTICAL" : "SIMILAR";
      analogues.push({
        matchType,
        description: asText(outcome.title, "Historical outcome record"),
        whatWasDone: asText(outcome.summary, "Previous action was recorded under similar operational conditions."),
        whatHappened: asText(outcome.actualOutcome, asText(outcome.expectedOutcome, "Outcome was tracked and recorded.")),
        lesson: asText(outcome.learningNotes, "Conditional execution requires monitoring verified assumptions."),
        relevanceNow: matchType === "IDENTICAL" 
          ? "Identical conditions detected in retained outcome records; treat as strong historical precedent."
          : "Similar operating context detected; use as directional context rather than guaranteed proof.",
      });
    }
  }

  if (analogues.length === 0 && (context.outcomes ?? []).length > 0) {
    const fallback = (context.outcomes ?? [])[0];
    analogues.push({
      matchType: "SIMILAR",
      description: asText(fallback.title, "General business outcome record"),
      whatWasDone: asText(fallback.summary, "Prior strategic action was evaluated."),
      whatHappened: asText(fallback.actualOutcome, "Outcome was recorded."),
      lesson: asText(fallback.learningNotes, "Assumptions require ongoing validation against live metrics."),
      relevanceNow: "General historical context provides a baseline reference point.",
    });
  }

  return analogues;
}

function computeDeviationState(
  scenario: Scenario,
  context: ScenarioContext,
): "ON_TRACK" | "DEVIATING" | "STRONGLY_DEVIATING" | "UNKNOWN" {
  const assumptions = parseJson<ScenarioAssumptionInput[]>(scenario.assumptionsJson, []);
  if (assumptions.length === 0) return "UNKNOWN";
  
  const earlyWarnings = context.trajectory?.earlyWarnings ?? [];
  let invalidCount = 0;
  
  for (const asm of assumptions) {
    const signal = normalizeText(asm.invalidationSignal);
    if (signal && earlyWarnings.some((w) => normalizeText(w).includes(signal))) {
      invalidCount++;
    }
  }

  if (invalidCount >= 2 || scenario.status === "INVALIDATED") return "STRONGLY_DEVIATING";
  if (invalidCount === 1) return "DEVIATING";
  return "ON_TRACK";
}

export function buildScenarioScorecard(
  scenario: ScenarioPathInput & { scenarioId?: number },
  context: ScenarioContext,
): ScenarioScorecard {
  const fit = strategicFitFor(scenario, context);
  const alignment = trajectoryAlignmentFor(scenario, context);
  const risk = scenarioRisk(scenario, context);
  const opportunity = scenarioOpportunity(scenario, context);
  const evidence = evidenceStrength(context);
  const uncertainty: ScenarioScore = scenario.assumptions.length === 0
    ? "HIGH"
    : scenario.assumptions.some((item) => item.confidence === "LOW" || !item.evidence?.length)
      ? "HIGH"
      : scenario.assumptions.some((item) => item.confidence === "MEDIUM")
        ? "MEDIUM"
        : "LOW";
  const impact: ScenarioScore = scenario.pathKind === "BASELINE"
    ? "MEDIUM"
    : opportunity.score === "HIGH" ? "HIGH" : opportunity.score === "MEDIUM" ? "MEDIUM" : "LOW";
  const reversibility: ScenarioScore = scenario.pathKind === "BASELINE" ? "HIGH" : scenario.actions && scenario.actions.length <= 2 ? "MEDIUM" : "LOW";
  const opportunityCost: ScenarioScore = scenario.pathKind === "BASELINE" && context.trajectory?.state !== "IMPROVING" ? "HIGH" : scenario.pathKind === "BASELINE" ? "MEDIUM" : "LOW";
  const supportingEvidence = unique([
    ...scenario.assumptions.flatMap((item) => item.evidence ?? []),
    ...(context.trajectory?.supportingSignals ?? []).slice(0, 4),
    ...(context.relationships ?? []).filter((item) => normalizeText(item.freshness) !== "stale").slice(0, 3).map((item) => item.explanation ?? "Related signals were observed together."),
  ]);
  const tradeOffs = unique([
    ...(scenario.pathKind === "BASELINE" ? ["Preserves reversibility and avoids new execution dependencies."] : ["Introduces execution dependencies and assumption exposure."]),
    ...(opportunityCost === "HIGH" ? ["May defer potential upside while current conditions evolve."] : []),
    ...(risk.score === "HIGH" ? ["Requires explicit monitoring because several assumptions remain uncertain."] : []),
  ]);
  return {
    scenarioId: scenario.scenarioId,
    pathKey: scenario.pathKey ?? `${scenario.pathKind.toLowerCase()}-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    pathKind: scenario.pathKind,
    title: scenario.title,
    potentialImpact: impact,
    risk: risk.score,
    strategicFit: fit.score,
    trajectoryAlignment: alignment.score,
    evidenceStrength: evidence,
    uncertainty,
    reversibility,
    opportunityCost,
    evidenceCount: supportingEvidence.length,
    supportingEvidence,
    risks: risk.reasons,
    opportunities: opportunity.items,
    tradeOffs,
    interpretation: `${fit.reason} ${alignment.reason} ${risk.reasons[0] ?? "Risk remains uncertain."}`,
  };
}

function toScenarioInput(row: Scenario): ScenarioPathInput & { scenarioId: number } {
  return {
    businessId: row.businessId,
    scenarioId: row.id,
    pathKind: row.pathKey?.toUpperCase().startsWith("BASELINE") || row.scenarioType.toUpperCase() === "BASELINE" ? "BASELINE" : "ALTERNATIVE",
    pathKey: row.pathKey ?? undefined,
    title: row.title,
    objective: row.description ?? undefined,
    description: row.description ?? undefined,
    scenarioType: row.scenarioType,
    actions: parseJson<string[]>(row.actionsJson, []),
    assumptions: parseJson<ScenarioAssumptionInput[]>(row.assumptionsJson, []),
    affectedAreas: parseJson<string[]>(row.affectedAreasJson, []),
    expectedDirection: parseJson<Record<string, string>>(row.expectedDirectionJson, {}),
    expectedOutcome: row.expectedOutcome ?? undefined,
    timeHorizon: row.timeHorizon ?? undefined,
  };
}

async function loadScenarioContext(businessId: number): Promise<ScenarioContext> {
  const [trajectory, crossSignal, situations, opportunities, strategies, outcomes, decisions] = await Promise.all([
    getBusinessTrajectoryIntelligence(businessId, { forecastWindow: 7 }).catch(() => null),
    getCrossSignalIntelligence(businessId, 12).catch(() => ({ relationships: [] })),
    getBusinessSituations(businessId).catch(() => []),
    getOpportunities(businessId).catch(() => []),
    getStrategies(businessId).catch(() => []),
    getRecentOutcomes(businessId, 20).catch(() => []),
    getDecisionCandidates(businessId, 15).catch(() => []),
  ]);
  return {
    trajectory,
    relationships: crossSignal.relationships,
    situations: situations as Array<Record<string, unknown>>,
    opportunities: opportunities as Array<Record<string, unknown>>,
    strategies: strategies as Array<Record<string, unknown>>,
    outcomes: outcomes as Array<Record<string, unknown>>,
    decisions: decisions as Array<Record<string, unknown>>,
  };
}

function scenarioWriteFromInput(input: ScenarioPathInput, context: ScenarioContext, scorecard: ScenarioScorecard) {
  const pathKey = scorecard.pathKey;
  const evidence = unique(scorecard.supportingEvidence);
  return {
    businessId: input.businessId,
    title: input.title,
    description: input.description ?? input.objective ?? `${input.pathKind} strategic path for human review.`,
    scenarioType: input.scenarioType ?? (input.pathKind === "BASELINE" ? "BASELINE" : "STRATEGIC_PATH"),
    pathKey,
    assumptionsJson: JSON.stringify(input.assumptions),
    actionsJson: JSON.stringify(input.actions ?? []),
    affectedAreasJson: JSON.stringify(input.affectedAreas ?? []),
    affectedMetricsJson: JSON.stringify(context.trajectory?.trajectories.map((item) => item.metricKey) ?? []),
    expectedDirectionJson: JSON.stringify(input.expectedDirection ?? {}),
    estimatedMetricsJson: JSON.stringify(context.trajectory?.trajectories.map((item) => ({ metricKey: item.metricKey, projectedDirection: item.projectedDirection, projectedValue: item.projectedValue })) ?? []),
    affectedSituationsJson: JSON.stringify((context.situations ?? []).filter((item) => ACTIVE_STATUSES.has(normalizeText(item.status))).slice(0, 5).map((item) => item.id)),
    strategicImplicationsJson: JSON.stringify([scorecard.interpretation, ...scorecard.tradeOffs]),
    risksJson: JSON.stringify(scorecard.risks),
    opportunitiesJson: JSON.stringify(scorecard.opportunities),
    evidenceJson: JSON.stringify(evidence),
    expectedOutcome: input.expectedOutcome ?? "Expected outcome remains conditional on the stated assumptions and current evidence.",
    timeHorizon: input.timeHorizon ?? "30 days",
    confidence: scorecard.evidenceStrength,
    uncertainty: scorecard.uncertainty,
    strategicFit: scorecard.strategicFit,
    strategicFitReason: strategicFitFor(input, context).reason,
    trajectoryAlignment: scorecard.trajectoryAlignment,
    trajectoryAlignmentReason: trajectoryAlignmentFor(input, context).reason,
    monitoringStatus: input.assumptions.length > 0 ? "MONITOR_ASSUMPTIONS" : "MONITOR_TRAJECTORY",
    evidenceQuality: scorecard.evidenceStrength === "HIGH" ? "HIGH EVIDENCE" : scorecard.evidenceStrength === "MEDIUM" ? "MEDIUM EVIDENCE" : "LIMITED EVIDENCE",
    status: "DRAFT" as const,
  };
}

export function compareScenarioPathInputs(
  businessId: number,
  scenarios: Array<ScenarioPathInput & { scenarioId?: number }>,
  context: ScenarioContext,
  now = new Date(),
): ScenarioComparisonView {
  const scorecards = scenarios.map((scenario) => buildScenarioScorecard(scenario, context));
  const ranked = [...scorecards].sort((a, b) => {
    const aScore = scoreRank(a.potentialImpact) + scoreRank(a.strategicFit) + scoreRank(a.trajectoryAlignment) + scoreRank(a.evidenceStrength) - scoreRank(a.risk) - scoreRank(a.uncertainty);
    const bScore = scoreRank(b.potentialImpact) + scoreRank(b.strategicFit) + scoreRank(b.trajectoryAlignment) + scoreRank(b.evidenceStrength) - scoreRank(b.risk) - scoreRank(b.uncertainty);
    return bScore - aScore || a.title.localeCompare(b.title);
  });
  const baseline = scorecards.find((item) => item.pathKind === "BASELINE");
  const comparisonKey = `scenario-paths:${businessId}:${scorecards.map((item) => item.scenarioId ?? item.pathKey).sort().join(",")}`;
  const uncertainty = scorecards.some((item) => item.uncertainty === "HIGH") ? "HIGH" : scorecards.some((item) => item.uncertainty === "MEDIUM") ? "MEDIUM" : scorecards.length > 0 ? "LOW" : "UNKNOWN";
  const interpretation = ranked.length === 0
    ? "No scenario paths are available for comparison."
    : `The comparison shows trade-offs rather than a guaranteed winner. ${ranked[0].title} has the strongest deterministic score from current evidence, while uncertainty remains ${uncertainty.toLowerCase()}.`;
  return {
    businessId,
    comparisonKey,
    title: "Strategic Path Comparison",
    baselineScenarioId: baseline?.scenarioId ?? null,
    scenarios: ranked,
    recommendedReviewOrder: ranked.flatMap((item) => item.scenarioId ? [item.scenarioId] : []),
    interpretation,
    uncertainty,
    updatedAt: now,
  };
}

export async function createScenarioPath(input: ScenarioPathInput) {
  const context = await loadScenarioContext(input.businessId);
  const scorecard = buildScenarioScorecard(input, context);
  const scenarioId = await upsertScenario(scenarioWriteFromInput(input, context, scorecard));
  if (!scenarioId) return null;
  await createScenarioHistory({
    businessId: input.businessId,
    scenarioId,
    eventType: "CREATED",
    previousStatus: null,
    newStatus: "DRAFT",
    detailsJson: JSON.stringify({ pathKind: input.pathKind, assumptions: input.assumptions.length, evidenceCount: scorecard.evidenceCount }),
  });
  return { scenarioId, scorecard };
}

export async function compareScenarioPathsForBusiness(businessId: number, scenarioIds?: number[]) {
  const context = await loadScenarioContext(businessId);
  const rows = scenarioIds?.length
    ? (await Promise.all(scenarioIds.map((scenarioId) => getScenarioById(businessId, scenarioId)))).filter((row): row is Scenario => Boolean(row))
    : await getScenarios(businessId);
  const selected = rows.filter((row) => row.status !== "ARCHIVED" && row.status !== "INVALIDATED");
  const comparison = compareScenarioPathInputs(businessId, selected.map(toScenarioInput), context);
  const id = await upsertScenarioComparison({
    businessId,
    comparisonKey: comparison.comparisonKey,
    title: comparison.title,
    scenarioIdsJson: JSON.stringify(comparison.scenarios.map((item) => item.scenarioId).filter(Boolean)),
    baselineScenarioId: comparison.baselineScenarioId,
    scorecardJson: JSON.stringify(comparison.scenarios),
    interpretation: comparison.interpretation,
    uncertainty: comparison.uncertainty,
  });
  return { ...comparison, comparisonId: id };
}

export async function getScenarioPathDetail(businessId: number, scenarioId: number): Promise<ScenarioDetailView | null> {
  const scenario = await getScenarioById(businessId, scenarioId);
  if (!scenario) return null;
  const context = await loadScenarioContext(businessId);
  const input = toScenarioInput(scenario);
  const scorecard = buildScenarioScorecard(input, context);
  const analogues = historicalAnalogues(input, context);
  const learningRecord = scenario.outcomeId ? {
    expectedOutcome: scenario.expectedOutcome ?? "Expected outcome derived from scenario simulation.",
    actualOutcome: "Outcome recorded and linked to scenario execution.",
    assumptionsHeld: input.assumptions.filter(a => a.confidence === "HIGH" || a.source === "HISTORICAL").map(a => a.label),
    assumptionsFailed: input.assumptions.filter(a => a.confidence === "LOW").map(a => a.label),
    unknownFactors: ["Market volatility", "Execution timing variance"],
    explainableLesson: "Scenarios with high assumption confidence tracked closely to projected impact; low-confidence assumptions required mid-course adjustments.",
    deviationState: computeDeviationState(scenario, context),
  } : null;

  return {
    scenario,
    assumptions: input.assumptions,
    actions: input.actions ?? [],
    affectedAreas: input.affectedAreas ?? [],
    expectedDirection: input.expectedDirection ?? {},
    risks: parseJson<string[]>(scenario.risksJson, scorecard.risks),
    opportunities: parseJson<string[]>(scenario.opportunitiesJson, scorecard.opportunities),
    evidence: parseJson<string[]>(scenario.evidenceJson, scorecard.supportingEvidence),
    strategicImplications: parseJson<string[]>(scenario.strategicImplicationsJson, scorecard.tradeOffs),
    scorecard,
    trajectory: context.trajectory ?? null,
    historicalAnalogues: analogues,
    learning: learningRecord,
    history: await getScenarioHistory(businessId, scenarioId, 50),
  };
}

export function allowedScenarioTransition(current: ScenarioLifecycleStatus, next: ScenarioLifecycleStatus): boolean {
  const transitions: Record<ScenarioLifecycleStatus, ScenarioLifecycleStatus[]> = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["UNDER_REVIEW", "SELECTED", "INVALIDATED", "ARCHIVED"],
    UNDER_REVIEW: ["SELECTED", "ACTIVE", "INVALIDATED", "ARCHIVED"],
    SELECTED: ["COMPLETED", "INVALIDATED", "ACTIVE"],
    COMPLETED: ["ARCHIVED"],
    INVALIDATED: ["ARCHIVED", "ACTIVE"],
    ARCHIVED: [],
  };
  return transitions[current]?.includes(next) ?? false;
}

export async function updateScenarioLifecycle(
  businessId: number,
  scenarioId: number,
  nextStatus: ScenarioLifecycleStatus,
  details?: string,
) {
  const scenario = await getScenarioById(businessId, scenarioId);
  if (!scenario) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (!allowedScenarioTransition(scenario.status as ScenarioLifecycleStatus, nextStatus)) {
    return { ok: false as const, reason: "INVALID_TRANSITION" as const, currentStatus: scenario.status };
  }
  await updateScenario(businessId, scenarioId, { status: nextStatus });
  await createScenarioHistory({
    businessId,
    scenarioId,
    eventType: "LIFECYCLE_CHANGED",
    previousStatus: scenario.status,
    newStatus: nextStatus,
    detailsJson: JSON.stringify({ details: details ?? null }),
  });
  return { ok: true as const, status: nextStatus };
}

export async function createScenarioDecisionDraft(businessId: number, scenarioId: number) {
  const detail = await getScenarioPathDetail(businessId, scenarioId);
  if (!detail) return null;
  const scenario = detail.scenario;
  const decisionKey = `scenario:${businessId}:${scenarioId}`;
  const write: DecisionCandidateWrite = {
    businessId,
    decisionKey,
    title: `Review scenario: ${scenario.title}`,
    category: "STRATEGIC",
    priority: detail.scorecard.risk === "HIGH" || detail.scorecard.potentialImpact === "HIGH" ? "HIGH" : "MEDIUM",
    priorityScore: Math.max(35, Math.min(95, 50 + scoreRank(detail.scorecard.potentialImpact) * 10 + scoreRank(detail.scorecard.strategicFit) * 7 - scoreRank(detail.scorecard.uncertainty) * 5)),
    urgency: detail.scorecard.risk === "HIGH" ? "REVIEW_NOW" : "MONITOR",
    potentialImpact: detail.scorecard.potentialImpact,
    evidenceStrength: detail.scorecard.evidenceStrength,
    confidence: detail.scorecard.uncertainty === "HIGH" ? "LOW" : detail.scorecard.evidenceStrength,
    sourceType: "SCENARIO",
    relatedSituationIdsJson: scenario.affectedSituationsJson ?? JSON.stringify([]),
    relatedOpportunityIdsJson: JSON.stringify(detail.opportunities),
    relatedCompetitorIdsJson: JSON.stringify([]),
    relatedSignalIdsJson: JSON.stringify([]),
    relatedScenarioIdsJson: JSON.stringify([scenario.id]),
    relatedStrategyIdsJson: JSON.stringify([]),
    evidenceChainJson: JSON.stringify(detail.evidence),
    whyMatters: "This scenario creates a reviewable strategic choice with explicit assumptions and trade-offs.",
    whatWeKnowJson: JSON.stringify([...detail.evidence, `Trajectory state: ${detail.trajectory?.state ?? "UNKNOWN"}.`]),
    whatWeDontKnowJson: JSON.stringify([...detail.assumptions.filter((item) => item.confidence !== "HIGH").map((item) => `Assumption needs validation: ${item.label}.`), "Future outcomes remain conditional and are not guaranteed."]),
    potentialConsequences: JSON.stringify([...detail.scorecard.opportunities, ...detail.scorecard.risks]),
    reversibility: detail.scorecard.reversibility,
    actionOptionsJson: JSON.stringify([
      { label: "Review assumptions", action: "VALIDATE_ASSUMPTIONS" },
      { label: "Compare paths", action: "COMPARE_SCENARIOS" },
      { label: "Defer and monitor", action: "MONITOR" },
    ]),
    recommendedNextStep: "Review the scenario assumptions and compare it with the current path before selecting an action.",
    recommendedNextStepReason: "The comparison is evidence-based but uncertainty remains explicit.",
    strategicAlignment: detail.scorecard.strategicFit,
    strategicAlignmentReason: scenario.strategicFitReason ?? detail.scorecard.interpretation,
    dependencyText: detail.scorecard.risks.join(" ") || null,
    conflictKeysJson: JSON.stringify([]),
    status: "OPEN",
    outcomeId: scenario.outcomeId ?? null,
    sourceFingerprint: `scenario:${scenario.id}:${scenario.updatedAt.toISOString()}:${detail.scorecard.uncertainty}`,
    lastEvaluatedAt: new Date(),
    expiresAt: null,
  };
  const result = await upsertDecisionCandidate(write);
  if (result.id) {
    await updateScenario(businessId, scenarioId, { selectedDecisionId: result.id, status: "UNDER_REVIEW" });
    await createScenarioHistory({
      businessId,
      scenarioId,
      eventType: "DECISION_DRAFT_CREATED",
      previousStatus: scenario.status,
      newStatus: "UNDER_REVIEW",
      detailsJson: JSON.stringify({ decisionId: result.id }),
    });
  }
  return { decisionId: result.id, changed: result.changed };
}

export async function refreshScenarioMonitoring(businessId: number, scenarioId: number) {
  const detail = await getScenarioPathDetail(businessId, scenarioId);
  if (!detail) return null;
  const invalidated = detail.assumptions.filter((assumption) => {
    const signal = normalizeText(assumption.invalidationSignal);
    if (!signal) return false;
    return (detail.trajectory?.earlyWarnings ?? []).some((warning) => normalizeText(warning).includes(signal));
  });
  const status = invalidated.length > 0 ? "INVALIDATED" : detail.scenario.status;
  const monitoringStatus = invalidated.length > 0 ? "ASSUMPTION_INVALIDATED" : "MONITORING_CURRENT";
  await updateScenario(businessId, scenarioId, { monitoringStatus, status });
  if (invalidated.length > 0 && detail.scenario.status !== "INVALIDATED") {
    await createScenarioHistory({
      businessId,
      scenarioId,
      eventType: "ASSUMPTION_INVALIDATED",
      previousStatus: detail.scenario.status,
      newStatus: "INVALIDATED",
      detailsJson: JSON.stringify({ assumptions: invalidated.map((item) => item.key) }),
    });
  }
  return { scenarioId, monitoringStatus, invalidatedAssumptions: invalidated.map((item) => item.key), status };
}

export async function getStoredScenarioComparisons(businessId: number, limit = 20) {
  return getScenarioComparisons(businessId, Math.min(limit, 50));
}

export async function getScenarioPathContextSummary(businessId: number) {
  const context = await loadScenarioContext(businessId);
  return {
    trajectoryState: context.trajectory?.state ?? "UNKNOWN",
    trajectoryConfidence: context.trajectory?.confidenceLevel ?? "UNKNOWN",
    relationshipCount: context.relationships?.length ?? 0,
    openOpportunityCount: (context.opportunities ?? []).filter((item) => ACTIVE_STATUSES.has(normalizeText(item.status))).length,
    activeStrategyCount: (context.strategies ?? []).filter((item) => ACTIVE_STATUSES.has(normalizeText(item.status))).length,
    openDecisionCount: (context.decisions ?? []).filter((item) => ACTIVE_STATUSES.has(normalizeText(item.status))).length,
  };
}

export function scenarioPathSummaryForCard(comparison: ScenarioComparisonView) {
  return comparison.scenarios.slice(0, 4).map((scenario) => ({
    scenarioId: scenario.scenarioId ?? null,
    title: scenario.title,
    pathKind: scenario.pathKind,
    potentialImpact: scenario.potentialImpact,
    risk: scenario.risk,
    strategicFit: scenario.strategicFit,
    trajectoryAlignment: scenario.trajectoryAlignment,
    uncertainty: scenario.uncertainty,
    interpretation: scenario.interpretation,
  }));
}

export async function getScenarioPathComparison(businessId: number, scenarioIds?: number[]) {
  return compareScenarioPathsForBusiness(businessId, scenarioIds);
}

export async function refreshScenarioPathComparison(businessId: number, scenarioIds?: number[]) {
  return compareScenarioPathsForBusiness(businessId, scenarioIds);
}

export async function getScenarioPathDetailWithContext(businessId: number, scenarioId: number) {
  return getScenarioPathDetail(businessId, scenarioId);
}

export async function createBaselineScenario(businessId: number, input: Omit<ScenarioPathInput, "businessId" | "pathKind">) {
  return createScenarioPath({ ...input, businessId, pathKind: "BASELINE", pathKey: input.pathKey ?? "BASELINE" });
}

export async function createAlternativeScenario(businessId: number, input: Omit<ScenarioPathInput, "businessId" | "pathKind">) {
  return createScenarioPath({ ...input, businessId, pathKind: "ALTERNATIVE", pathKey: input.pathKey ?? input.title.toUpperCase().replace(/[^A-Z0-9]+/g, "_") });
}

export async function listScenarioPaths(businessId: number) {
  const rows = await getScenarios(businessId);
  return rows.filter((row) => row.status !== "ARCHIVED").map(toScenarioInput);
}

export async function listScenarioPathComparisons(businessId: number, limit = 20) {
  return getStoredScenarioComparisons(businessId, limit);
}

export async function getScenarioHistoryForBusiness(businessId: number, scenarioId: number, limit = 50) {
  const row = await getScenarioById(businessId, scenarioId);
  return row ? getScenarioHistory(businessId, scenarioId, limit) : [];
}

export async function updateScenarioAssumptions(
  businessId: number,
  scenarioId: number,
  assumptions: ScenarioAssumptionInput[],
) {
  const row = await getScenarioById(businessId, scenarioId);
  if (!row) return null;
  await updateScenario(businessId, scenarioId, { assumptionsJson: JSON.stringify(assumptions), monitoringStatus: "MONITOR_ASSUMPTIONS" });
  await createScenarioHistory({
    businessId,
    scenarioId,
    eventType: "ASSUMPTIONS_UPDATED",
    previousStatus: row.status,
    newStatus: row.status,
    detailsJson: JSON.stringify({ assumptions: assumptions.map((item) => item.key) }),
  });
  return getScenarioPathDetail(businessId, scenarioId);
}

export async function attachScenarioOutcome(businessId: number, scenarioId: number, outcomeId: number) {
  const row = await getScenarioById(businessId, scenarioId);
  if (!row) return null;
  await updateScenario(businessId, scenarioId, { outcomeId, monitoringStatus: "OUTCOME_ATTACHED" });
  await createScenarioHistory({
    businessId,
    scenarioId,
    eventType: "OUTCOME_ATTACHED",
    previousStatus: row.status,
    newStatus: row.status,
    detailsJson: JSON.stringify({ outcomeId }),
  });
  return getScenarioPathDetail(businessId, scenarioId);
}

export async function getScenarioComparisonForBusiness(businessId: number, comparisonKey: string) {
  const comparisons = await getStoredScenarioComparisons(businessId, 50);
  return comparisons.find((comparison) => comparison.comparisonKey === comparisonKey) ?? null;
}

export function compareScenarioScorecards(a: ScenarioScorecard, b: ScenarioScorecard): number {
  return (scoreRank(b.potentialImpact) + scoreRank(b.strategicFit) - scoreRank(b.risk) - scoreRank(b.uncertainty)) -
    (scoreRank(a.potentialImpact) + scoreRank(a.strategicFit) - scoreRank(a.risk) - scoreRank(a.uncertainty));
}

export function scenarioAssumptionStatus(assumption: ScenarioAssumptionInput): "SUPPORTED" | "WATCH" | "UNSUPPORTED" {
  if (!assumption.evidence?.length) return "UNSUPPORTED";
  if (assumption.confidence === "LOW") return "WATCH";
  return "SUPPORTED";
}

export function scenarioExplanation(scorecard: ScenarioScorecard): string {
  return `Why this scenario exists: it represents a ${scorecard.pathKind.toLowerCase()} path. What supports it: ${scorecard.evidenceStrength.toLowerCase()} evidence. What could go wrong: ${scorecard.risks[0] ?? "uncertainty remains"}. What we do not know: ${scorecard.uncertainty.toLowerCase()} uncertainty.`;
}

export function scenarioToDecisionDraftPayload(scorecard: ScenarioScorecard) {
  return {
    title: `Review ${scorecard.title}`,
    priority: scorecard.risk === "HIGH" || scorecard.potentialImpact === "HIGH" ? "HIGH" : "MEDIUM",
    strategicAlignment: scorecard.strategicFit,
    evidenceStrength: scorecard.evidenceStrength,
    uncertainty: scorecard.uncertainty,
    options: ["Review assumptions", "Compare paths", "Monitor before selecting"],
  };
}

export const SCENARIO_PATH_STATUSES: ScenarioLifecycleStatus[] = ["DRAFT", "ACTIVE", "UNDER_REVIEW", "SELECTED", "COMPLETED", "INVALIDATED", "ARCHIVED"];
export const SCENARIO_SCORE_VALUES: ScenarioScore[] = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"];
export const SCENARIO_PATH_KINDS: ScenarioPathKind[] = ["BASELINE", "ALTERNATIVE"];
export const SCENARIO_PATH_SERVICE_VERSION = "day25-v2";
