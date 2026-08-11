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
import { getMarketSignals } from "../db";
import { refreshMarketSignalsForBusiness } from "../services/marketSignalService";
import {
  generateStrategyRecommendations,
  setStrategyRecommendationStatus,
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
});
