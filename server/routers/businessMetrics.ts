import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateBusinessMetrics,
  calculateBusinessHealthScore,
  detectBusinessChanges,
  getDataFreshness,
  generateBusinessIntelligenceBriefing,
} from "../services/businessMetricEngine";
import {
  getBusinessDataBasis,
  verifyBusinessOwnership,
} from "../services/businessDataService";
import { getMarketSignals, getBusinessSituations, updateBusinessSituationStatus } from "../db";
import { evaluateAndUpsertBusinessSituations } from "../services/businessSituationEngine";
import { evaluateAndRecordSituationSnapshots, getBusinessSituationTrends } from "../services/situationTrendService";
import { getDecisionPrioritiesForTenant, evaluateAndUpsertDecisionPriorities } from "../services/decisionPriorityEngine";
import { reevaluateTenantStrategies, getAdaptiveStrategyTimeline } from "../services/adaptiveStrategyService";
import { simulateAndCreateScenario } from "../services/scenarioService";
import { getScenarios, getScenarioById, deleteScenario, getOpportunities, getOpportunityById, updateOpportunityStatus } from "../db";
import { evaluateAndDetectOpportunities } from "../services/opportunityService";
import { evaluateCompetitorIntelligence } from "../services/competitiveIntelligenceService";
import {
  getDecisionQueue,
  getDecisionDetail,
  getDecisionHistory,
  refreshDecisionCandidates,
  updateDecisionLifecycle,
  linkDecisionOutcome,
} from "../services/decisionIntelligenceService";
import { getOutcomeByIdForBusiness, getMonitoringPreference, upsertMonitoringPreference } from "../db";
import {
  evaluateBusinessChanges,
  getMonitoringAlerts,
  getMonitoringAlertDetail,
  getMonitoringHistory,
  updateMonitoringAlertStatus,
} from "../services/continuousMonitoringService";
import { refreshMarketSignalsForBusiness } from "../services/marketSignalService";
import {
  getCrossSignalIntelligence,
  refreshCrossSignalIntelligence,
  getCrossSignalRelationshipDetail,
  getCrossSignalClusterDetail,
  getRelatedCrossSignalEvidence,
  updateCrossSignalRelationshipStatus,
} from "../services/crossSignalIntelligenceService";
import {
  generateStrategyRecommendations,
  setStrategyRecommendationStatus,
  recordRecommendationOutcome,
  getStrategyPerformanceAnalytics,
} from "../services/strategyCopilotService";
import {
  getBusinessTrajectoryIntelligence,
  getBusinessTrajectoryDetail,
  refreshBusinessTrajectory,
  getForecastHistory,
  recordForecastActual,
} from "../services/businessTrajectoryService";
import {
  compareScenarioPathsForBusiness,
  createAlternativeScenario,
  createBaselineScenario,
  createScenarioDecisionDraft,
  getScenarioPathDetailWithContext,
  getScenarioPathComparison,
  listScenarioPaths,
  listScenarioPathComparisons,
  refreshScenarioMonitoring,
  refreshScenarioPathComparison,
  updateScenarioAssumptions,
  updateScenarioLifecycle,
  attachScenarioOutcome,
} from "../services/scenarioPathService";

/**
 * Business Metrics Router
 * 
 * Provides endpoints for calculating and retrieving business metrics.
 * All endpoints verify business ownership before returning data.
 */

const scenarioAssumptionSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  value: z.string().max(1000),
  evidence: z.array(z.string().max(1000)).max(20).optional(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]).optional(),
  invalidationSignal: z.string().max(240).optional(),
});

const scenarioPathInputSchema = z.object({
  businessId: z.number(),
  title: z.string().min(1).max(240),
  pathKey: z.string().max(120).optional(),
  objective: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  scenarioType: z.string().max(80).optional(),
  actions: z.array(z.string().max(500)).max(20).optional(),
  assumptions: z.array(scenarioAssumptionSchema).max(30),
  affectedAreas: z.array(z.string().max(120)).max(20).optional(),
  expectedDirection: z.record(z.string(), z.string().max(120)).optional(),
  expectedOutcome: z.string().max(1000).optional(),
  timeHorizon: z.string().max(120).optional(),
});

