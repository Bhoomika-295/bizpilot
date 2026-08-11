import {
  calculateBusinessMetrics,
  calculateBusinessHealthScore,
  getDataFreshness,
  detectBusinessChanges,
  DataFreshness,
} from "./businessMetricEngine";
import { getMarketSignals, createRecommendation, getRecommendations, updateRecommendationStatus } from "../db";

export type StrategyPriority = "HIGH" | "MEDIUM" | "LOW";
export type StrategyStatus = "OPEN" | "DISMISSED" | "COMPLETED";

export interface StrategyEvidenceItem {
  label: string;
  value: string;
}

export interface StrategyRecommendationItem {
  id?: number;
  title: string;
  priority: StrategyPriority;
  recommendation: string;
  reason: string;
  evidence: StrategyEvidenceItem[];
  suggestedNextStep: string;
  confidence: string; // "High", "Medium", "Low"
  status: StrategyStatus;
  createdAt: Date;
}

export interface StrategyCopilotBriefing {
  status: "ready" | "insufficient_data" | "stale_data";
  staleWarning?: string;
  recommendations: StrategyRecommendationItem[];
  dataFreshness: DataFreshness;
  marketFreshnessLastUpdated: Date | null;
  periodLabel: string;
}

/**
 * Deterministic Strategy Rule Engine (Day 11)
 * Analyzes internal metrics, changes, health score, and external market signals
 * to generate grounded strategic recommendations (maximum 3).
 */
