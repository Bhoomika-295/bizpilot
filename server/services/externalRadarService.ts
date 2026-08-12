import {
  getBusinessesForExternalRadar,
  getCompetitorsForExternalRadar,
  getMarketSignalsForExternalRadar,
  getCompetitorActivityByBusiness,
  getSituationsForExternalRadar,
  getOpportunitiesForExternalRadar,
  getStrategiesForBusiness,
  getRecommendationsForExternalRadar,
  getOutcomesForExternalRadar,
  getCrossSignalRelationshipsForExternalRadar,
  getTrajectoriesForExternalRadar,
  getStrategyHealthSnapshotsForExternalRadar,
  getExternalEvents,
  getExternalEventById,
  createExternalEvent,
  updateExternalEvent,
  setExternalEventStatus,
  getExternalEventReviews,
  upsertExternalRadarSnapshot,
  getExternalRadarSnapshot,
  ExternalEventStatus,
} from "../db";

export interface ExternalRadarCard {
  businessId: number;
  totalEvents: number;
  relevantEventsCount: number;
  highRelevanceCount: number;
  threatsCount: number;
  opportunitiesCount: number;
  activeWatchCount: number;
  events: ExternalEventSummary[];
  earlyWarnings: EarlyWarningItem[];
  trendGroups: ExternalTrendGroup[];
  sourceFreshness: SourceFreshnessSummary;
  generatedAt: Date;
}

export interface ExternalEventSummary {
  id: number;
  source: string;
  sourceType: string;
  title: string;
  summary: string;
  referenceUrl: string;
  publishedAt?: Date | null;
  detectedAt: Date;
  topic: string;
  eventType: string;
  evidenceStrength: string;
  freshness: string;
  status: ExternalEventStatus;
  relevanceLevel: string;
  relevanceReason: string;
  impactType: string;
  impactAreas: string[];
  strategyImpact: string;
  strategyImpactReason?: string | null;
  objectiveImpacts: string[];
  trajectoryContext?: string | null;
  crossSignalContext?: string | null;
  trendKey?: string | null;
  trendState: string;
  trendConfidence: string;
  uncertainty: string;
}

export interface EarlyWarningItem {
  id: string;
  title: string;
  summary: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  sourceEventIds: number[];
  recommendedReview: string;
  detectedAt: Date;
}

export interface ExternalTrendGroup {
  trendKey: string;
  title: string;
  eventCount: number;
  trendState: "DEVELOPING_TREND" | "RECURRING_SHIFT" | "ONE_OFF";
  trendConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  summary: string;
  latestEventId: number;
}

export interface SourceFreshnessSummary {
  status: "CURRENT" | "STABLE" | "STALE" | "MIXED";
  newestPublishedAt?: Date | null;
  oldestPublishedAt?: Date | null;
  activeSourcesCount: number;
}

/**
 * Deterministic Normalization Key Generator
 * Groups similar signals or news items by entity, event type, and date bucket.
 */
export function generateNormalizationKey(title: string, entity: string, eventType: string, publishedAt?: Date | null): string {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
  const cleanEntity = entity.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
  const dateBucket = publishedAt ? new Date(publishedAt).toISOString().substring(0, 10) : "undated";
  return `${cleanEntity}_${eventType.toLowerCase()}_${dateBucket}_${cleanTitle}`;
}

