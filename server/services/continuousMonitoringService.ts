import { createHash } from "node:crypto";
import {
  getAllDecisionCandidates,
  getAllMonitoringEvents,
  getMonitoringEventById,
  getMonitoringEventHistory,
  getMonitoringEvents,
  getMonitoringPreference,
  getRecentOutcomes,
  updateMonitoringEventLifecycle,
  upsertMonitoringEvent,
  type MonitoringEventWrite,
  type MonitoringLifecycleStatus,
} from "../db";
import { loadDecisionContext, type DecisionContext } from "./decisionIntelligenceService";

export const MONITORING_EVENT_TYPES = [
  "SITUATION_CHANGED",
  "OPPORTUNITY_CHANGED",
  "COMPETITOR_CHANGED",
  "MARKET_CHANGED",
  "STRATEGY_CHANGED",
  "DECISION_CHANGED",
  "OUTCOME_CHANGED",
  "DATA_FRESHNESS_CHANGED",
  "HEALTH_CHANGED",
  "OTHER",
] as const;
export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];
export type MonitoringLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface MonitoringEvidenceItem {
  type: string;
  id?: number;
  label: string;
  detail: string;
}

export interface MonitoringDraft {
  businessId: number;
  eventType: MonitoringEventType;
  title: string;
  summary: string;
  whatChanged: string;
  whyMatters: string;
  severity: MonitoringLevel;
  priority: MonitoringLevel;
  priorityScore: number;
  sourceType: string;
  sourceId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  relatedSituationIds: number[];
  relatedOpportunityIds: number[];
  relatedCompetitorIds: number[];
  relatedDecisionIds: number[];
  relatedOutcomeIds: number[];
  evidence: MonitoringEvidenceItem[];
  recommendedReview: string;
  currentState: string;
  fingerprint: string;
}

