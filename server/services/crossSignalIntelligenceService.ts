import { createHash } from "node:crypto";
import {
  calculateBusinessMetrics,
  type BusinessMetrics,
} from "./businessMetricEngine";
import {
  getBusinessSituations,
  getCompetitorActivities,
  getDecisionCandidates,
  getMarketSignals,
  getOpportunities,
  getRecentOutcomes,
  getSignalClusterById,
  getSignalClusters,
  getSignalRelationshipById,
  getSignalRelationshipHistory,
  getSignalRelationships,
  getStrategyStates,
  getAllMonitoringEvents,
  upsertSignalCluster,
  upsertSignalRelationship,
  updateSignalRelationshipLifecycle,
} from "../db";

export const RELATIONSHIP_TYPES = [
  "TEMPORAL",
  "CORRELATED",
  "CONVERGING",
  "CONTRADICTING",
  "SEQUENTIAL",
  "UNKNOWN",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type RelationshipStrength = "HIGH" | "MEDIUM" | "LIMITED" | "UNKNOWN";
export type RelationshipStability = "STABLE" | "DEVELOPING" | "WEAKENING" | "UNKNOWN";
export type RelationshipFreshness = "CURRENT" | "LIMITED" | "STALE" | "UNKNOWN";
export type RelationshipStatus = "NEW" | "ACTIVE" | "WEAKENING" | "RESOLVED";
export type SignalDirection = "UP" | "DOWN" | "STABLE" | "NEW" | "UNKNOWN";
export type SignalImpact = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type SignalTheme = "CUSTOMER" | "COMPETITIVE" | "GROWTH" | "COST" | "OPERATIONS" | "MARKET" | "STRATEGY" | "OUTCOME" | "OTHER";

export interface SignalObservation {
  key: string;
  sourceType: string;
  sourceId?: number;
  label: string;
  detail: string;
  direction: SignalDirection;
  impact: SignalImpact;
  theme: SignalTheme;
  observedAt: Date;
  freshness?: RelationshipFreshness;
  relatedSituationIds?: number[];
  relatedOpportunityIds?: number[];
  relatedDecisionIds?: number[];
  relatedStrategyIds?: number[];
  relatedOutcomeIds?: number[];
  relatedMonitoringIds?: number[];
}

export interface RelationshipCandidate {
  relationshipKey: string;
  signalA: SignalObservation;
  signalB: SignalObservation;
  relationshipType: RelationshipType;
  strength: RelationshipStrength;
  stability: RelationshipStability;
  freshness: RelationshipFreshness;
  evidenceCount: number;
  status: RelationshipStatus;
  explanation: string;
  causalityStatus: "NOT_ESTABLISHED";
  firstObservedAt: Date;
  lastObservedAt: Date;
}

export interface SignalClusterView {
  id?: number;
  businessId: number;
  clusterKey: string;
  title: string;
  theme: string;
  interpretation: string;
  relationshipType: RelationshipType;
  strength: RelationshipStrength;
  stability: RelationshipStability;
  freshness: RelationshipFreshness;
  evidenceCount: number;
  relationshipIds: number[];
  signalKeys: string[];
  evidence: Array<Record<string, unknown>>;
  relatedSituationIds: number[];
  relatedOpportunityIds: number[];
  relatedDecisionIds: number[];
  relatedStrategyIds: number[];
  relatedOutcomeIds: number[];
  status: RelationshipStatus;
  firstObservedAt?: Date;
  lastObservedAt?: Date;
}

export interface CrossSignalRelationshipView {
  id?: number;
  businessId: number;
  relationshipKey: string;
  signalA: SignalObservation;
  signalB: SignalObservation;
  relationshipType: RelationshipType;
  strength: RelationshipStrength;
  stability: RelationshipStability;
  freshness: RelationshipFreshness;
  evidenceCount: number;
  status: RelationshipStatus;
  evidence: Array<Record<string, unknown>>;
  whatWeKnow: string[];
  whatWeDontKnow: string[];
  explanation: string;
  causalityStatus: "NOT_ESTABLISHED";
  relatedSituationIds: number[];
  relatedOpportunityIds: number[];
  relatedDecisionIds: number[];
  relatedStrategyIds: number[];
  relatedOutcomeIds: number[];
  firstObservedAt?: Date;
  lastObservedAt?: Date;
}

export interface CrossSignalContext {
  businessId: number;
  observations: SignalObservation[];
  relationships: RelationshipCandidate[];
  clusters: SignalClusterView[];
  metrics: BusinessMetrics | null;
  generatedAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 30;
const CHANGE_THRESHOLD_PERCENT = 5;

function parse<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function numberList(value: unknown) { return (Array.isArray(value) ? value : []).filter((item): item is number => typeof item === "number"); }
function dateValue(value: unknown, fallback = new Date()) { const date = value instanceof Date ? value : new Date(String(value || "")); return Number.isNaN(date.getTime()) ? fallback : date; }
function sha(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 64); }
function daysBetween(a: Date, b: Date) { return Math.abs(a.getTime() - b.getTime()) / DAY_MS; }
function lower(value: unknown) { return text(value).toLowerCase(); }
function includesAny(value: unknown, words: string[]) { const candidate = lower(value); return words.some((word) => candidate.includes(word)); }
function signedImpact(direction: SignalDirection, negativeWhenUp = false): SignalImpact {
  if (direction === "UNKNOWN" || direction === "STABLE") return "NEUTRAL";
  if (negativeWhenUp) return direction === "UP" || direction === "NEW" ? "NEGATIVE" : "POSITIVE";
  return direction === "DOWN" ? "NEGATIVE" : "POSITIVE";
}
function directionFromPercent(value: number): SignalDirection { return value > 0 ? "UP" : value < 0 ? "DOWN" : "STABLE"; }
function freshnessForDate(observedAt: Date, now = new Date()): RelationshipFreshness {
  const age = Math.max(0, now.getTime() - observedAt.getTime()) / DAY_MS;
  if (age <= 7) return "CURRENT";
  if (age <= 30) return "LIMITED";
  return "STALE";
}
function themeForText(value: unknown): SignalTheme {
  const candidate = lower(value);
  if (includesAny(candidate, ["customer", "retention", "churn", "conversion", "activity"])) return "CUSTOMER";
  if (includesAny(candidate, ["competitor", "competitive", "rival", "pricing pressure"])) return "COMPETITIVE";
  if (includesAny(candidate, ["growth", "revenue", "demand", "market opportunity", "expansion"])) return "GROWTH";
  if (includesAny(candidate, ["cost", "expense", "margin", "profit"])) return "COST";
  if (includesAny(candidate, ["capacity", "operation", "process", "transaction"]
  )) return "OPERATIONS";
  if (includesAny(candidate, ["strategy", "strategic", "recommendation"])) return "STRATEGY";
  if (includesAny(candidate, ["outcome", "actual", "result"])) return "OUTCOME";
  if (includesAny(candidate, ["market", "industry", "demand", "signal"])) return "MARKET";
  return "OTHER";
}
function directionFromText(value: unknown): SignalDirection {
  if (includesAny(value, ["declin", "drop", "decreas", "fall", "down", "weak", "worsen", "churn"])) return "DOWN";
  if (includesAny(value, ["increas", "grow", "rise", "surge", "up", "improv", "expand", "strong"])) return "UP";
  if (includesAny(value, ["new", "launch", "emerg", "detected"])) return "NEW";
  if (includesAny(value, ["stable", "unchanged", "flat"])) return "STABLE";
  return "UNKNOWN";
}
function signalKey(sourceType: string, sourceId: number | undefined, fallback: string) { return `${sourceType}:${sourceId ?? sha(fallback).slice(0, 12)}`; }

export function classifyRelationship(a: SignalObservation, b: SignalObservation, now = new Date()): RelationshipType {
  if (a.key === b.key) return "UNKNOWN";
  if (a.direction === "UNKNOWN" || b.direction === "UNKNOWN") return "UNKNOWN";
  const gap = daysBetween(a.observedAt, b.observedAt);
  if (gap > RECENT_WINDOW_DAYS) return "UNKNOWN";
  if (a.impact !== "NEUTRAL" && b.impact !== "NEUTRAL" && a.impact !== b.impact) return "CONTRADICTING";
  if (gap <= 1) return "TEMPORAL";
  const first = a.observedAt <= b.observedAt ? a : b;
  const second = first === a ? b : a;
  const sequenceEligible = ["METRIC", "MARKET_SIGNAL", "COMPETITOR_ACTIVITY"].includes(first.sourceType) &&
    ["SITUATION", "OPPORTUNITY", "OUTCOME", "DECISION"].includes(second.sourceType);
  if (sequenceEligible && gap <= 14) return "SEQUENTIAL";
  if (a.impact === b.impact && a.impact !== "NEUTRAL") {
    if (a.theme !== b.theme) return "CONVERGING";
    return "CORRELATED";
  }
  if (now.getTime() - Math.max(a.observedAt.getTime(), b.observedAt.getTime()) > RECENT_WINDOW_DAYS * DAY_MS) return "UNKNOWN";
  return "UNKNOWN";
}

export function calculateRelationshipStrength(evidenceCount: number, freshness: RelationshipFreshness, stability: RelationshipStability): RelationshipStrength {
  if (freshness === "STALE" || evidenceCount <= 0) return "LIMITED";
  if (evidenceCount >= 5 && stability === "STABLE" && freshness === "CURRENT") return "HIGH";
  if (evidenceCount >= 2) return "MEDIUM";
  return "LIMITED";
}

export function calculateRelationshipStability(evidenceCount: number, firstObservedAt: Date, lastObservedAt: Date, now = new Date()): RelationshipStability {
  const span = daysBetween(firstObservedAt, lastObservedAt);
  const age = Math.max(0, now.getTime() - lastObservedAt.getTime()) / DAY_MS;
  if (age > 30) return "WEAKENING";
  if (evidenceCount >= 3 && span >= 7 && age <= 14) return "STABLE";
  if (evidenceCount >= 2) return "DEVELOPING";
  return "UNKNOWN";
}

export function calculateRelationshipFreshness(observations: SignalObservation[], now = new Date()): RelationshipFreshness {
  if (!observations.length) return "UNKNOWN";
  const latest = observations.reduce((max, item) => item.observedAt > max ? item.observedAt : max, observations[0].observedAt);
  return freshnessForDate(latest, now);
}

function statusForEvidence(evidenceCount: number, freshness: RelationshipFreshness): RelationshipStatus {
  if (freshness === "STALE") return "WEAKENING";
  return evidenceCount >= 2 ? "ACTIVE" : "NEW";
}

function relationExplanation(type: RelationshipType, a: SignalObservation, b: SignalObservation): string {
  const pair = `${a.label} and ${b.label}`;
  switch (type) {
    case "TEMPORAL": return `${pair} changed within the same short time window. These signals moved together; causality is not established.`;
    case "CORRELATED": return `${pair} show a repeated directional pattern within the same business theme. They may be related, but the available evidence does not establish why.`;
    case "CONVERGING": return `${pair} moved in a compatible direction across different business themes. The signals may reinforce the same broader pattern.`;
    case "CONTRADICTING": return `${pair} carry opposing business implications in the same review window. The evidence should be reconciled before drawing a conclusion.`;
    case "SEQUENTIAL": return `${a.label} was observed before ${b.label} within the recent review window. The sequence is observable; causality is not established.`;
    default: return `${pair} are available in the same tenant and review window, but evidence is insufficient to classify their relationship.`;
  }
}

export function buildRelationshipCandidate(a: SignalObservation, b: SignalObservation, now = new Date(), historicalEvidenceCount = 0): RelationshipCandidate | null {
  const relationshipType = classifyRelationship(a, b, now);
  if (relationshipType === "UNKNOWN") return null;
  const observations = [a, b];
  const firstObservedAt = observations.reduce((min, item) => item.observedAt < min ? item.observedAt : min, observations[0].observedAt);
  const lastObservedAt = observations.reduce((max, item) => item.observedAt > max ? item.observedAt : max, observations[0].observedAt);
  const evidenceCount = Math.max(1, historicalEvidenceCount + 1);
  const freshness = calculateRelationshipFreshness(observations, now);
  const stability = calculateRelationshipStability(evidenceCount, firstObservedAt, lastObservedAt, now);
  return {
    relationshipKey: [a.key, b.key].sort().join("|") + `|${relationshipType}`,
    signalA: a.key <= b.key ? a : b,
    signalB: a.key <= b.key ? b : a,
    relationshipType,
    strength: calculateRelationshipStrength(evidenceCount, freshness, stability),
    stability,
    freshness,
    evidenceCount,
    status: statusForEvidence(evidenceCount, freshness),
    explanation: relationExplanation(relationshipType, a, b),
    causalityStatus: "NOT_ESTABLISHED",
    firstObservedAt,
    lastObservedAt,
  };
}

function metricObservations(metrics: BusinessMetrics, now: Date): SignalObservation[] {
  const candidates: Array<{ key: string; label: string; metric: any; theme: SignalTheme; negativeWhenUp?: boolean }> = [
    { key: "revenue", label: "Revenue", metric: metrics.revenue, theme: "GROWTH" },
    { key: "expenses", label: "Expenses", metric: metrics.expenses, theme: "COST", negativeWhenUp: true },
    { key: "transactionCount", label: "Transaction volume", metric: metrics.transactionCount, theme: "OPERATIONS" },
    { key: "customers", label: "Active customers", metric: metrics.customers ? { percentChange: metrics.customers.activePercentChange ?? (metrics.customers as any).percentChange, hasData: metrics.customers.hasData, hasPreviousData: metrics.customers.hasPreviousData } : { hasData: false, hasPreviousData: false }, theme: "CUSTOMER" },
  ];
  return candidates
    .filter((candidate) => candidate.metric.hasData && candidate.metric.hasPreviousData && Math.abs(Number(candidate.metric.percentChange || 0)) >= CHANGE_THRESHOLD_PERCENT)
    .map((candidate) => {
      const percent = Number(candidate.metric.percentChange || 0);
      const direction = directionFromPercent(percent);
      return {
        key: `METRIC:${candidate.key}`,
        sourceType: "METRIC",
        label: candidate.label,
        detail: `${candidate.label} ${direction === "UP" ? "increased" : "decreased"} ${Math.abs(percent).toFixed(1)}% versus the previous comparison period.`,
        direction,
        impact: signedImpact(direction, candidate.negativeWhenUp),
        theme: candidate.theme,
        observedAt: now,
        freshness: "CURRENT",
      };
    });
}

function marketObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.slice(0, 25).map((row) => {
    const observedAt = dateValue(row.publishedAt || row.discoveredAt || row.updatedAt, now);
    const direction = directionFromText(`${row.title} ${row.snippet} ${row.explanation}`);
    const negativeWhenUp = ["Competition", "Customers", "Expenses"].some((area) => text(row.impactArea).includes(area));
    return {
      key: signalKey("MARKET_SIGNAL", row.id, row.title), sourceType: "MARKET_SIGNAL", sourceId: row.id,
      label: text(row.title, "Market signal"), detail: text(row.explanation || row.snippet, `External signal from ${text(row.source, "unknown source")}.`), direction,
      impact: signedImpact(direction, negativeWhenUp), theme: themeForText(`${row.title} ${row.impactArea} ${row.relatedEntity}`), observedAt,
      freshness: freshnessForDate(observedAt, now),
    };
  });
}

function competitorObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.slice(0, 25).map((row) => {
    const direction = row.activityTrend === "DECREASING" ? "DOWN" : row.activityTrend === "STABLE" ? "STABLE" : "UP";
    const observedAt = dateValue(row.detectedAt || row.updatedAt, now);
    return {
      key: signalKey("COMPETITOR_ACTIVITY", row.id, row.title), sourceType: "COMPETITOR_ACTIVITY", sourceId: row.id,
      label: text(row.title, "Competitor activity"), detail: text(row.strategicRelevance || row.description, "Competitor activity was recorded."), direction,
      impact: signedImpact(direction, true), theme: "COMPETITIVE", observedAt, freshness: freshnessForDate(observedAt, now),
    };
  });
}

function situationObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => !["RESOLVED", "DISMISSED"].includes(text(row.status).toUpperCase())).slice(0, 20).map((row) => {
    const direction = includesAny(row.category, ["growth", "opportunity"]) ? "UP" : includesAny(`${row.title} ${row.summary} ${row.category}`, ["decline", "pressure", "risk", "worsen", "cost"]) ? "DOWN" : "NEW";
    const observedAt = dateValue(row.updatedAt || row.createdAt, now);
    return {
      key: signalKey("SITUATION", row.id, row.title), sourceType: "SITUATION", sourceId: row.id,
      label: text(row.title, "Business situation"), detail: text(row.summary, "A business situation is active."), direction,
      impact: signedImpact(direction, false), theme: themeForText(`${row.title} ${row.category}`), observedAt, freshness: freshnessForDate(observedAt, now),
      relatedSituationIds: [row.id],
    };
  });
}

function opportunityObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => !["DISMISSED", "EXPIRED", "PURSUED"].includes(text(row.status).toUpperCase())).slice(0, 20).map((row) => {
    const observedAt = dateValue(row.updatedAt || row.createdAt, now);
    return {
      key: signalKey("OPPORTUNITY", row.id, row.title), sourceType: "OPPORTUNITY", sourceId: row.id,
      label: text(row.title, "Opportunity"), detail: text(row.summary, "An opportunity has been recorded for review."), direction: "UP", impact: "POSITIVE",
      theme: themeForText(`${row.title} ${row.category}`), observedAt, freshness: freshnessForDate(observedAt, now), relatedOpportunityIds: [row.id],
    };
  });
}

function decisionObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => ["OPEN", "IN_REVIEW", "DEFERRED"].includes(text(row.status).toUpperCase())).slice(0, 15).map((row) => ({
    key: signalKey("DECISION", row.id, row.title), sourceType: "DECISION", sourceId: row.id, label: text(row.title, "Decision under review"),
    detail: text(row.whyMatters || row.potentialConsequences, "A decision requires review."), direction: "NEW", impact: "NEUTRAL", theme: themeForText(`${row.title} ${row.category}`), observedAt: dateValue(row.lastEvaluatedAt || row.updatedAt, now), freshness: freshnessForDate(dateValue(row.lastEvaluatedAt || row.updatedAt, now), now), relatedDecisionIds: [row.id],
  }));
}

function strategyObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => ["UPDATE", "REPLACE", "DEPRIORITIZE"].includes(text(row.evaluationStatus).toUpperCase())).slice(0, 15).map((row) => ({
    key: signalKey("STRATEGY", row.id, row.reason), sourceType: "STRATEGY", sourceId: row.id, label: "Strategy context changed", detail: text(row.reason, "Strategy context requires review."), direction: "DOWN", impact: "NEGATIVE", theme: "STRATEGY", observedAt: dateValue(row.updatedAt || row.createdAt, now), freshness: freshnessForDate(dateValue(row.updatedAt || row.createdAt, now), now), relatedStrategyIds: [row.id],
  }));
}

function outcomeObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => row.actualValue !== null && row.predictedValue !== null).slice(0, 15).map((row) => {
    const actual = Number(row.actualValue); const predicted = Number(row.predictedValue); const direction = actual >= predicted ? "UP" : "DOWN";
    const observedAt = dateValue(row.updatedAt || row.createdAt, now);
    return {
      key: signalKey("OUTCOME", row.id, row.metric), sourceType: "OUTCOME", sourceId: row.id, label: `${text(row.metric, "Outcome")} outcome`, detail: `Observed ${actual} versus predicted ${predicted}.`, direction, impact: signedImpact(direction), theme: "OUTCOME", observedAt, freshness: freshnessForDate(observedAt, now), relatedOutcomeIds: [row.id],
    };
  });
}

