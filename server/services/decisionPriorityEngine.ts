import {
  calculateBusinessHealthScore,
  getDataFreshness,
} from "./businessMetricEngine";
import { getBusinessSituationTrends, SituationTrendAnalysis } from "./situationTrendService";
import { upsertDecisionPriority, getDecisionPriorities as getStoredDecisionPriorities } from "../db";

export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface EvidenceReference {
  label: string;
  value: string;
  detail?: string;
}

export interface DecisionPriorityItem {
  id?: number;
  businessId: number;
  sourceType: string;
  sourceId?: number;
  title: string;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  urgency: string;
  impact: string;
  trend: string;
  reason: string;
  whyNow: string;
  evidence: EvidenceReference[];
  freshnessNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Decision Priority & Strategic Focus Engine (Day 15)
 * Synthesizes business situations, trend intelligence, health score, freshness, and evidence
 * into a ranked list of top strategic focus areas (Top 3).
 */
export async function evaluateAndUpsertDecisionPriorities(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<DecisionPriorityItem[]> {
  const [trends, healthScore, freshness] = await Promise.all([
    getBusinessSituationTrends(businessId),
    calculateBusinessHealthScore(businessId, periodStartDate, periodEndDate),
    getDataFreshness(businessId),
  ]);

  const rawItems: Omit<DecisionPriorityItem, "id" | "createdAt" | "updatedAt">[] = [];

  for (const t of trends) {
    let baseScore = 50;
    if (t.currentPriority === "HIGH") baseScore = 75;
    if (t.currentPriority === "MEDIUM") baseScore = 55;
    if (t.currentPriority === "LOW") baseScore = 30;

    // Trend amplification
    if (t.trendDirection === "WORSENING") {
      baseScore += 20;
    } else if (t.trendDirection === "NEW") {
      baseScore += 10;
    } else if (t.trendDirection === "RECURRING") {
      baseScore += 15;
    } else if (t.trendDirection === "IMPROVING") {
      baseScore -= 15;
    }

    // Health interaction: if health score is weak (< 50) and situation matches
    const overallHealth = healthScore.score ?? 50;
    if (overallHealth < 50 && (t.title.toLowerCase().includes("decline") || t.title.toLowerCase().includes("pressure") || t.title.toLowerCase().includes("cost"))) {
      baseScore += 10;
    }

    // Freshness penalty note
    let freshnessNote: string | undefined;
    if (freshness.status === "needs_refresh" && freshness.daysSinceLastUpdate !== null) {
      freshnessNote = `Priority may be affected by stale data (${freshness.daysSinceLastUpdate} days since last update).`;
      baseScore -= 5;
    } else if (freshness.status === "no_data") {
      freshnessNote = "Limited data freshness; priority calculated from baseline indicators.";
    }

    const clampedScore = Math.max(10, Math.min(100, baseScore));

    let priorityLevel: PriorityLevel = "MEDIUM";
    if (clampedScore >= 80) priorityLevel = "CRITICAL";
    else if (clampedScore >= 65) priorityLevel = "HIGH";
    else if (clampedScore >= 45) priorityLevel = "MEDIUM";
    else priorityLevel = "LOW";

    // Generate "Why now?" explanation from actual state changes
    let whyNow = "The situation remains active based on recent monitoring.";
    if (t.trendDirection === "WORSENING") {
      whyNow = "Priority increased because the situation trend worsened and supporting evidence increased.";
    } else if (t.trendDirection === "NEW") {
      whyNow = "Newly identified operating situation detected in current reporting period.";
    } else if (t.trendDirection === "RECURRING") {
      whyNow = "Priority increased because this operating pressure has re-emerged following previous resolution.";
    } else if (t.trendDirection === "IMPROVING") {
      whyNow = "Priority moderated because situation metrics show recent improvement.";
    } else if (t.durationDays && t.durationDays >= 10) {
      whyNow = `Priority remains active because the issue has persisted for ${t.durationDays} days.`;
    }

    const evidence: EvidenceReference[] = [
      { label: "Situation Category", value: t.currentStatus },
      { label: "Trend Direction", value: t.trendDirection },
      { label: "Duration", value: `${t.durationDays} days` },
      { label: "Health Score", value: `${Math.round(overallHealth)} / 100` },
    ];

    rawItems.push({
      businessId,
      sourceType: "SITUATION",
      sourceId: t.situationId,
      title: t.title,
      priorityLevel,
      priorityScore: clampedScore,
      urgency: t.currentPriority === "HIGH" ? "Urgent attention required" : "Standard monitoring",
      impact: t.currentPriority === "HIGH" ? "High business impact" : "Moderate impact",
      trend: t.trendDirection,
      reason: t.trendSummary,
      whyNow,
      evidence,
      freshnessNote,
    });
  }

  // Sort descending by priority score and limit to top items
  rawItems.sort((a, b) => b.priorityScore - a.priorityScore);

  const persisted: DecisionPriorityItem[] = [];
  for (const item of rawItems) {
    const id = await upsertDecisionPriority({
      businessId: item.businessId,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title,
      priorityLevel: item.priorityLevel,
      priorityScore: item.priorityScore,
      urgency: item.urgency,
      impact: item.impact,
      trend: item.trend,
      reason: item.reason,
      whyNow: item.whyNow,
      evidenceJson: JSON.stringify(item.evidence),
      freshnessNote: item.freshnessNote,
    });
    persisted.push({
      ...item,
      id: id || undefined,
    });
  }

  return persisted.sort((a, b) => b.priorityScore - a.priorityScore);
}

export async function getDecisionPrioritiesForTenant(businessId: number): Promise<DecisionPriorityItem[]> {
  const stored = await getStoredDecisionPriorities(businessId, 10);
  if (stored.length === 0) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    return await evaluateAndUpsertDecisionPriorities(businessId, thirtyDaysAgo, now);
  }

  return stored.map((s: any) => ({
    id: s.id,
    businessId: s.businessId,
    sourceType: s.sourceType,
    sourceId: s.sourceId || undefined,
    title: s.title,
    priorityLevel: s.priorityLevel as PriorityLevel,
    priorityScore: s.priorityScore,
    urgency: s.urgency,
    impact: s.impact,
    trend: s.trend,
    reason: s.reason,
    whyNow: s.whyNow,
    evidence: JSON.parse(s.evidenceJson || "[]") as EvidenceReference[],
    freshnessNote: s.freshnessNote || undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}