export interface MonitoringAlertView {
  id: number;
  businessId: number;
  eventType: string;
  title: string;
  summary: string;
  whatChanged: string;
  whyMatters: string;
  severity: string;
  priority: string;
  priorityScore: number;
  sourceType: string;
  sourceId: number | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  relatedSituationIds: number[];
  relatedOpportunityIds: number[];
  relatedCompetitorIds: number[];
  relatedDecisionIds: number[];
  relatedOutcomeIds: number[];
  evidence: MonitoringEvidenceItem[];
  recommendedReview?: string;
  currentState?: string;
  status: MonitoringLifecycleStatus;
  fingerprint: string;
  detectedAt: Date;
  firstDetectedAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  dismissedAt: Date | null;
  dismissalReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoringEvaluationResult {
  alerts: MonitoringAlertView[];
  generatedCount: number;
  createdCount: number;
  changedCount: number;
  escalatedCount: number;
  resolvedCount: number;
  refreshedAt: Date;
  message: string;
}

const levelScore: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const activeStatuses = new Set(["NEW", "ACTIVE", "ACKNOWLEDGED"]);

function parse<T>(value: unknown, fallback: T): T {
  try { return typeof value === "string" && value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function rank(value: unknown) { return levelScore[String(value || "").toUpperCase()] || 1; }
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 64); }
function fingerprint(type: string, sourceType: string, sourceId?: number, relatedId?: number) {
  return hash({ type, sourceType, sourceId: sourceId ?? null, relatedId: relatedId ?? null });
}
function evidence(type: string, label: string, detail: string, id?: number): MonitoringEvidenceItem {
  return id === undefined ? { type, label, detail } : { type, id, label, detail };
}
function priorityFromScore(score: number): MonitoringLevel {
  return score >= 85 ? "CRITICAL" : score >= 65 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
}
function safeArray(value: unknown): number[] { return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : []; }
function decisionFor(decisions: any[], sourceType: string, sourceId?: number) {
  return decisions.find((decision) => decision.sourceType === sourceType && (
    sourceId === undefined ||
    safeArray(parse(decision.relatedSituationIdsJson, [])).includes(sourceId) ||
    safeArray(parse(decision.relatedOpportunityIdsJson, [])).includes(sourceId) ||
    safeArray(parse(decision.relatedCompetitorIdsJson, [])).includes(sourceId) ||
    safeArray(parse(decision.relatedSignalIdsJson, [])).includes(sourceId) ||
    safeArray(parse(decision.relatedScenarioIdsJson, [])).includes(sourceId)
  ));
}
function decisionContext(decisions: any[], sourceType: string, sourceId?: number) {
  const decision = decisionFor(decisions, sourceType, sourceId);
  return decision ? {
    priority: String(decision.priority || "MEDIUM").toUpperCase() as MonitoringLevel,
    score: Number(decision.priorityScore || 50),
    decisionId: Number(decision.id),
  } : { priority: "MEDIUM" as MonitoringLevel, score: 50, decisionId: undefined };
}
function withDecisionIds(ids: number[], decisionId?: number) { return decisionId ? Array.from(new Set([...ids, decisionId])) : ids; }

function situationDraft(situation: any, decisions: any[], businessId: number): MonitoringDraft | null {
  const trend = String(situation.trendDirection || "").toUpperCase();
  const priority = String(situation.currentPriority || "MEDIUM").toUpperCase();
  if (!["WORSENING", "RECURRING"].includes(trend) && !(trend === "NEW" && priority === "HIGH")) return null;
  const decision = decisionContext(decisions, "SITUATION", Number(situation.situationId));
  const recurring = trend === "RECURRING";
  const title = recurring ? `${situation.title} has recurred` : `${situation.title} is worsening`;
  const whatChanged = recurring
    ? `${situation.title} has reappeared after a previous resolved occurrence.`
    : `${situation.title} is worsening across the latest verified situation review.`;
  const summary = text(situation.trendSummary, whatChanged);
  const whyMatters = recurring
    ? "A previously resolved business situation has reappeared. The recurrence may warrant review of the prior response and current evidence."
    : `${situation.title} is moving in an unfavorable direction. The current evidence supports review before the pattern persists.`;
  const score = Math.max(decision.score, priority === "HIGH" ? 72 : 52) + (recurring ? 8 : 0);
  return {
    businessId,
    eventType: "SITUATION_CHANGED",
    title,
    summary,
    whatChanged,
    whyMatters,
    severity: recurring || priority === "HIGH" ? "HIGH" : "MEDIUM",
    priority: priorityFromScore(score),
    priorityScore: Math.min(score, 100),
    sourceType: recurring ? "RECURRING_SITUATION" : "WORSENING_SITUATION",
    sourceId: Number(situation.situationId),
    relatedEntityType: "SITUATION",
    relatedEntityId: Number(situation.situationId),
    relatedSituationIds: [Number(situation.situationId)],
    relatedOpportunityIds: [],
    relatedCompetitorIds: [],
    relatedDecisionIds: withDecisionIds([], decision.decisionId),
    relatedOutcomeIds: [],
    evidence: [
      evidence("SITUATION", situation.title, text(situation.trendSummary, "Verified business situation."), Number(situation.situationId)),
      evidence("SITUATION_TREND", "Trend direction", `${trend}; ${situation.durationDays || 1} days observed.`),
      evidence("SITUATION_EVIDENCE", "Supporting evidence", `${situation.timeline?.[0]?.supportingCount || 0} supporting signals in the latest review.`),
    ],
    recommendedReview: recurring ? "Review the prior resolution and current situation evidence." : "Review the situation and its supporting evidence.",
    currentState: `${trend}; priority ${priority}; status ${text(situation.currentStatus, "ACTIVE")}.`,
    fingerprint: fingerprint("SITUATION_CHANGED", recurring ? "RECURRING_SITUATION" : "WORSENING_SITUATION", Number(situation.situationId)),
  };
}

function opportunityDraft(opportunity: any, decisions: any[], businessId: number): MonitoringDraft | null {
  const status = String(opportunity.status || "").toUpperCase();
  if (status !== "NEW") return null;
  const id = Number(opportunity.id);
  const decision = decisionContext(decisions, "OPPORTUNITY", id);
  const title = `New opportunity: ${text(opportunity.title, "Demand opportunity")}`;
  const summary = text(opportunity.summary, "A new opportunity has been recorded by Opportunity Intelligence.");
  const rawScore = Math.max(decision.score, rank(opportunity.priority) * 22 + rank(opportunity.potentialImpact) * 10);
  return {
    businessId,
    eventType: "OPPORTUNITY_CHANGED",
    title,
    summary,
    whatChanged: "Opportunity Intelligence recorded a new opportunity for review.",
    whyMatters: `${summary} The opportunity should be evaluated before its evidence becomes stale; this does not establish that it will succeed.`,
    severity: rank(opportunity.potentialImpact) >= 3 ? "HIGH" : "MEDIUM",
    priority: priorityFromScore(rawScore),
    priorityScore: Math.min(rawScore, 100),
    sourceType: "NEW_OPPORTUNITY",
    sourceId: id,
    relatedEntityType: "OPPORTUNITY",
    relatedEntityId: id,
    relatedSituationIds: safeArray(parse(opportunity.supportingSituationsJson, [])),
    relatedOpportunityIds: [id],
    relatedCompetitorIds: [],
    relatedDecisionIds: withDecisionIds([], decision.decisionId),
    relatedOutcomeIds: [],
    evidence: [
      evidence("OPPORTUNITY", opportunity.title, summary, id),
      evidence("OPPORTUNITY_PRIORITY", "Opportunity priority", text(opportunity.priority, "MEDIUM")),
      evidence("OPPORTUNITY_EVIDENCE", "Evidence strength", text(opportunity.evidenceStrength, "MEDIUM EVIDENCE")),
    ],
    recommendedReview: text(opportunity.potentialNextStep, "Review the opportunity evidence and evaluate whether to pursue it."),
    currentState: `Status ${status}; potential impact ${text(opportunity.potentialImpact, "MEDIUM")}; urgency ${text(opportunity.urgency, "MEDIUM")}.`,
    fingerprint: fingerprint("OPPORTUNITY_CHANGED", "NEW_OPPORTUNITY", id),
  };
}

function competitorDraft(competitor: any, decisions: any[], businessId: number): MonitoringDraft | null {
  const trend = String(competitor.trend || "").toUpperCase();
  const relevance = String(competitor.businessRelevance || "LOW").toUpperCase();
  if (!["INCREASING", "NEW"].includes(trend) || relevance === "LOW" || Number(competitor.evidenceCount || 0) < 1) return null;
  const id = Number(competitor.competitorId);
  const decision = decisionContext(decisions, "COMPETITOR", id);
  const title = `${text(competitor.competitorName, "Competitor")} activity increased`;
  const summary = `${text(competitor.primaryActivity, "Competitive")} activity is ${trend.toLowerCase()} for ${text(competitor.competitorName, "a tracked competitor")}.`;
  const score = Math.max(decision.score, relevance === "HIGH" ? 72 : 52) + (trend === "NEW" ? 5 : 0);
  return {
    businessId,
    eventType: "COMPETITOR_CHANGED",
    title,
    summary,
    whatChanged: `${text(competitor.competitorName, "A tracked competitor")} shows ${trend.toLowerCase()} activity in ${text(competitor.primaryActivity, "a relevant area").toLowerCase()}.`,
    whyMatters: `${summary} Customer or market effects are not established; these signals may be related and should be reviewed together with internal evidence.`,
    severity: relevance === "HIGH" ? "HIGH" : "MEDIUM",
    priority: priorityFromScore(score),
    priorityScore: Math.min(score, 100),
    sourceType: "COMPETITOR_ACTIVITY",
    sourceId: id,
    relatedEntityType: "COMPETITOR",
    relatedEntityId: id,
    relatedSituationIds: [],
    relatedOpportunityIds: [],
    relatedCompetitorIds: [id],
    relatedDecisionIds: withDecisionIds([], decision.decisionId),
    relatedOutcomeIds: [],
    evidence: [
      evidence("COMPETITOR", competitor.competitorName, summary, id),
      evidence("COMPETITOR_ACTIVITY", "Primary activity", text(competitor.primaryActivity, "Other")),
      evidence("COMPETITOR_EVIDENCE", "Verified activity count", `${Number(competitor.evidenceCount || 0)} recent activity items.`),
    ],
    recommendedReview: "Review competitor activity and compare it with current customer and market evidence.",
    currentState: `Trend ${trend}; business relevance ${relevance}; evidence count ${Number(competitor.evidenceCount || 0)}.`,
    fingerprint: fingerprint("COMPETITOR_CHANGED", "COMPETITOR_ACTIVITY", id),
  };
}

function strategyConflictDraft(decision: any, businessId: number): MonitoringDraft | null {
  const conflicts = parse<string[]>(decision.conflictKeysJson, []);
  const alignment = String(decision.strategicAlignment || "").toUpperCase();
  if (!conflicts.some((key) => key.startsWith("CONFLICT:")) && alignment !== "LOW") return null;
  const id = Number(decision.id);
  const score = Number(decision.priorityScore || 55);
  return {
    businessId,
    eventType: "STRATEGY_CHANGED",
    title: "Potential strategy conflict detected",
    summary: "A current decision may conflict with the active strategic focus.",
    whatChanged: `Decision "${text(decision.title, "a current decision")}" now carries a strategic conflict indicator.`,
    whyMatters: "Conflicting strategic directions can divide resources or make execution priorities unclear. This is a relationship requiring human review, not a claim that the decision is wrong.",
    severity: "HIGH",
    priority: priorityFromScore(Math.max(score, 65)),
    priorityScore: Math.min(Math.max(score, 65), 100),
    sourceType: "STRATEGY_CONFLICT",
    sourceId: id,
    relatedEntityType: "DECISION",
    relatedEntityId: id,
    relatedSituationIds: safeArray(parse(decision.relatedSituationIdsJson, [])),
    relatedOpportunityIds: safeArray(parse(decision.relatedOpportunityIdsJson, [])),
    relatedCompetitorIds: [],
    relatedDecisionIds: [id],
    relatedOutcomeIds: [],
    evidence: [
      evidence("DECISION", decision.title, text(decision.whyMatters, "Decision requires review."), id),
      evidence("STRATEGY_ALIGNMENT", "Strategic alignment", text(decision.strategicAlignmentReason, alignment)),
      evidence("CONFLICT", "Conflict indicators", conflicts.join(", ") || "LOW strategic alignment"),
    ],
    recommendedReview: "Open the related decision and compare it with the current strategic focus.",
    currentState: `Decision status ${text(decision.status, "OPEN")}; strategic alignment ${alignment || "UNKNOWN"}.`,
    fingerprint: fingerprint("STRATEGY_CHANGED", "STRATEGY_CONFLICT", id),
  };
}

function outcomeDraft(outcome: any, businessId: number): MonitoringDraft | null {
  const predicted = Number(outcome.predictedValue);
  const actual = Number(outcome.actualValue);
  if (!Number.isFinite(predicted) || !Number.isFinite(actual) || predicted <= 0) return null;
  const shortfallPct = ((predicted - actual) / Math.abs(predicted)) * 100;
  if (shortfallPct < 10 && Math.abs(actual - predicted) / Math.abs(predicted) < 0.1) return null;
  const id = Number(outcome.id);
  const below = actual < predicted;
  return {
    businessId,
    eventType: "OUTCOME_CHANGED",
    title: below ? "Recent outcome was below expectation" : "Recent outcome differed from expectation",
    summary: below ? "A recorded action produced a result below the expected outcome." : "A recorded action produced a result that differed materially from the expected outcome.",
    whatChanged: `Observed ${actual} versus expected ${predicted} for ${text(outcome.metric, "the tracked metric")}.`,
    whyMatters: "The result is a verified learning signal. It should inform the next strategy or decision review without assuming why the result occurred.",
    severity: below ? "HIGH" : "MEDIUM",
    priority: below ? "HIGH" : "MEDIUM",
    priorityScore: below ? 72 : 54,
    sourceType: "OUTCOME",
    sourceId: id,
    relatedEntityType: "OUTCOME",
    relatedEntityId: id,
    relatedSituationIds: [],
    relatedOpportunityIds: [],
    relatedCompetitorIds: [],
    relatedDecisionIds: [],
    relatedOutcomeIds: [id],
    evidence: [
      evidence("OUTCOME", "Recorded outcome", text(outcome.metric, "Tracked metric"), id),
      evidence("EXPECTED_VALUE", "Expected", String(predicted)),
      evidence("ACTUAL_VALUE", "Observed", String(actual)),
    ],
    recommendedReview: "Review the related action and outcome notes before changing the current plan.",
    currentState: `Expected ${predicted}; observed ${actual}; variance ${Math.round(shortfallPct)}%.`,
    fingerprint: fingerprint("OUTCOME_CHANGED", "OUTCOME", id),
  };
}

function healthDraft(context: DecisionContext, previous: any[], businessId: number): MonitoringDraft | null {
  const score = Number(context.healthScore?.score);
  if (!Number.isFinite(score)) return null;
  const previousHealth = previous.find((event) => event.eventType === "HEALTH_CHANGED");
  const previousScore = previousHealth ? Number(parse<{ score?: number }>(previousHealth.currentState, {}).score) : NaN;
  if (!Number.isFinite(previousScore) || Math.abs(score - previousScore) < 10) return null;
  const declined = score < previousScore;
  const factorDetails = (context.healthScore?.factors || []).slice(0, 3).map((factor: any) => `${factor.name}: ${factor.summary}`).join(" ");
  return {
    businessId,
    eventType: "HEALTH_CHANGED",
    title: declined ? "Business health declined materially" : "Business health improved materially",
    summary: declined ? "Business health declined materially since the previous evaluation." : "Business health improved materially since the previous evaluation.",
    whatChanged: `Business Health Score moved from ${previousScore} to ${score}.`,
    whyMatters: declined ? "A material health change may affect current priorities and should be reviewed with the component evidence." : "A material improvement may change which risks deserve attention, but should be confirmed against the underlying factors.",
    severity: declined ? "HIGH" : "MEDIUM",
    priority: declined ? "HIGH" : "MEDIUM",
    priorityScore: declined ? 76 : 58,
    sourceType: "HEALTH_SCORE",
    relatedEntityType: "BUSINESS",
    relatedSituationIds: [],
    relatedOpportunityIds: [],
    relatedCompetitorIds: [],
    relatedDecisionIds: [],
    relatedOutcomeIds: [],
    evidence: [
      evidence("HEALTH_SCORE", "Business Health Score", `${previousScore} → ${score}`),
      evidence("HEALTH_FACTORS", "Major components", factorDetails || "No component detail available."),
    ],
    recommendedReview: "Review the health score components and current business priorities.",
    currentState: JSON.stringify({ score, factors: context.healthScore?.factors || [] }),
    fingerprint: fingerprint("HEALTH_CHANGED", "HEALTH_SCORE"),
  };
}

function freshnessDraft(context: DecisionContext, previous: any[], businessId: number): MonitoringDraft | null {
  const freshness = context.freshness;
  if (!freshness || !["needs_refresh", "no_data"].includes(freshness.status)) return null;
  const previousFreshness = previous.find((event) => event.eventType === "DATA_FRESHNESS_CHANGED");
  const previousStatus = previousFreshness ? String(parse<{ status?: string }>(previousFreshness.currentState, {}).status || "") : "";
  if (previousStatus === freshness.status && previousFreshness?.status === "ACTIVE") return null;
  const staleDays = freshness.daysSinceLastUpdate === null ? "No data" : `${freshness.daysSinceLastUpdate} day(s) old`;
  return {
    businessId,
    eventType: "DATA_FRESHNESS_CHANGED",
    title: freshness.status === "no_data" ? "Important business data is missing" : "Important business data is stale",
    summary: freshness.status === "no_data" ? "No current business data is available for reliable evaluation." : `Business data is ${staleDays}; current decisions may have reduced confidence.`,
    whatChanged: freshness.status === "no_data" ? "The monitoring evaluation found no persisted transaction, expense, or customer update." : `The latest persisted business update is ${staleDays}.`,
    whyMatters: "This is an information-quality alert rather than a business risk. Stale or missing data reduces confidence in current intelligence.",
    severity: "MEDIUM",
    priority: freshness.status === "no_data" ? "HIGH" : "MEDIUM",
    priorityScore: freshness.status === "no_data" ? 68 : 48,
    sourceType: "DATA_FRESHNESS",
    relatedEntityType: "BUSINESS",
    relatedSituationIds: [],
    relatedOpportunityIds: [],
    relatedCompetitorIds: [],
    relatedDecisionIds: [],
    relatedOutcomeIds: [],
    evidence: [
      evidence("DATA_FRESHNESS", "Freshness status", text(freshness.label, freshness.status)),
      evidence("DATA_AGE", "Latest update", staleDays),
      evidence("DATA_POINTS", "Tracked data points", JSON.stringify(freshness.dataPoints || {})),
    ],
    recommendedReview: "Refresh or add the affected business data before relying on current recommendations.",
    currentState: JSON.stringify({ status: freshness.status, daysSinceLastUpdate: freshness.daysSinceLastUpdate }),
    fingerprint: fingerprint("DATA_FRESHNESS_CHANGED", "DATA_FRESHNESS"),
  };
}

export interface MonitoringDetectionInput {
  businessId: number;
  context: DecisionContext;
  decisions: any[];
  outcomes: any[];
  previousEvents?: any[];
}

export function detectMeaningfulMonitoringChanges(input: MonitoringDetectionInput): MonitoringDraft[] {
  const previous = input.previousEvents || [];
  const drafts: MonitoringDraft[] = [];
  input.context.situations.forEach((item) => { const draft = situationDraft(item, input.decisions, input.businessId); if (draft) drafts.push(draft); });
  input.context.opportunities.forEach((item) => { const draft = opportunityDraft(item, input.decisions, input.businessId); if (draft) drafts.push(draft); });
  input.context.competitors.forEach((item) => { const draft = competitorDraft(item, input.decisions, input.businessId); if (draft) drafts.push(draft); });
  input.decisions.forEach((item) => { const draft = strategyConflictDraft(item, input.businessId); if (draft) drafts.push(draft); });
  input.outcomes.forEach((item) => { const draft = outcomeDraft(item, input.businessId); if (draft) drafts.push(draft); });
  const health = healthDraft(input.context, previous, input.businessId); if (health) drafts.push(health);
  const freshness = freshnessDraft(input.context, previous, input.businessId); if (freshness) drafts.push(freshness);
  return Array.from(new Map(drafts.map((draft) => [draft.fingerprint, draft])).values())
    .sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title));
}

