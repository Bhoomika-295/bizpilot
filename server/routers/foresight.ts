import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getForesightSignalsForBusiness,
  updateForesightSignal,
  getForesightWatchlistForBusiness,
  createForesightWatchlistRecord,
  removeForesightWatchlistRecord,
} from "../db";
import { evaluateAndSyncForesight } from "../services/foresightService";
import { verifyBusinessOwnership } from "../services/businessDataService";

async function requireBusinessAccess(userId: number, businessId: number) {
  try {
    return await verifyBusinessOwnership(userId, businessId);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this business.",
    });
  }
}

export const foresightRouter = router({
  getSignals: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      await evaluateAndSyncForesight(input.businessId);
      return getForesightSignalsForBusiness(input.businessId);
    }),

  updateSignalStatus: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        signalId: z.number(),
        status: z.enum(["WATCH", "ACTIVE", "CONFIRMED", "RESOLVED", "DISMISSED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      return updateForesightSignal(input.signalId, input.businessId, { status: input.status });
    }),

  getWatchlist: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      await evaluateAndSyncForesight(input.businessId);
      return getForesightWatchlistForBusiness(input.businessId);
    }),

  addToWatchlist: protectedProcedure
    .input(
      z.object({
        businessId: z.number(),
        targetType: z.string(),
        targetId: z.number(),
        title: z.string(),
        currentValue: z.string().optional(),
        previousValue: z.string().optional(),
        changeSummary: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      return createForesightWatchlistRecord({
        businessId: input.businessId,
        targetType: input.targetType,
        targetId: input.targetId,
        title: input.title,
        currentValue: input.currentValue || null,
        previousValue: input.previousValue || null,
        changeSummary: input.changeSummary || null,
        status: "WATCHING",
        notes: input.notes || null,
      });
    }),

  removeFromWatchlist: protectedProcedure
    .input(z.object({ businessId: z.number(), watchlistId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      return removeForesightWatchlistRecord(input.watchlistId, input.businessId);
    }),
});