function monitoringObservations(rows: any[], now: Date): SignalObservation[] {
  return rows.filter((row) => ["NEW", "ACTIVE", "ACKNOWLEDGED"].includes(text(row.status).toUpperCase())).slice(0, 20).map((row) => ({
    key: signalKey("MONITORING", row.id, row.fingerprint), sourceType: "MONITORING", sourceId: row.id, label: text(row.title, "Monitoring alert"), detail: text(row.whyMatters || row.summary, "A verified monitoring event was recorded."), direction: "NEW", impact: text(row.priority).toUpperCase() === "HIGH" || text(row.severity).toUpperCase() === "HIGH" ? "NEGATIVE" : "NEUTRAL", theme: themeForText(`${row.title} ${row.eventType}`), observedAt: dateValue(row.lastSeenAt || row.detectedAt, now), freshness: freshnessForDate(dateValue(row.lastSeenAt || row.detectedAt, now), now), relatedMonitoringIds: [row.id],
  }));
}

export function buildSignalObservations(input: { metrics?: BusinessMetrics | null; marketSignals?: any[]; competitorActivities?: any[]; situations?: any[]; opportunities?: any[]; decisions?: any[]; strategies?: any[]; outcomes?: any[]; monitoringEvents?: any[]; now?: Date }): SignalObservation[] {
  const now = input.now || new Date();
  return [
    ...(input.metrics ? metricObservations(input.metrics, now) : []),
    ...marketObservations(input.marketSignals || [], now),
    ...competitorObservations(input.competitorActivities || [], now),
    ...situationObservations(input.situations || [], now),
    ...opportunityObservations(input.opportunities || [], now),
    ...decisionObservations(input.decisions || [], now),
    ...strategyObservations(input.strategies || [], now),
    ...outcomeObservations(input.outcomes || [], now),
    ...monitoringObservations(input.monitoringEvents || [], now),
  ].filter((observation) => daysBetween(observation.observedAt, now) <= RECENT_WINDOW_DAYS);
}

function compatibleThemes(a: SignalTheme, b: SignalTheme) {
  if (a === b) return true;
  const pairs = new Set([
    "COMPETITIVE:CUSTOMER", "COMPETITIVE:MARKET", "COMPETITIVE:GROWTH", "CUSTOMER:OUTCOME", "CUSTOMER:GROWTH",
    "COST:OPERATIONS", "COST:GROWTH", "OPERATIONS:GROWTH", "STRATEGY:CUSTOMER", "STRATEGY:COMPETITIVE", "MARKET:GROWTH",
  ]);
  return pairs.has(`${a}:${b}`) || pairs.has(`${b}:${a}`);
}

export function buildRelationshipCandidates(observations: SignalObservation[], now = new Date()): RelationshipCandidate[] {
  const ordered = observations.slice(0, 70).sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime() || a.key.localeCompare(b.key));
  const results: RelationshipCandidate[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i]; const b = ordered[j];
      if (a.sourceType === b.sourceType || !compatibleThemes(a.theme, b.theme) || daysBetween(a.observedAt, b.observedAt) > RECENT_WINDOW_DAYS) continue;
      const candidate = buildRelationshipCandidate(a, b, now);
      if (candidate) results.push(candidate);
    }
  }
  return results
    .sort((a, b) => b.evidenceCount - a.evidenceCount || b.lastObservedAt.getTime() - a.lastObservedAt.getTime() || a.relationshipKey.localeCompare(b.relationshipKey))
    .slice(0, 40);
}

function idsFor(candidates: RelationshipCandidate[], field: keyof SignalObservation): number[] {
  const values = candidates.flatMap((candidate) => [candidate.signalA, candidate.signalB].flatMap((signal) => Array.isArray(signal[field]) ? signal[field] as number[] : []));
  return Array.from(new Set<number>(values)).sort((a, b) => a - b);
}
function evidenceFor(candidates: RelationshipCandidate[]) {
  return candidates.flatMap((candidate) => [candidate.signalA, candidate.signalB].map((signal) => ({ sourceType: signal.sourceType, sourceId: signal.sourceId, key: signal.key, label: signal.label, detail: signal.detail, observedAt: signal.observedAt.toISOString() })));
}

