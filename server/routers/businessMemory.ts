import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  getBusinessMemoryTimeline,
  getBusinessMemoryDetail,
  getHistoricalContextForQuery,
  searchBusinessMemories,
} from "../services/businessMemoryService";
import { getBusinessPatterns, detectAndUpsertPatterns } from "../services/patternIntelligenceService";

async function verifyBusinessOwnership(ctxUser: any, businessId: number) {
  if (ctxUser.role === "admin") return true;
  if (ctxUser.businessId && Number(ctxUser.businessId) === Number(businessId)) return true;
  return false;
}

export const businessMemoryRouter = router({
  getTimeline: protectedProcedure
    .input(z.object({ businessId: z.number(), limit: z.number().optional().default(50) }))
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to business memory");
      }
      return await getBusinessMemoryTimeline(input.businessId, input.limit);
    }),

  getDetail: protectedProcedure
    .input(z.object({ businessId: z.number(), memoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to business memory");
      }
      return await getBusinessMemoryDetail(input.businessId, input.memoryId);
    }),

  getHistoricalContext: protectedProcedure
    .input(z.object({ businessId: z.number(), queryType: z.string(), categoryOrMetric: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to historical context");
      }
      return await getHistoricalContextForQuery(input.businessId, input.queryType, input.categoryOrMetric);
    }),

  getPatterns: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to pattern intelligence");
      }
      await detectAndUpsertPatterns(input.businessId);
      return await getBusinessPatterns(input.businessId);
    }),

  search: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        query: z.string().optional(),
        memoryType: z.string().optional(),
        importance: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to business memory search");
      }
      return await searchBusinessMemories(input.businessId, {
        query: input.query,
        memoryType: input.memoryType,
        importance: input.importance,
        status: input.status,
      });
    }),

  queryAssistant: protectedProcedure
    .input(z.object({ businessId: z.number(), question: z.string() }))
    .query(async ({ ctx, input }) => {
      const authorized = await verifyBusinessOwnership(ctx.user, input.businessId);
      if (!authorized) {
        throw new Error("Unauthorized access to memory assistant");
      }

      const memories = await getBusinessMemoryTimeline(input.businessId, 50);
      const patterns = await getBusinessPatterns(input.businessId);

      const q = input.question.toLowerCase();
      const matchedMemories = memories.filter(
        (m) => m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q)
      );
      const matchedPatterns = patterns.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );

      if (matchedMemories.length === 0 && matchedPatterns.length === 0) {
        return {
          answer: "BizPilot does not have enough historical evidence to answer this confidently.",
          sources: [],
          patterns: [],
        };
      }

      return {
        answer: `Based on ${matchedMemories.length} historical memories and ${matchedPatterns.length} verified patterns in BizPilot business memory:`,
        sources: matchedMemories.slice(0, 3).map((m) => ({ id: m.id, title: m.title, summary: m.summary, date: m.createdAt })),
        patterns: matchedPatterns.slice(0, 3).map((p) => ({ title: p.title, occurrences: p.occurrences, lesson: p.lessonsLearned })),
      };
    }),
});
