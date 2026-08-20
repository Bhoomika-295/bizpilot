import { getDb, getForesightSignalsForBusiness, getScenarios, getBusinessTrajectories, getMarketSignals } from "../db";
import { eq, desc } from "drizzle-orm";

export type OutlookType = "ACCELERATION" | "CONTRACTION" | "SHIFT" | "DISRUPTION" | "CONSOLIDATION";
export type TimeHorizon = "NEAR_TERM" | "MID_TERM" | "LONG_TERM";
export type ProbabilityLevel = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
export type UncertaintyLevel = "HIGH" | "MODERATE" | "LOW";
export type OverallReadiness = "FULLY_PREPARED" | "ADEQUATE" | "GAPS_IDENTIFIED" | "VULNERABLE" | "UNKNOWN";

export interface ReadinessDimension {
  dimension: string;
  status: "STRONG" | "ADEQUATE" | "VULNERABLE" | "UNKNOWN";
  score: number;
  notes: string;
}

export interface ReadinessGap {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  description: string;
  recommendedMitigation: string;
}

export async function getFutureReadinessWorkspaceData(businessId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [signals, scenarioList, trajectories, marketList, existingOutlooks, existingAssessments] = await Promise.all([
    getForesightSignalsForBusiness(businessId),
    getScenarios(businessId),
    getBusinessTrajectories(businessId, { limit: 10 }),
    getMarketSignals(businessId),
    db.select().from(futureOutlooks).where(eq(futureOutlooks.businessId, businessId)).orderBy(desc(futureOutlooks.createdAt)),
    db.select().from(businessReadinessAssessments).where(eq(businessReadinessAssessments.businessId, businessId)).orderBy(desc(businessReadinessAssessments.createdAt)),
  ]);

  let outlooks = existingOutlooks;
  let assessments = existingAssessments;

  if (outlooks.length === 0) {
    const defaultOutlooks = generateDefaultOutlooks(businessId, signals, scenarioList, trajectories, marketList);
    for (const outlook of defaultOutlooks) {
      const inserted = await db.insert(futureOutlooks).values(outlook).returning();
      const insertedId = Number(inserted[0]?.id ?? 0);
      if (insertedId) {
        const createdAssessment = generateDefaultAssessment(businessId, insertedId, outlook.title);
        await db.insert(businessReadinessAssessments).values(createdAssessment);
      }
    }
    outlooks = await db.select().from(futureOutlooks).where(eq(futureOutlooks.businessId, businessId)).orderBy(desc(futureOutlooks.createdAt));
    assessments = await db.select().from(businessReadinessAssessments).where(eq(businessReadinessAssessments.businessId, businessId)).orderBy(desc(businessReadinessAssessments.createdAt));
  }

  return {
    outlooks: outlooks.map(parseOutlookRow),
    assessments: assessments.map(parseAssessmentRow),
    signalCount: signals.length,
    scenarioCount: scenarioList.length,
    trajectoryCount: trajectories.length,
  };
}

function generateDefaultOutlooks(businessId: number, signals: any[], scenarios: any[], trajectories: any[], marketList: any[]) {
  const activeSignal = signals[0];
  const activeScenario = scenarios[0];
  const primaryTrajectory = trajectories[0];

  return [
    {
      businessId,
      signalId: activeSignal?.id ?? null,
      title: activeSignal ? `Horizon Shift: ${activeSignal.title}` : "Market Demand Acceleration",
      outlookType: "ACCELERATION" as OutlookType,
      timeHorizon: "NEAR_TERM" as TimeHorizon,
      probability: "MODERATE" as ProbabilityLevel,
      uncertaintyLevel: "MODERATE" as UncertaintyLevel,
      summary: "Emerging demand patterns and trajectory momentum indicate potential acceleration in customer activity over the next quarter.",
      assumptionsJson: JSON.stringify([
        { assumption: "Current customer acquisition velocity is sustained without severe supply constraints.", provenance: "SYSTEM_DERIVED" },
        { assumption: "Market pricing tolerance remains stable against competitor pressure.", provenance: "HISTORICAL" }
      ]),
      triggersJson: JSON.stringify([
        { indicator: "Weekly order volume growth", observableCondition: "Exceeds 15% WoW growth for two consecutive weeks", status: "WATCHING" },
        { indicator: "Operating expense ratio", observableCondition: "Remains below 70% of gross revenue", status: "WATCHING" }
      ]),
      timelineJson: JSON.stringify([
        { milestone: "Initial volume inflection", timeframe: "Days 1–14" },
        { milestone: "Capacity and staffing review", timeframe: "Days 15–30" }
      ]),
      scenariosJson: JSON.stringify(activeScenario ? [activeScenario.id] : []),
      evidenceJson: JSON.stringify({
        source: "Strategic Foresight & Trajectory Intelligence",
        supportingSignals: [activeSignal?.title ?? "Core demand indicator"],
        trajectoryStatus: primaryTrajectory?.status ?? "STABLE",
      }),
      status: "ACTIVE",
    },
    {
      businessId,
      signalId: null,
      title: "Cost Structure Disruption Risk",
      outlookType: "DISRUPTION" as OutlookType,
      timeHorizon: "MID_TERM" as TimeHorizon,
      probability: "LOW" as ProbabilityLevel,
      uncertaintyLevel: "HIGH" as UncertaintyLevel,
      summary: "Macroeconomic volatility and supplier cost pressures could introduce margin compression if pricing or efficiency is not adapted.",
      assumptionsJson: JSON.stringify([
        { assumption: "Supplier price inflation persists above baseline historical averages.", provenance: "HISTORICAL" },
        { assumption: "Customer retention is sensitive to retail price adjustments.", provenance: "USER_PROVIDED" }
      ]),
      triggersJson: JSON.stringify([
        { indicator: "Vendor expense variance", observableCondition: "Expense growth outpaces revenue growth by >5%", status: "WATCHING" }
      ]),
      timelineJson: JSON.stringify([
        { milestone: "Margin review threshold", timeframe: "Days 30–60" }
      ]),
      scenariosJson: JSON.stringify([]),
      evidenceJson: JSON.stringify({
        source: "External Radar & Expense Intelligence",
        riskLevel: "MODERATE",
      }),
      status: "ACTIVE",
    }
  ];
}