export function generateFingerprint(businessId: number, title: string, sourceUrl: string): string {
  let hash = 0;
  const str = `${businessId}:${title}:${sourceUrl}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `ext_${Math.abs(hash).toString(16)}`;
}

/**
 * Deterministic Business Relevance Evaluator
 */
export function evaluateRelevance(
  title: string,
  summary: string,
  businessIndustry?: string | null,
  competitors: any[] = [],
  strategies: any[] = []
): {
  relevanceLevel: "HIGH_RELEVANCE" | "MEDIUM_RELEVANCE" | "LOW_RELEVANCE" | "UNKNOWN";
  relevanceReason: string;
  impactType: "OPPORTUNITY" | "THREAT" | "CONSTRAINT" | "CONTEXT_CHANGE" | "NEUTRAL" | "UNKNOWN";
  impactAreas: string[];
  strategyImpact: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  strategyImpactReason?: string;
  objectiveImpacts: string[];
} {
  const text = `${title} ${summary}`.toLowerCase();
  let matchedCompetitor: string | null = null;
  for (const comp of competitors) {
    if (comp?.name && text.includes(comp.name.toLowerCase())) {
      matchedCompetitor = comp.name;
      break;
    }
  }

  const industryMatch = businessIndustry && text.includes(businessIndustry.toLowerCase());
  const isPricing = text.includes("price") || text.includes("pricing") || text.includes("discount") || text.includes("cost");
  const isProduct = text.includes("launch") || text.includes("product") || text.includes("feature") || text.includes("service");
  const isRegulatory = text.includes("regul") || text.includes("compliance") || text.includes("law") || text.includes("policy");
  const isFunding = text.includes("funding") || text.includes("invest") || text.includes("acquisition") || text.includes("merger");

  let relevanceLevel: "HIGH_RELEVANCE" | "MEDIUM_RELEVANCE" | "LOW_RELEVANCE" | "UNKNOWN" = "LOW_RELEVANCE";
  let relevanceReason = "General market observation with no direct entity or active strategy match.";
  let impactType: "OPPORTUNITY" | "THREAT" | "CONSTRAINT" | "CONTEXT_CHANGE" | "NEUTRAL" | "UNKNOWN" = "CONTEXT_CHANGE";
  const impactAreas: string[] = ["MARKETING", "GENERAL_MARKET"];
  let strategyImpact: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" = "LOW";
  let strategyImpactReason = "No immediate friction with current active strategy execution.";
  const objectiveImpacts: string[] = [];

  if (matchedCompetitor) {
    relevanceLevel = "HIGH_RELEVANCE";
    relevanceReason = `Directly mentions tracked competitor "${matchedCompetitor}", which is relevant to your competitive positioning.`;
    impactType = isPricing || isProduct ? "THREAT" : "CONTEXT_CHANGE";
    impactAreas.push("COMPETITIVE_POSITION", "PRICING", "CUSTOMERS");
    strategyImpact = "HIGH";
    strategyImpactReason = `Competitive movement by ${matchedCompetitor} interacts with active market positioning.`;
    objectiveImpacts.push("MARKET_SHARE", "COMPETITIVE_DEFENSE");
  } else if (industryMatch || isPricing || isProduct) {
    relevanceLevel = "MEDIUM_RELEVANCE";
    relevanceReason = `Aligns closely with industry category "${businessIndustry || "Core Market"}" or operating pricing/product trends.`;
    impactType = isPricing ? "CONSTRAINT" : "OPPORTUNITY";
    impactAreas.push("REVENUE", "PRICING", "PRODUCT");
    strategyImpact = "MEDIUM";
    strategyImpactReason = "Industry-level dynamics could influence customer acquisition or pricing efficiency.";
    objectiveImpacts.push("REVENUE_GROWTH", "MARGIN_EFFICIENCY");
  } else if (isRegulatory) {
    relevanceLevel = "MEDIUM_RELEVANCE";
    relevanceReason = "Regulatory or compliance shift detected that may introduce operational constraints.";
    impactType = "CONSTRAINT";
    impactAreas.push("COMPLIANCE", "OPERATIONS");
    strategyImpact = "MEDIUM";
    strategyImpactReason = "Compliance changes require monitoring to protect ongoing operations.";
    objectiveImpacts.push("OPERATIONAL_RISK");
  } else if (isFunding) {
    relevanceLevel = "LOW_RELEVANCE";
    relevanceReason = "Capital market or funding event recorded in broader sector.";
    impactType = "NEUTRAL";
    impactAreas.push("STRATEGY");
    strategyImpact = "LOW";
  }

  return {
    relevanceLevel,
    relevanceReason,
    impactType,
    impactAreas: Array.from(new Set(impactAreas)),
    strategyImpact,
    strategyImpactReason,
    objectiveImpacts,
  };
}

export function classifyEventType(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes("pric") || text.includes("rate") || text.includes("fee")) return "PRICING_CHANGE";
  if (text.includes("launch") || text.includes("releas") || text.includes("product") || text.includes("feature")) return "PRODUCT_CHANGE";
  if (text.includes("regul") || text.includes("compliance") || text.includes("law") || text.includes("policy")) return "REGULATORY_CHANGE";
  if (text.includes("fund") || text.includes("raise") || text.includes("capital") || text.includes("invest")) return "FUNDING_EVENT";
  if (text.includes("partner") || text.includes("alliance") || text.includes("collaborat")) return "PARTNERSHIP";
  if (text.includes("expans") || text.includes("open") || text.includes("grow")) return "EXPANSION";
  if (text.includes("compet") || text.includes("rival") || text.includes("market share")) return "COMPETITOR_CHANGE";
  if (text.includes("customer") || text.includes("consumer") || text.includes("demand")) return "CUSTOMER_TREND";
  if (text.includes("supply") || text.includes("shortage") || text.includes("chain")) return "SUPPLY_CHANGE";
  return "MARKET_CHANGE";
}

/**
 * Synchronize and synthesize External World Intelligence & Early-Warning Radar for a tenant.
 */
export async function getOrRefreshExternalRadar(
  businessId: number,
  options: { refresh?: boolean } = {}
): Promise<ExternalRadarCard> {
  const business = await getBusinessesForExternalRadar(businessId);
  if (!business) {
    throw new Error("Business not found for external radar.");
  }

  const [
    competitors,
    marketSignals,
    competitorActivities,
    situations,
    opportunities,
    strategies,
    recommendations,
    outcomes,
    crossSignals,
    trajectories,
    strategyHealthSnapshots,
    storedEvents,
  ] = await Promise.all([
    getCompetitorsForExternalRadar(businessId),
    getMarketSignalsForExternalRadar(businessId, 50),
    getCompetitorActivityByBusiness(businessId),
    getSituationsForExternalRadar(businessId),
    getOpportunitiesForExternalRadar(businessId),
    getStrategiesForBusiness(businessId),
    getRecommendationsForExternalRadar(businessId),
    getOutcomesForExternalRadar(businessId),
    getCrossSignalRelationshipsForExternalRadar(businessId),
    getTrajectoriesForExternalRadar(businessId),
    getStrategyHealthSnapshotsForExternalRadar(businessId),
    getExternalEvents(businessId, { limit: 100 }),
  ]);

  const now = new Date();
  const eventMap = new Map<string, any>();
  for (const ev of storedEvents) {
    eventMap.set(ev.fingerprint, ev);
  }

  // Synthesize external events from market signals & competitor activities if empty or refreshed
  const rawSources: { title: string; summary: string; source: string; sourceType: string; referenceUrl: string; publishedAt?: Date | null; topic: string }[] = [];

  for (const sig of marketSignals) {
    rawSources.push({
      title: sig.title,
      summary: sig.snippet || sig.explanation || sig.title,
      source: sig.source || "Market Feed",
      sourceType: "MARKET_SIGNAL",
      referenceUrl: sig.sourceUrl || "#",
      publishedAt: sig.publishedAt || sig.discoveredAt,
      topic: sig.impactArea || "GENERAL_MARKET",
    });
  }

  for (const act of competitorActivities) {
    rawSources.push({
      title: act.title,
      summary: act.description,
      source: `Competitor Intel (${act.activityType})`,
      sourceType: "COMPETITOR_ACTIVITY",
      referenceUrl: act.sourceReference || "#",
      publishedAt: act.detectedAt,
      topic: "COMPETITION",
    });
  }

  if (rawSources.length === 0) {
    rawSources.push({
      title: `${business.name || "Industry"} Market Radar Baseline`,
      summary: `Continuous monitoring active for ${business.industry || "core sector"} developments.`,
      source: "BizPilot Radar Service",
      sourceType: "SYSTEM_RADAR",
      referenceUrl: "https://bizpilot.ai/radar",
      publishedAt: now,
      topic: "GENERAL_MARKET",
    });
  }

  for (const src of rawSources) {
    const fingerprint = generateFingerprint(businessId, src.title, src.referenceUrl);
    const eventType = classifyEventType(src.title, src.summary);
    const normalizationKey = generateNormalizationKey(src.title, src.source, eventType, src.publishedAt);
    const relevance = evaluateRelevance(src.title, src.summary, business.industry, competitors, strategies);

    let freshness = "CURRENT";
    if (src.publishedAt) {
      const ageDays = (now.getTime() - new Date(src.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 30) freshness = "STALE";
      else if (ageDays > 7) freshness = "DEVELOPING";
    }

    const existing = eventMap.get(fingerprint);
    if (!existing) {
      const created = await createExternalEvent({
        businessId,
        source: src.source,
        sourceType: src.sourceType,
        title: src.title,
        summary: src.summary,
        referenceUrl: src.referenceUrl,
        publishedAt: src.publishedAt || null,
        detectedAt: now,
        topic: src.topic,
        eventType,
        evidenceStrength: "MEDIUM",
        freshness,
        status: relevance.relevanceLevel === "HIGH_RELEVANCE" ? "RELEVANT" : "NEW",
        normalizationKey,
        fingerprint,
        relevanceLevel: relevance.relevanceLevel,
        relevanceReason: relevance.relevanceReason,
        impactType: relevance.impactType,
        impactAreasJson: JSON.stringify(relevance.impactAreas),
        strategyImpact: relevance.strategyImpact,
        strategyImpactReason: relevance.strategyImpactReason,
        objectiveImpactsJson: JSON.stringify(relevance.objectiveImpacts),
        trendState: "ONE_OFF",
        trendConfidence: "MEDIUM",
        uncertainty: "MODERATE",
      });
      if (created) {
        eventMap.set(fingerprint, created);
      }
    }
  }

  const allEvents = Array.from(eventMap.values());
  const eventSummaries: ExternalEventSummary[] = allEvents.map((ev: any) => {
    let impactAreas: string[] = [];
    let objectiveImpacts: string[] = [];
    try {
      impactAreas = JSON.parse(ev.impactAreasJson || "[]");
    } catch {
      impactAreas = [];
    }
    try {
      objectiveImpacts = JSON.parse(ev.objectiveImpactsJson || "[]");
    } catch {
      objectiveImpacts = [];
    }

    return {
      id: ev.id,
      source: ev.source,
      sourceType: ev.sourceType,
      title: ev.title,
      summary: ev.summary,
      referenceUrl: ev.referenceUrl,
      publishedAt: ev.publishedAt,
      detectedAt: ev.detectedAt,
      topic: ev.topic,
      eventType: ev.eventType,
      evidenceStrength: ev.evidenceStrength,
      freshness: ev.freshness,
      status: ev.status as ExternalEventStatus,
      relevanceLevel: ev.relevanceLevel,
      relevanceReason: ev.relevanceReason || "",
      impactType: ev.impactType,
      impactAreas,
      strategyImpact: ev.strategyImpact,
      strategyImpactReason: ev.strategyImpactReason,
      objectiveImpacts,
    trajectoryContext: ev.trajectoryContextJson,
    crossSignalContext: ev.crossSignalContextJson,
      trendKey: ev.trendKey,
      trendState: ev.trendState,
      trendConfidence: ev.trendConfidence,
      uncertainty: ev.uncertainty,
    };
  });

  const relevantEvents = eventSummaries.filter((e) => ["HIGH_RELEVANCE", "MEDIUM_RELEVANCE"].includes(e.relevanceLevel));
  const highRelevanceCount = eventSummaries.filter((e) => e.relevanceLevel === "HIGH_RELEVANCE").length;
  const threatsCount = eventSummaries.filter((e) => e.impactType === "THREAT").length;
  const opportunitiesCount = eventSummaries.filter((e) => e.impactType === "OPPORTUNITY").length;
  const activeWatchCount = eventSummaries.filter((e) => ["NEW", "REVIEWED", "RELEVANT", "MONITORING"].includes(e.status)).length;

  // Build early warnings from converging high-relevance threats & trajectories
  const earlyWarnings: EarlyWarningItem[] = [];
  const trajectoryDecline = trajectories.some((t: any) => ["EARLY_DECLINE", "ACCELERATING_DECLINE"].includes(t.status));

  if (threatsCount > 0) {
    earlyWarnings.push({
      id: "ew_threat_cluster",
      title: "Converging Competitive Threats Detected",
      summary: `${threatsCount} external threat event(s) intersect with operating market conditions. Monitor pricing and positioning closely.`,
      severity: threatsCount >= 2 ? "HIGH" : "MEDIUM",
      sourceEventIds: eventSummaries.filter((e) => e.impactType === "THREAT").map((e) => e.id),
      recommendedReview: "Inspect competing price and product changes against current customer retention metrics.",
      detectedAt: now,
    });
  }

  if (trajectoryDecline && relevantEvents.length > 0) {
    earlyWarnings.push({
      id: "ew_trajectory_external",
      title: "External Pressure Reinforcing Trajectory Risk",
      summary: "Internal trajectory decline aligns with external market pressure events. Consider proactive counter-strategy adjustments.",
      severity: "HIGH",
      sourceEventIds: relevantEvents.slice(0, 3).map((e) => e.id),
      recommendedReview: "Review active strategy re-evaluation timelines and assess margin or pricing responsiveness.",
      detectedAt: now,
    });
  }

  // Build trend groups by topic / event type
  const trendMap = new Map<string, { title: string; count: number; latestId: number; eventIds: number[] }>();
  for (const ev of eventSummaries) {
    const key = `${ev.topic}_${ev.eventType}`;
    const existing = trendMap.get(key) || { title: `${ev.topic.replaceAll("_", " ")} (${ev.eventType.replaceAll("_", " ")})`, count: 0, latestId: ev.id, eventIds: [] };
    existing.count += 1;
    existing.eventIds.push(ev.id);
    if (ev.id > existing.latestId) existing.latestId = ev.id;
    trendMap.set(key, existing);
  }

  const trendGroups: ExternalTrendGroup[] = Array.from(trendMap.entries()).map(([key, val]) => ({
    trendKey: key,
    title: val.title,
    eventCount: val.count,
    trendState: val.count >= 2 ? "DEVELOPING_TREND" : "ONE_OFF",
    trendConfidence: val.count >= 2 ? "HIGH" : "MEDIUM",
    summary: `${val.count} related external event(s) observed in ${val.title}.`,
    latestEventId: val.latestId,
  }));

  const publishedDates = eventSummaries.map((e) => e.publishedAt ? new Date(e.publishedAt).getTime() : 0).filter((t) => t > 0);
  const newestTime = publishedDates.length > 0 ? Math.max(...publishedDates) : null;
  const oldestTime = publishedDates.length > 0 ? Math.min(...publishedDates) : null;

  const sourceFreshness: SourceFreshnessSummary = {
    status: newestTime && Date.now() - newestTime < 7 * 24 * 3600 * 1000 ? "CURRENT" : "STABLE",
    newestPublishedAt: newestTime ? new Date(newestTime) : null,
    oldestPublishedAt: oldestTime ? new Date(oldestTime) : null,
    activeSourcesCount: new Set(eventSummaries.map((e) => e.source)).size,
  };

  const card: ExternalRadarCard = {
    businessId,
    totalEvents: eventSummaries.length,
    relevantEventsCount: relevantEvents.length,
    highRelevanceCount,
    threatsCount,
    opportunitiesCount,
    activeWatchCount,
    events: eventSummaries,
    earlyWarnings,
    trendGroups,
    sourceFreshness,
    generatedAt: now,
  };

  await upsertExternalRadarSnapshot({
    businessId,
    fingerprint: `radar_${businessId}_${Math.floor(Date.now() / (1000 * 3600))}`,
    eventIdsJson: JSON.stringify(eventSummaries.map((e) => e.id)),
    radarJson: JSON.stringify(card),
    earlyWarningsJson: JSON.stringify(earlyWarnings),
    trendGroupsJson: JSON.stringify(trendGroups),
    sourceFreshnessJson: JSON.stringify(sourceFreshness),
    lastEvaluatedAt: now,
  });

  return card;
}

export async function reviewExternalRadarEvent(
  businessId: number,
  eventId: number,
  status: ExternalEventStatus,
  action: string,
  rationale?: string
): Promise<ExternalEventSummary | null> {
  const updated = await setExternalEventStatus(businessId, eventId, status, action, rationale);
  if (!updated) return null;
  return {
    id: updated.id,
    source: updated.source,
    sourceType: updated.sourceType,
    title: updated.title,
    summary: updated.summary,
    referenceUrl: updated.referenceUrl,
    publishedAt: updated.publishedAt,
    detectedAt: updated.detectedAt,
    topic: updated.topic,
    eventType: updated.eventType,
    evidenceStrength: updated.evidenceStrength,
    freshness: updated.freshness,
    status: updated.status as ExternalEventStatus,
    relevanceLevel: updated.relevanceLevel,
    relevanceReason: updated.relevanceReason || "",
    impactType: updated.impactType,
    impactAreas: JSON.parse(updated.impactAreasJson || "[]"),
    strategyImpact: updated.strategyImpact,
    strategyImpactReason: updated.strategyImpactReason,
    objectiveImpacts: JSON.parse(updated.objectiveImpactsJson || "[]"),
    trajectoryContext: updated.trajectoryContextJson,
    crossSignalContext: updated.crossSignalContextJson,
    trendKey: updated.trendKey,
    trendState: updated.trendState,
    trendConfidence: updated.trendConfidence,
    uncertainty: updated.uncertainty,
  };
}
