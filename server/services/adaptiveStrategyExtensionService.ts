import { evaluateStrategyHealthForBusiness, StrategyHealthCard } from "./strategyHealthService";
import { getActionPlansForBusiness, getRecentOutcomes } from "../db";

export interface StrategyDriftClassification {
  strategyId: number;
  objective: string;
  driftDetected: boolean;
  driftSeverity: "MONITOR" | "REVIEW" | "ADAPT" | "REPLACE";
  primaryCause: "EXECUTION_GAP" | "ASSUMPTION_GAP" | "MARKET_CHANGE" | "CUSTOMER_CHANGE" | "RESOURCE_CONSTRAINT" | "OUTCOME_MISMATCH" | "DATA_UNCERTAINTY";
  causeExplanation: string;
  executionProgress: number;
  outcomeStatus: "POSITIVE" | "NEGATIVE" | "MIXED" | "PENDING";
  strategicFit: "HIGH" | "MEDIUM" | "LOW";
  recommendedOptions: Array<{
    optionId: string;
    title: string;
    description: string;
    executionEffort: "LOW" | "MEDIUM" | "HIGH";
    potentialUpside: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    currentRisk: "LOW" | "MEDIUM" | "HIGH";
    evidenceConfidence: "LOW" | "MEDIUM" | "HIGH";
  }>;
}

export async function evaluateAdaptiveStrategyForBusiness(businessId: number): Promise<StrategyDriftClassification[]> {
  const [healthCards, actions, outcomes] = await Promise.all([
    evaluateStrategyHealthForBusiness(businessId),
    getActionPlansForBusiness(businessId),
    getRecentOutcomes(businessId, 50),
  ]);

  return healthCards.map((card: StrategyHealthCard) => {
    const strategyActions = actions.filter((action: any) => action.sourceId === card.strategyId || action.title.toLowerCase().includes(card.objective.toLowerCase()));
    const completedCount = strategyActions.filter((item: any) => ["COMPLETED", "RESOLVED"].includes(String(item.status).toUpperCase())).length;
    const executionProgress = strategyActions.length > 0 ? Math.round((completedCount / strategyActions.length) * 100) : card.status === "ACTIVE" ? 75 : 40;

    const strategyOutcomes = outcomes.filter((item: any) => item.strategyId === card.strategyId);
    const hasNegativeOutcome = strategyOutcomes.some((item: any) => String(item.outcomeStatus).toUpperCase() === "NEGATIVE") || card.objectivePerformance === "OFF_TRACK";
    const hasPositiveOutcome = strategyOutcomes.some((item: any) => String(item.outcomeStatus).toUpperCase() === "POSITIVE");
    const outcomeStatus: StrategyDriftClassification["outcomeStatus"] = hasNegativeOutcome ? "NEGATIVE" : hasPositiveOutcome ? "POSITIVE" : strategyOutcomes.length > 0 ? "MIXED" : "PENDING";

    let primaryCause: StrategyDriftClassification["primaryCause"] = "DATA_UNCERTAINTY";
    let causeExplanation = "Insufficient longitudinal data to determine definitive strategic drift cause.";

    if (executionProgress < 50 && hasNegativeOutcome) {
      primaryCause = "EXECUTION_GAP";
      causeExplanation = "Strategy execution is incomplete while outcomes show friction. The core objective may still be valid if fully executed.";
    } else if (card.assumptionState === "INVALIDATED" || card.assumptionDetails.some((item: any) => item.state === "INVALIDATED")) {
      primaryCause = "ASSUMPTION_GAP";
      causeExplanation = "One or more core assumptions underlying this strategy have been invalidated by recent market evidence.";
    } else if (card.environmentFit === "ADVERSE") {
      primaryCause = "MARKET_CHANGE";
      causeExplanation = "Adverse market and competitor shifts have changed external operating conditions.";
    } else if (executionProgress >= 70 && hasNegativeOutcome) {
      primaryCause = "OUTCOME_MISMATCH";
      causeExplanation = "Execution is strong (>=70%), but expected business outcomes have not materialized. The strategic hypothesis requires re-evaluation.";
    } else if (card.healthState === "WATCH" || card.healthState === "AT_RISK") {
      primaryCause = "MARKET_CHANGE";
      causeExplanation = "Signals and trajectories indicate developing headwinds requiring tactical adjustment.";
    }

    const driftDetected = ["AT_RISK", "MISALIGNED", "WATCH"].includes(card.healthState) || hasNegativeOutcome;
    const driftSeverity: StrategyDriftClassification["driftSeverity"] = card.healthState === "MISALIGNED" || primaryCause === "ASSUMPTION_GAP" ? "REPLACE" : card.healthState === "AT_RISK" || primaryCause === "OUTCOME_MISMATCH" ? "ADAPT" : driftDetected ? "REVIEW" : "MONITOR";

    const recommendedOptions = [
      {
        optionId: "CONTINUE",
        title: "Continue current strategy",
        description: "Maintain current trajectory while reinforcing execution and monitoring assumption stability.",
        executionEffort: "LOW" as const,
        potentialUpside: "MEDIUM" as const,
        currentRisk: "HIGH" as const,
        evidenceConfidence: card.dataConfidence === "UNKNOWN" ? "LOW" : card.dataConfidence,
      },
      {
        optionId: "ADAPT",
        title: "Adapt current strategy",
        description: "Refine tactical approach, address assumption gaps, and refocus actions on verified bottlenecks.",
        executionEffort: "MEDIUM" as const,
        potentialUpside: "HIGH" as const,
        currentRisk: "MEDIUM" as const,
        evidenceConfidence: "MEDIUM" as const,
      },
      {
        optionId: "PAUSE",
        title: "Pause strategy",
        description: "Temporarily halt execution pending further data collection or resource realignment.",
        executionEffort: "LOW" as const,
        potentialUpside: "UNKNOWN" as const,
        currentRisk: "MEDIUM" as const,
        evidenceConfidence: "LOW" as const,
      },
      {
        optionId: "REPLACE",
        title: "Replace strategy",
        description: "Sunset current strategy version and establish a new objective version based on current market intelligence.",
        executionEffort: "HIGH" as const,
        potentialUpside: "HIGH" as const,
        currentRisk: "MEDIUM" as const,
        evidenceConfidence: "MEDIUM" as const,
      },
    ];

    return {
      strategyId: card.strategyId,
      objective: card.objective,
      driftDetected,
      driftSeverity,
      primaryCause,
      causeExplanation,
      executionProgress,
      outcomeStatus,
      strategicFit: card.strategicFit,
      recommendedOptions,
    };
  });
}