function toWrite(draft: MonitoringDraft): MonitoringEventWrite {
  return {
    businessId: draft.businessId,
    eventType: draft.eventType,
    title: draft.title,
    summary: draft.summary,
    whatChanged: draft.whatChanged,
    whyMatters: draft.whyMatters,
    severity: draft.severity,
    priority: draft.priority,
    priorityScore: draft.priorityScore,
    sourceType: draft.sourceType,
    sourceId: draft.sourceId ?? null,
    relatedEntityType: draft.relatedEntityType || null,
    relatedEntityId: draft.relatedEntityId ?? null,
    relatedSituationIdsJson: JSON.stringify(draft.relatedSituationIds),
    relatedOpportunityIdsJson: JSON.stringify(draft.relatedOpportunityIds),
    relatedCompetitorIdsJson: JSON.stringify(draft.relatedCompetitorIds),
    relatedDecisionIdsJson: JSON.stringify(draft.relatedDecisionIds),
    relatedOutcomeIdsJson: JSON.stringify(draft.relatedOutcomeIds),
    evidenceJson: JSON.stringify(draft.evidence),
    recommendedReview: draft.recommendedReview,
    currentState: draft.currentState,
    fingerprint: draft.fingerprint,
    status: "NEW",
    detectedAt: new Date(),
    firstDetectedAt: new Date(),
    lastSeenAt: new Date(),
    resolvedAt: null,
    dismissedAt: null,
    dismissalReason: null,
    lastEscalatedAt: null,
  };
}

