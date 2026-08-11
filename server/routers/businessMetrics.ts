import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateBusinessMetrics,
  calculateBusinessHealthScore,
  getDataFreshness,
} from "../services/businessMetricEngine";
import {
  getBusinessDataBasis,
  verifyBusinessOwnership,
} from "../services/businessDataService";

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
      // Verify ownership
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
      const business = await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
      const dataBasis = await getBusinessDataBasis(business);

      const healthScore = await calculateBusinessHealthScore(
        input.businessId,
        input.periodStartDate,
        input.periodEndDate,
        dataBasis
      );

      return healthScore;
    }),

  /**
   * Get data freshness information
   */
  getDataFreshness: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      await requireMetricsBusinessAccess(ctx.user.id, input.businessId);

      const freshness = await getDataFreshness(input.businessId);

      return freshness;
    }),

  /**
   * Get metrics for multiple standard periods
   * Returns: current period, previous period, and YTD
   */
  getMetricsMultiPeriod: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const business = await requireMetricsBusinessAccess(ctx.user.id, input.businessId);
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
});