async function requireMetricsBusinessAccess(userId: number, businessId: number) {
  try {
    return await verifyBusinessOwnership(userId, businessId);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  }
}

export const businessMetricsRouter = router({
  /**
   * Get metrics for a business in a given period
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.date(),
        periodEndDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);

      const metrics = await calculateBusinessMetrics(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate
      );

      return metrics;
    }),

  /**
   * Get business health score
   */
  getHealthScore: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.date(),
        periodEndDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);

      const business = await verifyBusinessOwnership(ctx.user.id, input.businessId);
      const dataBasis = await getBusinessDataBasis(business);

      const metrics = await calculateBusinessMetrics(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate
      );

      const score = await calculateBusinessHealthScore(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate,
        dataBasis
      );

      return score;
    }),

  /**
   * Get data freshness indicator status
   */
  getDataFreshness: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getDataFreshness(input.businessId);
    }),

  /**
   * Get internal business changes
   */
  getChanges: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.date(),
        periodEndDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const metrics = await calculateBusinessMetrics(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate
      );
      return detectBusinessChanges(metrics);
    }),

  /**
   * Get Intelligent Business Briefing
   */
  getBriefing: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.date(),
        periodEndDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const metrics = await calculateBusinessMetrics(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate
      );
      const changes = detectBusinessChanges(metrics);
      return generateBusinessIntelligenceBriefing(metrics, changes);
    }),

  /**
   * Get multi-period business metrics, previous comparison, and health score
   */
  getMetricsMultiPeriod: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);

      const business = await verifyBusinessOwnership(ctx.user.id, input.businessId);
      const dataBasis = await getBusinessDataBasis(business);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [currentMetrics, previousMetrics, healthScore] = await Promise.all([
        calculateBusinessMetrics(input.businessId, thirtyDaysAgo, now),
        calculateBusinessMetrics(input.businessId, sixtyDaysAgo, thirtyDaysAgo),
        calculateBusinessHealthScore(
          input.businessId,
          thirtyDaysAgo,
          now,
          dataBasis
        ),
      ]);

      return {
        current: currentMetrics,
        previous: previousMetrics,
        healthScore,
      };
    }),

  /**
   * Get market signals for a business
   */
  getMarketSignals: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const signals = await getMarketSignals(input.businessId);
      return {
        signals,
        lastUpdated: signals.length > 0 ? signals[0].discoveredAt : null,
      };
    }),

  /**
   * Refresh market signals for a business by fetching from external provider
   */
  refreshMarketSignals: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      try {
        const result = await refreshMarketSignalsForBusiness(input.businessId);
        const signals = await getMarketSignals(input.businessId);
        return {
          success: result.success,
          message: result.message,
          signalCount: result.signalCount,
          signals,
          lastUpdated: signals.length > 0 ? signals[0].discoveredAt : null,
        };
      } catch (error) {
        console.error("[MarketSignals Router] Refresh error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Market signals temporarily unavailable.",
        });
      }
    }),

  /**
   * Get Strategy Copilot recommendations and briefing
   */
  getStrategyBriefing: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.date(),
        periodEndDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await generateStrategyRecommendations(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate
      );
    }),

  /**
   * Update Strategy Recommendation Status (OPEN, COMPLETED, DISMISSED)
   */
  updateStrategyStatus: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        recommendationId: z.number(),
        status: z.enum(["OPEN", "COMPLETED", "DISMISSED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      await setStrategyRecommendationStatus(input.recommendationId, input.status);
      return { success: true };
    }),

  /**
   * Record or update recommendation outcome and optional notes/metrics
   */
  recordOutcome: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        recommendationId: z.number(),
        outcomeStatus: z.enum(["Positive", "Neutral", "Negative", "Unknown"]),
        outcomeNote: z.string().optional(),
        metricBefore: z.number().optional(),
        metricAfter: z.number().optional(),
        observedChange: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      await recordRecommendationOutcome(input.recommendationId, {
        outcomeStatus: input.outcomeStatus,
        outcomeNote: input.outcomeNote,
        metricBefore: input.metricBefore,
        metricAfter: input.metricAfter,
        observedChange: input.observedChange,
      });
      return { success: true };
    }),

  /**
   * Get strategy performance summary and historical insights
   */
  getPerformanceAnalytics: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getStrategyPerformanceAnalytics(input.businessId);
    }),

  /**
   * Get evaluated business situations for the active period
   */
  getBusinessSituations: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.string().optional(),
        periodEndDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const start = input.periodStartDate ? new Date(input.periodStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input.periodEndDate ? new Date(input.periodEndDate) : new Date();
      return await evaluateAndUpsertBusinessSituations(input.businessId, start, end);
    }),

  /**
   * Get situation trend analyses and historical timelines (Day 14)
   */
  getSituationTrends: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.string().optional(),
        periodEndDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const start = input.periodStartDate ? new Date(input.periodStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input.periodEndDate ? new Date(input.periodEndDate) : new Date();
      return await evaluateAndRecordSituationSnapshots(input.businessId, start, end);
    }),

  /**
   * Get single business situation by ID with ownership verification
   */
  getBusinessSituationById: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        situationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const list = await getBusinessSituations(input.businessId);
      const found = list.find((s: any) => s.id === input.situationId);
      if (!found) {
        throw new Error("Business situation not found or unauthorized");
      }
      return found;
    }),

  /**
   * Update business situation lifecycle status
   */
  updateBusinessSituationStatus: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        situationId: z.number(),
        status: z.enum(["ACTIVE", "MONITORING", "RESOLVED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      await updateBusinessSituationStatus(input.situationId, input.status);
      return { success: true };
    }),

  /**
   * Get decision priorities and Today's Strategic Focus
   */
  getDecisionPriorities: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.string().optional(),
        periodEndDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const start = input.periodStartDate ? new Date(input.periodStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input.periodEndDate ? new Date(input.periodEndDate) : new Date();
      return await evaluateAndUpsertDecisionPriorities(input.businessId, start, end);
    }),

  /**
   * Get single decision priority detail
   */
  getDecisionPriorityDetail: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        priorityId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const list = await getDecisionPrioritiesForTenant(input.businessId);
      const found = list.find((p) => p.id === input.priorityId);
      if (!found) {
        throw new Error("Decision priority not found or unauthorized");
      }
      return found;
    }),

  /**
   * Reevaluate tenant strategies against changing context (Day 16)
   */
  reevaluateStrategies: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        periodStartDate: z.string().optional(),
        periodEndDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const start = input.periodStartDate ? new Date(input.periodStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input.periodEndDate ? new Date(input.periodEndDate) : new Date();
      return await reevaluateTenantStrategies(input.businessId, start, end);
    }),

  /**
   * Get adaptive strategy evolution timeline and state (Day 16)
   */
  getAdaptiveStrategyTimeline: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getAdaptiveStrategyTimeline(input.businessId);
    }),

  /**
   * Get all scenarios for business (Day 17)
   */
  getScenarios: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getScenarios(input.businessId);
    }),

  /**
   * Get single scenario by ID (Day 17)
   */
  getScenarioById: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        scenarioId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const scenario = await getScenarioById(input.businessId, input.scenarioId);
      if (!scenario) {
        throw new Error("Scenario not found or unauthorized");
      }
      return scenario;
    }),

  /**
   * Create and simulate a new scenario (Day 17)
   */
  createScenario: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        scenarioType: z.string(),
        assumptions: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await simulateAndCreateScenario(input.businessId, {
        title: input.title,
        description: input.description,
        scenarioType: input.scenarioType as any,
        assumptions: input.assumptions,
      });
    }),

  /**
   * Delete a scenario (Day 17)
   */
  deleteScenario: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        scenarioId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await deleteScenario(input.businessId, input.scenarioId);
    }),

  /**
   * Opportunity Intelligence Procedures (Day 18)
   */
  getOpportunities: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await evaluateAndDetectOpportunities(input.businessId);
    }),

  getOpportunityById: protectedProcedure
    .input(z.object({ businessId: z.number(), opportunityId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getOpportunityById(input.businessId, input.opportunityId);
    }),

  updateOpportunityStatus: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        opportunityId: z.number(),
        status: z.enum(["NEW", "ACTIVE", "MONITORING", "PURSUED", "DISMISSED", "EXPIRED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await updateOpportunityStatus(input.businessId, input.opportunityId, input.status);
    }),

  /**
   * Competitive Strategy Intelligence v2 Procedures (Day 19)
   */
  getCompetitorIntelligence: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await evaluateCompetitorIntelligence(input.businessId);
    }),

  /**
   * Decision Intelligence Procedures (Day 20)
   */
  getDecisionQueue: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().int().min(1).max(7).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getDecisionQueue(input.businessId, input.limit);
    }),
  getDecisionDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getDecisionDetail(input.businessId, input.decisionId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
      return result;
    }),
  refreshDecisionQueue: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await refreshDecisionCandidates(input.businessId);
    }),
  updateDecisionStatus: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number().int().positive(), status: z.enum(["OPEN", "IN_REVIEW", "DECIDED", "DEFERRED", "DISMISSED", "EXPIRED"]), details: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      try {
        const result = await updateDecisionLifecycle(input.businessId, input.decisionId, input.status, input.details);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid decision status transition." });
      }
    }),
  getDecisionHistory: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number().int().positive(), limit: z.number().int().min(1).max(50).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getDecisionHistory(input.businessId, input.decisionId, input.limit);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
      return result;
    }),
  linkDecisionOutcome: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number().int().positive(), outcomeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const outcome = await getOutcomeByIdForBusiness(input.businessId, input.outcomeId);
      if (!outcome) throw new TRPCError({ code: "NOT_FOUND", message: "Outcome not found for this business." });
      const result = await linkDecisionOutcome(input.businessId, input.decisionId, input.outcomeId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
      return result;
    }),
  /**
   * Continuous Monitoring & Intelligence Alerts v1 Procedures (Day 22)
   */
  getMonitoringAlerts: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().int().min(1).max(100).optional(), status: z.enum(["NEW", "ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).optional(), eventType: z.string().max(60).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getMonitoringAlerts(input.businessId, { limit: input.limit, status: input.status, eventType: input.eventType });
    }),
  getMonitoringAlertDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), eventId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getMonitoringAlertDetail(input.businessId, input.eventId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Monitoring alert not found." });
      return result;
    }),
  refreshMonitoringAlerts: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await evaluateBusinessChanges(input.businessId);
    }),
  updateMonitoringAlertStatus: protectedProcedure
    .input(z.object({ businessId: z.number(), eventId: z.number().int().positive(), status: z.enum(["NEW", "ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]), details: z.string().max(2000).optional(), dismissalReason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      try {
        const result = await updateMonitoringAlertStatus(input.businessId, input.eventId, input.status, input.details, input.dismissalReason);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Monitoring alert not found." });
        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid monitoring alert status transition." });
      }
    }),
  getMonitoringHistory: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getMonitoringHistory(input.businessId, input.limit);
    }),
  getMonitoringPreferences: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getMonitoringPreference(input.businessId);
    }),
  updateMonitoringPreferences: protectedProcedure
    .input(z.object({ businessId: z.number(), enabledCategories: z.array(z.string().max(60)).max(20).optional(), minimumPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"), minimumSeverity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW") }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await upsertMonitoringPreference({ businessId: input.businessId, enabledCategoriesJson: input.enabledCategories ? JSON.stringify(input.enabledCategories) : null, minimumPriority: input.minimumPriority, minimumSeverity: input.minimumSeverity });
    }),
  /**
   * Cross-Signal Intelligence & Relationship Analysis v1 Procedures (Day 23)
   */
  getCrossSignalIntelligence: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getCrossSignalIntelligence(input.businessId, input.limit);
    }),
  refreshCrossSignalIntelligence: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await refreshCrossSignalIntelligence(input.businessId);
    }),
  getCrossSignalRelationshipDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), relationshipId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getCrossSignalRelationshipDetail(input.businessId, input.relationshipId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Signal relationship not found." });
      return result;
    }),
  getCrossSignalClusterDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), clusterId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getCrossSignalClusterDetail(input.businessId, input.clusterId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Signal cluster not found." });
      return result;
    }),
  getRelatedCrossSignalEvidence: protectedProcedure
    .input(z.object({ businessId: z.number(), entityType: z.enum(["SITUATION", "OPPORTUNITY", "DECISION", "STRATEGY", "OUTCOME", "MONITORING"]), entityId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getRelatedCrossSignalEvidence(input.businessId, input.entityType, input.entityId);
    }),
  updateCrossSignalRelationshipStatus: protectedProcedure
    .input(z.object({ businessId: z.number(), relationshipId: z.number().int().positive(), status: z.enum(["NEW", "ACTIVE", "WEAKENING", "RESOLVED"]), details: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      try {
        const result = await updateCrossSignalRelationshipStatus(input.businessId, input.relationshipId, input.status, input.details);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Signal relationship not found." });
        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid signal relationship status transition." });
      }
    }),
  /**
   * Business Trajectory & Early-Warning Forecasting v1 Procedures (Day 24)
   */
  getBusinessTrajectory: protectedProcedure
    .input(z.object({ businessId: z.number(), forecastWindow: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional(), refresh: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getBusinessTrajectoryIntelligence(input.businessId, { forecastWindow: input.forecastWindow, refresh: input.refresh });
    }),
  refreshBusinessTrajectory: protectedProcedure
    .input(z.object({ businessId: z.number(), forecastWindow: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await refreshBusinessTrajectory(input.businessId, { forecastWindow: input.forecastWindow });
    }),
  getBusinessTrajectoryDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), trajectoryId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getBusinessTrajectoryDetail(input.businessId, input.trajectoryId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Business trajectory not found." });
      return result;
    }),
  getTrajectoryForecastHistory: protectedProcedure
    .input(z.object({ businessId: z.number(), metricKey: z.string().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return await getForecastHistory(input.businessId, input.metricKey);
    }),
  recordTrajectoryForecastActual: protectedProcedure
    .input(z.object({ businessId: z.number(), snapshotId: z.number().int().positive(), actualValue: z.number(), actualObservedAt: z.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await recordForecastActual(input.businessId, input.snapshotId, input.actualValue, input.actualObservedAt);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Forecast snapshot not found." });
      return result;
    }),
  /**
   * Strategic Scenario Simulation & Path Comparison v2 Procedures (Day 25)
   */
  getScenarioPaths: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return listScenarioPaths(input.businessId);
    }),
  createBaselineScenarioPath: protectedProcedure
    .input(scenarioPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const { businessId, ...pathInput } = input;
      return createBaselineScenario(businessId, pathInput);
    }),
  createAlternativeScenarioPath: protectedProcedure
    .input(scenarioPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const { businessId, ...pathInput } = input;
      return createAlternativeScenario(businessId, pathInput);
    }),
  getScenarioPathComparison: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioIds: z.array(z.number().int().positive()).max(20).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return getScenarioPathComparison(input.businessId, input.scenarioIds);
    }),
  refreshScenarioPathComparison: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioIds: z.array(z.number().int().positive()).max(20).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return refreshScenarioPathComparison(input.businessId, input.scenarioIds);
    }),
  compareScenarioPaths: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioIds: z.array(z.number().int().positive()).max(20).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return compareScenarioPathsForBusiness(input.businessId, input.scenarioIds);
    }),
  getScenarioPathDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await getScenarioPathDetailWithContext(input.businessId, input.scenarioId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario path not found." });
      return result;
    }),
  getScenarioPathComparisons: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().int().positive().max(50).optional() }))
    .query(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return listScenarioPathComparisons(input.businessId, input.limit);
    }),
  updateScenarioPathLifecycle: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive(), status: z.enum(["DRAFT", "ACTIVE", "UNDER_REVIEW", "SELECTED", "COMPLETED", "INVALIDATED", "ARCHIVED"]), details: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      return updateScenarioLifecycle(input.businessId, input.scenarioId, input.status, input.details);
    }),
  createScenarioDecisionDraft: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await createScenarioDecisionDraft(input.businessId, input.scenarioId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario path not found." });
      return result;
    }),
  refreshScenarioMonitoring: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await refreshScenarioMonitoring(input.businessId, input.scenarioId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario path not found." });
      return result;
    }),
  updateScenarioAssumptions: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive(), assumptions: z.array(scenarioAssumptionSchema).max(30) }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const { businessId, scenarioId, assumptions } = input;
      return updateScenarioAssumptions(businessId, scenarioId, assumptions);
    }),
  attachScenarioOutcome: protectedProcedure
    .input(z.object({ businessId: z.number(), scenarioId: z.number().int().positive(), outcomeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const result = await attachScenarioOutcome(input.businessId, input.scenarioId, input.outcomeId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario path not found." });
      return result;
    }),
});
