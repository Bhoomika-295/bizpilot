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
import { refreshMarketSignalsForBusiness } from "../services/marketSignalService";
import {
  generateStrategyRecommendations,
  setStrategyRecommendationStatus,
  recordRecommendationOutcome,
  getStrategyPerformanceAnalytics,
} from "../services/strategyCopilotService";

/**
 * Business Metrics Router
 * 
 * Provides endpoints for calculating and retrieving business metrics.
 * All endpoints verify business ownership before returning data.
 */

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
});
