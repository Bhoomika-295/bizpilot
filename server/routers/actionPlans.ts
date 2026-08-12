import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { verifyBusinessOwnership } from "../services/businessDataService";
import {
  ACTION_STATUSES,
  assertTransition,
  buildActionProposal,
  getActionDetailForBusiness,
  getActionQueueForBusiness,
  formatActionOutcomeNotes,
  transitionAction,
  validateActionDraft,
} from "../services/actionPlanService";

const actionStatusSchema = z.enum(ACTION_STATUSES);

async function requireBusinessAccess(userId: number, businessId: number) {
  try {
    return await verifyBusinessOwnership(userId, businessId);
  } catch {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this business." });
  }
}

async function requireAction(userId: number, businessId: number, actionPlanId: number) {
  await requireBusinessAccess(userId, businessId);
  const detail = await getActionDetailForBusiness(businessId, actionPlanId);
  if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found." });
  return detail;
}

function requireValidDraft(input: { title: string; description: string; expectedOutcome?: string | null }) {
  const validation = validateActionDraft(input);
  if (!validation.valid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: validation.issues.join(" ") });
  }
}

type ActionProposal = ReturnType<typeof buildActionProposal>;

async function persistVerifiedProposal(args: {
  userId: number;
  businessId: number;
  proposal: ActionProposal;
  dueDate?: Date;
  evidence?: string | null;
}) {
  const business = await requireBusinessAccess(args.userId, args.businessId);
  requireValidDraft(args.proposal);
  const result = await db.createActionPlan({
    businessId: args.businessId,
    title: args.proposal.title,
    description: args.proposal.description,
    actionType: args.proposal.actionType,
    status: "PROPOSED",
    priority: args.proposal.priority,
    sourceType: args.proposal.sourceType,
    sourceId: args.proposal.sourceId,
    decisionId: args.proposal.decisionId,
    strategyId: args.proposal.strategyId,
    objectiveId: args.proposal.objectiveId,
    situationId: args.proposal.situationId,
    opportunityId: args.proposal.opportunityId,
    threatId: args.proposal.threatId,
    ownerUserId: business.userId,
    dueDate: args.dueDate,
    expectedOutcome: args.proposal.expectedOutcome,
    evidence: args.evidence ?? null,
    createdByUserId: args.userId,
  });
  const actionPlanId = Number((result as any).insertId);
  await db.createActionPlanEvent({
    businessId: args.businessId,
    actionPlanId,
    eventType: "CREATED",
    previousStatus: null,
    newStatus: "PROPOSED",
    actorUserId: args.userId,
    detailsJson: JSON.stringify({ sourceType: args.proposal.sourceType, sourceId: args.proposal.sourceId }),
  });
  return db.getActionPlanById(args.businessId, actionPlanId);
}