export async function generateStrategyRecommendations(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<StrategyCopilotBriefing> {
  const [metrics, healthScore, freshness, marketSignals] = await Promise.all([
    calculateBusinessMetrics(businessId, periodStartDate, periodEndDate),
    calculateBusinessHealthScore(businessId, periodStartDate, periodEndDate),
    getDataFreshness(businessId),
    getMarketSignals(businessId, 20),
  ]);

  const changes = detectBusinessChanges(metrics);

  const marketFreshnessLastUpdated = marketSignals.length > 0 ? marketSignals[0].discoveredAt : null;

  // Check insufficient data
  const totalDataPoints = freshness.dataPoints.transactions + freshness.dataPoints.expenses + freshness.dataPoints.customers;
  if (totalDataPoints === 0 || freshness.status === "no_data") {
    return {
      status: "insufficient_data",
      recommendations: [],
      dataFreshness: freshness,
      marketFreshnessLastUpdated,
      periodLabel: changes.periodLabel,
    };
  }

  // Check stale data warnings
  let staleWarning: string | undefined;
  if (freshness.status === "needs_refresh" && freshness.daysSinceLastUpdate !== null) {
    staleWarning = `Strategy is based on business data last updated ${freshness.daysSinceLastUpdate} day${freshness.daysSinceLastUpdate === 1 ? "" : "s"} ago.`;
  }

  const generated: Omit<StrategyRecommendationItem, "id" | "status" | "createdAt">[] = [];

  const revChange = changes.changes.find((c) => c.metric === "revenue");
  const expChange = changes.changes.find((c) => c.metric === "expenses");
  const custChange = changes.changes.find((c) => c.metric === "customers");

  // RULE A: Expenses growing significantly faster than revenue
  if (expChange && expChange.direction === "increase" && expChange.percentChange >= 10) {
    const revGrowth = revChange ? revChange.percentChange : 0;
    if (revGrowth < expChange.percentChange) {
      generated.push({
        title: "Review rising operating expenses",
        priority: "HIGH",
        recommendation: "Investigate expense growth categories to protect operating margin performance.",
        reason: `Expenses increased ${expChange.percentChange.toFixed(1)}% while revenue growth was weaker (${revGrowth >= 0 ? "+" : ""}${revGrowth.toFixed(1)}%).`,
        evidence: [
          { label: "Expenses trend", value: `+${expChange.percentChange.toFixed(1)}%` },
          { label: "Revenue trend", value: `${revGrowth >= 0 ? "+" : ""}${revGrowth.toFixed(1)}%` },
          { label: "Current Health Score", value: `${Math.round(healthScore.score ?? 50)} / 100` },
        ],
        suggestedNextStep: "Review the largest expense categories from the current period and evaluate non-essential costs.",
        confidence: "High",
      });
    }
  }

  // RULE B: Revenue decline
  if (revChange && revChange.direction === "decrease" && Math.abs(revChange.percentChange) >= 5) {
    const dropPct = Math.abs(revChange.percentChange);
    generated.push({
      title: "Investigate declining sales activity",
      priority: dropPct >= 15 ? "HIGH" : "MEDIUM",
      recommendation: "Examine sales pipeline and transaction frequency to identify softening demand.",
      reason: `Revenue shows downward pressure of ${dropPct.toFixed(1)}% in the current period.`,
      evidence: [
        { label: "Revenue change", value: `${revChange.percentChange.toFixed(1)}%` },
        { label: "Current Revenue", value: `₹${metrics.revenue.value.toLocaleString()}` },
      ],
      suggestedNextStep: "Analyze top-selling product categories and customer re-engagement campaigns.",
      confidence: "High",
    });
  }

  // RULE C: Customer activity decrease
  if (custChange && custChange.direction === "decrease" && Math.abs(custChange.percentChange) >= 5) {
    generated.push({
      title: "Address declining customer activity",
      priority: "MEDIUM",
      recommendation: "Engage inactive or slipping customer segments to restore retention.",
      reason: `Active customer counts decreased by ${Math.abs(custChange.percentChange).toFixed(1)}% compared to the prior period.`,
      evidence: [
        { label: "Customer change", value: `${custChange.percentChange.toFixed(1)}%` },
        { label: "Active customers", value: `${metrics.customers.active}` },
      ],
      suggestedNextStep: "Review customer feedback and reach out to recently inactive accounts.",
      confidence: "Medium",
    });
  }

  // RULE D: High relevance competitor or market signals
  const highRelevanceSignals = marketSignals.filter((s) => (s as any).relevanceLevel === "HIGH" || (s as any).importanceScore >= 3);
  if (highRelevanceSignals.length > 0) {
    const topSignal = highRelevanceSignals[0];
    generated.push({
      title: `Monitor competitor development: ${topSignal.relatedEntity}`,
      priority: "MEDIUM",
      recommendation: "Review recent external market intelligence before finalizing product or pricing updates.",
      reason: `Detected ${highRelevanceSignals.length} high-relevance external market signal${highRelevanceSignals.length === 1 ? "" : "s"} involving ${(topSignal as any).relatedEntity || "market competitors"}.`,
      evidence: [
        { label: "Top Signal", value: topSignal.title },
        { label: "Source", value: topSignal.source },
        { label: "Impact Area", value: (topSignal as any).impactArea || "Competition" },
      ],
      suggestedNextStep: "Inspect the Market Signals intelligence card for full context and source links.",
      confidence: "Medium",
    });
  }

  // Fallback if no specific rule triggered
  if (generated.length === 0) {
    generated.push({
      title: "Maintain operating stability and monitor trends",
      priority: "LOW",
      recommendation: "Operating metrics remain within stable historical corridors. Continue core operational cadence.",
      reason: `Business health score stands at ${Math.round(healthScore.score ?? 50)}/100 with balanced operational shifts.`,
      evidence: [
        { label: "Health Score", value: `${Math.round(healthScore.score ?? 50)} / 100` },
        { label: "Data Freshness", value: freshness.label },
      ],
      suggestedNextStep: "Continue regular record maintenance and periodic reviews.",
      confidence: "High",
    });
  }

  // Limit to top 3 recommendations sorted by priority (HIGH -> MEDIUM -> LOW)
  const priorityRank: Record<StrategyPriority, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedGenerated = generated
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
    .slice(0, 3);

  // Check existing stored recommendations in DB for this business
  const existingStored = await getRecommendations(businessId);
  const recommendationsMap = new Map<string, any>();
  for (const stored of existingStored) {
    recommendationsMap.set(stored.title, stored);
  }

  const finalRecommendations: StrategyRecommendationItem[] = [];

  for (const item of sortedGenerated) {
    const existing = recommendationsMap.get(item.title);
    if (existing) {
      const dbStatus = existing.status;
      const mappedStatus: StrategyStatus =
        dbStatus === "completed" ? "COMPLETED" : dbStatus === "rejected" ? "DISMISSED" : "OPEN";

      finalRecommendations.push({
        id: existing.id,
        title: existing.title,
        priority: item.priority,
        recommendation: item.recommendation,
        reason: item.reason,
        evidence: item.evidence,
        suggestedNextStep: item.suggestedNextStep,
        confidence: item.confidence,
        status: mappedStatus,
        createdAt: existing.createdAt,
      });
    } else {
      let newId: number | undefined;
      try {
        const res = await createRecommendation(businessId, {
          title: item.title,
          description: item.recommendation,
          category: item.priority,
          evidence: JSON.stringify(item.evidence),
          confidence: item.confidence === "High" ? 0.9 : 0.75,
          assumptions: item.reason,
          expectedImpact: item.suggestedNextStep,
        });
        if (res && Array.isArray(res) && res[0]?.insertId) {
          newId = Number(res[0].insertId);
        }
      } catch (err) {
        console.error("[StrategyCopilot] Error persisting recommendation:", err);
      }

      finalRecommendations.push({
        id: newId,
        ...item,
        status: "OPEN",
        createdAt: new Date(),
      });
    }
  }

  return {
    status: "ready",
    staleWarning,
    recommendations: finalRecommendations,
    dataFreshness: freshness,
    marketFreshnessLastUpdated,
    periodLabel: changes.periodLabel,
  };
}

export async function setStrategyRecommendationStatus(
  recommendationId: number,
  status: StrategyStatus
) {
  const dbStatus = status === "COMPLETED" ? "completed" : status === "DISMISSED" ? "rejected" : "pending";
  return await updateRecommendationStatus(recommendationId, dbStatus);
}
