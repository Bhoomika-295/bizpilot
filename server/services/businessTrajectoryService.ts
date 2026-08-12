import {
  getAllBusinessExpenses,
  getAllBusinessTransactions,
  getBusinessCustomers,
} from "./businessDataService";
import {
  createTrajectoryForecastSnapshot,
  createTrajectoryHistory,
  createTrajectoryLearningSignal,
  getBusinessTrajectoryById,
  getBusinessTrajectories,
  getTrajectoryForecastSnapshots,
  getTrajectoryHistory,
  type BusinessTrajectoryWrite,
  type TrajectoryForecastSnapshotWrite,
  upsertBusinessTrajectory,
  updateTrajectoryForecastActual,
} from "../db";
import { getBusinessSituations } from "../db";
import { getOpportunities, getDecisionCandidates, getStrategies } from "../db";
import { getCrossSignalIntelligence } from "./crossSignalIntelligenceService";

export const TRAJECTORY_METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "expenses", label: "Operating cost" },
  { key: "transactionCount", label: "Order volume" },
  { key: "activeCustomers", label: "Customer activity" },
] as const;

export type ForecastWindow = 7 | 14 | 30;
export type TrajectoryDirection = "IMPROVING" | "DECLINING" | "STABLE" | "VOLATILE" | "INSUFFICIENT_DATA";
export type TrajectoryMomentum = "ACCELERATING" | "DECELERATING" | "STABLE" | "UNKNOWN";
export type DataSufficiency = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type VolatilityLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type TrajectoryStatus =
  | "HEALTHY_GROWTH"
  | "STABLE"
  | "SLOWING_GROWTH"
  | "EARLY_DECLINE"
  | "ACCELERATING_DECLINE"
  | "RECOVERING"
  | "VOLATILE"
  | "INSUFFICIENT_DATA";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const HISTORY_DAYS = 56;
const MIN_MEANINGFUL_RATE = 3;

export interface MetricObservation {
  metricKey: string;
  metricLabel: string;
  observedAt: Date;
  value: number;
}

export interface MetricTrajectoryView {
  metricKey: string;
  metricLabel: string;
  observations: MetricObservation[];
  currentValue: number | null;
  previousValue: number | null;
  direction: TrajectoryDirection;
  momentum: TrajectoryMomentum;
  volatility: VolatilityLevel;
  forecastWindow: ForecastWindow | null;
  projectedValue: number | null;
  projectedDirection: string | null;
  confidenceLevel: ConfidenceLevel;
  dataSufficiency: DataSufficiency;
  freshness: "CURRENT" | "LIMITED" | "STALE" | "UNKNOWN";
  evidenceCount: number;
  status: TrajectoryStatus;
  earlyWarnings: string[];
  supportingSignals: string[];
  contradictingSignals: string[];
  explanation: string;
}

export interface TrajectoryIntegrationContext {
  crossSignalRelationships?: Array<{
    relationshipType?: string;
    strength?: string;
    freshness?: string;
    explanation?: string;
    signalAKey?: string;
    signalBKey?: string;
  }>;
  situations?: any[];
  opportunities?: any[];
  decisions?: any[];
  strategies?: any[];
}