function generateDefaultAssessment(businessId: number, outlookId: number, outlookTitle: string) {
  const dimensions: ReadinessDimension[] = [
    { dimension: "Strategic Alignment", status: "STRONG", score: 4, notes: "Core objectives align with current growth and operational priorities." },
    { dimension: "Operational Agility", status: "ADEQUATE", score: 3, notes: "Processes are established but require faster execution cycles during volume surges." },
    { dimension: "Resource Capacity", status: "VULNERABLE", score: 2, notes: "Staffing and working capital buffers are constrained if growth accelerates rapidly." },
    { dimension: "Risk Exposure", status: "ADEQUATE", score: 3, notes: "Monitored through early-warning alerts, but proactive hedging is limited." },
    { dimension: "Information Sufficiency", status: "STRONG", score: 4, notes: "Backed by tenant-isolated metrics, business memory, and verified evidence." }
  ];

  const gaps: ReadinessGap[] = [
    {
      title: "Resource Working Capital Buffer",
      severity: "HIGH",
      description: "Current cash flow buffer may experience strain if order volume surges past 25% projected baseline.",
      recommendedMitigation: "Review short-term receivables and establish credit or inventory staging reserves."
    }
  ];

  return {
    businessId,
    outlookId,
    title: `Readiness Assessment: ${outlookTitle}`,
    overallReadiness: "GAPS_IDENTIFIED" as OverallReadiness,
    dimensionsJson: JSON.stringify(dimensions),
    supportingEvidenceJson: JSON.stringify(["Robust customer data", "Stable core revenue trajectory", "Active monitoring alerts"]),
    limitingEvidenceJson: JSON.stringify(["Limited working capital buffer", "Manual staffing allocation"]),
    unknownFactorsJson: JSON.stringify(["Macroeconomic supply chain stability", "Competitor pricing moves"]),
    gapsJson: JSON.stringify(gaps),
    decisionImplicationsJson: JSON.stringify(["Decision required on inventory staging and working capital allocation."]),
    actionImplicationsJson: JSON.stringify(["Schedule quarterly capacity review", "Establish weekly supplier cost checks"]),
    monitoringLinksJson: JSON.stringify(["monitoring-alerts", "trajectory-revenue"]),
    status: "ACTIVE",
  };
}

function parseOutlookRow(row: any) {
  return {
    ...row,
    assumptions: safeJsonParse(row.assumptionsJson, []),
    triggers: safeJsonParse(row.triggersJson, []),
    timeline: safeJsonParse(row.timelineJson, []),
    scenarios: safeJsonParse(row.scenariosJson, []),
    evidence: safeJsonParse(row.evidenceJson, {}),
  };
}

function parseAssessmentRow(row: any) {
  return {
    ...row,
    dimensions: safeJsonParse(row.dimensionsJson, []),
    supportingEvidence: safeJsonParse(row.supportingEvidenceJson, []),
    limitingEvidence: safeJsonParse(row.limitingEvidenceJson, []),
    unknownFactors: safeJsonParse(row.unknownFactorsJson, []),
    gaps: safeJsonParse(row.gapsJson, []),
    decisionImplications: safeJsonParse(row.decisionImplicationsJson, []),
    actionImplications: safeJsonParse(row.actionImplicationsJson, []),
    monitoringLinks: safeJsonParse(row.monitoringLinksJson, []),
  };
}

function safeJsonParse(val: any, fallback: any) {
  if (!val) return fallback;
  try {
    return typeof val === "string" ? JSON.parse(val) : val;
  } catch {
    return fallback;
  }
}
