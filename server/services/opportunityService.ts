import {
  getBusinessMetrics,
  getMarketSignals,
  getBusinessSituations,
  getStrategies,
  getScenarios,
  upsertOpportunity,
  getOpportunities,
  updateOpportunityStatus,
} from "../db";

export interface OpportunityPayload {
  businessId: number;
  title: string;
  summary: string;
  category: "GROWTH" | "MARKET" | "CUSTOMER" | "COMPETITIVE" | "PRODUCT" | "OPERATIONAL" | "EFFICIENCY" | "STRATEGIC";
  priority: "HIGH" | "MEDIUM" | "LOW";
  evidenceStrength: "HIGH EVIDENCE" | "MEDIUM EVIDENCE" | "LIMITED EVIDENCE";
  potentialImpact: "HIGH" | "MEDIUM" | "LOW";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  status?: "NEW" | "ACTIVE" | "MONITORING" | "PURSUED" | "DISMISSED" | "EXPIRED";
  supportingSignals?: string[];
  supportingSituations?: string[];
  supportingMetrics?: string[];
  potentialNextStep?: string;
}

/**
 * Deterministic Opportunity Intelligence Engine (Day 18)
 * Synthesizes positive business trends, improving situations, favorable market signals,
 * competitor weaknesses, and strategy outcomes into potential valuable opportunities worth investigating.
 */
export async function evaluateAndDetectOpportunities(businessId: number) {
  const [metrics, signals, situations, strategies, scenarios, existingOpportunities] = await Promise.all([
    getBusinessMetrics(businessId),
    getMarketSignals(businessId),
    getBusinessSituations(businessId),
    getStrategies(businessId),
    getScenarios(businessId),
    getOpportunities(businessId),
  ]);

  const detected: OpportunityPayload[] = [];

  const revenue = metrics?.revenue || 0;
  const profit = metrics?.profit || 0;
  const customerCount = metrics?.customerCount || 0;

  // Pattern A: Favorable Market Signal + Positive Profitability
  const favorableMarketSignals = signals.filter(
    (s: any) => s.relevanceLevel === "HIGH" && (s.impactArea === "Revenue" || s.impactArea === "Customers" || s.impactArea === "General Market")
  );

  if (profit > 0 && favorableMarketSignals.length > 0) {
    detected.push({
      businessId,
      title: "Favorable Market Tailwinds & Stable Profitability",
      summary: `Your business is operating profitably (₹${profit.toLocaleString()}) while external market intelligence shows supportive industry momentum.`,
      category: "GROWTH",
      priority: profit > 50000 ? "HIGH" : "MEDIUM",
      evidenceStrength: "HIGH EVIDENCE",
      potentialImpact: "HIGH",
      urgency: "MEDIUM",
      supportingSignals: favorableMarketSignals.slice(0, 2).map((s: any) => s.title),
      supportingSituations: situations.filter((s: any) => s.category === "GROWTH" || s.category === "REVENUE").map((s: any) => s.title),
      supportingMetrics: [`Current Profit: ₹${profit.toLocaleString()}`, `Active Customers: ${customerCount}`],
      potentialNextStep: "Review customer demand by segment or run a capacity expansion scenario.",
    });
  }

  // Pattern B: Competitor Weakness + Positive Revenue
  const competitorWeaknessSignals = signals.filter(
    (s: any) => s.impactArea === "Competition" && (s.sentiment === "negative" || s.title.toLowerCase().includes("competitor") || s.title.toLowerCase().includes("rival"))
  );
  if (competitorWeaknessSignals.length > 0 && revenue > 0) {
    detected.push({
      businessId,
      title: "Competitive Gap & Market Share Opportunity",
      summary: "Tracked competitor or industry activity has shown friction while your business maintains active revenue flow.",
      category: "COMPETITIVE",
      priority: "HIGH",
      evidenceStrength: "MEDIUM EVIDENCE",
      potentialImpact: "HIGH",
      urgency: "HIGH",
      supportingSignals: competitorWeaknessSignals.slice(0, 2).map((s: any) => s.title),
      supportingSituations: situations.filter((s: any) => s.category === "COMPETITION").map((s: any) => s.title),
      supportingMetrics: [`Revenue Baseline: ₹${revenue.toLocaleString()}`],
      potentialNextStep: "Compare competitor pricing and evaluate targeted acquisition campaigns.",
    });
  }

  // Pattern C: Improving Situation Trend
  const improvingSituations = situations.filter((s: any) => s.trendDirection === "IMPROVING" || s.status === "ACTIVE");
  if (improvingSituations.length > 0) {
    for (const sit of improvingSituations.slice(0, 2)) {
      detected.push({
        businessId,
        title: `Momentum in ${sit.title}`,
        summary: `Operating situation is showing positive momentum and favorable evidence accumulation.`,
        category: "STRATEGIC",
        priority: sit.priority === "HIGH" ? "HIGH" : "MEDIUM",
        evidenceStrength: "HIGH EVIDENCE",
        potentialImpact: "MEDIUM",
        urgency: "MEDIUM",
        supportingSignals: [],
        supportingSituations: [sit.title],
        supportingMetrics: [sit.summary],
        potentialNextStep: "Test the opportunity against current strategic priorities and verify operational readiness.",
      });
    }
  }

  // Pattern D: Scenario Expansion Opportunity
  const activeScenarios = scenarios.filter((sc: any) => sc.status === "ACTIVE");
  if (activeScenarios.length > 0) {
    const topScen = activeScenarios[0];
    detected.push({
      businessId,
      title: `Simulated Expansion: ${topScen.title}`,
      summary: `Saved what-if simulation indicates favorable projected financial outcomes worth exploring further.`,
      category: "OPERATIONAL",
      priority: "MEDIUM",
      evidenceStrength: "MEDIUM EVIDENCE",
      potentialImpact: "HIGH",
      urgency: "LOW",
      supportingSignals: [topScen.description || topScen.scenarioType],
      supportingSituations: [],
      supportingMetrics: [`Scenario Type: ${topScen.scenarioType}`],
      potentialNextStep: "Review detailed baseline vs scenario comparison and consult Strategy Copilot.",
    });
  }

  // Deduplicate and Upsert into DB if not already existing
  const existingTitles = new Set(existingOpportunities.map((o: any) => o.title));
  for (const item of detected) {
    if (!existingTitles.has(item.title)) {
      await upsertOpportunity({
        businessId,
        title: item.title,
        summary: item.summary,
        category: item.category,
        priority: item.priority,
        evidenceStrength: item.evidenceStrength,
        potentialImpact: item.potentialImpact,
        urgency: item.urgency,
        status: "NEW",
        supportingSignalsJson: JSON.stringify(item.supportingSignals || []),
        supportingSituationsJson: JSON.stringify(item.supportingSituations || []),
        supportingMetricsJson: JSON.stringify(item.supportingMetrics || []),
        potentialNextStep: item.potentialNextStep,
      });
    }
  }

  return getOpportunities(businessId);
}
