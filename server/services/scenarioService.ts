import {
  getBusinessMetrics,
  getBusinessSituations,
  getDecisionPriorities,
  getRecommendations,
  upsertScenario,
  getScenarios,
} from "../db";

export interface ScenarioInputPayload {
  title: string;
  description?: string;
  scenarioType: "PRICE_CHANGE" | "MARKETING_CHANGE" | "COST_CHANGE" | "DEMAND_CHANGE" | "COMPETITOR_CHANGE" | "CUSTOM";
  assumptions: Record<string, any>; // e.g. { priceChangePct: 10 } or { marketingSpendNew: 70000 }
}

export async function simulateAndCreateScenario(businessId: number, payload: ScenarioInputPayload) {
  // 1. Fetch current baseline context
  const metrics = await getBusinessMetrics(businessId);
  const situations = await getBusinessSituations(businessId);
  const priorities = await getDecisionPriorities(businessId);
  const recommendations = await getRecommendations(businessId);

  const baselineRevenue = metrics?.revenue || 1000000;
  const baselineExpenses = metrics?.expenses || 600000;
  const baselineProfit = metrics?.profit || 400000;

  let affectedAreas: string[] = [];
  let estimatedMetrics: Record<string, any> = {};
  let affectedSituations: Array<{ title: string; current: string; projected: string }> = [];
  let strategicImplications: Array<{ strategyTitle: string; implication: string }> = [];
  let evidenceQuality = "MEDIUM EVIDENCE";

  // 2. Deterministic impact rules & range-based estimation
  switch (payload.scenarioType) {
    case "PRICE_CHANGE": {
      const pct = Number(payload.assumptions.priceChangePct || 10);
      affectedAreas = ["Revenue", "Demand", "Transactions", "Customer activity", "Competitive pressure", "Business health"];
      
      // Range-based estimation (assuming quantity unchanged)
      const estimatedRev = Math.round(baselineRevenue * (1 + pct / 100));
      const profitDelta = estimatedRev - baselineRevenue;
      const estimatedProfit = Math.round(baselineProfit + profitDelta);

      estimatedMetrics = {
        baselineRevenue,
        estimatedRevenue: estimatedRev,
        revenueChangePct: pct,
        baselineProfit,
        estimatedNetProfit: estimatedProfit,
        note: "Modeled estimate assuming unit demand remains unchanged.",
      };

      affectedSituations = situations.map((s) => {
        if (s.category.toLowerCase().includes("growth") || s.category.toLowerCase().includes("revenue")) {
          return {
            title: s.title,
            current: s.priority,
            projected: pct > 0 ? "Potentially stronger" : "Potentially weaker",
          };
        }
        if (s.category.toLowerCase().includes("competitive") || s.category.toLowerCase().includes("pressure")) {
          return {
            title: s.title,
            current: s.priority,
            projected: pct > 0 ? "Potentially higher scrutiny" : "Potentially eased",
          };
        }
        return {
          title: s.title,
          current: s.priority,
          projected: "Stable / Monitored",
        };
      });

      strategicImplications = recommendations.slice(0, 2).map((r) => ({
        strategyTitle: r.title,
        implication: pct > 0
          ? "Growth and margin-oriented priorities become more favorable, while customer retention tracking is critical."
          : "Volume-focused priorities may be required to compensate for lower per-unit margin.",
      }));

      evidenceQuality = metrics && metrics.revenue > 0 ? "HIGH EVIDENCE" : "LIMITED EVIDENCE";
      break;
    }

    case "MARKETING_CHANGE": {
      const newSpend = Number(payload.assumptions.marketingSpendNew || 70000);
      const spendDelta = newSpend - 50000; // baseline assumption
      affectedAreas = ["Expenses", "Customer Acquisition", "Revenue", "Operating Cash Flow"];

      const estimatedExp = baselineExpenses + spendDelta;
      const estimatedProfit = baselineProfit - spendDelta; // initial cost absorption

      estimatedMetrics = {
        baselineExpenses,
        estimatedExpenses: estimatedExp,
        marketingSpendNew: newSpend,
        baselineProfit,
        estimatedNetProfit: estimatedProfit,
        note: "Modeled estimate factoring in incremental marketing spend prior to conversion lift.",
      };

      affectedSituations = situations.map((s) => ({
        title: s.title,
        current: s.priority,
        projected: s.category.toLowerCase().includes("expense") ? "Potentially higher cost pressure initially" : "Growth potential enhanced",
      }));

      strategicImplications = recommendations.slice(0, 2).map((r) => ({
        strategyTitle: r.title,
        implication: "Marketing-driven growth priorities become central; monitor customer acquisition cost closely.",
      }));

      evidenceQuality = "MEDIUM EVIDENCE";
      break;
    }

    case "COST_CHANGE": {
      const costChangePct = Number(payload.assumptions.costChangePct || 8);
      affectedAreas = ["Expenses", "Net Margins", "Business Health", "Cost Pressure"];

      const expenseDelta = Math.round(baselineExpenses * (costChangePct / 100));
      const estimatedExp = baselineExpenses + expenseDelta;
      const estimatedProfit = baselineProfit - expenseDelta;

      estimatedMetrics = {
        baselineExpenses,
        estimatedExpenses: estimatedExp,
        costChangePct,
        baselineProfit,
        estimatedNetProfit: estimatedProfit,
        note: "Modeled estimate based on percentage adjustment to baseline operating expenses.",
      };

      affectedSituations = situations.map((s) => ({
        title: s.title,
        current: s.priority,
        projected: s.category.toLowerCase().includes("expense") || s.title.toLowerCase().includes("cost") ? "WORSENING (Higher Cost Pressure)" : "Stable",
      }));

      strategicImplications = recommendations.slice(0, 2).map((r) => ({
        strategyTitle: r.title,
        implication: "Cost-reduction and margin-defense strategies become critical to counteract expense increases.",
      }));

      evidenceQuality = metrics && metrics.expenses > 0 ? "HIGH EVIDENCE" : "LIMITED EVIDENCE";
      break;
    }

    case "DEMAND_CHANGE": {
      const demandChangePct = Number(payload.assumptions.demandChangePct || 10);
      affectedAreas = ["Revenue", "Transactions", "Customer activity", "Growth"];

      const revDelta = Math.round(baselineRevenue * (demandChangePct / 100));
      const estimatedRev = baselineRevenue + revDelta;
      const estimatedProfit = baselineProfit + Math.round(revDelta * 0.4); // assuming 40% incremental margin

      estimatedMetrics = {
        baselineRevenue,
        estimatedRevenue: estimatedRev,
        demandChangePct,
        baselineProfit,
        estimatedNetProfit: estimatedProfit,
        note: "Modeled estimate reflecting volume expansion or contraction.",
      };

      affectedSituations = situations.map((s) => ({
        title: s.title,
        current: s.priority,
        projected: demandChangePct > 0 ? "Potentially stronger growth dynamics" : "Potentially heightened contraction risk",
      }));

      strategicImplications = recommendations.slice(0, 2).map((r) => ({
        strategyTitle: r.title,
        implication: demandChangePct > 0
          ? "Capacity planning and growth execution priorities take precedence."
          : "Efficiency and customer retention priorities become paramount.",
      }));

      evidenceQuality = "MEDIUM EVIDENCE";
      break;
    }

    case "COMPETITOR_CHANGE": {
      affectedAreas = ["Competitive pressure", "Market share", "Pricing power", "Customer retention"];
      estimatedMetrics = {
        note: "Qualitative scenario analyzing competitive market positioning and defensibility.",
      };
      affectedSituations = situations.map((s) => ({
        title: s.title,
        current: s.priority,
        projected: "Potentially heightened competitive intensity",
      }));
      strategicImplications = recommendations.slice(0, 2).map((r) => ({
        strategyTitle: r.title,
        implication: "Competitive differentiation and customer loyalty strategies become more relevant.",
      }));
      evidenceQuality = "MEDIUM EVIDENCE";
      break;
    }

    default: {
      affectedAreas = ["General Business Operations", "Strategy", "Metrics"];
      estimatedMetrics = { note: "Custom scenario analysis." };
      evidenceQuality = "LIMITED EVIDENCE";
      break;
    }
  }

  // 3. Save scenario to database
  const scenarioId = await upsertScenario({
    businessId,
    title: payload.title,
    description: payload.description || `Scenario analysis for ${payload.scenarioType}`,
    scenarioType: payload.scenarioType,
    assumptionsJson: JSON.stringify(payload.assumptions),
    affectedAreasJson: JSON.stringify(affectedAreas),
    estimatedMetricsJson: JSON.stringify(estimatedMetrics),
    affectedSituationsJson: JSON.stringify(affectedSituations),
    strategicImplicationsJson: JSON.stringify(strategicImplications),
    evidenceQuality,
    status: "ACTIVE",
  });

  return scenarioId;
}
