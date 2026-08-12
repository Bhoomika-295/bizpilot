import {
  getLatestDailyBrief,
  createDailyBrief,
} from "../db";
import {
  calculateBusinessMetrics,
  calculateBusinessHealthScore,
  detectBusinessChanges,
} from "./businessMetricEngine";
import { getAttentionQueueForBusiness } from "./businessAttentionService";
import { getOrRefreshExternalRadar } from "./externalRadarService";
import { evaluateStrategyHealthForBusiness } from "./strategyHealthService";
import { getDecisionQueue } from "./decisionIntelligenceService";
import { getOpportunities } from "../db";

export async function generateOrGetDailyBrief(businessId: number, forceRefresh = false) {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  if (!forceRefresh) {
    const existing = await getLatestDailyBrief(businessId, todayStr);
    if (existing) {
      return parseBrief(existing);
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const metrics = await calculateBusinessMetrics(businessId, thirtyDaysAgo, now);
  const healthScore = await calculateBusinessHealthScore(businessId, thirtyDaysAgo, now, "real");
  const changes = detectBusinessChanges(metrics);
  const attention = await getAttentionQueueForBusiness(businessId);
  const radar = await getOrRefreshExternalRadar(businessId);
  const strategyHealthList = await evaluateStrategyHealthForBusiness(businessId);
  const decisionQueue = await getDecisionQueue(businessId);
  const opportunities = await getOpportunities(businessId);

  const topHealth = healthScore.score ?? 50;
  const topStrategy = strategyHealthList[0] || null;

  let opening = `Executive Briefing for ${todayStr}: Overall health score is ${topHealth}/100. `;
  if (attention.now.length > 0) {
    opening += `There are ${attention.now.length} urgent items requiring immediate executive attention in the Now tier. `;
  } else {
    opening += `Operations are stable with no critical bottlenecks in the Now tier. `;
  }
  if (radar.earlyWarnings.length > 0) {
    opening += `External radar has surfaced ${radar.earlyWarnings.length} early-warning signals to review.`;
  }

  const briefPayload = {
    executiveOpening: opening,
    healthSummaryJson: JSON.stringify({
      score: healthScore.score,
      explanation: healthScore.explanation,
      revenue: metrics.revenue.value,
      expenses: metrics.expenses.value,
      netProfit: metrics.estimatedProfit.value,
      margin: metrics.revenue.value > 0 ? (metrics.estimatedProfit.value / metrics.revenue.value) * 100 : 0,
    }),
    changesSummaryJson: JSON.stringify({
      changesCount: changes.changes.length,
      changes: changes.changes.slice(0, 5),
    }),
    attentionSummaryJson: JSON.stringify({
      nowCount: attention.now.length,
      nextCount: attention.next.length,
      watchCount: attention.watch.length,
      topNow: attention.now.slice(0, 3),
    }),
    externalRadarJson: JSON.stringify({
      activeEventsCount: radar.totalEvents,
      topWarnings: radar.earlyWarnings.slice(0, 3),
      marketTrends: radar.trendGroups.slice(0, 3),
    }),
    opportunitiesThreatsJson: JSON.stringify({
      opportunities: opportunities.slice(0, 3),
    }),
    strategyStatusJson: JSON.stringify({
      healthState: topStrategy?.healthState || "STABLE",
      objectivePerformance: topStrategy?.objectivePerformance || "ON_TRACK",
      summary: topStrategy?.evidenceSummary?.[0] || "Strategy performing within expected parameters.",
    }),
    decisionsSummaryJson: JSON.stringify({
      pendingCount: decisionQueue.length,
      topDecisions: decisionQueue.slice(0, 3),
    }),
    outcomesJson: JSON.stringify({
      trackedOutcomes: [],
    }),
  };

  const fingerprint = `brief_${todayStr}_${topHealth}_${attention.activeCount}`;

  const saved = await createDailyBrief({
    businessId,
    briefDate: todayStr,
    executiveOpening: briefPayload.executiveOpening,
    healthSummaryJson: briefPayload.healthSummaryJson,
    changesSummaryJson: briefPayload.changesSummaryJson,
    attentionSummaryJson: briefPayload.attentionSummaryJson,
    externalRadarJson: briefPayload.externalRadarJson,
    opportunitiesThreatsJson: briefPayload.opportunitiesThreatsJson,
    strategyStatusJson: briefPayload.strategyStatusJson,
    decisionsSummaryJson: briefPayload.decisionsSummaryJson,
    outcomesJson: briefPayload.outcomesJson,
    fingerprint,
  });

  return parseBrief(saved || {
    id: 0,
    businessId,
    briefDate: todayStr,
    ...briefPayload,
    fingerprint,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function parseBrief(row: any) {
  return {
    id: row.id,
    businessId: row.businessId,
    briefDate: row.briefDate,
    executiveOpening: row.executiveOpening,
    health: JSON.parse(row.healthSummaryJson || "{}"),
    changes: JSON.parse(row.changesSummaryJson || "{}"),
    attention: JSON.parse(row.attentionSummaryJson || "{}"),
    externalRadar: JSON.parse(row.externalRadarJson || "{}"),
    opportunitiesThreats: JSON.parse(row.opportunitiesThreatsJson || "{}"),
    strategyStatus: JSON.parse(row.strategyStatusJson || "{}"),
    decisions: JSON.parse(row.decisionsSummaryJson || "{}"),
    outcomes: JSON.parse(row.outcomesJson || "{}"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
