import {
  getBusinessSituations,
  getAllMonitoringEvents,
  getCompetitorActivities,
  getOpportunities,
  getLatestStrategyHealthSnapshot,
  getAllDecisionCandidates,
  getExternalEvents,
  getSignalRelationships,
  getAttentionItemsForBusiness,
  getAttentionItemById,
  createAttentionItem,
  updateAttentionItem,
  createAttentionReviewLogEntry,
  getAttentionReviewLogsForBusiness,
} from "../db";

export interface AttentionExplanation {
  summary: string;
  reasons: string[];
  factors: {
    impact: string;
    urgency: string;
    strategicRelevance: string;
    trajectoryRelevance: string;
    evidenceStrength: string;
    freshness: string;
    crossSignalSupport: boolean;
  };
  recommendedAction: string;
}

export async function refreshAttentionQueueForBusiness(businessId: number) {
  // Fetch source intelligence records
  const [
    situations,
    monitoringEvents,
    competitorActivities,
    opportunities,
    strategyHealth,
    decisions,
    externalEvents,
    signalRelationships,
  ] = await Promise.all([
    getBusinessSituations(businessId),
    getAllMonitoringEvents(businessId),
    getCompetitorActivities(businessId),
    getOpportunities(businessId),
    getLatestStrategyHealthSnapshot(businessId),
    getAllDecisionCandidates(businessId),
    getExternalEvents(businessId),
    getSignalRelationships(businessId),
  ]);

  const existingItems = await getAttentionItemsForBusiness(businessId);
  const existingMap = new Map(existingItems.map(item => [`${item.sourceType}:${item.sourceId}`, item]));

  const generatedItems: Array<{
    sourceType: string;
    sourceId: number | null;
    title: string;
    summary: string;
    category: string;
    tier: string;
    priority: string;
    priorityScore: number;
    impact: string;
    urgency: string;
    strategicRelevance: string;
    trajectoryRelevance: string;
    evidenceStrength: string;
    freshness: string;
    crossSignalSupport: boolean;
    explanationJson: string;
  }> = [];

  // 1. Process active situations
  for (const sit of situations) {
    if (sit.status === "RESOLVED" || sit.status === "DISMISSED") continue;
    const isHigh = sit.priority === "HIGH";
    const impact = isHigh ? "HIGH" : "MEDIUM";
    const urgency = isHigh ? "CRITICAL" : "HIGH";
    const priority = isHigh ? "HIGH" : "MEDIUM";
    const priorityScore = isHigh ? 90 : 75;
    const tier = priorityScore >= 80 ? "NOW" : "NEXT";

    const explanation: AttentionExplanation = {
      summary: `Business situation '${sit.title}' requires operational review.`,
      reasons: [
        `Situation status is active with ${sit.priority} priority.`,
        `Category: ${sit.category}`,
        `Supporting evidence count: ${sit.supportingCount}`,
      ],
      factors: {
        impact,
        urgency,
        strategicRelevance: "HIGH",
        trajectoryRelevance: "DECLINING",
        evidenceStrength: "HIGH",
        freshness: "FRESH",
        crossSignalSupport: true,
      },
      recommendedAction: "Review situation timeline and coordinate corrective mitigation.",
    };

    generatedItems.push({
      sourceType: "SITUATION",
      sourceId: sit.id,
      title: sit.title,
      summary: sit.summary,
      category: "SITUATION",
      tier,
      priority,
      priorityScore,
      impact,
      urgency,
      strategicRelevance: "HIGH",
      trajectoryRelevance: "DECLINING",
      evidenceStrength: "HIGH",
      freshness: "FRESH",
      crossSignalSupport: true,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // 2. Process monitoring alerts
  for (const alert of monitoringEvents) {
    if (alert.status === "RESOLVED" || alert.status === "DISMISSED") continue;
    const impact = alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "HIGH" : "MEDIUM";
    const urgency = alert.severity === "CRITICAL" ? "CRITICAL" : "MEDIUM";
    const priorityScore = alert.severity === "CRITICAL" ? 85 : alert.severity === "HIGH" ? 70 : 50;
    const tier = priorityScore >= 80 ? "NOW" : priorityScore >= 60 ? "NEXT" : "WATCH";

    const explanation: AttentionExplanation = {
      summary: alert.summary,
      reasons: [
        `Triggered by monitored rule: ${alert.title}`,
        `Severity level: ${alert.severity}`,
        `Recommended review: ${alert.recommendedReview || "Inspect metric telemetry"}`,
      ],
      factors: {
        impact,
        urgency,
        strategicRelevance: "MEDIUM",
        trajectoryRelevance: "STABLE",
        evidenceStrength: "HIGH",
        freshness: "FRESH",
        crossSignalSupport: false,
      },
      recommendedAction: alert.recommendedReview || "Inspect telemetry and acknowledge alert.",
    };

    generatedItems.push({
      sourceType: "MONITORING_ALERT",
      sourceId: alert.id,
      title: alert.title,
      summary: alert.summary,
      category: "EARLY_WARNING",
      tier,
      priority: alert.severity === "CRITICAL" ? "CRITICAL" : alert.severity === "HIGH" ? "HIGH" : "MEDIUM",
      priorityScore,
      impact,
      urgency,
      strategicRelevance: "MEDIUM",
      trajectoryRelevance: "STABLE",
      evidenceStrength: "HIGH",
      freshness: "FRESH",
      crossSignalSupport: false,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // 3. Process Strategy Health warnings
  if (strategyHealth && (strategyHealth.healthState === "OFF_TRACK" || strategyHealth.healthState === "VULNERABLE")) {
    const isOffTrack = strategyHealth.healthState === "OFF_TRACK";
    const priorityScore = isOffTrack ? 92 : 72;
    const tier = isOffTrack ? "NOW" : "NEXT";
    const summaryText = `Strategy health is rated ${strategyHealth.healthState}. Objective performance: ${strategyHealth.objectivePerformance}, Trajectory alignment: ${strategyHealth.trajectoryAlignment}.`;

    const explanation: AttentionExplanation = {
      summary: summaryText,
      reasons: [
        `Strategy health snapshot indicates alignment issues.`,
        `Objective performance: ${strategyHealth.objectivePerformance}`,
        `Active assumptions require validation or adjustment.`,
      ],
      factors: {
        impact: "HIGH",
        urgency: isOffTrack ? "CRITICAL" : "HIGH",
        strategicRelevance: "HIGH",
        trajectoryRelevance: "DECLINING",
        evidenceStrength: "HIGH",
        freshness: "FRESH",
        crossSignalSupport: true,
      },
      recommendedAction: "Open Strategy Health workspace to adjust assumptions or pivot strategy.",
    };

    generatedItems.push({
      sourceType: "STRATEGY_HEALTH",
      sourceId: strategyHealth.id,
      title: `Strategy Health: ${strategyHealth.healthState.replace("_", " ")}`,
      summary: summaryText,
      category: "STRATEGY_REVIEW",
      tier,
      priority: isOffTrack ? "CRITICAL" : "HIGH",
      priorityScore,
      impact: "HIGH",
      urgency: isOffTrack ? "CRITICAL" : "HIGH",
      strategicRelevance: "HIGH",
      trajectoryRelevance: "DECLINING",
      evidenceStrength: "HIGH",
      freshness: "FRESH",
      crossSignalSupport: true,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // 4. Process high-priority decisions
  for (const dec of decisions) {
    if (dec.status === "DECIDED" || dec.status === "DISMISSED" || dec.status === "DEFERRED") continue;
    const isUrgent = dec.urgency === "CRITICAL" || dec.urgency === "HIGH";
    const priorityScore = isUrgent ? 82 : 65;
    const tier = priorityScore >= 80 ? "NOW" : "NEXT";

    const explanation: AttentionExplanation = {
      summary: dec.whyMatters,
      reasons: [
        `Decision priority is ${dec.priority} with ${dec.urgency} urgency.`,
        `Potential impact: ${dec.potentialImpact}`,
        `Why it matters: ${dec.whyMatters}`,
      ],
      factors: {
        impact: dec.potentialImpact,
        urgency: dec.urgency,
        strategicRelevance: "HIGH",
        trajectoryRelevance: "STABLE",
        evidenceStrength: dec.evidenceStrength,
        freshness: "FRESH",
        crossSignalSupport: false,
      },
      recommendedAction: "Review decision candidates, weigh trade-offs, and record decision outcome.",
    };

    generatedItems.push({
      sourceType: "DECISION",
      sourceId: dec.id,
      title: `Decision Pending: ${dec.title}`,
      summary: dec.whyMatters,
      category: "DECISION",
      tier,
      priority: dec.priority,
      priorityScore,
      impact: dec.potentialImpact,
      urgency: dec.urgency,
      strategicRelevance: "HIGH",
      trajectoryRelevance: "STABLE",
      evidenceStrength: dec.evidenceStrength,
      freshness: "FRESH",
      crossSignalSupport: false,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // 5. Process high-relevance external events
  for (const ext of externalEvents) {
    if (ext.status === "DISMISSED" || ext.status === "RESOLVED") continue;
    if (ext.relevanceLevel !== "HIGH" && ext.relevanceLevel !== "MEDIUM") continue;
    const isHigh = ext.relevanceLevel === "HIGH";
    const priorityScore = isHigh ? 78 : 55;
    const tier = priorityScore >= 80 ? "NOW" : priorityScore >= 60 ? "NEXT" : "WATCH";

    const explanation: AttentionExplanation = {
      summary: ext.summary,
      reasons: [
        `Event type: ${ext.eventType}`,
        `Business relevance: ${ext.relevanceLevel}`,
        `Impact type: ${ext.impactType}`,
        `Strategy impact: ${ext.strategyImpact}`,
      ],
      factors: {
        impact: ext.impactType || "MEDIUM",
        urgency: isHigh ? "HIGH" : "MEDIUM",
        strategicRelevance: isHigh ? "HIGH" : "MEDIUM",
        trajectoryRelevance: "STABLE",
        evidenceStrength: ext.evidenceStrength,
        freshness: ext.freshness,
        crossSignalSupport: false,
      },
      recommendedAction: ext.relevanceReason || "Review external radar and evaluate strategic implications.",
    };

    generatedItems.push({
      sourceType: "EXTERNAL_EVENT",
      sourceId: ext.id,
      title: ext.title,
      summary: ext.summary,
      category: "MARKET_CHANGE",
      tier,
      priority: isHigh ? "HIGH" : "MEDIUM",
      priorityScore,
      impact: ext.impactType || "MEDIUM",
      urgency: isHigh ? "HIGH" : "MEDIUM",
      strategicRelevance: isHigh ? "HIGH" : "MEDIUM",
      trajectoryRelevance: "STABLE",
      evidenceStrength: ext.evidenceStrength,
      freshness: ext.freshness,
      crossSignalSupport: false,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // 6. Process opportunities
  for (const opp of opportunities) {
    if (opp.status === "DISMISSED" || opp.status === "EXPIRED") continue;
    const isHigh = opp.potentialImpact === "HIGH" || opp.priority === "HIGH";
    const priorityScore = isHigh ? 68 : 48;
    const tier = priorityScore >= 60 ? "NEXT" : "WATCH";

    const explanation: AttentionExplanation = {
      summary: `Growth opportunity identified: ${opp.title}`,
      reasons: [
        `Potential impact: ${opp.potentialImpact}`,
        `Evidence strength: ${opp.evidenceStrength}`,
        `Next step: ${opp.potentialNextStep || "Evaluate opportunity"}`,
      ],
      factors: {
        impact: opp.potentialImpact,
        urgency: opp.urgency,
        strategicRelevance: "HIGH",
        trajectoryRelevance: "IMPROVING",
        evidenceStrength: opp.evidenceStrength,
        freshness: "FRESH",
        crossSignalSupport: false,
      },
      recommendedAction: opp.potentialNextStep || "Evaluate opportunity details and consider promoting to action.",
    };

    generatedItems.push({
      sourceType: "OPPORTUNITY",
      sourceId: opp.id,
      title: `Opportunity: ${opp.title}`,
      summary: opp.summary,
      category: "OPPORTUNITY",
      tier,
      priority: opp.priority,
      priorityScore,
      impact: opp.potentialImpact,
      urgency: opp.urgency,
      strategicRelevance: "HIGH",
      trajectoryRelevance: "IMPROVING",
      evidenceStrength: opp.evidenceStrength,
      freshness: "FRESH",
      crossSignalSupport: false,
      explanationJson: JSON.stringify(explanation),
    });
  }

  // Sync generated items to database (upsert/update)
  for (const item of generatedItems) {
    const key = `${item.sourceType}:${item.sourceId}`;
    const existing = existingMap.get(key);
    if (existing) {
      if (existing.status !== "ACKNOWLEDGED" && existing.status !== "IN_REVIEW" && existing.status !== "DISMISSED") {
        await updateAttentionItem(businessId, existing.id, {
          tier: item.tier,
          title: item.title,
          summary: item.summary,
          priority: item.priority as any,
          priorityScore: item.priorityScore,
          impact: item.impact as any,
          urgency: item.urgency as any,
          strategicRelevance: item.strategicRelevance as any,
          trajectoryRelevance: item.trajectoryRelevance as any,
          evidenceStrength: item.evidenceStrength as any,
          explanationJson: item.explanationJson,
        });
      }
    } else {
      await createAttentionItem({
        businessId,
        tier: item.tier as any,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        title: item.title,
        summary: item.summary,
        category: item.category as any,
        priority: item.priority as any,
        priorityScore: item.priorityScore,
        impact: item.impact as any,
        urgency: item.urgency as any,
        strategicRelevance: item.strategicRelevance as any,
        trajectoryRelevance: item.trajectoryRelevance as any,
        evidenceStrength: item.evidenceStrength as any,
        freshness: "FRESH",
        crossSignalSupport: item.crossSignalSupport,
        explanationJson: item.explanationJson,
        status: "NEW",
      });
    }
  }

  return await getAttentionItemsForBusiness(businessId);
}

export async function getAttentionQueueForBusiness(businessId: number) {
  let items = await getAttentionItemsForBusiness(businessId);
  if (items.length === 0) {
    items = await refreshAttentionQueueForBusiness(businessId);
  }

  const now = items.filter(i => i.tier === "NOW" && i.status !== "DISMISSED" && i.status !== "RESOLVED");
  const next = items.filter(i => i.tier === "NEXT" && i.status !== "DISMISSED" && i.status !== "RESOLVED");
  const watch = items.filter(i => i.tier === "WATCH" && i.status !== "DISMISSED" && i.status !== "RESOLVED");
  const background = items.filter(i => i.tier === "BACKGROUND" || i.status === "DISMISSED" || i.status === "RESOLVED");

  return {
    now,
    next,
    watch,
    background,
    totalCount: items.length,
    activeCount: items.filter(i => i.status !== "DISMISSED" && i.status !== "RESOLVED").length,
  };
}

export async function reviewAttentionItem(
  businessId: number,
  itemId: number,
  action: "ACKNOWLEDGE" | "DISMISS" | "RESOLVE" | "REOPEN",
  reason?: string,
  notes?: string
) {
  const item = await getAttentionItemById(businessId, itemId);
  if (!item) return null;

  let newStatus: any = item.status;
  if (action === "ACKNOWLEDGE") newStatus = "ACKNOWLEDGED";
  if (action === "DISMISS") newStatus = "DISMISSED";
  if (action === "RESOLVE") newStatus = "RESOLVED";
  if (action === "REOPEN") newStatus = "ACTIVE";

  const updated = await updateAttentionItem(businessId, itemId, {
    status: newStatus,
    dismissalReason: action === "DISMISS" ? reason || "NOT_RELEVANT" : item.dismissalReason,
    resolvedAt: action === "RESOLVE" ? new Date() : item.resolvedAt,
  });

  await createAttentionReviewLogEntry({
    businessId,
    attentionItemId: itemId,
    action,
    reason: reason || null,
    notes: notes || null,
  });

  return updated;
}
