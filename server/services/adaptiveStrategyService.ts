import {
  getBusinessSituations,
  getMarketSignals,
  getRecommendations,
  getDecisionPriorities,
  getStrategyStates,
  upsertStrategyState,
  createStrategyEvent,
  getStrategyEvents,
} from "../db";
import { generateStrategyRecommendations } from "./strategyCopilotService";
import { evaluateAndUpsertDecisionPriorities } from "./decisionPriorityEngine";

export type ReevaluationOutcome = "KEEP" | "UPDATE" | "DEPRIORITIZE" | "REPLACE" | "EXPIRED";

export interface StrategyEvolutionSummary {
  recommendationId: number;
  title: string;
  currentStatus: string;
  evaluationResult: ReevaluationOutcome;
  confidence: string;
  reason: string;
  contextChanges: string[];
  timeline: any[];
}

/**
 * Adaptive Strategy Re-evaluation Engine (Day 16)
 * Re-evaluates existing recommendations against current business context,
 * decision priorities, situations, and market signals.
 */
export async function reevaluateTenantStrategies(businessId: number, startDate: Date, endDate: Date): Promise<StrategyEvolutionSummary[]> {
  // 1. Get current decision priorities and situations
  const priorities = await evaluateAndUpsertDecisionPriorities(businessId, startDate, endDate);
  const situations = await getBusinessSituations(businessId);
  const marketSignals = await getMarketSignals(businessId, 30);
  const existingRecommendations = await getRecommendations(businessId);
  const existingStates = await getStrategyStates(businessId);

  const topPriority = priorities[0];
  const activeSituations = situations.filter((s: any) => (s.currentStatus || s.status) === "ACTIVE");
  const highSignals = marketSignals.filter((m: any) => m.relevanceLevel === "HIGH");

  const evolutions: StrategyEvolutionSummary[] = [];

  for (const rec of existingRecommendations) {
    if (rec.status === "completed" || rec.status === "COMPLETED" || rec.status === "rejected" || rec.status === "DISMISSED") {
      continue;
    }

    const state = existingStates.find((st: any) => st.recommendationId === rec.id);
    const prevPriority = state?.priorityAtGeneration || "MEDIUM";
    const prevTrend = state?.situationTrendAtGeneration || "STABLE";

    const currentTopTrend = topPriority?.trend || "STABLE";
    const currentTopPriorityLevel = topPriority?.priorityLevel || "MEDIUM";

    let outcome: ReevaluationOutcome = "KEEP";
    let reason = "Underlying business evidence and situation priority remain stable. No strategic rewrite needed.";
    const contextChanges: string[] = [];

    // Check if priority changed or trend worsened
    if (topPriority && topPriority.title.toLowerCase() !== rec.title.toLowerCase() && currentTopPriorityLevel === "CRITICAL") {
      outcome = "REPLACE";
      reason = `New critical evidence appeared: '${topPriority.title}' became the highest-priority situation (${topPriority.trend}).`;
      contextChanges.push(`New critical priority: ${topPriority.title}`);
    } else if (prevTrend === "WORSENING" && currentTopTrend === "IMPROVING") {
      outcome = "DEPRIORITIZE";
      reason = "Situation trend improved from WORSENING to IMPROVING. Pressure has eased.";
      contextChanges.push("Situation trend shifted from WORSENING to IMPROVING");
    } else if (activeSituations.length === 0 && highSignals.length === 0) {
      outcome = "EXPIRED";
      reason = "Underlying situation or evidence is no longer active or relevant.";
      contextChanges.push("No active supporting situations or high-relevance market signals remain");
    } else if (topPriority && prevPriority !== currentTopPriorityLevel) {
      outcome = "UPDATE";
      reason = `Recommendation context updated due to priority shift from ${prevPriority} to ${currentTopPriorityLevel}.`;
      contextChanges.push(`Priority level shifted from ${prevPriority} to ${currentTopPriorityLevel}`);
    } else {
      outcome = "KEEP";
      reason = "Business context and priorities have not meaningfully changed. Maintaining strategic focus.";
    }

    // Persist strategy state & event if outcome is not KEEP
    await upsertStrategyState({
      businessId,
      recommendationId: rec.id,
      priorityAtGeneration: currentTopPriorityLevel,
      situationTrendAtGeneration: currentTopTrend,
      evaluationStatus: outcome,
      reason,
    });

    if (outcome !== "KEEP") {
      await createStrategyEvent({
        businessId,
        recommendationId: rec.id,
        eventType: `STRATEGY_RE_EVALUATED_${outcome}`,
        previousStrategyTitle: rec.title,
        newStrategyTitle: outcome === "REPLACE" && topPriority ? topPriority.title : rec.title,
        evaluationResult: outcome,
        reason,
      });
    }

    const events = await getStrategyEvents(businessId, 10);
    const timeline = events.filter((e: any) => e.recommendationId === rec.id);

    evolutions.push({
      recommendationId: rec.id,
      title: rec.title,
      currentStatus: rec.status || "OPEN",
      evaluationResult: outcome,
      confidence: rec.confidence ? `${Math.round(Number(rec.confidence) * 100)}%` : "HIGH EVIDENCE",
      reason,
      contextChanges,
      timeline,
    });
  }

  // If no recommendations exist, generate initial ones
  if (evolutions.length === 0) {
    await generateStrategyRecommendations(businessId, startDate, endDate);
  }

  return evolutions;
}

export async function getAdaptiveStrategyTimeline(businessId: number) {
  const events = await getStrategyEvents(businessId, 30);
  const states = await getStrategyStates(businessId);
  return {
    events,
    states,
  };
}
