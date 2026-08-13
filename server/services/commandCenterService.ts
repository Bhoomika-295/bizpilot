import {
  getActionPlanById,
  getActionPlansForBusiness,
  getAllDecisionCandidates,
  getBusinessMemoriesForBusiness,
  getBusinessSituations,
  getLatestStrategyHealthSnapshot,
  getAttentionItemById,
  getBusinessSituationById,
  getForesightSignalsForBusiness,
  getPatternIntelligenceForBusiness,
  getRecentOutcomes,
  getScenarios,
  getStrategyById,
  getStrategies,
  getRootCauseInvestigations,
} from "../db";
import { getAttentionQueueForBusiness } from "./businessAttentionService";
import { getActionQueueForBusiness, getExecutionRiskSummary } from "./actionPlanService";
import { getDecisionQueue, getDecisionDetail } from "./decisionIntelligenceService";
import { generateOrGetDailyBrief } from "./dailyBriefService";
import { getBusinessMemoryDetail } from "./businessMemoryService";
import { getOrganizationalLearningSnapshot } from "./organizationalLearningService";
import { getMonitoringAlerts } from "./continuousMonitoringService";
import { getBusinessFollowThrough } from "./intelligenceChainService";

export type CommandCenterPriorityLane = "NOW" | "NEXT" | "WATCH";
export type CommandCenterPrioritySource =
  | "ATTENTION"
  | "DECISION"
  | "ACTION"
  | "SITUATION"
  | "FORESIGHT"
  | "SCENARIO"
  | "DIAGNOSTIC";

export interface CommandCenterPriority {
  key: string;
  source: CommandCenterPrioritySource;
  sourceId: number | null;
  lane: CommandCenterPriorityLane;
  title: string;
  summary: string;
  whyNow: string;
  priority: string;
  status: string;
  freshness: string;
  evidence: string[];
}

export interface CommandCenterSnapshot {
  businessId: number;
  generatedAt: Date;
  freshness: {
    state: "FRESH" | "AGING" | "STALE" | "UNKNOWN";
    label: string;
    lastBriefAt: Date | null;
  };
  health: {
    score: number | null;
    explanation: string;
    dataBasis: string;
    hasEnoughData: boolean;
  };
  headline: string;
  trend: {
    state: "CHANGES_DETECTED" | "STABLE" | "UNKNOWN";
    summary: string;
    changeCount: number;
  };
  urgency: {
    level: "HIGH" | "MEDIUM" | "LOW";
    summary: string;
    nowCount: number;
    nextCount: number;
  };
  priorities: {
    now: CommandCenterPriority[];
    next: CommandCenterPriority[];
    watch: CommandCenterPriority[];
    total: number;
  };
  execution: {
    active: number;
    dueToday: number;
    overdue: number;
    blocked: number;
    completed: number;
    healthy: number;
    atRisk: number;
    unknown: number;
    decisionLinked: number;
    outcomeReviewPending: number;
    riskLevel: string;
    riskMessage: string;
  };
  followThrough: {
    decisionsMade: number;
    decisionsAwaitingExecution: number;
    actionsCreated: number;
    actionsCompleted: number;
    blockedActions: number;
    outcomesRecorded: number;
    outcomesAwaitingReview: number;
    lessonsCreated: number;
    highSeverityGapCount: number;
    gaps: Array<{ kind: string; title: string; explanation: string; decisionId?: number; actionId?: number; outcomeId?: number }>;
  };
  strategy: {
    state: string;
    objectivePerformance: string;
    trajectoryAlignment: string;
    summary: string;
  };
  memory: {
    recentCount: number;
    patternCount: number;
    recurringPatternCount: number;
    validatedLessonCount: number;
    contradictionCount: number;
    latestMemoryAt: Date | null;
    relevantLessons: Array<{ id: number; title: string; summary: string; sourceType: string | null; sourceId: number | null; relevance: string }>;
  };
  signals: {
    activeForesightCount: number;
    openSituationCount: number;
    pendingDecisionCount: number;
    activeScenarioCount: number;
    recentOutcomeCount: number;
  };
  diagnostics: {
    openInvestigationCount: number;
    highestConfidence: string;
    topContributor: string;
    unknownFactorCount: number;
  };
  brief: Record<string, unknown>;
}

export interface CommandCenterBrief {
  businessId: number;
  generatedAt: Date;
  opening: string;
  sections: Array<{
    key: string;
    title: string;
    summary: string;
    status: "READY" | "WATCH" | "EMPTY";
    evidence: string[];
  }>;
  decisionPrompt: string;
  sourceBriefId: number | null;
  narrativeMode: "DETERMINISTIC_FALLBACK";
}

