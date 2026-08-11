import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { businessMetricsRouter } from "./routers/businessMetrics";
import { verifyBusinessOwnership } from "./services/businessDataService";

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

async function requireRecordBusiness(
  userId: number,
  record: { businessId: number } | undefined
) {
  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Record not found." });
  }
  await requireBusinessAccess(userId, record.businessId);
  return record;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * ============================================================
   * BUSINESS OPERATIONS
   * ============================================================
   */
  business: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          industry: z.string().optional(),
          businessType: z.string().optional(),
          country: z.string().optional(),
          location: z.string().optional(),
          currency: z.string().optional(),
          businessSize: z.string().optional(),
          numberOfEmployees: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createBusiness(ctx.user.id, input);
        return result;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBusinessesByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getBusinessById(input.businessId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          data: z.object({
            name: z.string().optional(),
            industry: z.string().optional(),
            businessType: z.string().optional(),
            country: z.string().optional(),
            location: z.string().optional(),
            currency: z.string().optional(),
            businessSize: z.string().optional(),
            numberOfEmployees: z.number().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.updateBusiness(input.businessId, input.data);
      }),
  }),

  /**
   * ============================================================
   * BUSINESS GOALS OPERATIONS
   * ============================================================
   */
  businessGoals: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          goal: z.string().min(1),
          priority: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createBusinessGoal(
          input.businessId,
          input.goal,
          input.priority || 0
        );
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getBusinessGoals(input.businessId);
      }),
  }),

  /**
   * ============================================================
   * CUSTOMER OPERATIONS
   * ============================================================
   */
  customers: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          name: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          company: z.string().optional(),
          location: z.string().optional(),
          status: z.enum(["active", "inactive", "prospect"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createCustomer(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getCustomers(input.businessId);
      }),

    get: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const customer = await db.getCustomerById(input.customerId);
        return await requireRecordBusiness(ctx.user.id, customer);
      }),

    update: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          data: z.object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            company: z.string().optional(),
            location: z.string().optional(),
            status: z.enum(["active", "inactive", "prospect"]).optional(),
            notes: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const customer = await db.getCustomerById(input.customerId);
        await requireRecordBusiness(ctx.user.id, customer);
        return await db.updateCustomer(input.customerId, input.data);
      }),

    delete: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const customer = await db.getCustomerById(input.customerId);
        await requireRecordBusiness(ctx.user.id, customer);
        return await db.deleteCustomer(input.customerId);
      }),
  }),

  /**
   * ============================================================
   * PRODUCT OPERATIONS
   * ============================================================
   */
  products: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          type: z.enum(["product", "service"]).optional(),
          price: z.number().optional(),
          cost: z.number().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createProduct(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getProducts(input.businessId);
      }),

    get: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        return await requireRecordBusiness(ctx.user.id, product);
      }),

    update: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          data: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            type: z.enum(["product", "service"]).optional(),
            price: z.number().optional(),
            cost: z.number().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        await requireRecordBusiness(ctx.user.id, product);
        return await db.updateProduct(input.productId, input.data);
      }),

    delete: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        await requireRecordBusiness(ctx.user.id, product);
        return await db.deleteProduct(input.productId);
      }),
  }),

  /**
   * ============================================================
   * TRANSACTION OPERATIONS
   * ============================================================
   */
  transactions: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          customerId: z.number().optional(),
          productId: z.number().optional(),
          type: z.enum(["sale", "refund", "payment", "other"]).optional(),
          amount: z.number().min(0),
          description: z.string().optional(),
          transactionDate: z.date(),
          status: z.enum(["completed", "pending", "failed"]).optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createTransaction(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getTransactions(input.businessId);
      }),

    get: protectedProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const transaction = await db.getTransactionById(input.transactionId);
        return await requireRecordBusiness(ctx.user.id, transaction);
      }),

    delete: protectedProcedure
      .input(z.object({ transactionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const transaction = await db.getTransactionById(input.transactionId);
        await requireRecordBusiness(ctx.user.id, transaction);
        return await db.deleteTransaction(input.transactionId);
      }),
  }),

  /**
   * ============================================================
   * EXPENSE OPERATIONS
   * ============================================================
   */
  expenses: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          category: z.string().min(1),
          description: z.string().optional(),
          amount: z.number().min(0),
          expenseDate: z.date(),
          status: z.enum(["completed", "pending"]).optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createExpense(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getExpenses(input.businessId);
      }),

    get: protectedProcedure
      .input(z.object({ expenseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const expense = await db.getExpenseById(input.expenseId);
        return await requireRecordBusiness(ctx.user.id, expense);
      }),

    delete: protectedProcedure
      .input(z.object({ expenseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const expense = await db.getExpenseById(input.expenseId);
        await requireRecordBusiness(ctx.user.id, expense);
        return await db.deleteExpense(input.expenseId);
      }),
  }),

  /**
   * ============================================================
   * METRICS OPERATIONS
   * ============================================================
   */
  metrics: router({
    getBusinessMetrics: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getBusinessMetrics(input.businessId);
      }),
  }),

  /**
   * ============================================================
   * BUSINESS EVENTS OPERATIONS
   * ============================================================
   */
  events: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          eventType: z.string(),
          entity: z.string().optional(),
          entityId: z.number().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createBusinessEvent(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getBusinessEvents(input.businessId, input.limit);
      }),
  }),

  /**
   * ============================================================
   * RECOMMENDATIONS OPERATIONS
   * ============================================================
   */
  recommendations: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().optional(),
          evidence: z.string().optional(),
          confidence: z.number().optional(),
          assumptions: z.string().optional(),
          expectedImpact: z.string().optional(),
          risk: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createRecommendation(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getRecommendations(input.businessId);
      }),
  }),

  /**
   * ============================================================
   * STRATEGIES OPERATIONS
   * ============================================================
   */
  strategies: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          objective: z.string().min(1),
          targetMetric: z.string().optional(),
          baseline: z.number().optional(),
          proposedActions: z.string().optional(),
          expectedOutcome: z.string().optional(),
          timeframe: z.string().optional(),
          assumptions: z.string().optional(),
          risks: z.string().optional(),
          confidence: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createStrategy(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getStrategies(input.businessId);
      }),
  }),

  /**
   * ============================================================
   * EXTERNAL DATA SOURCES OPERATIONS
   * ============================================================
   */
  externalDataSources: router({
    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number(),
          name: z.string().min(1),
          source: z.string().min(1),
          sourceType: z.enum(["api", "webhook", "polling", "manual", "other"]).optional(),
          dataType: z.string().optional(),
          freshness: z.enum(["live", "near-real-time", "periodic", "historical", "unknown"]).optional(),
          reliability: z.number().optional(),
          provenance: z.string().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.createExternalDataSource(input.businessId, input);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireBusinessAccess(ctx.user.id, input.businessId);
        return await db.getExternalDataSources(input.businessId);
      }),
  }),

  businessMetrics: businessMetricsRouter,
});

export type AppRouter = typeof appRouter;