export function buildSignalClusters(candidates: RelationshipCandidate[], businessId: number): SignalClusterView[] {
  const groups = new Map<string, RelationshipCandidate[]>();
  for (const candidate of candidates) {
    const themes = [candidate.signalA.theme, candidate.signalB.theme].sort().join("+");
    const key = `${themes}:${candidate.relationshipType}`;
    const list = groups.get(key) || []; list.push(candidate); groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([clusterKey, group]: [string, RelationshipCandidate[]]) => {
    const themes = Array.from(new Set<SignalTheme>(group.flatMap((candidate) => [candidate.signalA.theme, candidate.signalB.theme]))).sort();
    const strongest = [...group].sort((a, b) => strengthScore(b.strength) - strengthScore(a.strength))[0];
    const signalKeys = Array.from(new Set<string>(group.flatMap((candidate) => [candidate.signalA.key, candidate.signalB.key]))).sort();
    return {
      businessId, clusterKey, title: themes.map((theme) => theme[0] + theme.slice(1).toLowerCase()).join(" + "), theme: themes.join(" + "),
      interpretation: group.length >= 2 ? `${group.length} verified relationships point to a ${themes.join(" and ").toLowerCase()} pattern. These signals may be related; causality is not established.` : strongest.explanation,
      relationshipType: strongest.relationshipType, strength: strongest.strength, stability: strongest.stability, freshness: group.some((item) => item.freshness === "CURRENT") ? "CURRENT" : strongest.freshness,
      evidenceCount: group.reduce((sum: number, item: RelationshipCandidate) => sum + item.evidenceCount, 0), relationshipIds: [], signalKeys, evidence: evidenceFor(group),
      relatedSituationIds: idsFor(group, "relatedSituationIds"), relatedOpportunityIds: idsFor(group, "relatedOpportunityIds"), relatedDecisionIds: idsFor(group, "relatedDecisionIds"), relatedStrategyIds: idsFor(group, "relatedStrategyIds"), relatedOutcomeIds: idsFor(group, "relatedOutcomeIds"), status: group.some((item: RelationshipCandidate) => item.status === "ACTIVE") ? "ACTIVE" : strongest.status,
      firstObservedAt: group.reduce((min: Date, item: RelationshipCandidate) => item.firstObservedAt < min ? item.firstObservedAt : min, group[0].firstObservedAt), lastObservedAt: group.reduce((max: Date, item: RelationshipCandidate) => item.lastObservedAt > max ? item.lastObservedAt : max, group[0].lastObservedAt),
    };
  }).sort((a, b) => b.evidenceCount - a.evidenceCount || a.clusterKey.localeCompare(b.clusterKey)).slice(0, 12);
}

function strengthScore(value: string) { return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : 1; }

function relationshipView(row: any): CrossSignalRelationshipView {
  const evidence = parse<Array<Record<string, unknown>>>(row.evidenceJson, []);
  const sourceA: SignalObservation = { key: row.signalAKey, sourceType: row.signalAType, sourceId: row.signalAId || undefined, label: text(evidence.find((item) => item.key === row.signalAKey)?.label, row.signalAKey), detail: text(evidence.find((item) => item.key === row.signalAKey)?.detail), direction: "UNKNOWN", impact: "NEUTRAL", theme: themeForText(row.signalAType), observedAt: dateValue(evidence.find((item) => item.key === row.signalAKey)?.observedAt, row.lastObservedAt) };
  const sourceB: SignalObservation = { key: row.signalBKey, sourceType: row.signalBType, sourceId: row.signalBId || undefined, label: text(evidence.find((item) => item.key === row.signalBKey)?.label, row.signalBKey), detail: text(evidence.find((item) => item.key === row.signalBKey)?.detail), direction: "UNKNOWN", impact: "NEUTRAL", theme: themeForText(row.signalBType), observedAt: dateValue(evidence.find((item) => item.key === row.signalBKey)?.observedAt, row.lastObservedAt) };
  return {
    id: row.id, businessId: row.businessId, relationshipKey: row.relationshipKey, signalA: sourceA, signalB: sourceB, relationshipType: row.relationshipType, strength: row.strength, stability: row.stability, freshness: row.freshness, evidenceCount: row.evidenceCount, status: row.status, evidence,
    whatWeKnow: parse(row.whatWeKnowJson, []), whatWeDontKnow: parse(row.whatWeDontKnowJson, ["The available evidence does not establish causality."]), explanation: row.explanation, causalityStatus: "NOT_ESTABLISHED",
    relatedSituationIds: parse(row.relatedSituationIdsJson, []), relatedOpportunityIds: parse(row.relatedOpportunityIdsJson, []), relatedDecisionIds: parse(row.relatedDecisionIdsJson, []), relatedStrategyIds: parse(row.relatedStrategyIdsJson, []), relatedOutcomeIds: parse(row.relatedOutcomeIdsJson, []), firstObservedAt: row.firstObservedAt, lastObservedAt: row.lastObservedAt,
  };
}

export async function loadCrossSignalContext(businessId: number, now = new Date()): Promise<CrossSignalContext> {
  const start = new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);
  const [metrics, marketSignals, competitorActivities, situations, opportunities, decisions, strategies, outcomes, monitoringEvents] = await Promise.all([
    calculateBusinessMetrics(businessId, start, now).catch(() => null), getMarketSignals(businessId, 25), getCompetitorActivities(businessId), getBusinessSituations(businessId), getOpportunities(businessId), getDecisionCandidates(businessId, 15), getStrategyStates(businessId), getRecentOutcomes(businessId, 20), getAllMonitoringEvents(businessId),
  ]);
  const observations = buildSignalObservations({ metrics, marketSignals, competitorActivities, situations, opportunities, decisions, strategies, outcomes, monitoringEvents, now });
  const relationships = buildRelationshipCandidates(observations, now);
  const clusters = buildSignalClusters(relationships, businessId);
  return { businessId, observations, relationships, clusters, metrics, generatedAt: now };
}

