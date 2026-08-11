import {
  getBusinessSituations,
  getSituationSnapshots,
  createSituationSnapshot,
  getBusinessSituationSnapshots,
} from "../db";
import { evaluateAndUpsertBusinessSituations, BusinessSituationItem } from "./businessSituationEngine";

export type TrendDirection = "IMPROVING" | "WORSENING" | "STABLE" | "NEW" | "RESOLVED" | "RECURRING";

export interface SituationTimelineItem {
  snapshotId?: number;
  situationId: number;
  title: string;
  summary: string;
  priority: string;
  status: string;
  category: string;
  trendDirection: TrendDirection;
  supportingCount: number;
  internalEvidenceCount: number;
  externalEvidenceCount: number;
  freshnessInfo?: string;
  timestamp: Date;
}

export interface SituationTrendAnalysis {
  situationId: number;
  title: string;
  currentStatus: string;
  currentPriority: string;
  trendDirection: TrendDirection;
  trendSummary: string;
  timeline: SituationTimelineItem[];
  changesSinceLastReview: string[];
  durationDays: number;
  previousOccurrencesCount: number;
}

/**
 * Deterministic Trend Analysis & Snapshot Service (Day 14)
 */
export async function evaluateAndRecordSituationSnapshots(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<SituationTrendAnalysis[]> {
  // First evaluate/upsert current situations
  const currentSituations = await evaluateAndUpsertBusinessSituations(businessId, periodStartDate, periodEndDate);
  const analyses: SituationTrendAnalysis[] = [];

  for (const sit of currentSituations) {
    if (!sit.id) continue;

    // Fetch existing history/snapshots
    const snapshots = await getSituationSnapshots(sit.id, 20);
    const now = new Date();

    let trendDirection: TrendDirection = "NEW";
    let trendSummary = "Newly emerged situation detected in current reporting period.";
    const changesSinceLastReview: string[] = [];

    const internalCount = sit.supportingSignals.filter((s) => s.type === "INTERNAL").length;
    const externalCount = sit.supportingSignals.filter((s) => s.type === "EXTERNAL").length;

    if (snapshots.length > 0) {
      const prev = snapshots[0];
      const prevPriorityRank = prev.priority === "HIGH" ? 3 : prev.priority === "MEDIUM" ? 2 : 1;
      const currPriorityRank = sit.priority === "HIGH" ? 3 : sit.priority === "MEDIUM" ? 2 : 1;

      if (sit.status === "RESOLVED") {
        trendDirection = "RESOLVED";
        trendSummary = "Situation has been marked as resolved.";
        changesSinceLastReview.push("Status updated to RESOLVED.");
      } else if (currPriorityRank > prevPriorityRank) {
        trendDirection = "WORSENING";
        trendSummary = `Priority increased from ${prev.priority} to ${sit.priority}. Supporting signals increased.`;
        changesSinceLastReview.push(`Priority increased from ${prev.priority} to ${sit.priority}.`);
      } else if (currPriorityRank < prevPriorityRank) {
        trendDirection = "IMPROVING";
        trendSummary = `Priority eased from ${prev.priority} to ${sit.priority}.`;
        changesSinceLastReview.push(`Priority eased from ${prev.priority} to ${sit.priority}.`);
      } else if (sit.supportingCount > prev.supportingCount) {
        trendDirection = "WORSENING";
        trendSummary = `Supporting signals increased from ${prev.supportingCount} to ${sit.supportingCount}.`;
        changesSinceLastReview.push(`${sit.supportingCount - prev.supportingCount} additional supporting signals detected.`);
      } else if (sit.supportingCount < prev.supportingCount) {
        trendDirection = "IMPROVING";
        trendSummary = `Supporting signals decreased from ${prev.supportingCount} to ${sit.supportingCount}.`;
        changesSinceLastReview.push(`Supporting signals decreased by ${prev.supportingCount - sit.supportingCount}.`);
      } else {
        trendDirection = "STABLE";
        trendSummary = "Operating situation metrics and priority remain stable compared to previous review.";
        changesSinceLastReview.push("No significant change since previous review.");
      }

      // Check recurring situation pattern (resolved previously and returned after meaningful time)
      const allBusinessSnapshots = await getBusinessSituationSnapshots(businessId, 100);
      const pastResolvedForCategory = allBusinessSnapshots.filter(
        (snap: any) => snap.category === sit.category && snap.status === "RESOLVED"
      );
      if (pastResolvedForCategory.length > 0 && snapshots.length <= 1) {
        trendDirection = "RECURRING";
        trendSummary = `Recurring situation: ${sit.category} pressure has re-emerged after previous resolution.`;
        changesSinceLastReview.push("Situation has re-emerged following previous resolution.");
      }
    } else {
      trendDirection = "NEW";
      trendSummary = "First recorded snapshot for this situation.";
      changesSinceLastReview.push("Initial observation snapshot recorded.");
    }

    // Record snapshot (with deduplication inside createSituationSnapshot)
    await createSituationSnapshot({
      businessId,
      situationId: sit.id,
      title: sit.title,
      summary: sit.summary,
      priority: sit.priority,
      status: sit.status,
      category: sit.category,
      trendDirection,
      supportingCount: sit.supportingCount,
      internalEvidenceCount: internalCount,
      externalEvidenceCount: externalCount,
      freshnessInfo: sit.freshnessInfo,
      timestamp: now,
    });

    const updatedSnapshots = await getSituationSnapshots(sit.id, 20);
    const firstSnap = updatedSnapshots[updatedSnapshots.length - 1];
    const durationDays = firstSnap ? Math.max(1, Math.round((now.getTime() - new Date(firstSnap.timestamp).getTime()) / (1000 * 60 * 60 * 24))) : 1;

    const timeline: SituationTimelineItem[] = updatedSnapshots.map((snap: any) => ({
      snapshotId: snap.id,
      situationId: snap.situationId,
      title: snap.title,
      summary: snap.summary,
      priority: snap.priority,
      status: snap.status,
      category: snap.category,
      trendDirection: snap.trendDirection as TrendDirection,
      supportingCount: snap.supportingCount,
      internalEvidenceCount: snap.internalEvidenceCount,
      externalEvidenceCount: snap.externalEvidenceCount,
      freshnessInfo: snap.freshnessInfo,
      timestamp: new Date(snap.timestamp),
    }));

    analyses.push({
      situationId: sit.id,
      title: sit.title,
      currentStatus: sit.status,
      currentPriority: sit.priority,
      trendDirection,
      trendSummary,
      timeline,
      changesSinceLastReview,
      durationDays,
      previousOccurrencesCount: timeline.filter((t) => t.status === "RESOLVED").length,
    });
  }

  return analyses;
}

export async function getBusinessSituationTrends(businessId: number): Promise<SituationTrendAnalysis[]> {
  const situations = await getBusinessSituations(businessId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  
  if (situations.length === 0) {
    return await evaluateAndRecordSituationSnapshots(businessId, thirtyDaysAgo, now);
  }

  const analyses: SituationTrendAnalysis[] = [];
  for (const sit of situations) {
    const snapshots = await getSituationSnapshots(sit.id, 20);
    const firstSnap = snapshots[snapshots.length - 1];
    const durationDays = firstSnap ? Math.max(1, Math.round((now.getTime() - new Date(firstSnap.timestamp).getTime()) / (1000 * 60 * 60 * 24))) : 1;

    const timeline: SituationTimelineItem[] = snapshots.map((snap: any) => ({
      snapshotId: snap.id,
      situationId: snap.situationId,
      title: snap.title,
      summary: snap.summary,
      priority: snap.priority,
      status: snap.status,
      category: snap.category,
      trendDirection: (snap.trendDirection || "STABLE") as TrendDirection,
      supportingCount: snap.supportingCount,
      internalEvidenceCount: snap.internalEvidenceCount,
      externalEvidenceCount: snap.externalEvidenceCount,
      freshnessInfo: snap.freshnessInfo,
      timestamp: new Date(snap.timestamp),
    }));

    const latestSnap = snapshots[0];
    const trendDirection: TrendDirection = latestSnap ? (latestSnap.trendDirection as TrendDirection) : "NEW";

    analyses.push({
      situationId: sit.id,
      title: sit.title,
      currentStatus: sit.status,
      currentPriority: sit.priority,
      trendDirection,
      trendSummary: latestSnap?.summary || sit.summary,
      timeline,
      changesSinceLastReview: latestSnap ? [latestSnap.summary] : ["Initial review."],
      durationDays,
      previousOccurrencesCount: timeline.filter((t) => t.status === "RESOLVED").length,
    });
  }

  return analyses;
}
