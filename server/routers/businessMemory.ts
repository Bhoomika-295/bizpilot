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
import { getBusinessPatterns, detectAndUpsertPatterns, getConditionAwarePatternDetail } from "../services/patternIntelligenceService";
import {
  getOrganizationalLearningSnapshot,
  extractLessonsFromLearningLoop,
  validateBusinessMemoryLesson,
  type LessonValidationStatus,
} from "../services/organizationalLearningService";

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

  getOrganizationalLearning: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional().default(100), query: z.string().trim().max(200).optional() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await getOrganizationalLearningSnapshot(input.businessId, { limit: input.limit, query: input.query });
    }),

  refreshLearningLoop: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      const lessons = await extractLessonsFromLearningLoop(input.businessId);
      await detectAndUpsertPatterns(input.businessId);
      return { lessonsCreatedOrReused: lessons.length, snapshot: await getOrganizationalLearningSnapshot(input.businessId) };
    }),

  reviewLesson: protectedProcedure
    .input(z.object({
      businessId: z.number().int().positive(),
      memoryId: z.number().int().positive(),
      validationStatus: z.enum(["NEW", "SUPPORTED", "REPEATED", "CONTRADICTED", "SUPERSEDED", "UNKNOWN"]),
      newEvidence: z.string().trim().max(2000).optional(),
      conflictDescription: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await validateBusinessMemoryLesson(
        input.businessId,
        input.memoryId,
        input.validationStatus as LessonValidationStatus,
        input.newEvidence,
        input.conflictDescription,
      );
    }),

  getPatternDetail: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive(), patternId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessMemoryAccess(ctx.user, input.businessId);
      return await getConditionAwarePatternDetail(input.businessId, input.patternId);
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