export interface BusinessTrajectorySummary {
  businessId: number;
  state: "IMPROVING" | "STABLE" | "MIXED" | "EARLY_WARNING" | "DETERIORATING" | "RECOVERING" | "VOLATILE" | "UNKNOWN";
  headline: string;
  interpretation: string;
  trajectories: MetricTrajectoryView[];
  earlyWarnings: string[];
  supportingSignals: string[];
  contradictingSignals: string[];
  confidenceLevel: ConfidenceLevel;
  freshness: "CURRENT" | "LIMITED" | "STALE" | "UNKNOWN";
  forecastWindow: ForecastWindow;
  updatedAt: Date;
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundProjection(value: number): number {
  const magnitude = Math.abs(value);
  const step = magnitude >= 1000 ? 1 : magnitude >= 100 ? 0.1 : 0.01;
  return Math.round(value / step) * step;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function freshnessFor(lastObservedAt: Date | null, now: Date): MetricTrajectoryView["freshness"] {
  if (!lastObservedAt) return "UNKNOWN";
  const ageDays = Math.max(0, now.getTime() - lastObservedAt.getTime()) / DAY_MS;
  if (ageDays <= 7) return "CURRENT";
  if (ageDays <= 21) return "LIMITED";
  return "STALE";
}

function dataSufficiencyFor(observationCount: number): DataSufficiency {
  if (observationCount >= 6) return "HIGH";
  if (observationCount >= 4) return "MEDIUM";
  if (observationCount >= 2) return "LOW";
  return "INSUFFICIENT";
}

function classifyVolatility(rates: number[]): VolatilityLevel {
  if (rates.length < 2) return "UNKNOWN";
  const signChanges = rates.slice(1).filter((rate, index) => Math.sign(rate) !== Math.sign(rates[index])).length;
  const dispersion = standardDeviation(rates);
  const magnitude = Math.max(1, Math.abs(average(rates)));
  if (signChanges >= 2 || dispersion > Math.max(18, magnitude * 2.5)) return "HIGH";
  if (dispersion > Math.max(8, magnitude * 1.5)) return "MEDIUM";
  return "LOW";
}

function classifyMomentum(rates: number[]): TrajectoryMomentum {
  if (rates.length < 3) return "UNKNOWN";
  const prior = average(rates.slice(0, -2));
  const recent = average(rates.slice(-2));
  const priorMagnitude = Math.abs(prior);
  const recentMagnitude = Math.abs(recent);
  if (recentMagnitude >= priorMagnitude + 1) return "ACCELERATING";
  if (recentMagnitude <= Math.max(0, priorMagnitude - 1)) return "DECELERATING";
  return "STABLE";
}

function classifyDirection(rates: number[], volatility: VolatilityLevel): TrajectoryDirection {
  if (rates.length === 0) return "INSUFFICIENT_DATA";
  if (volatility === "HIGH") return "VOLATILE";
  const recentRate = average(rates.slice(-Math.min(3, rates.length)));
  if (Math.abs(recentRate) < MIN_MEANINGFUL_RATE) return "STABLE";
  return recentRate > 0 ? "IMPROVING" : "DECLINING";
}

function classifyConfidence(
  sufficiency: DataSufficiency,
  volatility: VolatilityLevel,
  freshness: MetricTrajectoryView["freshness"]
): ConfidenceLevel {
  if (sufficiency === "INSUFFICIENT") return "UNKNOWN";
  if (volatility === "HIGH" || freshness === "STALE") return "LOW";
  if (sufficiency === "HIGH" && volatility === "LOW" && freshness === "CURRENT") return "HIGH";
  if (sufficiency === "MEDIUM" || volatility === "MEDIUM" || freshness === "LIMITED") return "MEDIUM";
  return "LOW";
}

function classifyStatus(direction: TrajectoryDirection, momentum: TrajectoryMomentum): TrajectoryStatus {
  if (direction === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  if (direction === "VOLATILE") return "VOLATILE";
  if (direction === "STABLE") return "STABLE";
  if (direction === "IMPROVING" && momentum === "DECELERATING") return "SLOWING_GROWTH";
  if (direction === "DECLINING" && momentum === "ACCELERATING") return "ACCELERATING_DECLINE";
  if (direction === "DECLINING" && momentum === "DECELERATING") return "RECOVERING";
  if (direction === "IMPROVING") return "HEALTHY_GROWTH";
  return "EARLY_DECLINE";
}

function projectedDirectionFor(direction: TrajectoryDirection, momentum: TrajectoryMomentum): string | null {
  if (direction === "INSUFFICIENT_DATA" || direction === "VOLATILE") return null;
  if (direction === "IMPROVING" && momentum === "DECELERATING") return "POSITIVE BUT SLOWING";
  if (direction === "DECLINING" && momentum === "DECELERATING") return "DECLINE MAY EASE";
  if (direction === "IMPROVING") return "CONTINUED GROWTH";
  if (direction === "DECLINING") return "CONTINUED PRESSURE";
  return "STABLE RANGE";
}

function warningsFor(
  metricLabel: string,
  direction: TrajectoryDirection,
  momentum: TrajectoryMomentum,
  status: TrajectoryStatus,
  volatility: VolatilityLevel,
  freshness: MetricTrajectoryView["freshness"]
): string[] {
  const warnings: string[] = [];
  if (status === "SLOWING_GROWTH") warnings.push(`${metricLabel} remains positive, but recent growth momentum is slowing.`);
  if (status === "EARLY_DECLINE") warnings.push(`${metricLabel} has moved into a declining trajectory and warrants review.`);
  if (status === "ACCELERATING_DECLINE") warnings.push(`${metricLabel} is declining and the rate of deterioration is increasing.`);
  if (status === "VOLATILE") warnings.push(`${metricLabel} is behaving inconsistently, so short-term direction is uncertain.`);
  if (freshness === "STALE") warnings.push(`${metricLabel} is based on stale data; refresh the underlying records before acting.`);
  if (direction === "IMPROVING" && momentum === "DECELERATING") warnings.push(`${metricLabel} is improving without the same pace of recent support.`);
  if (volatility === "HIGH" && warnings.length === 0) warnings.push(`${metricLabel} has high variation across recent observations.`);
  return Array.from(new Set(warnings));
}

export function buildMetricTrajectory(
  observations: MetricObservation[],
  now = new Date(),
  forecastWindow: ForecastWindow = 7
): MetricTrajectoryView {
  const ordered = observations
    .map((observation) => ({ ...observation, observedAt: new Date(observation.observedAt), value: asNumber(observation.value) }))
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const current = ordered.at(-1)?.value ?? null;
  const previous = ordered.at(-2)?.value ?? null;
  const rates: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const before = ordered[index - 1].value;
    const after = ordered[index].value;
    if (before !== 0) rates.push(((after - before) / Math.abs(before)) * 100);
  }
  const sufficiency = dataSufficiencyFor(ordered.length);
  const volatility = classifyVolatility(rates);
  const direction = ordered.length < 2 ? "INSUFFICIENT_DATA" : classifyDirection(rates, volatility);
  const momentum = direction === "INSUFFICIENT_DATA" || direction === "VOLATILE" ? "UNKNOWN" : classifyMomentum(rates);
  const freshness = freshnessFor(ordered.at(-1)?.observedAt ?? null, now);
  const confidenceLevel = classifyConfidence(sufficiency, volatility, freshness);
  const status = classifyStatus(direction, momentum);
  const canProject = current !== null && ordered.length >= 4 && confidenceLevel !== "LOW" && confidenceLevel !== "UNKNOWN" && volatility !== "HIGH";
  const recentRate = average(rates.slice(-Math.min(3, rates.length)));
  const projectedValue = canProject ? roundProjection(current * (1 + (recentRate / 100) * (forecastWindow / 7))) : null;
  const projectedDirection = projectedDirectionFor(direction, momentum);
  const earlyWarnings = warningsFor(ordered[0]?.metricLabel ?? "Metric", direction, momentum, status, volatility, freshness);
  const explanation = ordered.length < 2
    ? `${ordered[0]?.metricLabel ?? "Metric"} does not have enough historical observations to establish a trajectory.`
    : `${ordered[0].metricLabel} is ${direction.toLowerCase().replaceAll("_", " ")} with ${momentum.toLowerCase().replaceAll("_", " ")} momentum. Based on ${ordered.length} observed points, the forecast is ${confidenceLevel.toLowerCase()} confidence and is updated from the latest available business data.`;
  return {
    metricKey: ordered[0]?.metricKey ?? "unknown",
    metricLabel: ordered[0]?.metricLabel ?? "Metric",
    observations: ordered,
    currentValue: current,
    previousValue: previous,
    direction,
    momentum,
    volatility,
    forecastWindow: ordered.length >= 4 ? forecastWindow : null,
    projectedValue,
    projectedDirection: projectedValue === null ? null : projectedDirection,
    confidenceLevel,
    dataSufficiency: sufficiency,
    freshness,
    evidenceCount: ordered.length,
    status,
    earlyWarnings,
    supportingSignals: [],
    contradictingSignals: [],
    explanation,
  };
}

function weekKey(date: Date): string {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized.toISOString().slice(0, 10);
}

function groupObservations(
  metricKey: string,
  metricLabel: string,
  records: Array<{ date: Date; value: number }>
): MetricObservation[] {
  const buckets = new Map<string, { date: Date; value: number; customers: Set<number> }>();
  for (const record of records) {
    const key = weekKey(record.date);
    const bucket = buckets.get(key) ?? { date: new Date(`${key}T00:00:00.000Z`), value: 0, customers: new Set<number>() };
    bucket.value += asNumber(record.value);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime()).map((bucket) => ({
    metricKey,
    metricLabel,
    observedAt: bucket.date,
    value: bucket.value,
  }));
}

function groupCustomerActivity(
  records: Array<{ date: Date; customerId: number | null }>
): MetricObservation[] {
  const buckets = new Map<string, { date: Date; customers: Set<number> }>();
  for (const record of records) {
    const key = weekKey(record.date);
    const bucket = buckets.get(key) ?? { date: new Date(`${key}T00:00:00.000Z`), customers: new Set<number>() };
    if (record.customerId !== null) bucket.customers.add(record.customerId);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime()).map((bucket) => ({
    metricKey: "activeCustomers",
    metricLabel: "Customer activity",
    observedAt: bucket.date,
    value: bucket.customers.size,
  }));
}

export async function loadHistoricalMetricObservations(businessId: number, now = new Date()): Promise<Record<string, MetricObservation[]>> {
  const start = new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
  const [transactions, expenses, customers] = await Promise.all([
    getAllBusinessTransactions(businessId),
    getAllBusinessExpenses(businessId),
    getBusinessCustomers(businessId),
  ]);
  const transactionRows = transactions.filter((row) => row.transactionDate >= start && row.status === "completed");
  const expenseRows = expenses.filter((row) => row.expenseDate >= start && row.status === "completed");
  const transactionDates = transactionRows.map((row) => ({ date: new Date(row.transactionDate), value: asNumber(row.amount) }));
  const expenseDates = expenseRows.map((row) => ({ date: new Date(row.expenseDate), value: asNumber(row.amount) }));
  const activityDates = transactionRows.map((row) => ({ date: new Date(row.transactionDate), customerId: row.customerId }));
  return {
    revenue: groupObservations("revenue", "Revenue", transactionDates),
    expenses: groupObservations("expenses", "Operating cost", expenseDates),
    transactionCount: groupObservations("transactionCount", "Order volume", transactionRows.map((row) => ({ date: new Date(row.transactionDate), value: 1 }))),
    activeCustomers: groupCustomerActivity(activityDates),
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function trajectoryViewFromRow(row: any): MetricTrajectoryView {
  return {
    metricKey: row.metricKey,
    metricLabel: row.metricLabel,
    observations: parseJson<MetricObservation[]>(row.evidenceJson, []).map((item) => ({ ...item, observedAt: new Date(item.observedAt) })),
    currentValue: row.currentValue === null ? null : asNumber(row.currentValue),
    previousValue: row.previousValue === null ? null : asNumber(row.previousValue),
    direction: row.direction,
    momentum: row.momentum,
    volatility: row.volatility,
    forecastWindow: row.forecastWindow as ForecastWindow | null,
    projectedValue: row.projectedValue === null ? null : asNumber(row.projectedValue),
    projectedDirection: row.projectedDirection,
    confidenceLevel: row.confidenceLevel,
    dataSufficiency: row.dataSufficiency,
    freshness: row.freshness,
    evidenceCount: row.evidenceCount,
    status: row.status,
    earlyWarnings: parseJson<string[]>(row.earlyWarningsJson, []),
    supportingSignals: parseJson<string[]>(row.supportingSignalsJson, []),
    contradictingSignals: parseJson<string[]>(row.contradictingSignalsJson, []),
    explanation: row.explanation,
  };
}

export function synthesizeBusinessTrajectory(
  businessId: number,
  trajectories: MetricTrajectoryView[],
  context: TrajectoryIntegrationContext = {},
  now = new Date(),
  forecastWindow: ForecastWindow = 7
): BusinessTrajectorySummary {
  const usable = trajectories.filter((trajectory) => trajectory.direction !== "INSUFFICIENT_DATA");
  const declines = usable.filter((trajectory) => ["EARLY_DECLINE", "ACCELERATING_DECLINE"].includes(trajectory.status));
  const improving = usable.filter((trajectory) => ["HEALTHY_GROWTH", "RECOVERING"].includes(trajectory.status));
  const warnings = usable.flatMap((trajectory) => trajectory.earlyWarnings);
  const relationshipWarnings = (context.crossSignalRelationships ?? []).filter((relationship) =>
    ["CONTRADICTING", "SEQUENTIAL"].includes(String(relationship.relationshipType)) && relationship.freshness !== "STALE"
  );
  const convergingSupport = (context.crossSignalRelationships ?? []).filter((relationship) =>
    relationship.relationshipType === "CONVERGING" && relationship.freshness !== "STALE"
  );
  const hasHighPrioritySituation = (context.situations ?? []).some((situation) =>
    ["HIGH", "CRITICAL"].includes(String(situation.priority).toUpperCase()) && String(situation.status).toUpperCase() !== "RESOLVED"
  );
  const hasOpenDecision = (context.decisions ?? []).some((decision) => ["OPEN", "IN_REVIEW"].includes(String(decision.status).toUpperCase()));
  const crossSignalWarning = relationshipWarnings.length > 0 || hasHighPrioritySituation;
  const state: BusinessTrajectorySummary["state"] = usable.length === 0
    ? "UNKNOWN"
    : usable.some((trajectory) => trajectory.volatility === "HIGH") && usable.filter((trajectory) => trajectory.volatility === "HIGH").length >= 2
      ? "VOLATILE"
      : declines.length >= 2 || usable.some((trajectory) => trajectory.status === "ACCELERATING_DECLINE")
        ? "DETERIORATING"
        : crossSignalWarning || warnings.length > 0
          ? "EARLY_WARNING"
          : improving.length > 0 && improving.length === usable.length
            ? (usable.some((trajectory) => trajectory.status === "RECOVERING") ? "RECOVERING" : "IMPROVING")
            : usable.every((trajectory) => trajectory.status === "STABLE")
              ? "STABLE"
              : "MIXED";
  const supportingSignals = [
    ...convergingSupport.map((relationship) => relationship.explanation ?? "A converging cross-signal relationship supports this trajectory."),
    ...improving.map((trajectory) => `${trajectory.metricLabel} is ${trajectory.direction.toLowerCase()}.`),
    ...(context.opportunities ?? []).filter((opportunity) => ["NEW", "ACTIVE", "MONITORING"].includes(String(opportunity.status).toUpperCase())).slice(0, 2).map((opportunity) => `Open opportunity context: ${opportunity.title ?? "Opportunity"}.`),
  ];
  const contradictingSignals = [
    ...relationshipWarnings.map((relationship) => relationship.explanation ?? "A conflicting cross-signal relationship weakens confidence."),
    ...declines.map((trajectory) => `${trajectory.metricLabel} is ${trajectory.direction.toLowerCase()} with ${trajectory.momentum.toLowerCase()} momentum.`),
    ...(context.strategies ?? []).filter((strategy) => String(strategy.status).toUpperCase() === "ACTIVE").slice(0, 2).map((strategy) => `Active strategy context may need review against current evidence: ${strategy.title ?? "Strategy"}.`),
  ];
  const confidenceValues = usable.map((trajectory) => trajectory.confidenceLevel);
  const confidenceLevel: ConfidenceLevel = confidenceValues.includes("LOW") || confidenceValues.includes("UNKNOWN")
    ? "LOW"
    : confidenceValues.includes("MEDIUM")
      ? "MEDIUM"
      : confidenceValues.length > 0 ? "HIGH" : "UNKNOWN";
  const freshness: BusinessTrajectorySummary["freshness"] = usable.some((trajectory) => trajectory.freshness === "STALE")
    ? "STALE"
    : usable.some((trajectory) => trajectory.freshness === "LIMITED")
      ? "LIMITED"
      : usable.length > 0 ? "CURRENT" : "UNKNOWN";
  const headlineByState: Record<BusinessTrajectorySummary["state"], string> = {
    IMPROVING: "Business trajectory is improving",
    STABLE: "Business trajectory is broadly stable",
    MIXED: "Business trajectory is mixed",
    EARLY_WARNING: "Business trajectory shows early warning conditions",
    DETERIORATING: "Business trajectory is deteriorating",
    RECOVERING: "Business trajectory is recovering",
    VOLATILE: "Business trajectory is volatile",
    UNKNOWN: "Business trajectory is not yet established",
  };
  const interpretation = state === "EARLY_WARNING"
    ? `Recent evidence remains mixed or weakening across important indicators${hasOpenDecision ? "; open decisions should be reviewed against the latest trajectory" : ""}. This is an early-warning condition, not a causal conclusion.`
    : state === "DETERIORATING"
      ? "Multiple verified indicators are declining or accelerating downward. Review the evidence chain before taking action."
      : state === "IMPROVING"
        ? "Recent observations are directionally positive across the available indicators, with confidence limited by data sufficiency and freshness."
        : state === "RECOVERING"
          ? "Recent declines appear to be easing in at least one important indicator; recovery is emerging but not yet confirmed."
          : state === "STABLE"
            ? "Available indicators are not moving enough to establish a meaningful near-term direction."
            : "The available indicators do not support a single reliable business direction yet.";
  return {
    businessId,
    state,
    headline: headlineByState[state],
    interpretation,
    trajectories,
    earlyWarnings: Array.from(new Set([...warnings, ...relationshipWarnings.map((relationship) => relationship.explanation ?? "Related signals are moving in conflicting directions.")])),
    supportingSignals: Array.from(new Set(supportingSignals)).slice(0, 8),
    contradictingSignals: Array.from(new Set(contradictingSignals)).slice(0, 8),
    confidenceLevel,
    freshness,
    forecastWindow,
    updatedAt: now,
  };
}

async function loadIntegrationContext(businessId: number): Promise<TrajectoryIntegrationContext> {
  const [crossSignal, situations, opportunities, decisions, strategies] = await Promise.all([
    getCrossSignalIntelligence(businessId, 12).catch(() => ({ relationships: [] })),
    getBusinessSituations(businessId).catch(() => []),
    getOpportunities(businessId).catch(() => []),
    getDecisionCandidates(businessId, 15).catch(() => []),
    getStrategies(businessId).catch(() => []),
  ]);
  return {
    crossSignalRelationships: crossSignal.relationships,
    situations,
    opportunities,
    decisions,
    strategies,
  };
}

function trajectoryWriteFromView(businessId: number, view: MetricTrajectoryView): BusinessTrajectoryWrite {
  return {
    businessId,
    metricKey: view.metricKey,
    metricLabel: view.metricLabel,
    currentValue: view.currentValue === null ? null : String(view.currentValue),
    previousValue: view.previousValue === null ? null : String(view.previousValue),
    direction: view.direction,
    momentum: view.momentum,
    forecastWindow: view.forecastWindow,
    projectedValue: view.projectedValue === null ? null : String(view.projectedValue),
    projectedDirection: view.projectedDirection,
    confidenceLevel: view.confidenceLevel,
    dataSufficiency: view.dataSufficiency,
    volatility: view.volatility,
    status: view.status,
    evidenceCount: view.evidenceCount,
    freshness: view.freshness,
    lastObservedAt: view.observations.at(-1)?.observedAt ?? null,
    evidenceJson: JSON.stringify(view.observations),
    supportingSignalsJson: JSON.stringify(view.supportingSignals),
    contradictingSignalsJson: JSON.stringify(view.contradictingSignals),
    earlyWarningsJson: JSON.stringify(view.earlyWarnings),
    explanation: view.explanation,
  };
}

export async function refreshBusinessTrajectory(
  businessId: number,
  options: { forecastWindow?: ForecastWindow; now?: Date } = {}
) {
  const now = options.now ?? new Date();
  const forecastWindow = options.forecastWindow ?? 7;
  const observations = await loadHistoricalMetricObservations(businessId, now);
  const context = await loadIntegrationContext(businessId);
  const views = TRAJECTORY_METRICS.map((metric) => {
    const view = buildMetricTrajectory(observations[metric.key] ?? [], now, forecastWindow);
    const related = (context.crossSignalRelationships ?? []).filter((relationship) =>
      relationship.signalAKey === metric.key || relationship.signalBKey === metric.key
    );
    view.supportingSignals = related.filter((relationship) => relationship.relationshipType === "CONVERGING").map((relationship) => relationship.explanation ?? "Converging related signals support this metric.");
    view.contradictingSignals = related.filter((relationship) => relationship.relationshipType === "CONTRADICTING").map((relationship) => relationship.explanation ?? "Contradicting related signals reduce confidence.");
    view.earlyWarnings = Array.from(new Set([...view.earlyWarnings, ...view.contradictingSignals]));
    return view;
  });
  const summary = synthesizeBusinessTrajectory(businessId, views, context, now, forecastWindow);
  const persisted: MetricTrajectoryView[] = [];
  for (const view of views) {
    const previous = await getBusinessTrajectoryById(businessId, (await getBusinessTrajectories(businessId, { metricKey: view.metricKey, limit: 1 }))[0]?.id ?? -1);
    const result = await upsertBusinessTrajectory(trajectoryWriteFromView(businessId, view));
    if (result.row) {
      persisted.push(trajectoryViewFromRow(result.row));
      const changed = Boolean(result.changed);
      if (changed || !previous) {
        await createTrajectoryHistory({
          businessId,
          trajectoryId: result.id as number,
          eventType: changed ? "TRAJECTORY_UPDATED" : "TRAJECTORY_CREATED",
          previousStatus: previous?.status ?? null,
          newStatus: view.status,
          detailsJson: JSON.stringify({ direction: view.direction, momentum: view.momentum, confidenceLevel: view.confidenceLevel }),
        });
      }
      const recentSnapshots = await getTrajectoryForecastSnapshots(businessId, { metricKey: view.metricKey, limit: 1 });
      const latestSnapshot = recentSnapshots[0];
      const recentEnough = latestSnapshot && now.getTime() - new Date(latestSnapshot.forecastedAt).getTime() < 6 * 60 * 60 * 1000;
      if (!recentEnough && result.id) {
        const snapshot: TrajectoryForecastSnapshotWrite = {
          businessId,
          trajectoryId: result.id,
          metricKey: view.metricKey,
          forecastWindow,
          forecastedAt: now,
          observedThrough: view.observations.at(-1)?.observedAt ?? now,
          currentValue: view.currentValue === null ? null : String(view.currentValue),
          projectedValue: view.projectedValue === null ? null : String(view.projectedValue),
          projectedDirection: view.projectedDirection,
          trajectoryStatus: view.status,
          confidenceLevel: view.confidenceLevel,
          dataSufficiency: view.dataSufficiency,
          evidenceJson: JSON.stringify(view.observations),
          actualValue: null,
          actualObservedAt: null,
          comparisonStatus: null,
          comparisonNotes: null,
        };
        await createTrajectoryForecastSnapshot(snapshot);
      }
    }
  }
  return { ...summary, trajectories: persisted.length > 0 ? persisted : views, refreshedAt: now };
}

export async function getBusinessTrajectoryIntelligence(
  businessId: number,
  options: { forecastWindow?: ForecastWindow; refresh?: boolean } = {}
): Promise<BusinessTrajectorySummary> {
  const forecastWindow = options.forecastWindow ?? 7;
  const stored = await getBusinessTrajectories(businessId, { limit: 20 });
  if (options.refresh || stored.length === 0) {
    return refreshBusinessTrajectory(businessId, { forecastWindow });
  }
  const context = await loadIntegrationContext(businessId);
  const trajectories = stored.map(trajectoryViewFromRow);
  return synthesizeBusinessTrajectory(businessId, trajectories, context, new Date(), forecastWindow);
}

export async function getBusinessTrajectoryDetail(businessId: number, trajectoryId: number) {
  const row = await getBusinessTrajectoryById(businessId, trajectoryId);
  if (!row) return null;
  return {
    trajectory: trajectoryViewFromRow(row),
    snapshots: await getTrajectoryForecastSnapshots(businessId, { trajectoryId, limit: 30 }),
    history: await getTrajectoryHistory(businessId, trajectoryId, 50),
  };
}

export function compareForecastToActual(currentValue: number | null, projectedValue: number | null, actualValue: number | null) {
  if (currentValue === null || projectedValue === null || actualValue === null) {
    return { comparisonStatus: "INSUFFICIENT_DATA", signalType: "INSUFFICIENT_DATA", notes: "The forecast or actual value is not available for comparison." };
  }
  const expectedDelta = projectedValue - currentValue;
  const actualDelta = actualValue - currentValue;
  const expectedDirection = Math.sign(expectedDelta);
  const actualDirection = Math.sign(actualDelta);
  const directionCorrect = expectedDirection === 0 ? actualDirection === 0 : expectedDirection === actualDirection;
  const tolerance = Math.max(Math.abs(currentValue) * 0.05, 1);
  const withinExpectedRange = Math.abs(actualValue - projectedValue) <= tolerance;
  if (directionCorrect && withinExpectedRange) {
    return { comparisonStatus: "FORECAST_ACCURATE", signalType: "FORECAST_ACCURATE", notes: "Actual movement remained within a modest evidence-based tolerance of the projection." };
  }
  if (directionCorrect) {
    return { comparisonStatus: "FORECAST_DIRECTION_CORRECT", signalType: "FORECAST_DIRECTION_CORRECT", notes: "Actual movement followed the projected direction, but magnitude differed." };
  }
  return { comparisonStatus: "FORECAST_DIRECTION_WRONG", signalType: "FORECAST_DIRECTION_WRONG", notes: "Actual movement did not follow the projected direction." };
}

export async function recordForecastActual(
  businessId: number,
  snapshotId: number,
  actualValue: number,
  actualObservedAt = new Date()
) {
  const snapshots = await getTrajectoryForecastSnapshots(businessId, { limit: 100 });
  const snapshot = snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return null;
  const comparison = compareForecastToActual(
    snapshot.currentValue === null ? null : asNumber(snapshot.currentValue),
    snapshot.projectedValue === null ? null : asNumber(snapshot.projectedValue),
    actualValue
  );
  const updated = await updateTrajectoryForecastActual(businessId, snapshotId, {
    actualValue: String(actualValue),
    actualObservedAt,
    comparisonStatus: comparison.comparisonStatus,
    comparisonNotes: comparison.notes,
  });
  await createTrajectoryLearningSignal({
    businessId,
    forecastSnapshotId: snapshotId,
    metricKey: snapshot.metricKey,
    signalType: comparison.signalType,
    evidenceJson: JSON.stringify({ currentValue: snapshot.currentValue, projectedValue: snapshot.projectedValue, actualValue, actualObservedAt: actualObservedAt.toISOString(), notes: comparison.notes }),
  });
  return { snapshot: updated, comparison };
}

export async function getForecastHistory(businessId: number, metricKey?: string) {
  return getTrajectoryForecastSnapshots(businessId, { metricKey, limit: 50 });
}