export const actionPlansRouter = router({
  queue: protectedProcedure
    .input(z.object({ businessId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      return getActionQueueForBusiness(input.businessId);
    }),

  detail: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number() }))
    .query(async ({ ctx, input }) => requireAction(ctx.user.id, input.businessId, input.actionPlanId)),

  history: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number() }))
    .query(async ({ ctx, input }) => {
      const detail = await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return detail.history;
    }),

  create: protectedProcedure
    .input(z.object({
      businessId: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
      actionType: z.string().optional(),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
      sourceType: z.string().optional(),
      sourceId: z.number().optional(),
      decisionId: z.number().optional(),
      strategyId: z.number().optional(),
      objectiveId: z.number().optional(),
      situationId: z.number().optional(),
      opportunityId: z.number().optional(),
      threatId: z.number().optional(),
      ownerUserId: z.number().optional(),
      dueDate: z.coerce.date().optional(),
      expectedOutcome: z.string().optional(),
      evidence: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const business = await requireBusinessAccess(ctx.user.id, input.businessId);
      if (input.ownerUserId !== undefined && input.ownerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only assign actions to an authorized workspace owner." });
      }
      requireValidDraft(input);
      const result = await db.createActionPlan({
        businessId: input.businessId,
        title: input.title.trim(),
        description: input.description.trim(),
        actionType: input.actionType ?? "REVIEW",
        status: "PROPOSED",
        priority: input.priority ?? "MEDIUM",
        sourceType: input.sourceType ?? "MANUAL",
        sourceId: input.sourceId,
        decisionId: input.decisionId,
        strategyId: input.strategyId,
        objectiveId: input.objectiveId,
        situationId: input.situationId,
        opportunityId: input.opportunityId,
        threatId: input.threatId,
        ownerUserId: input.ownerUserId ?? business.userId,
        dueDate: input.dueDate,
        expectedOutcome: input.expectedOutcome?.trim(),
        evidence: input.evidence?.trim(),
        createdByUserId: ctx.user.id,
      });
      const actionPlanId = Number((result as any).insertId);
      await db.createActionPlanEvent({
        businessId: input.businessId,
        actionPlanId,
        eventType: "CREATED",
        previousStatus: null,
        newStatus: "PROPOSED",
        actorUserId: ctx.user.id,
        detailsJson: JSON.stringify({ sourceType: input.sourceType ?? "MANUAL" }),
      });
      return db.getActionPlanById(input.businessId, actionPlanId);
    }),

  edit: protectedProcedure
    .input(z.object({
      businessId: z.number(),
      actionPlanId: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
      ownerUserId: z.number().nullable().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      expectedOutcome: z.string().nullable().optional(),
      evidence: z.string().nullable().optional(),
      completionNotes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const detail = await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      if (input.ownerUserId !== undefined && input.ownerUserId !== null && input.ownerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only assign actions to an authorized workspace owner." });
      }
      const nextTitle = input.title ?? detail.action.title;
      const nextDescription = input.description ?? detail.action.description;
      const nextExpectedOutcome = input.expectedOutcome ?? detail.action.expectedOutcome;
      requireValidDraft({ title: nextTitle, description: nextDescription, expectedOutcome: nextExpectedOutcome });
      await db.updateActionPlan(input.businessId, input.actionPlanId, {
        title: input.title?.trim(),
        description: input.description?.trim(),
        priority: input.priority,
        ownerUserId: input.ownerUserId === null ? null : input.ownerUserId,
        dueDate: input.dueDate,
        expectedOutcome: input.expectedOutcome?.trim() ?? input.expectedOutcome,
        evidence: input.evidence?.trim() ?? input.evidence,
        completionNotes: input.completionNotes?.trim() ?? input.completionNotes,
      });
      await db.createActionPlanEvent({
        businessId: input.businessId,
        actionPlanId: input.actionPlanId,
        eventType: input.ownerUserId !== undefined ? "ASSIGNED" : "EDITED",
        previousStatus: detail.action.status,
        newStatus: detail.action.status,
        actorUserId: ctx.user.id,
        detailsJson: JSON.stringify({ fields: Object.keys(input).filter((key) => !["businessId", "actionPlanId"].includes(key)) }),
      });
      return db.getActionPlanById(input.businessId, input.actionPlanId);
    }),

  approve: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "APPROVED");
    }),

  assign: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number(), ownerUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const detail = await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      if (input.ownerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only assign actions to an authorized workspace owner." });
      }
      await db.updateActionPlan(input.businessId, input.actionPlanId, { ownerUserId: input.ownerUserId });
      await db.createActionPlanEvent({
        businessId: input.businessId,
        actionPlanId: input.actionPlanId,
        eventType: "ASSIGNED",
        previousStatus: detail.action.status,
        newStatus: detail.action.status,
        actorUserId: ctx.user.id,
        detailsJson: JSON.stringify({ ownerUserId: input.ownerUserId }),
      });
      return db.getActionPlanById(input.businessId, input.actionPlanId);
    }),

  start: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const detail = await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      if (detail.action.ownerUserId && detail.action.ownerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the assigned owner can start this action." });
      }
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "IN_PROGRESS");
    }),

  block: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number(), reason: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "BLOCKED", { reason: input.reason.trim() });
    }),

  unblock: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "IN_PROGRESS");
    }),

  complete: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number(), actualOutcome: z.string().min(10), completionNotes: z.string().min(5), evidence: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const detail = await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      if (detail.action.ownerUserId && detail.action.ownerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the assigned owner can complete this action." });
      }
      const actualOutcome = input.actualOutcome.trim();
      const completionNotes = input.completionNotes.trim();
      await db.updateActionPlan(input.businessId, input.actionPlanId, {
        actualOutcome,
        completionNotes,
        evidence: input.evidence?.trim(),
      });
      await db.createActionLinkedOutcome({
        businessId: input.businessId,
        actionPlanId: input.actionPlanId,
        strategyId: detail.action.strategyId,
        metric: detail.action.title,
        timeframe: "ACTION_COMPLETION",
        notes: formatActionOutcomeNotes({
          expectedOutcome: detail.action.expectedOutcome,
          actualOutcome,
          completionNotes,
          evidence: input.evidence?.trim(),
        }),
      });
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "COMPLETED", { outcomeCaptured: true });
    }),

  cancel: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number(), reason: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "CANCELLED", { reason: input.reason.trim() });
    }),

  reopen: protectedProcedure
    .input(z.object({ businessId: z.number(), actionPlanId: z.number(), reason: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      await requireAction(ctx.user.id, input.businessId, input.actionPlanId);
      return transitionAction(input.businessId, input.actionPlanId, ctx.user.id, "APPROVED", { reason: input.reason.trim() });
    }),

  createFromAttention: protectedProcedure
    .input(z.object({ businessId: z.number(), attentionItemId: z.number(), dueDate: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const business = await requireBusinessAccess(ctx.user.id, input.businessId);
      const item = await db.getAttentionItemById(input.businessId, input.attentionItemId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Attention item not found." });
      const proposal = buildActionProposal({
        sourceType: "ATTENTION",
        sourceId: item.id,
        title: item.title,
        summary: item.summary,
        priority: item.priority,
        expectedOutcome: "Reduce the identified business risk or capture the next verified signal.",
        situationId: item.sourceType === "SITUATION" ? item.sourceId ?? undefined : undefined,
      });
      requireValidDraft(proposal);
      const result = await db.createActionPlan({
        businessId: input.businessId,
        title: proposal.title,
        description: proposal.description,
        actionType: proposal.actionType,
        status: "PROPOSED",
        priority: proposal.priority,
        sourceType: proposal.sourceType,
        sourceId: proposal.sourceId,
        situationId: proposal.situationId,
        ownerUserId: business.userId,
        dueDate: input.dueDate,
        expectedOutcome: proposal.expectedOutcome,
        evidence: item.explanationJson,
        createdByUserId: ctx.user.id,
      });
      const actionPlanId = Number((result as any).insertId);
      await db.createActionPlanEvent({ businessId: input.businessId, actionPlanId, eventType: "CREATED", previousStatus: null, newStatus: "PROPOSED", actorUserId: ctx.user.id, detailsJson: JSON.stringify({ sourceType: "ATTENTION", sourceId: item.id }) });
      return db.getActionPlanById(input.businessId, actionPlanId);
    }),

  createFromDecision: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number(), dueDate: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const decision = await db.getDecisionCandidateById(input.businessId, input.decisionId);
      if (!decision) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
      return persistVerifiedProposal({
        userId: ctx.user.id,
        businessId: input.businessId,
        dueDate: input.dueDate,
        evidence: decision.whyMatters,
        proposal: buildActionProposal({
          sourceType: "DECISION",
          sourceId: decision.id,
          decisionId: decision.id,
          title: `Follow through: ${decision.title}`,
          summary: decision.recommendedNextStep || decision.whyMatters,
          priority: decision.priority,
          expectedOutcome: decision.potentialConsequences,
        }),
      });
    }),

  createFromStrategy: protectedProcedure
    .input(z.object({ businessId: z.number(), strategyId: z.number(), dueDate: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await db.getStrategyById(input.businessId, input.strategyId);
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      return persistVerifiedProposal({
        userId: ctx.user.id,
        businessId: input.businessId,
        dueDate: input.dueDate,
        evidence: strategy.objective,
        proposal: buildActionProposal({
          sourceType: "STRATEGY",
          sourceId: strategy.id,
          strategyId: strategy.id,
          title: `Execute strategy: ${strategy.objective}`,
          summary: strategy.proposedActions || strategy.objective,
          priority: strategy.status === "active" ? "HIGH" : "MEDIUM",
          expectedOutcome: strategy.expectedOutcome || "Measure the strategy against its target metric and expected outcome.",
        }),
      });
    }),

  createFromOpportunity: protectedProcedure
    .input(z.object({ businessId: z.number(), opportunityId: z.number(), dueDate: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const opportunity = await db.getOpportunityById(input.businessId, input.opportunityId);
      if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
      return persistVerifiedProposal({
        userId: ctx.user.id,
        businessId: input.businessId,
        dueDate: input.dueDate,
        evidence: opportunity.summary,
        proposal: buildActionProposal({
          sourceType: "OPPORTUNITY",
          sourceId: opportunity.id,
          opportunityId: opportunity.id,
          title: `Validate opportunity: ${opportunity.title}`,
          summary: opportunity.potentialNextStep || opportunity.summary,
          priority: opportunity.priority,
          expectedOutcome: "Validate the opportunity with a measurable next step before scaling investment.",
        }),
      });
    }),

  proposeFromAttention: protectedProcedure
    .input(z.object({ businessId: z.number(), attentionItemId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      const item = await db.getAttentionItemById(input.businessId, input.attentionItemId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Attention item not found." });
      return buildActionProposal({
        sourceType: "ATTENTION",
        sourceId: item.id,
        title: item.title,
        summary: item.summary,
        priority: item.priority,
        expectedOutcome: "Reduce the identified business risk or capture the next verified signal.",
        situationId: item.sourceType === "SITUATION" ? item.sourceId ?? undefined : undefined,
      });
    }),

  proposeFromDecision: protectedProcedure
    .input(z.object({ businessId: z.number(), decisionId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      const decision = await db.getDecisionCandidateById(input.businessId, input.decisionId);
      if (!decision) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found." });
      return buildActionProposal({
        sourceType: "DECISION",
        sourceId: decision.id,
        decisionId: decision.id,
        title: `Follow through: ${decision.title}`,
        summary: decision.recommendedNextStep || decision.whyMatters,
        priority: decision.priority,
        expectedOutcome: decision.potentialConsequences,
      });
    }),

  proposeFromStrategy: protectedProcedure
    .input(z.object({ businessId: z.number(), strategyId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      const strategy = await db.getStrategyById(input.businessId, input.strategyId);
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      return buildActionProposal({
        sourceType: "STRATEGY",
        sourceId: strategy.id,
        strategyId: strategy.id,
        title: `Execute strategy: ${strategy.objective}`,
        summary: strategy.proposedActions || strategy.objective,
        priority: strategy.status === "active" ? "HIGH" : "MEDIUM",
        expectedOutcome: strategy.expectedOutcome || "Measure the strategy against its target metric and expected outcome.",
      });
    }),

  proposeFromOpportunity: protectedProcedure
    .input(z.object({ businessId: z.number(), opportunityId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireBusinessAccess(ctx.user.id, input.businessId);
      const opportunity = await db.getOpportunityById(input.businessId, input.opportunityId);
      if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
      return buildActionProposal({
        sourceType: "OPPORTUNITY",
        sourceId: opportunity.id,
        opportunityId: opportunity.id,
        title: `Validate opportunity: ${opportunity.title}`,
        summary: opportunity.potentialNextStep || opportunity.summary,
        priority: opportunity.priority,
        expectedOutcome: "Validate the opportunity with a measurable next step before scaling investment.",
      });
    }),
});

export type ActionPlansRouter = typeof actionPlansRouter;
