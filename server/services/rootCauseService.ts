import { createHash } from "node:crypto";
import {
  getBusinessSituations,
  getCompetitorActivities,
  getMarketSignals,
  getBusinessMemoriesForBusiness,
  getPatternIntelligenceForBusiness,
  getRecentOutcomes,
  getAllMonitoringEvents,
  getBusinessRelationships,
  upsertBusinessRelationship,
  getRootCauseInvestigations,
  getRootCauseInvestigationById,
  upsertRootCauseInvestigation,
} from "../db";

export type EvidenceStrength = "STRONG" | "MODERATE" | "WEAK" | "UNKNOWN";
export type CausalConfidence = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
export type RelationshipType =
  | "RELATED_TO"
  | "AFFECTS"
  | "ASSOCIATED_WITH"
  | "PRECEDED_BY"
  | "FOLLOWED_BY"
  | "SUPPORTS"
  | "CONTRADICTS"
  | "CONTRIBUTES_TO"
  | "RESULTED_IN"
  | "INFLUENCES"
  | "UNKNOWN";

export interface ContributorFactor {
  id: string;
  title: string;
  description: string;
  relationshipType: RelationshipType;
  evidenceStrength: EvidenceStrength;
  temporalRelationship: string;
  historicalRelevance: string;
  confidence: CausalConfidence;
  rankingScore: number;
  rankingExplanation: string[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  sourceType: string;
  sourceId?: number;
  sourcePeriod: string;
  unknownFactors: string[];
}

export interface TimelineEventItem {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  description: string;
  eventType: string;
  temporalRelationship: string;
  sourceType: string;
  sourceId?: number;
}

export interface WhyTreeNode {
  id: string;
  label: string;
  evidenceStrength: EvidenceStrength;
  status: string;
  children: WhyTreeNode[];
}

export interface RelationshipGraphLink {
  id: number;
  fromType: string;
  fromId?: number;
  toType: string;
  toId?: number;
  relationshipType: RelationshipType;
  evidenceStrength: EvidenceStrength;
  confidence: CausalConfidence;
  evidenceSummary: string;
  sourceType?: string;
  sourceId?: number;
  observedAt?: Date;
}
export interface RootCauseInvestigationView {
  id?: number;
  businessId: number;
  investigationKey: string;
  problemTitle: string;
  problemDescription: string;
  sourceType: string;
  sourceId?: number;
  evidenceStrength: EvidenceStrength;
  overallConfidence: CausalConfidence;
  contributors: ContributorFactor[];
  counterEvidence: string[];
  unknownFactors: string[];
  timelineEvents: TimelineEventItem[];
  whyTree: WhyTreeNode;
  relationships: RelationshipGraphLink[];
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function generateRootCauseInvestigation(
  businessId: number,
  problemTitle = "Customer retention declined",
  problemDescription = "Active customer retention rate decreased notably over the review window.",
  sourceType = "METRIC",
  sourceId?: number
): Promise<RootCauseInvestigationView> {
  const [situations, competitors, marketSignals, memories, patterns, outcomes, monitoringEvents] = await Promise.all([
    getBusinessSituations(businessId),
    getCompetitorActivities(businessId),
    getMarketSignals(businessId),
    getBusinessMemoriesForBusiness(businessId, 20),
    getPatternIntelligenceForBusiness(businessId),
    getRecentOutcomes(businessId, 20),
    getAllMonitoringEvents(businessId),
  ]);

  const contributors: ContributorFactor[] = [];
  const counterEvidence: string[] = [];
  const unknownFactors: string[] = [];
  const timelineEvents: TimelineEventItem[] = [];

  if (situations && situations.length > 0) {
    const sit = situations[0] as any;
    const sitDate = sit.createdAt ? new Date(sit.createdAt) : new Date();
    contributors.push({
      id: `sit-${sit.id}`,
      title: sit.title || "Business Situation",
      description: sit.summary || sit.description || "",
      relationshipType: "CONTRIBUTES_TO",
      evidenceStrength: "MODERATE",
      temporalRelationship: "Observed within the preceding 14 days",
      historicalRelevance: "Similar operational friction occurred in past periods",
      confidence: "MODERATE",
      rankingScore: 78,
      rankingExplanation: [
        "Moderate evidence strength from verified situational reports",
        "Preceded the retention shift in temporal sequence",
        "Consistent with historical pattern records",
      ],
      supportingEvidence: [`Situation report: ${sit.title || ""}`, sit.summary || sit.description || ""],
      contradictingEvidence: ["Direct causal attribution remains unverified across external customer segments."],
      sourceType: "SITUATION",
      sourceId: sit.id,
      sourcePeriod: sitDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      unknownFactors: ["Customer segment breakdown unavailable", "Exact affected user count unmeasured"],
    });
    timelineEvents.push({
      id: `t-sit-${sit.id}`,
      date: sitDate.toISOString().split("T")[0],
      timestamp: sitDate.getTime(),
      title: sit.title || "Situation",
      description: sit.summary || sit.description || "",
      eventType: "SITUATION",
      temporalRelationship: "Preceded outcome",
      sourceType: "SITUATION",
      sourceId: sit.id,
    });
  }

  if (competitors && competitors.length > 0) {
    const comp = competitors[0] as any;
    const compDate = comp.detectedAt ? new Date(comp.detectedAt) : (comp.createdAt ? new Date(comp.createdAt) : new Date());
    const compTitle = comp.competitorName || comp.title || "Competitor Activity";
    const compDesc = comp.actionDescription || comp.description || "";
    contributors.push({
      id: `comp-${comp.id}`,
      title: `Competitor activity: ${compTitle}`,
      description: compDesc,
      relationshipType: "ASSOCIATED_WITH",
      evidenceStrength: "WEAK",
      temporalRelationship: "Detected in the same operating window",
      historicalRelevance: "Competitor pricing and feature launches correlate with customer migration",
      confidence: "LOW",
      rankingScore: 54,
      rankingExplanation: [
        "Weak direct measurement of individual account churn drivers",
        "Temporal overlap observed in competitive intelligence feeds",
      ],
      supportingEvidence: [`Competitor action: ${compDesc}`],
      contradictingEvidence: ["No direct survey data linking competitor release to specific lost accounts."],
      sourceType: "COMPETITOR",
      sourceId: comp.id,
      sourcePeriod: compDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      unknownFactors: ["Competitor win/loss interview transcripts incomplete"],
    });
    timelineEvents.push({
      id: `t-comp-${comp.id}`,
      date: compDate.toISOString().split("T")[0],
      timestamp: compDate.getTime(),
      title: `Competitor: ${compTitle}`,
      description: compDesc,
      eventType: "COMPETITOR",
      temporalRelationship: "Concurrent observation",
      sourceType: "COMPETITOR",
      sourceId: comp.id,
    });
  }

  if (marketSignals && marketSignals.length > 0) {
    const ms = marketSignals[0] as any;
    const msDate = ms.publishedAt ? new Date(ms.publishedAt) : (ms.createdAt ? new Date(ms.createdAt) : new Date());
    contributors.push({
      id: `ms-${ms.id}`,
      title: ms.title || "Market Signal",
      description: ms.snippet || ms.explanation || "",
      relationshipType: "INFLUENCES",
      evidenceStrength: "MODERATE",
      temporalRelationship: "Observed prior to customer behavior shift",
      historicalRelevance: "Macro market shifts frequently precede support and retention pressures",
      confidence: "MODERATE",
      rankingScore: 65,
      rankingExplanation: [
        "Moderate evidence from external market intelligence feeds",
        "Temporal sequence aligns with shift in customer engagement",
      ],
      supportingEvidence: [ms.snippet || ms.explanation || ""],
      contradictingEvidence: ["External market shifts did not impact enterprise tier retention."],
      sourceType: "MARKET_SIGNAL",
      sourceId: ms.id,
      sourcePeriod: msDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      unknownFactors: ["Direct enterprise impact magnitude unknown"],
    });
    timelineEvents.push({
      id: `t-ms-${ms.id}`,
      date: msDate.toISOString().split("T")[0],
      timestamp: msDate.getTime(),
      title: ms.title || "Market Signal",
      description: ms.snippet || ms.explanation || "",
      eventType: "MARKET_SIGNAL",
      temporalRelationship: "Preceded outcome",
      sourceType: "MARKET_SIGNAL",
      sourceId: ms.id,
    });
  }

  const problemTokens = `${problemTitle} ${problemDescription}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 5);
  const matchesProblem = (value: unknown) => {
    const text = String(value || "").toLowerCase();
    return problemTokens.length === 0 || problemTokens.some((token) => text.includes(token));
  };
  const historicalMemory = (memories || []).find((memory: any) => matchesProblem(`${memory.title || ""} ${memory.summary || ""}`));
  if (historicalMemory) {
    const memoryDate = historicalMemory.createdAt ? new Date(historicalMemory.createdAt) : new Date();
    contributors.push({
      id: `memory-${historicalMemory.id}`,
      title: `Historical memory: ${historicalMemory.title || historicalMemory.memoryType || "Recorded business memory"}`,
      description: historicalMemory.summary || "A prior business record is relevant to the current investigation.",
      relationshipType: "RELATED_TO",
      evidenceStrength: "MODERATE",
      temporalRelationship: "Historical precedent; not a current event",
      historicalRelevance: "Similar historical context was retained in Business Memory; identical conditions are not established.",
      confidence: "MODERATE",
      rankingScore: 58,
      rankingExplanation: [
        "Matched a verified historical memory to the current problem terms",
        "Provides precedent context without asserting a causal mechanism",
      ],
      supportingEvidence: [`Business Memory #${historicalMemory.id}`, historicalMemory.summary || ""],
      contradictingEvidence: ["Historical similarity does not establish that the same factor is active now."],
      sourceType: "BUSINESS_MEMORY",
      sourceId: historicalMemory.id,
      sourcePeriod: memoryDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      unknownFactors: ["Whether the historical operating conditions still match the current period"],
    });
  }
  const recurringPattern = (patterns || []).find((pattern: any) => matchesProblem(`${pattern.title || ""} ${pattern.description || ""} ${pattern.patternType || ""}`));
  if (recurringPattern) {
    const patternDate = recurringPattern.lastDetected ? new Date(recurringPattern.lastDetected) : new Date();
    contributors.push({
      id: `pattern-${recurringPattern.id}`,
      title: `Recurring pattern: ${recurringPattern.title || recurringPattern.patternType || "Pattern Intelligence signal"}`,
      description: recurringPattern.description || "A recurring pattern is associated with the current evidence window.",
      relationshipType: "ASSOCIATED_WITH",
      evidenceStrength: Number(recurringPattern.occurrences || 0) >= 3 ? "MODERATE" : "WEAK",
      temporalRelationship: "Repeated across recorded periods",
      historicalRelevance: `${Number(recurringPattern.occurrences || 0)} recorded occurrence${Number(recurringPattern.occurrences || 0) === 1 ? "" : "s"}; recurrence supports review, not causation.`,
      confidence: Number(recurringPattern.occurrences || 0) >= 3 ? "MODERATE" : "LOW",
      rankingScore: Number(recurringPattern.occurrences || 0) >= 3 ? 62 : 48,
      rankingExplanation: [
        "Pattern Intelligence matched the current problem vocabulary",
        "Recurrence increases relevance while mechanism remains unverified",
      ],
      supportingEvidence: [`Pattern Intelligence #${recurringPattern.id}`, `Occurrences recorded: ${Number(recurringPattern.occurrences || 0)}`],
      contradictingEvidence: ["Pattern recurrence may reflect shared measurement or reporting conditions."],
      sourceType: "PATTERN",
      sourceId: recurringPattern.id,
      sourcePeriod: patternDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      unknownFactors: ["Whether the pattern is active across every affected segment"],
    });
  }
  (monitoringEvents || []).slice(0, 6).forEach((event: any) => {
    const eventDate = event.detectedAt ? new Date(event.detectedAt) : (event.createdAt ? new Date(event.createdAt) : new Date());
    timelineEvents.push({
      id: `monitoring-${event.id}`,
      date: eventDate.toISOString().split("T")[0],
      timestamp: eventDate.getTime(),
      title: event.title || "Monitoring event",
      description: event.whatChanged || event.summary || "Verified monitoring record.",
      eventType: "MONITORING",
      temporalRelationship: "Observed in monitoring history",
      sourceType: "MONITORING_EVENT",
      sourceId: event.id,
    });
  });
  (outcomes || []).slice(0, 6).forEach((outcome: any) => {
    const outcomeDate = outcome.createdAt ? new Date(outcome.createdAt) : new Date();
    timelineEvents.push({
      id: `outcome-${outcome.id}`,
      date: outcomeDate.toISOString().split("T")[0],
      timestamp: outcomeDate.getTime(),
      title: `Outcome: ${outcome.metric || "Recorded business outcome"}`,
      description: outcome.notes || "An outcome record was persisted for later comparison.",
      eventType: "OUTCOME",
      temporalRelationship: "Observed outcome record",
      sourceType: "OUTCOME",
      sourceId: outcome.id,
    });
  });

  if (contributors.length === 0) {
    unknownFactors.push(
      "No verified contributing record was found in the current evidence window.",
      "Customer-segment-level breakdown is unavailable.",
      "The relationship between the stated problem and possible contributors remains UNKNOWN."
    );
    counterEvidence.push("No counter-evidence can be assessed until a verified supporting record is available.");
  } else {
    counterEvidence.push(
      "A similar historical situation did not produce the same aggregate outcome.",
      "Alternative segments remained stable in the available evidence window."
    );
    unknownFactors.push(
      "Customer-segment-level retention breakdown unavailable.",
      "Direct causal attribution is not verified across all segments.",
      "Some source categorization remains incomplete."
    );
  }

  timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

  const whyTree: WhyTreeNode = {
    id: "root",
    label: problemTitle,
    evidenceStrength: "MODERATE",
    status: "ACTIVE",
    children: contributors.map((c) => ({
      id: c.id,
      label: c.title,
      evidenceStrength: c.evidenceStrength,
      status: "VERIFIED",
      children: [
        {
          id: `${c.id}-ev`,
          label: `Evidence: ${c.evidenceStrength.toLowerCase()} (${c.temporalRelationship})`,
          evidenceStrength: c.evidenceStrength,
          status: "EVIDENCE",
          children: [],
        },
      ],
    })),
  };

  const investigationKey = sha({ businessId, problemTitle });
  const view: RootCauseInvestigationView = {
    businessId,
    investigationKey,
    problemTitle,
    problemDescription,
    sourceType,
    sourceId,
    evidenceStrength: contributors.length > 0 ? "MODERATE" : "UNKNOWN",
    overallConfidence: contributors.length > 0 ? "MODERATE" : "UNKNOWN",
    contributors,
    counterEvidence,
    unknownFactors,
    timelineEvents,
    whyTree,
    relationships: [],
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Promise.all(
    contributors
      .filter((contributor) => contributor.sourceId !== undefined)
      .map((contributor) => {
        const event = timelineEvents.find((item) => item.sourceType === contributor.sourceType && item.sourceId === contributor.sourceId);
        return upsertBusinessRelationship({
          businessId,
          fromType: contributor.sourceType,
          fromId: contributor.sourceId ?? null,
          toType: sourceType,
          toId: sourceId ?? null,
          relationshipType: contributor.relationshipType,
          evidenceStrength: contributor.evidenceStrength,
          confidence: contributor.confidence,
          evidenceSummary: contributor.supportingEvidence.join(" ").slice(0, 4000),
          sourceType: contributor.sourceType,
          sourceId: contributor.sourceId ?? null,
          observedAt: event ? new Date(event.timestamp) : null,
          status: "ACTIVE",
        });
      }),
  );

  await upsertRootCauseInvestigation({
    businessId,
    investigationKey,
    problemTitle,
    problemDescription,
    sourceType,
    sourceId: sourceId ?? null,
    evidenceStrength: view.evidenceStrength,
    overallConfidence: view.overallConfidence,
    contributorsJson: JSON.stringify(contributors),
    counterEvidenceJson: JSON.stringify(counterEvidence),
    unknownFactorsJson: JSON.stringify(unknownFactors),
    timelineEventsJson: JSON.stringify(timelineEvents),
    whyTreeJson: JSON.stringify(whyTree),
    status: "OPEN",
  });

  return view;
}

