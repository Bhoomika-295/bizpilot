import {
  getScenarios,
  getScenarioById,
  upsertScenario,
  getScenarioAssumptions,
  createScenarioAssumption,
  getScenarioReviews,
  createScenarioReview,
  getBusinessMetrics,
} from "../db";

export interface ScenarioAssumptionInput {
  metric: string;
  baselineValue: string;
  scenarioValue: string;
  percentageChange?: string;
  unit?: string;
  source?: "USER_ASSUMPTION" | "HISTORICAL_PATTERN" | "FORECAST_EXTRAPOLATION" | "EXTERNAL_BENCHMARK";
  confidence?: "HIGH" | "MEDIUM" | "LOW" | "USER_DEFINED";
  rationale?: string;
}

export interface ScenarioSimulationRequest {
  businessId: number;
  title: string;
  description?: string;
  scenarioType?: "BASELINE" | "UPSIDE" | "DOWNSIDE" | "CUSTOM";
  timeHorizon?: string;
  assumptions: ScenarioAssumptionInput[];
}

export async function simulateAndCreateScenario(req: ScenarioSimulationRequest) {
  const metrics = await getBusinessMetrics(req.businessId);

  const baselineRevenue = Number(metrics?.revenue || 1000000);
  const baselineMargin = 18;
  const baselineRetention = Number(metrics?.customerCount || 82);

  let projectedRevenue = baselineRevenue;
  let projectedMargin = baselineMargin;
  let projectedRetention = baselineRetention;

  const estimatedMetrics: Record<string, { baseline: string; scenario: string; change: string }> = {};
  const affectedAreas: string[] = ["Revenue", "Margin", "Retention"];
  const tradeOffs: string[] = [];
  const evidences: string[] = [
    "Current baseline revenue and historical business data",
    "Transparent deterministic percentage change calculation",
  ];

  for (const asm of req.assumptions) {
    const pChange = parseFloat(asm.percentageChange || "0");
    const mLower = asm.metric.toLowerCase();
    if (mLower.includes("price") || mLower.includes("pricing") || mLower.includes("revenue")) {
      projectedRevenue = baselineRevenue * (1 + pChange / 100);
      estimatedMetrics["Revenue"] = {
        baseline: `₹${(baselineRevenue / 100000).toFixed(2)}L`,
        scenario: `₹${(projectedRevenue / 100000).toFixed(2)}L`,
        change: `${pChange >= 0 ? "+" : ""}${pChange}%`,
      };
      if (pChange > 0) {
        projectedMargin = baselineMargin + pChange * 0.12;
        tradeOffs.push(`Potential revenue increase of +${pChange}% balanced against potential demand impact.`);
      }
    } else if (mLower.includes("demand") || mLower.includes("volume")) {
      projectedRevenue = projectedRevenue * (1 + pChange / 100);
      estimatedMetrics["Demand / Volume"] = {
        baseline: "100%",
        scenario: `${100 + pChange}%`,
        change: `${pChange >= 0 ? "+" : ""}${pChange}%`,
      };
    } else if (mLower.includes("retention") || mLower.includes("churn")) {
      projectedRetention = baselineRetention + pChange;
      estimatedMetrics["Retention"] = {
        baseline: `${baselineRetention}%`,
        scenario: `${projectedRetention.toFixed(1)}%`,
        change: `${pChange >= 0 ? "+" : ""}${pChange}pp`,
      };
      if (pChange < 0) {
        tradeOffs.push(`Retention estimated to shift by ${pChange}pp under current assumptions.`);
      }
    } else if (mLower.includes("cost") || mLower.includes("expense")) {
      projectedMargin = baselineMargin - pChange * 0.5;
      estimatedMetrics["Margin"] = {
        baseline: `${baselineMargin}%`,
        scenario: `${projectedMargin.toFixed(1)}%`,
        change: `${pChange >= 0 ? "+" : ""}${pChange}%`,
      };
    }
  }

  if (!estimatedMetrics["Revenue"]) {
    estimatedMetrics["Revenue"] = {
      baseline: `₹${(baselineRevenue / 100000).toFixed(2)}L`,
      scenario: `₹${(projectedRevenue / 100000).toFixed(2)}L`,
      change: "0%",
    };
  }
  if (!estimatedMetrics["Margin"]) {
    estimatedMetrics["Margin"] = {
      baseline: `${baselineMargin}%`,
      scenario: `${projectedMargin.toFixed(1)}%`,
      change: `${(projectedMargin - baselineMargin).toFixed(1)}pp`,
    };
  }
  if (!estimatedMetrics["Retention"]) {
    estimatedMetrics["Retention"] = {
      baseline: `${baselineRetention}%`,
      scenario: `${projectedRetention.toFixed(1)}%`,
      change: `${(projectedRetention - baselineRetention).toFixed(1)}pp`,
    };
  }

  const revChange = projectedRevenue - baselineRevenue;
  const impactCategory = revChange > 0 && projectedRetention >= baselineRetention ? "POSITIVE" : revChange < 0 && projectedRetention < baselineRetention ? "NEGATIVE" : "MIXED";
  const confidence = req.assumptions.length >= 2 ? "MEDIUM" : "LOW";

  const strategyAlignment = "NEUTRAL";
  const strategyReason = "Scenario assumptions show moderate baseline alignment with active business objectives.";

  const scenarioId = await upsertScenario({
    businessId: req.businessId,
    title: req.title,
    description: req.description || "Evaluated through BizPilot deterministic scenario simulation engine.",
    scenarioType: req.scenarioType || "CUSTOM",
    assumptionsJson: JSON.stringify(req.assumptions),
    affectedAreasJson: JSON.stringify(affectedAreas),
    estimatedMetricsJson: JSON.stringify(estimatedMetrics),
    strategicImplicationsJson: JSON.stringify({ tradeOffs, strategyAlignment, strategyReason }),
    evidenceJson: JSON.stringify(evidences),
    timeHorizon: req.timeHorizon || "90 DAYS",
    confidence,
    uncertainty: "MEDIUM",
    strategicFit: strategyAlignment,
    strategicFitReason: strategyReason,
    status: "ACTIVE",
  });

  if (scenarioId) {
    for (const asm of req.assumptions) {
      await createScenarioAssumption({
        businessId: req.businessId,
        scenarioId: Number(scenarioId),
        metric: asm.metric,
        baselineValue: asm.baselineValue,
        scenarioValue: asm.scenarioValue,
        percentageChange: asm.percentageChange || "0%",
        unit: asm.unit || "INR",
        source: asm.source || "USER_ASSUMPTION",
        confidence: asm.confidence || "MEDIUM",
        rationale: asm.rationale || undefined,
      });
    }
  }

  return {
    scenarioId,
    title: req.title,
    impactCategory,
    confidence,
    estimatedMetrics,
    tradeOffs,
    strategyAlignment,
    strategyReason,
    evidences,
  };
}