function relatedIds(candidate: RelationshipCandidate, field: keyof SignalObservation): number[] {
  return Array.from(new Set<number>([candidate.signalA, candidate.signalB].flatMap((item) => Array.isArray(item[field]) ? item[field] as number[] : []))).sort((a, b) => a - b);
}
function candidateEvidence(candidate: RelationshipCandidate) { return [candidate.signalA, candidate.signalB].map((signal) => ({ sourceType: signal.sourceType, sourceId: signal.sourceId, key: signal.key, label: signal.label, detail: signal.detail, direction: signal.direction, impact: signal.impact, theme: signal.theme, observedAt: signal.observedAt.toISOString() })); }

export async function refreshCrossSignalIntelligence(businessId: number) {
  const context = await loadCrossSignalContext(businessId);
  const persisted: CrossSignalRelationshipView[] = [];
  for (const candidate of context.relationships) {
    const previous = await getSignalRelationships(businessId, { limit: 100 });
    const old = previous.find((row) => row.relationshipKey === candidate.relationshipKey);
    const evidenceCount = Math.max(candidate.evidenceCount, old?.evidenceCount || 0) + (old ? 1 : 0);
    const firstObservedAt = old?.firstObservedAt && old.firstObservedAt < candidate.firstObservedAt ? old.firstObservedAt : candidate.firstObservedAt;
    const stability = calculateRelationshipStability(evidenceCount, firstObservedAt, candidate.lastObservedAt);
    const freshness = calculateRelationshipFreshness([candidate.signalA, candidate.signalB]);
    const strength = calculateRelationshipStrength(evidenceCount, freshness, stability);
    const status = statusForEvidence(evidenceCount, freshness);
    const result = await upsertSignalRelationship({
      businessId, relationshipKey: candidate.relationshipKey, signalAType: candidate.signalA.sourceType, signalAId: candidate.signalA.sourceId, signalAKey: candidate.signalA.key, signalBType: candidate.signalB.sourceType, signalBId: candidate.signalB.sourceId, signalBKey: candidate.signalB.key,
      relationshipType: candidate.relationshipType, strength, evidenceCount, stability, freshness, status, firstObservedAt, lastObservedAt: candidate.lastObservedAt,
      relatedSituationIdsJson: JSON.stringify(relatedIds(candidate, "relatedSituationIds")), relatedOpportunityIdsJson: JSON.stringify(relatedIds(candidate, "relatedOpportunityIds")), relatedDecisionIdsJson: JSON.stringify(relatedIds(candidate, "relatedDecisionIds")), relatedStrategyIdsJson: JSON.stringify(relatedIds(candidate, "relatedStrategyIds")), relatedOutcomeIdsJson: JSON.stringify(relatedIds(candidate, "relatedOutcomeIds")), evidenceJson: JSON.stringify(candidateEvidence(candidate)), whatWeKnowJson: JSON.stringify([`${candidate.signalA.label} was observed at ${candidate.signalA.observedAt.toISOString()}.`, `${candidate.signalB.label} was observed at ${candidate.signalB.observedAt.toISOString()}.`, `The relationship was classified as ${candidate.relationshipType}.`]), whatWeDontKnowJson: JSON.stringify(["Whether either signal caused the other.", "Whether the pattern will persist beyond the current review window."]), explanation: relationExplanation(candidate.relationshipType, candidate.signalA, candidate.signalB), causalityStatus: "NOT_ESTABLISHED",
    });
    if (result.row) persisted.push(relationshipView(result.row));
  }
  const existing = await getSignalRelationships(businessId, { limit: 100 });
  const currentKeys = new Set(context.relationships.map((item) => item.relationshipKey));
  for (const row of existing) {
    if (currentKeys.has(row.relationshipKey) || row.status === "RESOLVED") continue;
    const age = Math.max(0, Date.now() - dateValue(row.lastObservedAt).getTime()) / DAY_MS;
    const nextStatus: RelationshipStatus = age > 60 ? "RESOLVED" : age > 30 ? "WEAKENING" : row.status;
    if (nextStatus !== row.status) await updateSignalRelationshipLifecycle(businessId, row.id, nextStatus, JSON.stringify({ reason: "No supporting relationship evidence in the recent review window.", ageDays: Math.round(age) }));
  }
  const relationshipIdByKey = new Map(persisted.map((row) => [row.relationshipKey, row.id]).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
  for (const cluster of context.clusters) {
    const members = context.relationships.filter((candidate) => {
      const themes = [candidate.signalA.theme, candidate.signalB.theme].sort().join("+");
      return `${themes}:${candidate.relationshipType}` === cluster.clusterKey;
    });
    const relationshipIds = members.map((candidate) => relationshipIdByKey.get(candidate.relationshipKey)).filter((id): id is number => typeof id === "number");
    await upsertSignalCluster({ businessId, clusterKey: cluster.clusterKey, title: cluster.title, theme: cluster.theme, interpretation: cluster.interpretation, relationshipType: cluster.relationshipType, strength: cluster.strength, stability: cluster.stability, freshness: cluster.freshness, evidenceCount: cluster.evidenceCount, relationshipIdsJson: JSON.stringify(relationshipIds), signalKeysJson: JSON.stringify(cluster.signalKeys), evidenceJson: JSON.stringify(cluster.evidence), relatedSituationIdsJson: JSON.stringify(cluster.relatedSituationIds), relatedOpportunityIdsJson: JSON.stringify(cluster.relatedOpportunityIds), relatedDecisionIdsJson: JSON.stringify(cluster.relatedDecisionIds), relatedStrategyIdsJson: JSON.stringify(cluster.relatedStrategyIds), relatedOutcomeIdsJson: JSON.stringify(cluster.relatedOutcomeIds), status: cluster.status, firstObservedAt: cluster.firstObservedAt, lastObservedAt: cluster.lastObservedAt });
  }
  return { ...context, relationships: persisted, clusters: await getSignalClusters(businessId, { limit: 12 }), refreshedAt: new Date() };
}

export function canTransitionRelationship(current: RelationshipStatus, next: RelationshipStatus) {
  const allowed: Record<RelationshipStatus, RelationshipStatus[]> = {
    NEW: ["ACTIVE", "WEAKENING", "RESOLVED"],
    ACTIVE: ["WEAKENING", "RESOLVED"],
    WEAKENING: ["ACTIVE", "RESOLVED"],
    RESOLVED: ["NEW", "ACTIVE"],
  };
  return current === next || allowed[current].includes(next);
}

export async function updateCrossSignalRelationshipStatus(businessId: number, relationshipId: number, status: RelationshipStatus, details?: string) {
  const existing = await getSignalRelationshipById(businessId, relationshipId);
  if (!existing) return null;
  if (!canTransitionRelationship(existing.status as RelationshipStatus, status)) throw new Error(`Invalid relationship lifecycle transition from ${existing.status} to ${status}.`);
  const row = await updateSignalRelationshipLifecycle(businessId, relationshipId, status, details ? JSON.stringify({ details }) : undefined);
  return row ? relationshipView(row) : null;
}

export async function getCrossSignalIntelligence(businessId: number, limit = 7) {
  const rows = await getSignalRelationships(businessId, { limit: Math.min(Math.max(limit, 1), 12) });
  const clusters = await getSignalClusters(businessId, { limit: 6 });
  return { relationships: rows.map(relationshipView), clusters, generatedAt: new Date() };
}

export async function getCrossSignalRelationshipDetail(businessId: number, relationshipId: number) {
  const row = await getSignalRelationshipById(businessId, relationshipId);
  if (!row) return null;
  return { relationship: relationshipView(row), history: await getSignalRelationshipHistory(businessId, relationshipId, 50) };
}

export async function getCrossSignalClusterDetail(businessId: number, clusterId: number) {
  const cluster = await getSignalClusterById(businessId, clusterId);
  if (!cluster) return null;
  const relationshipIds = numberList(parse(cluster.relationshipIdsJson, []));
  const relationships = (await Promise.all(relationshipIds.map((id) => getSignalRelationshipById(businessId, id)))).filter(Boolean).map(relationshipView);
  return { cluster, relationships };
}

function linkedById(row: any, field: string, id: number) { return numberList(parse(row[field], [])).includes(id); }
export async function getRelatedCrossSignalEvidence(businessId: number, entityType: "SITUATION" | "OPPORTUNITY" | "DECISION" | "STRATEGY" | "OUTCOME" | "MONITORING", entityId: number) {
  const rows = await getSignalRelationships(businessId, { limit: 100 });
  const field: Record<string, string> = { SITUATION: "relatedSituationIdsJson", OPPORTUNITY: "relatedOpportunityIdsJson", DECISION: "relatedDecisionIdsJson", STRATEGY: "relatedStrategyIdsJson", OUTCOME: "relatedOutcomeIdsJson", MONITORING: "evidenceJson" };
  if (entityType === "MONITORING") return rows.filter((row) => row.signalAType === "MONITORING" && row.signalAId === entityId || row.signalBType === "MONITORING" && row.signalBId === entityId).map(relationshipView);
  return rows.filter((row) => linkedById(row, field[entityType], entityId)).map(relationshipView);
}

export async function getCrossSignalMonitoringSupport(businessId: number) {
  const result = await getCrossSignalIntelligence(businessId, 12);
  return result.relationships.filter((relationship) => relationship.relationshipType === "CONVERGING" && relationship.evidenceCount >= 2 && relationship.freshness !== "STALE");
}

export async function getCrossSignalDecisionEvidence(businessId: number, decisionId: number) { return getRelatedCrossSignalEvidence(businessId, "DECISION", decisionId); }
export async function getCrossSignalSituationEvidence(businessId: number, situationId: number) { return getRelatedCrossSignalEvidence(businessId, "SITUATION", situationId); }
export async function getCrossSignalOpportunityEvidence(businessId: number, opportunityId: number) { return getRelatedCrossSignalEvidence(businessId, "OPPORTUNITY", opportunityId); }

export function crossSignalView(row: any): CrossSignalRelationshipView { return relationshipView(row); }