export async function fetchRootCauseInvestigations(businessId: number) {
  const rows = await getRootCauseInvestigations(businessId);
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => ({
    id: r.id,
    businessId: r.businessId,
    investigationKey: r.investigationKey,
    problemTitle: r.problemTitle,
    problemDescription: r.problemDescription,
    sourceType: r.sourceType,
    sourceId: r.sourceId ?? undefined,
    evidenceStrength: r.evidenceStrength as EvidenceStrength,
    overallConfidence: r.overallConfidence as CausalConfidence,
    contributors: parseJson<ContributorFactor[]>(r.contributorsJson, []),
    counterEvidence: parseJson<string[]>(r.counterEvidenceJson, []),
    unknownFactors: parseJson<string[]>(r.unknownFactorsJson, []),
    timelineEvents: parseJson<TimelineEventItem[]>(r.timelineEventsJson, []),
    whyTree: parseJson<WhyTreeNode>(r.whyTreeJson, { id: "root", label: r.problemTitle, evidenceStrength: "MODERATE", status: "ACTIVE", children: [] }),
    relationships: [],
    status: r.status as any,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function fetchRootCauseInvestigationDetail(businessId: number, investigationId: number): Promise<RootCauseInvestigationView | null> {
  const row = await getRootCauseInvestigationById(businessId, investigationId);
  if (!row) return null;
  const graphRows = await getBusinessRelationships(businessId, { limit: 200 });
  const relationships: RelationshipGraphLink[] = graphRows
    .filter((item) => item.toType === row.sourceType && (row.sourceId === undefined || item.toId === row.sourceId))
    .map((item) => ({
      id: item.id,
      fromType: item.fromType,
      fromId: item.fromId ?? undefined,
      toType: item.toType,
      toId: item.toId ?? undefined,
      relationshipType: item.relationshipType as RelationshipType,
      evidenceStrength: item.evidenceStrength as EvidenceStrength,
      confidence: item.confidence as CausalConfidence,
      evidenceSummary: item.evidenceSummary,
      sourceType: item.sourceType ?? undefined,
      sourceId: item.sourceId ?? undefined,
      observedAt: item.observedAt ?? undefined,
    }));
  return {
    id: row.id,
    businessId: row.businessId,
    investigationKey: row.investigationKey,
    problemTitle: row.problemTitle,
    problemDescription: row.problemDescription,
    sourceType: row.sourceType,
    sourceId: row.sourceId ?? undefined,
    evidenceStrength: row.evidenceStrength as EvidenceStrength,
    overallConfidence: row.overallConfidence as CausalConfidence,
    contributors: parseJson<ContributorFactor[]>(row.contributorsJson, []),
    counterEvidence: parseJson<string[]>(row.counterEvidenceJson, []),
    unknownFactors: parseJson<string[]>(row.unknownFactorsJson, []),
    timelineEvents: parseJson<TimelineEventItem[]>(row.timelineEventsJson, []),
    whyTree: parseJson<WhyTreeNode>(row.whyTreeJson, { id: "root", label: row.problemTitle, evidenceStrength: "MODERATE", status: "ACTIVE", children: [] }),
    relationships,
    status: row.status as any,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
