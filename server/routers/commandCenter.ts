import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { verifyBusinessOwnership } from "../services/businessDataService";
import {
  getCommandCenterBrief,
  getCommandCenterInsightDetail,
  getCommandCenterSnapshot,
  searchCommandCenter,
} from "../services/commandCenterService";

async function requireCommandCenterAccess(userId: number, businessId: number) {
  try {
    return await verifyBusinessOwnership(userId, businessId);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  }
}

export const commandCenterRouter = router({
  getSnapshot: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      return await getCommandCenterSnapshot(input.businessId);
    }),

  getExecutiveBrief: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      return await getCommandCenterBrief(input.businessId);
    }),

  getBrief: protectedProcedure
    .input(z.object({ businessId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      return await getCommandCenterBrief(input.businessId);
    }),

  globalSearch: protectedProcedure
    .input(
      z.object({
        businessId: z.number().int().positive(),
        query: z.string().trim().min(2).max(120),
        limit: z.number().int().min(1).max(25).optional().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      return await searchCommandCenter(input.businessId, input.query, input.limit);
    }),

  search: protectedProcedure
    .input(
      z.object({
        businessId: z.number().int().positive(),
        query: z.string().trim().min(2).max(120),
        limit: z.number().int().min(1).max(25).optional().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      return await searchCommandCenter(input.businessId, input.query, input.limit);
    }),

  getInsightDetail: protectedProcedure
    .input(z.object({
      businessId: z.number().int().positive(),
      sourceType: z.enum(["ATTENTION", "DECISION", "ACTION", "SITUATION", "STRATEGY", "MEMORY", "PATTERN", "OUTCOME", "FORESIGHT", "SCENARIO", "DIAGNOSTIC"]),
      sourceId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      await requireCommandCenterAccess(ctx.user.id, input.businessId);
      const detail = await getCommandCenterInsightDetail(input.businessId, input.sourceType, input.sourceId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Verified insight record not found." });
      return detail;
    }),
});
