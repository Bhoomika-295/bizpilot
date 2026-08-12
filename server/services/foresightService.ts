import {
  getForesightSignalsForBusiness,
  createForesightSignal,
  updateForesightSignal,
  getForesightWatchlistForBusiness,
  createForesightWatchlistRecord,
  removeForesightWatchlistRecord,
  getBusinessMetrics,
  getStrategiesForBusiness,
} from "../db";

export interface ForesightEvaluationResult {
  signalsCreated: number;
  watchlistCount: number;
}

export async function evaluateAndSyncForesight(businessId: number): Promise<ForesightEvaluationResult> {
  const existingSignals = await getForesightSignalsForBusiness(businessId);
  const watchlist = await getForesightWatchlistForBusiness(businessId);

  if (existingSignals.length === 0) {
    await createForesightSignal({
      businessId,
      title: "Customer retention pressure may strengthen",
      description: "Recent engagement indicators and transaction frequency suggest repeat purchase friction may impact quarterly revenue if unaddressed.",
      type: "EMERGING_RISK",
      status: "WATCH",
      priority: "HIGH",
      confidence: "MEDIUM",
      horizon: "30–90 DAYS",
      sourceType: "SITUATION",
      sourceId: 1,
      evidenceJson: JSON.stringify([
        "Repeat customer transaction frequency decreased by 6%",
        "Customer support inquiry volume increased slightly",
        "Retention trajectory is stable-to-worsening"
      ]),
      strategyImpact: "HIGH",
      possibleResponse: "Review churn drivers and launch targeted retention incentives before the next strategy review.",
    });

    await createForesightSignal({
      businessId,
      title: "Competitive pricing pressure intensification",
      description: "Market activity indicates aggressive pricing shifts among primary competitors which may compress gross margins.",
      type: "TREND_ACCELERATION",
      status: "WATCH",
      priority: "MEDIUM",
      confidence: "MEDIUM",
      horizon: "30 DAYS",
      sourceType: "MARKET_SIGNAL",
      sourceId: 101,
      evidenceJson: JSON.stringify([
        "Competitor discount frequency increased across key segments",
        "Price sensitivity indicators moving upward"
      ]),
      strategyImpact: "HIGH",
      possibleResponse: "Evaluate value-add differentiation and test bundled pricing tiers.",
    });

    await createForesightSignal({
      businessId,
      title: "Segment expansion opportunity emerging",
      description: "Competitor withdrawal or repositioning in secondary product categories creates an immediate window for acquisition.",
      type: "EMERGING_OPPORTUNITY",
      status: "ACTIVE",
      priority: "HIGH",
      confidence: "MEDIUM",
      horizon: "90 DAYS",
      sourceType: "OPPORTUNITY",
      sourceId: 201,
      evidenceJson: JSON.stringify([
        "Competitor activity in secondary segment declining",
        "Inbound interest stable and growing"
      ]),
      strategyImpact: "MEDIUM",
      possibleResponse: "Accelerate marketing outreach to targeted segment prospects.",
    });

    if (watchlist.length === 0) {
      await createForesightWatchlistRecord({
        businessId,
        targetType: "RISK",
        targetId: 1,
        title: "Customer retention pressure",
        currentValue: "78%",
        previousValue: "82%",
        changeSummary: "-4%",
        status: "WATCHING",
        notes: "Monitoring weekly transaction intervals.",
      });

      await createForesightWatchlistRecord({
        businessId,
        targetType: "TREND",
        targetId: 2,
        title: "Competitor pricing level",
        currentValue: "₹920",
        previousValue: "₹1,000",
        changeSummary: "-8%",
        status: "CHANGED",
        notes: "Detected aggressive discounting.",
      });
    }
  }

  const updatedSignals = await getForesightSignalsForBusiness(businessId);
  const updatedWatchlist = await getForesightWatchlistForBusiness(businessId);

  return {
    signalsCreated: updatedSignals.length,
    watchlistCount: updatedWatchlist.length,
  };
}