export function monitoringEventView(row: any): MonitoringAlertView {
  return {
    id: row.id,
    businessId: row.businessId,
    eventType: row.eventType,
    title: row.title,
    summary: row.summary,
    whatChanged: row.whatChanged,
    whyMatters: row.whyMatters,
    severity: row.severity,
    priority: row.priority,
    priorityScore: row.priorityScore,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    relatedSituationIds: parse(row.relatedSituationIdsJson, []),
    relatedOpportunityIds: parse(row.relatedOpportunityIdsJson, []),
    relatedCompetitorIds: parse(row.relatedCompetitorIdsJson, []),
    relatedDecisionIds: parse(row.relatedDecisionIdsJson, []),
    relatedOutcomeIds: parse(row.relatedOutcomeIdsJson, []),
    evidence: parse(row.evidenceJson, []),
    recommendedReview: row.recommendedReview || undefined,
    currentState: row.currentState || undefined,
    status: row.status,
    fingerprint: row.fingerprint,
    detectedAt: new Date(row.detectedAt),
    firstDetectedAt: new Date(row.firstDetectedAt),
    lastSeenAt: new Date(row.lastSeenAt),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    dismissedAt: row.dismissedAt ? new Date(row.dismissedAt) : null,
    dismissalReason: row.dismissalReason,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function preferenceAllows(draft: MonitoringDraft, preference: any) {
  if (!preference) return true;
  const enabled = parse<string[]>(preference.enabledCategoriesJson, []);
  if (enabled.length && !enabled.includes(draft.eventType) && !enabled.includes(draft.sourceType)) return false;
  return rank(draft.priority) >= rank(preference.minimumPriority) && rank(draft.severity) >= rank(preference.minimumSeverity);
}

function resolveCandidates(existing: any[], drafts: MonitoringDraft[]) {
  const fingerprints = new Set(drafts.map((draft) => draft.fingerprint));
  return existing.filter((event) => activeStatuses.has(event.status) && !fingerprints.has(event.fingerprint) && [
    "SITUATION_CHANGED", "OPPORTUNITY_CHANGED", "COMPETITOR_CHANGED", "STRATEGY_CHANGED", "DATA_FRESHNESS_CHANGED",
  ].includes(event.eventType));
}

export interface EarlyWarningAnalytics {
  warningsDetected: number;
  warningsResolved: number;
  warningsRecurring: number;
  averageTimeToResolutionHours: number;
  byCategory: Record<string, number>;
}

export async function getEarlyWarningAnalytics(businessId: number): Promise<EarlyWarningAnalytics> {
  const events = await getAllMonitoringEvents(businessId);
  const resolved = events.filter((e) => e.status === "RESOLVED" && e.resolvedAt);
  const recurring = events.filter((e) => e.sourceType?.includes("RECURRING"));
  const byCategory: Record<string, number> = {};
  for (const event of events) {
    const cat = event.eventType || "OTHER";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  let totalResolutionTimeHours = 0;
  for (const event of resolved) {
    const detected = new Date(event.detectedAt || event.createdAt).getTime();
    const resolvedAt = new Date(event.resolvedAt!).getTime();
    if (resolvedAt > detected) {
      totalResolutionTimeHours += (resolvedAt - detected) / 3_600_000;
    }
  }
  return {
    warningsDetected: events.length,
    warningsResolved: resolved.length,
    warningsRecurring: recurring.length,
    averageTimeToResolutionHours: resolved.length ? Math.round((totalResolutionTimeHours / resolved.length) * 10) / 10 : 0,
    byCategory,
  };
}

export async function evaluateBusinessChanges(businessId: number): Promise<MonitoringEvaluationResult> {
  const now = new Date();
  const [context, decisions, outcomes, existing, preference] = await Promise.all([
    loadDecisionContext(businessId),
    getAllDecisionCandidates(businessId),
    getRecentOutcomes(businessId),
    getAllMonitoringEvents(businessId),
    getMonitoringPreference(businessId),
  ]);
  const drafts = detectMeaningfulMonitoringChanges({ businessId, context, decisions, outcomes, previousEvents: existing });
  const enabledDrafts = drafts.filter((draft) => preferenceAllows(draft, preference));
  let createdCount = 0;
  let changedCount = 0;
  let escalatedCount = 0;
  for (const draft of enabledDrafts) {
    const result = await upsertMonitoringEvent(toWrite(draft));
    if (result.created) createdCount += 1;
    else if (result.changed) changedCount += 1;
    if (result.escalated) escalatedCount += 1;
  }

  let resolvedCount = 0;
  for (const event of resolveCandidates(existing, enabledDrafts)) {
    const row = await updateMonitoringEventLifecycle(businessId, event.id, "RESOLVED", JSON.stringify({ reason: "Underlying condition returned to normal and remained stable." }));
    if (row) resolvedCount += 1;
  }
  const alerts = await getMonitoringAlerts(businessId, { limit: 25 });
  return {
    alerts,
    generatedCount: enabledDrafts.length,
    createdCount,
    changedCount,
    escalatedCount,
    resolvedCount,
    refreshedAt: now,
    message: enabledDrafts.length === 0 ? "No meaningful business intelligence changes require attention." : `${enabledDrafts.length} meaningful intelligence change(s) evaluated without automatic action.`,
  };
}

export async function getMonitoringAlerts(businessId: number, options: { limit?: number; status?: MonitoringLifecycleStatus; eventType?: string } = {}) {
  const preference = await getMonitoringPreference(businessId);
  const rows = await getMonitoringEvents(businessId, options);
  return rows.filter((row) => {
    const draft = { priority: row.priority, severity: row.severity, eventType: row.eventType, sourceType: row.sourceType } as MonitoringDraft;
    return preferenceAllows(draft, preference);
  }).map(monitoringEventView);
}

export async function getMonitoringAlertDetail(businessId: number, eventId: number) {
  const row = await getMonitoringEventById(businessId, eventId);
  if (!row) return null;
  return { alert: monitoringEventView(row), history: await getMonitoringEventHistory(businessId, eventId, 50) };
}

export function canTransitionMonitoringAlert(current: MonitoringLifecycleStatus, next: MonitoringLifecycleStatus) {
  const allowed: Record<MonitoringLifecycleStatus, MonitoringLifecycleStatus[]> = {
    NEW: ["ACTIVE", "ACKNOWLEDGED", "DISMISSED", "RESOLVED"],
    ACTIVE: ["ACKNOWLEDGED", "DISMISSED", "RESOLVED"],
    ACKNOWLEDGED: ["ACTIVE", "DISMISSED", "RESOLVED"],
    RESOLVED: ["ACTIVE"],
    DISMISSED: ["ACTIVE"],
  };
  return current === next || allowed[current].includes(next);
}

export async function updateMonitoringAlertStatus(businessId: number, eventId: number, status: MonitoringLifecycleStatus, details?: string, dismissalReason?: string | null) {
  const existing = await getMonitoringEventById(businessId, eventId);
  if (!existing) return null;
  if (!canTransitionMonitoringAlert(existing.status as MonitoringLifecycleStatus, status)) throw new Error(`Invalid monitoring lifecycle transition from ${existing.status} to ${status}.`);
  return await updateMonitoringEventLifecycle(businessId, eventId, status, details, dismissalReason);
}

export async function getMonitoringHistory(businessId: number, limit = 50) {
  const rows = await getMonitoringEvents(businessId, { limit });
  return rows.map(monitoringEventView);
}
