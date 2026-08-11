import {
  calculateBusinessMetrics,
  calculateBusinessHealthScore,
  getDataFreshness,
  detectBusinessChanges,
  DataFreshness,
} from "./businessMetricEngine";
import { getMarketSignals, getBusinessSituations, upsertBusinessSituation, updateBusinessSituationStatus } from "../db";

export type SituationPriority = "LOW" | "MEDIUM" | "HIGH";
export type SituationStatus = "ACTIVE" | "MONITORING" | "RESOLVED";
export type SituationCategory =
  | "Growth"
  | "Decline"
  | "Cost Pressure"
  | "Customer Change"
  | "Competitive Pressure"
  | "Market Opportunity"
  | "Operational Risk"
  | "Stable"
  | "Mixed Signals";

export interface SupportingSignalItem {
  type: "INTERNAL" | "EXTERNAL";
  label: string;
  value: string;
  detail: string;
  priority: SituationPriority;
  timestamp?: string;
  sourceUrl?: string;
}

export interface BusinessSituationItem {
  id?: number;
  businessId: number;
  title: string;
  summary: string;
  priority: SituationPriority;
  status: SituationStatus;
  category: SituationCategory;
  supportingSignals: SupportingSignalItem[];
  supportingCount: number;
  freshnessInfo: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Deterministic Business Situation Engine.
 * Groups internal metrics changes and external market signals into coherent operating situations.
 */
export async function evaluateAndUpsertBusinessSituations(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<BusinessSituationItem[]> {
  const metrics = await calculateBusinessMetrics(businessId, periodStartDate, periodEndDate);
  const [health, changeDetection, freshness, signals] = await Promise.all([
    calculateBusinessHealthScore(businessId, periodStartDate, periodEndDate),
    detectBusinessChanges(metrics),
    getDataFreshness(businessId),
    getMarketSignals(businessId, 30),
  ]);

  const rawSituations: Omit<BusinessSituationItem, "id" | "createdAt" | "updatedAt">[] = [];
  const changes = changeDetection.changes;

  const internalSignals: SupportingSignalItem[] = changes.map((c: any) => ({
    type: "INTERNAL",
    label: c.title,
    value: c.metric,
    detail: c.description,
    priority: c.priority,
  }));

  const externalSignals: SupportingSignalItem[] = signals.slice(0, 10).map((s: any) => ({
    type: "EXTERNAL",
    label: s.title,
    value: `${s.relevanceLevel} Relevance (${s.impactArea})`,
    detail: s.snippet || s.explanation || "External market signal detected.",
    priority: s.relevanceLevel === "HIGH" ? "HIGH" : s.relevanceLevel === "MEDIUM" ? "MEDIUM" : "LOW",
    timestamp: s.publishedAt ? new Date(s.publishedAt).toLocaleString() : undefined,
    sourceUrl: s.sourceUrl || undefined,
  }));

  const allSupporting = [...internalSignals, ...externalSignals];

  // Check for Mixed Signals (e.g. Revenue up, but Customer or Transaction activity down)
  const revChange = changes.find((c: any) => c.metric.toLowerCase().includes("revenue"));
  const custChange = changes.find((c: any) => c.metric.toLowerCase().includes("customer"));
  const txnChange = changes.find((c: any) => c.metric.toLowerCase().includes("transaction"));

  const revUp = revChange && revChange.direction === "increase";
  const revDown = revChange && revChange.direction === "decrease";
  const activityDown = (custChange && custChange.direction === "decrease") || (txnChange && txnChange.direction === "decrease");

  if (revUp && activityDown) {
    rawSituations.push({
      businessId,
      title: "Mixed Operating Signals",
      summary: "Revenue is improving, but customer and transaction activity is declining.",
      priority: "MEDIUM",
      status: "ACTIVE",
      category: "Mixed Signals",
      supportingSignals: allSupporting.filter((s) => s.type === "INTERNAL"),
      supportingCount: allSupporting.filter((s) => s.type === "INTERNAL").length,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Check for Competitive Pressure
  const compSignals = externalSignals.filter(
    (s) => s.detail.toLowerCase().includes("competitor") || s.label.toLowerCase().includes("competitor")
  );
  if (activityDown && compSignals.length > 0) {
    rawSituations.push({
      businessId,
      title: "Competitive Pressure",
      summary: "Customer activity is weakening while competitor activity in the market has increased.",
      priority: "HIGH",
      status: "ACTIVE",
      category: "Competitive Pressure",
      supportingSignals: [...internalSignals.filter((s) => s.value.toLowerCase().includes("customer") || s.value.toLowerCase().includes("transaction")), ...compSignals],
      supportingCount: internalSignals.length + compSignals.length,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Check for Cost Pressure
  const expChange = changes.find((c: any) => c.metric.toLowerCase().includes("expense"));
  if (expChange && expChange.direction === "increase" && (!revUp || (expChange.percentChange || 0) > (revChange?.percentChange || 0))) {
    rawSituations.push({
      businessId,
      title: "Cost Pressure",
      summary: `Expenses are growing (+${(expChange.percentChange || 0).toFixed(1)}%), outpacing revenue expansion.`,
      priority: expChange.priority === "HIGH" ? "HIGH" : "MEDIUM",
      status: "ACTIVE",
      category: "Cost Pressure",
      supportingSignals: allSupporting.filter((s) => s.detail.toLowerCase().includes("expense") || s.label.toLowerCase().includes("expense")),
      supportingCount: 1 + externalSignals.filter((s) => s.detail.toLowerCase().includes("cost") || s.detail.toLowerCase().includes("price")).length,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Check for Growth
  if (revUp && !activityDown) {
    rawSituations.push({
      businessId,
      title: "Operating Growth",
      summary: "Revenue and core activity metrics have improved over the previous comparison period.",
      priority: revChange?.priority || "MEDIUM",
      status: "ACTIVE",
      category: "Growth",
      supportingSignals: allSupporting.filter((s) => s.type === "INTERNAL"),
      supportingCount: allSupporting.filter((s) => s.type === "INTERNAL").length,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Check for Decline
  if (revDown && activityDown) {
    rawSituations.push({
      businessId,
      title: "Demand Pressure & Decline",
      summary: "Multiple core operating metrics (revenue and activity) show downward movement.",
      priority: "HIGH",
      status: "ACTIVE",
      category: "Decline",
      supportingSignals: allSupporting.filter((s) => s.type === "INTERNAL"),
      supportingCount: allSupporting.filter((s) => s.type === "INTERNAL").length,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Fallback Stable situation if none triggered
  if (rawSituations.length === 0) {
    rawSituations.push({
      businessId,
      title: "Stable Operations",
      summary: "No major negative shifts or high-priority pressures detected in current reporting period.",
      priority: "LOW",
      status: "ACTIVE",
      category: "Stable",
      supportingSignals: internalSignals.slice(0, 2),
      supportingCount: internalSignals.length > 0 ? internalSignals.length : 1,
      freshnessInfo: freshness.status === "up_to_date" ? "Data is fresh" : "Data needs refresh",
    });
  }

  // Persist / Upsert situations
  const persistedItems: BusinessSituationItem[] = [];
  for (const sit of rawSituations) {
    const sitId = await upsertBusinessSituation({
      businessId: sit.businessId,
      title: sit.title,
      summary: sit.summary,
      priority: sit.priority,
      status: sit.status,
      category: sit.category,
      supportingSignalsJson: JSON.stringify(sit.supportingSignals),
      supportingCount: sit.supportingCount,
      freshnessInfo: sit.freshnessInfo,
    });
    persistedItems.push({
      ...sit,
      id: sitId,
    });
  }

  return persistedItems;
}

export async function getBusinessSituationsForTenant(businessId: number): Promise<BusinessSituationItem[]> {
  const stored = await getBusinessSituations(businessId);
  if (stored.length === 0) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    return await evaluateAndUpsertBusinessSituations(businessId, thirtyDaysAgo, now);
  }

  return stored.map((s: any) => ({
    id: s.id,
    businessId: s.businessId,
    title: s.title,
    summary: s.summary,
    priority: s.priority as SituationPriority,
    status: s.status as SituationStatus,
    category: s.category as SituationCategory,
    supportingSignals: JSON.parse(s.supportingSignalsJson || "[]") as SupportingSignalItem[],
    supportingCount: s.supportingCount,
    freshnessInfo: s.freshnessInfo || "Data is fresh",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function changeBusinessSituationStatus(
  situationId: number,
  status: SituationStatus
) {
  return await updateBusinessSituationStatus(situationId, status);
}