export type CommandCenterSearchResult = {
  resultType: "MEMORY" | "PATTERN" | "DECISION" | "ACTION" | "SITUATION" | "STRATEGY" | "OUTCOME"   | "FORESIGHT"
  | "SCENARIO"
  | "DIAGNOSTIC";
  recordId: number;
  title: string;
  summary: string;
  status: string;
  relevance: number;
  href: string;
};

function asText(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function freshnessFor(lastUpdated: Date | null, now: Date): CommandCenterSnapshot["freshness"] {
  if (!lastUpdated) return { state: "UNKNOWN", label: "No verified brief timestamp", lastBriefAt: null };
  const ageHours = (now.getTime() - lastUpdated.getTime()) / 3_600_000;
  if (ageHours <= 24) return { state: "FRESH", label: "Updated within the last 24 hours", lastBriefAt: lastUpdated };
  if (ageHours <= 72) return { state: "AGING", label: "Updated within the last 3 days", lastBriefAt: lastUpdated };
  return { state: "STALE", label: "Needs a fresh review", lastBriefAt: lastUpdated };
}

function priorityFromAttention(item: any, lane: CommandCenterPriorityLane): CommandCenterPriority {
  const explanation = (() => {
    try {
      return JSON.parse(item.explanationJson || "{}");
    } catch {
      return {};
    }
  })();
  return {
    key: `attention-${item.id}`,
    source: "ATTENTION",
    sourceId: item.id ?? null,
    lane,
    title: asText(item.title, "Attention item"),
    summary: asText(item.summary, "Verified intelligence requires review."),
    whyNow: asText(explanation.summary, asText(item.summary, "Review the verified signal.")),
    priority: asText(item.priority, "MEDIUM"),
    status: asText(item.status, "ACTIVE"),
    freshness: asText(item.freshness, "UNKNOWN"),
    evidence: Array.isArray(explanation.reasons) ? explanation.reasons.slice(0, 3).map(asText) : [],
  };
}

function buildPriorities(input: {
  attention: Awaited<ReturnType<typeof getAttentionQueueForBusiness>>;
  decisions: any[];
  actions: any[];
  situations: any[];
  foresight: any[];
  scenarios: any[];
  rootCauses: any[];
}) {
  const now: CommandCenterPriority[] = input.attention.now.slice(0, 8).map((item) => priorityFromAttention(item, "NOW"));
  const next: CommandCenterPriority[] = input.attention.next.slice(0, 8).map((item) => priorityFromAttention(item, "NEXT"));
  const watch: CommandCenterPriority[] = input.attention.watch.slice(0, 8).map((item) => priorityFromAttention(item, "WATCH"));

  input.decisions.slice(0, 6).forEach((decision: any) => {
    const lane: CommandCenterPriorityLane = ["CRITICAL", "HIGH"].includes(asText(decision.priority)) ? "NOW" : "NEXT";
    const target = lane === "NOW" ? now : next;
    target.push({
      key: `decision-${decision.id}`,
      source: "DECISION",
      sourceId: decision.id ?? null,
      lane,
      title: asText(decision.title, "Decision candidate"),
      summary: asText(decision.whyMatters, "A decision is supported by verified evidence."),
      whyNow: asText(decision.recommendedNextStep, "Review evidence, consider options and trade-offs, and record human decision."),
      priority: asText(decision.priority, "MEDIUM"),
      status: asText(decision.status, "OPEN"),
      freshness: asText(decision.lastEvaluatedAt, "UNKNOWN"),
      evidence: [
        `Evidence: ${asText(decision.evidenceStrength, "MEDIUM")}`,
        `Confidence: ${asText(decision.confidence, "MEDIUM")}`,
        `Strategic Alignment: ${asText(decision.strategicAlignment, "UNKNOWN")}`
      ],
    });
  });

  input.actions.filter((action: any) => action.overdue || action.status === "BLOCKED").slice(0, 6).forEach((action: any) => {
    now.push({
      key: `action-${action.id}`,
      source: "ACTION",
      sourceId: action.id ?? null,
      lane: "NOW",
      title: asText(action.title, "Execution item"),
      summary: asText(action.description, "An execution item requires follow-through."),
      whyNow: action.overdue ? "This action is overdue." : asText(action.blockReason, "This action is blocked."),
      priority: asText(action.priority, "MEDIUM"),
      status: asText(action.status, "PROPOSED"),
      freshness: asText(action.dueBucket, "UNKNOWN"),
      evidence: [asText(action.sourceType, "MANUAL")],
    });
  });

  input.situations.filter((situation: any) => !["RESOLVED", "DISMISSED"].includes(asText(situation.status))).slice(0, 4).forEach((situation: any) => {
    if (now.some((item) => item.source === "ATTENTION" && item.title === situation.title)) return;
    const lane: CommandCenterPriorityLane = asText(situation.priority) === "HIGH" ? "NOW" : "WATCH";
    (lane === "NOW" ? now : watch).push({
      key: `situation-${situation.id}`,
      source: "SITUATION",
      sourceId: situation.id ?? null,
      lane,
      title: asText(situation.title, "Business situation"),
      summary: asText(situation.summary, "An active situation is being monitored."),
      whyNow: `Situation category: ${asText(situation.category, "Unclassified")}.`,
      priority: asText(situation.priority, "MEDIUM"),
      status: asText(situation.status, "ACTIVE"),
      freshness: asText(situation.freshnessInfo, "UNKNOWN"),
      evidence: [`${asNumber(situation.supportingCount)} supporting signals`],
    });
  });

  input.foresight.filter((signal: any) => ["ACTIVE", "WATCH", "CONFIRMED"].includes(asText(signal.status))).slice(0, 4).forEach((signal: any) => {
    watch.push({
      key: `foresight-${signal.id}`,
      source: "FORESIGHT",
      sourceId: signal.id ?? null,
      lane: "WATCH",
      title: asText(signal.title, "Foresight signal"),
      summary: asText(signal.description, asText(signal.summary, "A future-facing signal is being watched.")),
      whyNow: "Keep this signal in view as new verified evidence arrives.",
      priority: asText(signal.priority, "MEDIUM"),
      status: asText(signal.status, "WATCH"),
      freshness: asText(signal.updatedAt, "UNKNOWN"),
      evidence: [asText(signal.signalType, "FORESIGHT")],
    });
  });

  input.scenarios.filter((scenario: any) => ["ACTIVE", "UNDER_REVIEW", "SELECTED"].includes(asText(scenario.status))).slice(0, 4).forEach((scenario: any) => {
    watch.push({
      key: `scenario-${scenario.id}`,
      source: "SCENARIO",
      sourceId: scenario.id ?? null,
      lane: "WATCH",
      title: asText(scenario.title, "Scenario path"),
      summary: asText(scenario.description, asText(scenario.expectedOutcome, "A modeled future path is available for review.")),
      whyNow: asText(scenario.uncertainty, "Review the scenario assumptions and uncertainty before acting."),
      priority: asText(scenario.confidence, "MEDIUM"),
      status: asText(scenario.status, "ACTIVE"),
      freshness: asText(scenario.timeHorizon, "UNKNOWN"),
      evidence: [asText(scenario.evidenceQuality, "Evidence quality not recorded")],
    });
  });

  input.rootCauses.filter((investigation: any) => ["OPEN", "INVESTIGATING"].includes(asText(investigation.status))).slice(0, 3).forEach((investigation: any) => {
    const contributors = Array.isArray(investigation.contributors) ? investigation.contributors : [];
    const topContributor = contributors[0];
    watch.push({
      key: `diagnostic-${investigation.id ?? investigation.investigationKey}`,
      source: "DIAGNOSTIC",
      sourceId: investigation.id ?? null,
      lane: "WATCH",
      title: `WHY: ${asText(investigation.problemTitle, "Business situation")}`,
      summary: "A structured diagnostic is available with supporting evidence, counter-evidence, and unknown factors.",
      whyNow: topContributor ? `Highest-ranked contributor: ${asText(topContributor.title, "unresolved factor")}.` : "Review the evidence graph before making a causal claim.",
      priority: investigation.overallConfidence === "HIGH" ? "HIGH" : "MEDIUM",
      status: asText(investigation.status, "OPEN"),
      freshness: asText(investigation.updatedAt, "UNKNOWN"),
      evidence: [
        `Evidence strength: ${asText(investigation.evidenceStrength, "UNKNOWN")}`,
        `${Array.isArray(investigation.counterEvidence) ? investigation.counterEvidence.length : 0} counter-evidence item(s)`,
        `${Array.isArray(investigation.unknownFactors) ? investigation.unknownFactors.length : 0} unknown factor(s)`,
      ],
    });
  });

  const byPriority = (a: CommandCenterPriority, b: CommandCenterPriority) => {
    const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (rank[b.priority] || 0) - (rank[a.priority] || 0) || a.title.localeCompare(b.title);
  };
  now.sort(byPriority);
  next.sort(byPriority);
  watch.sort(byPriority);
  return { now: now.slice(0, 10), next: next.slice(0, 10), watch: watch.slice(0, 10), total: now.length + next.length + watch.length };
}

export async function getCommandCenterSnapshot(businessId: number): Promise<CommandCenterSnapshot> {
  const now = new Date();
  const brief = await generateOrGetDailyBrief(businessId, false);
  const [attention, decisions, actions, situations, strategyHealth, memories, patterns, foresight, scenarios, outcomes, monitoringAlerts, rootCauses, learningSnapshot, followThrough] = await Promise.all([
    getAttentionQueueForBusiness(businessId),
    getDecisionQueue(businessId, 10),
    getActionQueueForBusiness(businessId, now),
    getBusinessSituations(businessId),
    getLatestStrategyHealthSnapshot(businessId),
    getBusinessMemoriesForBusiness(businessId, 25),
    getPatternIntelligenceForBusiness(businessId),
    getForesightSignalsForBusiness(businessId),
    getScenarios(businessId),
    getRecentOutcomes(businessId, 10),
    getMonitoringAlerts(businessId, { limit: 10 }),
    getRootCauseInvestigations(businessId),
    getOrganizationalLearningSnapshot(businessId, { limit: 100 }),
    getBusinessFollowThrough(businessId),
  ]);

  const priorityLanes = buildPriorities({ attention, decisions, actions: actions.actions, situations, foresight, scenarios, rootCauses });
  const actionSummary = actions.summary as any;
  const briefHealth = (brief.health || {}) as any;
  const briefChanges = (brief.changes || {}) as any;
  const briefStrategy = (brief.strategyStatus || {}) as any;
  const strategyEvidence = (() => {
    try {
      const parsed = JSON.parse(strategyHealth?.evidenceSummaryJson || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const executionRisk = getExecutionRiskSummary(actions.actions as any, now);
  const executionHealth = actionSummary.executionHealth || {};
  const decisionLinkedActions = actions.actions.filter((action: any) => action.decisionId);
  const outcomeReviewPending = actions.actions.filter((action: any) => action.status === "COMPLETED" && !action.actualOutcome).length;
  const latestBriefAt = asDate(brief.updatedAt) || asDate(brief.createdAt);
  const recurringPatternCount = patterns.filter((pattern: any) => asNumber(pattern.occurrences) >= 2).length;
  const relevantLessons = learningSnapshot.lessons
    .filter((lesson) => ["HIGH", "MEDIUM"].includes(lesson.relevance.level) && ["SUPPORTED", "REPEATED", "NEW"].includes(lesson.validationStatus))
    .sort((a, b) => b.relevance.score - a.relevance.score)
    .slice(0, 3)
    .map((lesson) => ({ id: lesson.id, title: lesson.title, summary: lesson.summary, sourceType: lesson.sourceType, sourceId: lesson.sourceId, relevance: lesson.relevance.level }));
  const openInvestigations = rootCauses.filter((investigation: any) => ["OPEN", "INVESTIGATING"].includes(asText(investigation.status)));
  const contributorRows = openInvestigations.flatMap((investigation: any) => Array.isArray(investigation.contributors) ? investigation.contributors : []);
  const topContributor = contributorRows.sort((a: any, b: any) => asNumber(b.rankingScore) - asNumber(a.rankingScore))[0];
  const unknownFactorCount = openInvestigations.reduce((total: number, investigation: any) => total + (Array.isArray(investigation.unknownFactors) ? investigation.unknownFactors.length : 0), 0);
  const changeCount = asNumber(briefChanges.changesCount, Array.isArray(briefChanges.changes) ? briefChanges.changes.length : 0);
  const activeWarningsCount = monitoringAlerts.filter((alert: any) => ["NEW", "ACTIVE", "ACKNOWLEDGED"].includes(alert.status)).length;
  const urgencyLevel: CommandCenterSnapshot["urgency"]["level"] = activeWarningsCount > 0 || priorityLanes.now.length > 0 ? "HIGH" : priorityLanes.next.length > 0 ? "MEDIUM" : "LOW";

  return {
    businessId,
    generatedAt: now,
    freshness: freshnessFor(latestBriefAt, now),
    health: {
      score: briefHealth.score === null || briefHealth.score === undefined ? null : asNumber(briefHealth.score),
      explanation: asText(briefHealth.explanation, "No verified health explanation is available yet."),
      dataBasis: asText(briefHealth.dataBasis, "real"),
      hasEnoughData: Boolean(briefHealth.hasEnoughData ?? briefHealth.score !== null),
    },
    headline: asText(brief.executiveOpening, "Executive snapshot is ready for review."),
    trend: {
      state: changeCount > 0 ? "CHANGES_DETECTED" : briefChanges.changes ? "STABLE" : "UNKNOWN",
      summary: changeCount > 0 ? `${changeCount} verified business change${changeCount === 1 ? "" : "s"} surfaced in the current brief.` : "No verified business changes are currently surfaced in the brief.",
      changeCount,
    },
    urgency: {
      level: urgencyLevel,
      summary: urgencyLevel === "HIGH" ? "Now-tier items require executive review." : urgencyLevel === "MEDIUM" ? "The next decision order needs attention." : "No immediate urgency is supported by the current queue.",
      nowCount: priorityLanes.now.length,
      nextCount: priorityLanes.next.length,
    },
    priorities: priorityLanes,
    execution: {
      active: asNumber(actionSummary.active),
      dueToday: asNumber(actionSummary.dueToday),
      overdue: asNumber(actionSummary.overdue),
      blocked: asNumber(actionSummary.blocked),
      completed: asNumber(actionSummary.completed),
      healthy: asNumber(executionHealth.healthy),
      atRisk: asNumber(executionHealth.atRisk),
      unknown: asNumber(executionHealth.unknown),
      decisionLinked: decisionLinkedActions.length,
      outcomeReviewPending,
      riskLevel: asText(executionRisk.level, "LOW"),
      riskMessage: asText(executionRisk.message, "Execution risk is not elevated."),
    },
    followThrough: {
      decisionsMade: followThrough.decisionsMade,
      decisionsAwaitingExecution: followThrough.decisionsAwaitingExecution,
      actionsCreated: followThrough.actionsCreated,
      actionsCompleted: followThrough.actionsCompleted,
      blockedActions: followThrough.blockedActions,
      outcomesRecorded: followThrough.outcomesRecorded,
      outcomesAwaitingReview: followThrough.outcomesAwaitingReview,
      lessonsCreated: followThrough.lessonsCreated,
      highSeverityGapCount: followThrough.gaps.filter((gap) => gap.severity === "HIGH").length,
      gaps: followThrough.gaps.slice(0, 8).map((gap) => ({ kind: gap.kind, title: gap.title, explanation: gap.explanation, decisionId: gap.decisionId, actionId: gap.actionId, outcomeId: gap.outcomeId })),
    },
    strategy: {
      state: asText(strategyHealth?.healthState, asText(briefStrategy.healthState, "UNKNOWN")),
      objectivePerformance: asText(strategyHealth?.objectivePerformance, asText(briefStrategy.objectivePerformance, "UNKNOWN")),
      trajectoryAlignment: asText(strategyHealth?.trajectoryAlignment, "UNKNOWN"),
      summary: asText(strategyEvidence[0], asText(briefStrategy.summary, "No strategy health summary is available yet.")),
    },
    memory: {
      recentCount: memories.length,
      patternCount: patterns.length,
      recurringPatternCount,
      validatedLessonCount: learningSnapshot.metrics.validatedLessonCount,
      contradictionCount: learningSnapshot.metrics.contradictionCount,
      latestMemoryAt: asDate(memories[0]?.createdAt),
      relevantLessons,
    },
    signals: {
      activeForesightCount: foresight.filter((signal: any) => ["ACTIVE", "WATCH", "CONFIRMED"].includes(asText(signal.status))).length,
      openSituationCount: situations.filter((situation: any) => !["RESOLVED", "DISMISSED"].includes(asText(situation.status))).length,
      pendingDecisionCount: decisions.filter((decision: any) => !["DECIDED", "DISMISSED", "DEFERRED", "EXPIRED"].includes(asText(decision.status))).length,
      activeScenarioCount: scenarios.filter((scenario: any) => ["ACTIVE", "UNDER_REVIEW", "SELECTED"].includes(asText(scenario.status))).length,
      recentOutcomeCount: outcomes.length,
    },
    diagnostics: {
      openInvestigationCount: openInvestigations.length,
      highestConfidence: asText(openInvestigations[0]?.overallConfidence, "UNKNOWN"),
      topContributor: asText(topContributor?.title, "No ranked contributor available"),
      unknownFactorCount,
    },
    brief: brief as Record<string, unknown>,
  };
}

export function buildCommandCenterBriefSections(snapshot: CommandCenterSnapshot): CommandCenterBrief["sections"] {
  const hasNow = snapshot.priorities.now.length > 0;
  const validatedLessonCount = snapshot.memory.validatedLessonCount ?? 0;
  const contradictionCount = snapshot.memory.contradictionCount ?? 0;
  const relevantLessons = snapshot.memory.relevantLessons ?? [];
  const hasMemory = snapshot.memory.recentCount > 0 || snapshot.memory.patternCount > 0 || validatedLessonCount > 0;
  const activeWarnings = (snapshot.signals as any).activeEarlyWarningsCount || 0;
  const diagnostics = snapshot.diagnostics ?? { openInvestigationCount: 0, highestConfidence: "UNKNOWN", topContributor: "No ranked contributor available", unknownFactorCount: 0 };
  const openDiagnostics = diagnostics.openInvestigationCount;
  return [
      {
        key: "diagnostics",
        title: "Root-cause diagnostics",
        summary: openDiagnostics > 0 ? `${openDiagnostics} structured WHY investigation${openDiagnostics === 1 ? " is" : "s are"} available. Review contributors, counter-evidence, and unknowns before acting.` : "No open root-cause investigation is currently recorded.",
        status: openDiagnostics > 0 ? "WATCH" : "EMPTY",
        evidence: [diagnostics.topContributor, `${diagnostics.unknownFactorCount} unknown factor(s)`],
      },
      {
        key: "early_warnings",
        title: "Early warnings",
        summary: activeWarnings > 0 ? `${activeWarnings} early warning${activeWarnings === 1 ? "" : "s"} require executive attention.` : "No active early warnings require attention.",
        status: activeWarnings > 0 ? "WATCH" : "READY",
        evidence: [`${activeWarnings} active early warning(s)`, snapshot.trend.summary],
      },
      {
        key: "summary",
        title: "Executive summary",
        summary: snapshot.headline,
        status: snapshot.health.hasEnoughData ? "READY" : "EMPTY",
        evidence: [`Health: ${snapshot.health.score === null ? "not available" : snapshot.health.score}`, `Freshness: ${snapshot.freshness.state}`],
      },
      {
        key: "changes",
        title: "What changed",
        summary: snapshot.trend.summary,
        status: snapshot.trend.changeCount > 0 ? "WATCH" : snapshot.trend.state === "STABLE" ? "READY" : "EMPTY",
        evidence: [`${snapshot.trend.changeCount} verified change${snapshot.trend.changeCount === 1 ? "" : "s"}`],
      },
      {
        key: "matters",
        title: "What matters now",
        summary: hasNow ? `${snapshot.priorities.now.length} Now-tier items require executive review.` : "No Now-tier items are currently supported by the verified queue.",
        status: hasNow ? "WATCH" : "READY",
        evidence: snapshot.priorities.now.slice(0, 3).map((item) => item.title),
      },
      {
        key: "future",
        title: "What could happen",
        summary: snapshot.signals.activeScenarioCount || snapshot.signals.activeForesightCount ? `${snapshot.signals.activeScenarioCount} active scenario path${snapshot.signals.activeScenarioCount === 1 ? "" : "s"} and ${snapshot.signals.activeForesightCount} foresight signal${snapshot.signals.activeForesightCount === 1 ? "" : "s"} are available for review.` : "No active scenario or foresight path is currently recorded.",
        status: snapshot.signals.activeScenarioCount || snapshot.signals.activeForesightCount ? "WATCH" : "EMPTY",
        evidence: snapshot.priorities.watch.filter((item) => item.source === "SCENARIO" || item.source === "FORESIGHT").slice(0, 3).map((item) => item.title),
      },
      {
        key: "decisions",
        title: "Decisions required",
        summary: snapshot.signals.pendingDecisionCount > 0 ? `${snapshot.signals.pendingDecisionCount} decision candidate${snapshot.signals.pendingDecisionCount === 1 ? "" : "s"} require executive attention based on worsening or recurring evidence.` : "No pending decision candidates require immediate review.",
        status: snapshot.signals.pendingDecisionCount > 0 ? "WATCH" : "EMPTY",
        evidence: snapshot.priorities.now.concat(snapshot.priorities.next).filter((item) => item.source === "DECISION").slice(0, 3).map((item) => `${item.title} (${item.whyNow})`),
      },
      {
        key: "actions",
        title: "Actions required",
        summary: snapshot.execution.overdue > 0 || snapshot.execution.blocked > 0 || snapshot.execution.atRisk > 0 ? snapshot.execution.riskMessage : `${snapshot.execution.active} active action${snapshot.execution.active === 1 ? "" : "s"} remain in the execution queue.`,
        status: snapshot.execution.overdue > 0 || snapshot.execution.blocked > 0 || snapshot.execution.atRisk > 0 ? "WATCH" : snapshot.execution.active > 0 ? "READY" : "EMPTY",
        evidence: [`${snapshot.execution.active} active`, `${snapshot.execution.overdue} overdue`, `${snapshot.execution.blocked} blocked`, `${snapshot.execution.atRisk} at risk`, `${snapshot.execution.decisionLinked} decision-linked`],
      },
      {
        key: "learning",
        title: "What we learned",
        summary: hasMemory ? `${validatedLessonCount} validated lesson${validatedLessonCount === 1 ? "" : "s"} and ${snapshot.memory.recurringPatternCount} recurring pattern${snapshot.memory.recurringPatternCount === 1 ? "" : "s"} are available as context for the next decision.` : "No retained memory or recurring pattern is available for this business yet.",
        status: hasMemory ? "READY" : "EMPTY",
        evidence: [`${snapshot.memory.recentCount} memories`, `${validatedLessonCount} validated lessons`, `${contradictionCount} contradiction${contradictionCount === 1 ? "" : "s"} to review`],
      },
  ];
}

export async function getCommandCenterBrief(businessId: number): Promise<CommandCenterBrief> {
  const [snapshot, brief] = await Promise.all([getCommandCenterSnapshot(businessId), generateOrGetDailyBrief(businessId, false)]);
  const hasNow = snapshot.priorities.now.length > 0;
  return {
    businessId,
    generatedAt: new Date(),
    opening: snapshot.headline,
    sections: buildCommandCenterBriefSections(snapshot),
    decisionPrompt: hasNow ? "Which Now-tier item should receive an owner and a next review time?" : "What new verified evidence should change the current executive priority order?",
    sourceBriefId: typeof brief.id === "number" ? brief.id : null,
    narrativeMode: "DETERMINISTIC_FALLBACK",
  };
}

export function normalizeCommandCenterQuery(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 12);
}

export function scoreCommandCenterMatch(tokens: string[], title: string, summary: string) {
  const titleText = title.toLowerCase();
  const summaryText = summary.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (titleText.includes(token)) score += 5;
    if (summaryText.includes(token)) score += 2;
  }
  return score;
}

export async function searchCommandCenter(businessId: number, query: string, limit = 12): Promise<CommandCenterSearchResult[]> {
  const tokens = normalizeCommandCenterQuery(query);
  if (!tokens.length) return [];
  const [memories, patterns, decisions, actions, situations, strategies, outcomes, foresight, scenarios, rootCauses] = await Promise.all([
    getBusinessMemoriesForBusiness(businessId, 100),
    getPatternIntelligenceForBusiness(businessId),
    getAllDecisionCandidates(businessId),
    getActionPlansForBusiness(businessId),
    getBusinessSituations(businessId),
    getStrategies(businessId),
    getRecentOutcomes(businessId, 100),
    getForesightSignalsForBusiness(businessId),
    getScenarios(businessId),
    getRootCauseInvestigations(businessId),
  ]);
  const results: CommandCenterSearchResult[] = [];
  const add = (resultType: CommandCenterSearchResult["resultType"], row: any, title: string, summary: string, status: string, href: string) => {
    const relevance = scoreCommandCenterMatch(tokens, title, summary);
    if (relevance > 0 && row?.id) results.push({ resultType, recordId: Number(row.id), title, summary, status, relevance, href });
  };
  memories.forEach((row: any) => add("MEMORY", row, asText(row.title, asText(row.memoryType, "Business memory")), asText(row.summary, asText(row.description, "")), asText(row.status, "RECORDED"), `/memory/${businessId}`));
  patterns.forEach((row: any) => add("PATTERN", row, asText(row.title, "Recurring pattern"), asText(row.description, ""), asText(row.status, "DETECTED"), `/memory/${businessId}`));
  decisions.forEach((row: any) => add("DECISION", row, asText(row.title, "Decision candidate"), asText(row.whyMatters, ""), asText(row.status, "OPEN"), `/dashboard/${businessId}`));
  actions.forEach((row: any) => add("ACTION", row, asText(row.title, "Action plan"), asText(row.description, ""), asText(row.status, "PROPOSED"), `/actions/${businessId}`));
  situations.forEach((row: any) => add("SITUATION", row, asText(row.title, "Business situation"), asText(row.summary, ""), asText(row.status, "ACTIVE"), `/dashboard/${businessId}`));
  strategies.forEach((row: any) => add("STRATEGY", row, asText(row.objective, "Strategy"), asText(row.expectedOutcome, asText(row.lessonsLearned, "")), asText(row.status, "planning"), `/dashboard/${businessId}`));
  outcomes.forEach((row: any) => add("OUTCOME", row, asText(row.metric, "Outcome"), asText(row.notes, ""), "RECORDED", `/dashboard/${businessId}`));
  foresight.forEach((row: any) => add("FORESIGHT", row, asText(row.title, "Foresight signal"), asText(row.description, asText(row.summary, "")), asText(row.status, "WATCH"), `/dashboard/${businessId}`));
  scenarios.forEach((row: any) => add("SCENARIO", row, asText(row.title, "Scenario path"), asText(row.description, asText(row.expectedOutcome, "")), asText(row.status, "ACTIVE"), `/dashboard/${businessId}`));
  rootCauses.forEach((row: any) => add("DIAGNOSTIC", row, `WHY: ${asText(row.problemTitle, "Root-cause investigation")}`, asText(row.problemDescription, "Evidence-backed diagnostic"), asText(row.status, "OPEN"), `/why/${businessId}`));
  return results.sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title)).slice(0, Math.min(Math.max(limit, 1), 25));
}

export type CommandCenterTraceSourceType = CommandCenterSearchResult["resultType"] | "ATTENTION";

export interface CommandCenterInsightDetail {
  businessId: number;
  sourceType: CommandCenterTraceSourceType;
  sourceId: number;
  title: string;
  summary: string;
  status: string;
  whyNow: string;
  evidence: string[];
  chain: Array<{ stage: "SOURCE" | "DATA" | "SIGNAL" | "SITUATION" | "TREND" | "FORESIGHT" | "STRATEGY" | "DECISION" | "ACTION" | "INTERPRETATION" | "OUTCOME"; label: string; recordId: number | null }>;
}

export async function getCommandCenterInsightDetail(
  businessId: number,
  sourceType: CommandCenterTraceSourceType,
  sourceId: number,
): Promise<CommandCenterInsightDetail | null> {
  let record: any = null;
  let outcomeCount = 0;

  switch (sourceType) {
    case "ATTENTION":
      record = await getAttentionItemById(businessId, sourceId);
      break;
    case "DECISION": {
      const detail = await getDecisionDetail(businessId, sourceId);
      record = detail?.decision || null;
      outcomeCount = detail?.events?.filter((event: any) => String(event.eventType || "").includes("OUTCOME")).length || 0;
      break;
    }
    case "ACTION":
      record = await getActionPlanById(businessId, sourceId);
      break;
    case "SITUATION":
      record = await getBusinessSituationById(sourceId);
      if (record && Number(record.businessId) !== businessId) record = null;
      break;
    case "STRATEGY":
      record = await getStrategyById(businessId, sourceId);
      break;
    case "MEMORY":
      record = await getBusinessMemoryDetail(businessId, sourceId);
      break;
    case "PATTERN":
      record = (await getPatternIntelligenceForBusiness(businessId)).find((item: any) => Number(item.id) === sourceId) || null;
      break;
    case "OUTCOME":
      record = (await getRecentOutcomes(businessId, 200)).find((item: any) => Number(item.id) === sourceId) || null;
      break;
    case "FORESIGHT":
      record = (await getForesightSignalsForBusiness(businessId)).find((item: any) => Number(item.id) === sourceId) || null;
      break;
    case "SCENARIO":
      record = (await getScenarios(businessId)).find((item: any) => Number(item.id) === sourceId) || null;
      break;
    case "DIAGNOSTIC":
      record = (await getRootCauseInvestigations(businessId)).find((item: any) => Number(item.id) === sourceId) || null;
      break;
  }

  if (!record) return null;

  const title = asText(record.title, asText(record.objective, asText(record.metric, `${sourceType} record #${sourceId}`)));
  const summary = asText(record.summary, asText(record.description, asText(record.whyMatters, asText(record.expectedOutcome, asText(record.notes, "Verified record available for review.")))));
  const status = asText(record.status, asText(record.lifecycleStatus, "RECORDED"));
  const whyNow = asText(record.whyNow, asText(record.rationale, asText(record.whyMatters, asText(record.explanation, "Review the source record and its current status before changing priority."))));
  const evidence = [
    record.sourceType ? `Source type: ${record.sourceType}` : null,
    record.sourceId ? `Source record: #${record.sourceId}` : null,
    record.priority ? `Priority: ${record.priority}` : null,
    record.dueDate ? `Due: ${asText(record.dueDate)}` : null,
    outcomeCount > 0 ? `${outcomeCount} outcome-linked event${outcomeCount === 1 ? "" : "s"}` : null,
  ].filter((value): value is string => Boolean(value));

  const chain: CommandCenterInsightDetail["chain"] = [{ stage: "SOURCE", label: `${sourceType} record #${sourceId}`, recordId: sourceId }];
  const sourceStage = sourceType === "OUTCOME" ? "DATA" : sourceType === "FORESIGHT" ? "FORESIGHT" : sourceType === "ATTENTION" ? "SIGNAL" : sourceType;
  chain.push({ stage: sourceStage as CommandCenterInsightDetail["chain"][number]["stage"], label: title, recordId: sourceId });
  chain.push({ stage: "INTERPRETATION", label: whyNow, recordId: sourceId });
  if (outcomeCount > 0) chain.push({ stage: "OUTCOME", label: `${outcomeCount} outcome-linked event${outcomeCount === 1 ? "" : "s"} recorded`, recordId: sourceId });

  return {
    businessId,
    sourceType,
    sourceId,
    title,
    summary,
    status,
    whyNow,
    evidence,
    chain,
  };
}
