import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getBusinessMemoryTimeline,
  getBusinessMemoryDetail,
  getHistoricalContextForQuery,
  searchBusinessMemories,
  queryBusinessMemory,
} from "../services/businessMemoryService";
import { getBusinessPatterns, detectAndUpsertPatterns } from "../services/patternIntelligenceService";

import { verifyBusinessOwnership as verifyOwnedBusiness } from "../services/businessDataService";

async function requireBusinessMemoryAccess(ctxUser: { id: number }, businessId: number) {
  try {
    return await verifyOwnedBusiness(ctxUser.id, businessId);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  }
}

export const businessMemoryRouter = router({
  getTimeline: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional().default(50) }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await getBusinessMemoryTimeline(input.businessId, input.limit);
    }),

  getDetail: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), memoryId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await getBusinessMemoryDetail(input.businessId, input.memoryId);
    }),

  getHistoricalContext: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), queryType: z.string().trim().min(1).max(100), categoryOrMetric: z.string().trim().min(1).max(100).optional() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await getHistoricalContextForQuery(input.businessId, input.queryType, input.categoryOrMetric);
    }),

  getPatterns: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      await detectAndUpsertPatterns(input.businessId);
      return await getBusinessPatterns(input.businessId);
    }),

  search: protectedProcedure
    .input(
      z.object({
        businessId: z.number().int().positive(),
        query: z.string().trim().max(200).optional(),
        memoryType: z.string().trim().max(50).optional(),
        importance: z.string().trim().max(50).optional(),
        status: z.string().trim().max(50).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await searchBusinessMemories(input.businessId, {
        query: input.query,
        memoryType: input.memoryType,
        importance: input.importance,
        status: input.status,
      });
    }),

  queryAssistant: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), question: z.string().trim().min(1).max(500) }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await queryBusinessMemory(input.businessId, input.question);
    }),
});
