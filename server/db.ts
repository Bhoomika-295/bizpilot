import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  businesses,
  customers,
  products,
  transactions,
  expenses,
  businessEvents,
  recommendations,
  strategies,
  outcomes,
  externalDataSources,
  csvImports,
  competitors,
  marketSignals,
  scenarios,
  opportunities,
  actionPlans,
  businessMemories,
  patternIntelligence,
} from "../drizzle/schema.postgres";
import type { InferInsertModel } from "drizzle-orm";
export type InsertUser = InferInsertModel<typeof users>;
import { eq, desc } from "drizzle-orm";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _sql = postgres(process.env.DATABASE_URL, { max: 10, idle_timeout: 20 });
      _db = drizzle(_sql, {
        schema: {
          users,
          businesses,
          customers,
          products,
          transactions,
          expenses,
          businessEvents,
          recommendations,
          strategies,
          outcomes,
          externalDataSources,
          csvImports,
          competitors,
          marketSignals,
          scenarios,
          opportunities,
          actionPlans,
          businessMemories,
          patternIntelligence,
        },
      });
    } catch (error) {
      console.warn("[Database] Failed to connect to PostgreSQL:", error);
      _db = null;
      _sql = null;
    }
  }
  return _db;
}

/**
 * ============================================================
 * USER OPERATIONS
 * ============================================================
 */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: Record<string, unknown> = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values as any).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * ============================================================
 * BUSINESS OPERATIONS
 * ============================================================
 */

export async function createBusiness(
  userId: number,
  data: {
    name: string;
    industry?: string;
    businessType?: string;
    country?: string;
    location?: string;
    currency?: string;
    businessSize?: string;
    numberOfEmployees?: number;
    isDemo?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(businesses).values({
    userId,
    name: data.name,
    industry: data.industry,
    currency: data.currency || "USD",
  }).returning();

  return result;
}

export async function getBusinessById(businessId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getBusinessesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId));
}

export async function getAllBusinesses() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businesses);
}

export async function updateBusiness(
  businessId: number,
  data: Partial<{
    name: string;
    industry: string;
    currency: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(businesses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(businesses.id, businessId));
}

/**
 * ============================================================
 * CUSTOMER OPERATIONS
 * ============================================================
 */

export async function getCustomersForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy(desc(customers.createdAt));
}

export async function createCustomer(data: {
  businessId: number;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  totalSpent?: number;
  lastOrderDate?: Date;
  segment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * PRODUCT OPERATIONS
 * ============================================================
 */

export async function getProductsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId))
    .orderBy(desc(products.createdAt));
}

export async function createProduct(data: {
  businessId: number;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  cost?: number;
  stockLevel?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * TRANSACTION OPERATIONS
 * ============================================================
 */

export async function getTransactionsForBusiness(businessId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function createTransaction(data: {
  businessId: number;
  customerId?: number;
  productId?: number;
  amount: number;
  type?: string;
  status?: string;
  transactionDate?: Date;
  paymentMethod?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values({
    ...data,
    transactionDate: data.transactionDate || new Date(),
  }).returning();
  return result[0];
}

/**
 * ============================================================
 * EXPENSE OPERATIONS
 * ============================================================
 */

export async function getExpensesForBusiness(businessId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(expenses)
    .where(eq(expenses.businessId, businessId))
    .orderBy(desc(expenses.expenseDate))
    .limit(limit);
}

export async function createExpense(data: {
  businessId: number;
  category: string;
  amount: number;
  expenseDate?: Date;
  vendor?: string;
  description?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values({
    ...data,
    expenseDate: data.expenseDate || new Date(),
  }).returning();
  return result[0];
}

/**
 * ============================================================
 * BUSINESS EVENTS / METRICS
 * ============================================================
 */

export async function getBusinessEventsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(businessEvents)
    .where(eq(businessEvents.businessId, businessId))
    .orderBy(desc(businessEvents.timestamp));
}

export async function createBusinessEvent(data: {
  businessId: number;
  eventType: string;
  title: string;
  description?: string;
  severity?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businessEvents).values({
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  }).returning();
  return result[0];
}

/**
 * ============================================================
 * RECOMMENDATIONS
 * ============================================================
 */

export async function getRecommendationsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.businessId, businessId))
    .orderBy(desc(recommendations.createdAt));
}

export async function createRecommendation(data: {
  businessId: number;
  title: string;
  description: string;
  category?: string;
  impact?: string;
  effort?: string;
  status?: string;
  confidenceScore?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recommendations).values(data).returning();
  return result[0];
}

export async function updateRecommendationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(recommendations)
    .set({ status, updatedAt: new Date() })
    .where(eq(recommendations.id, id));
}

/**
 * ============================================================
 * STRATEGIES
 * ============================================================
 */

export async function getStrategiesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategies)
    .where(eq(strategies.businessId, businessId))
    .orderBy(desc(strategies.createdAt));
}

export async function createStrategy(data: {
  businessId: number;
  title: string;
  description: string;
  category?: string;
  targetMetric?: string;
  expectedImpact?: string;
  timeframe?: string;
  status?: string;
  progress?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(strategies).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * OUTCOMES
 * ============================================================
 */

export async function getOutcomesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(outcomes)
    .where(eq(outcomes.businessId, businessId))
    .orderBy(desc(outcomes.createdAt));
}

export async function createOutcome(data: {
  businessId: number;
  strategyId?: number;
  title: string;
  metricName: string;
  expectedValue?: string;
  actualValue?: string;
  status?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outcomes).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * EXTERNAL DATA SOURCES & CSV IMPORTS
 * ============================================================
 */

export async function getExternalDataSourcesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(externalDataSources)
    .where(eq(externalDataSources.businessId, businessId))
    .orderBy(desc(externalDataSources.createdAt));
}

export async function getCsvImportsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(csvImports)
    .where(eq(csvImports.businessId, businessId))
    .orderBy(desc(csvImports.createdAt));
}

/**
 * ============================================================
 * COMPETITORS & MARKET SIGNALS
 * ============================================================
 */

export async function getCompetitorsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId))
    .orderBy(desc(competitors.createdAt));
}

export async function getMarketSignalsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(marketSignals)
    .where(eq(marketSignals.businessId, businessId))
    .orderBy(desc(marketSignals.createdAt));
}

/**
 * ============================================================
 * SCENARIOS
 * ============================================================
 */

export async function getScenariosForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.businessId, businessId))
    .orderBy(desc(scenarios.createdAt));
}

export async function createScenario(data: {
  businessId: number;
  title: string;
  description?: string;
  assumptions?: Record<string, any>;
  projectedOutcome?: Record<string, any>;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scenarios).values({
    ...data,
    assumptions: data.assumptions ? JSON.stringify(data.assumptions) : null,
    projectedOutcome: data.projectedOutcome ? JSON.stringify(data.projectedOutcome) : null,
  }).returning();
  return result[0];
}

/**
 * ============================================================
 * OPPORTUNITIES
 * ============================================================
 */

export async function getOpportunitiesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.businessId, businessId))
    .orderBy(desc(opportunities.createdAt));
}

export async function createOpportunity(data: {
  businessId: number;
  title: string;
  description: string;
  category?: string;
  potentialValue?: string;
  probability?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(opportunities).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * ACTION PLANS
 * ============================================================
 */

export async function getActionPlansForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.businessId, businessId))
    .orderBy(desc(actionPlans.createdAt));
}

export async function createActionPlan(data: {
  businessId: number;
  title: string;
  description?: string;
  status?: string;
  dueDate?: Date;
  assignee?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(actionPlans).values(data).returning();
  return result[0];
}

/**
 * ============================================================
 * BUSINESS MEMORIES
 * ============================================================
 */

export async function getBusinessMemoriesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(desc(businessMemories.createdAt));
}

export async function createBusinessMemory(data: {
  businessId: number;
  memoryType: string;
  content: string;
  importance?: number;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businessMemories).values({
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  }).returning();
  return result[0];
}

/**
 * ============================================================
 * PATTERN INTELLIGENCE
 * ============================================================
 */

export async function getPatternIntelligenceForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(patternIntelligence)
    .where(eq(patternIntelligence.businessId, businessId))
    .orderBy(desc(patternIntelligence.createdAt));
}

export async function createPatternIntelligence(data: {
  businessId: number;
  patternType: string;
  title: string;
  description: string;
  confidence?: number;
  signalData?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(patternIntelligence).values({
    ...data,
    signalData: data.signalData ? JSON.stringify(data.signalData) : null,
  }).returning();
  return result[0];
}

export async function getBusinessSituations(businessId: number) {
  return [];
}
export async function getBusinessMetrics(businessId: number) {
  return [];
}

export async function getRecentOutcomes(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(outcomes).where(eq(outcomes.businessId, businessId)).limit(10);
}

export async function getBusinessSituations(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return [];
}

export async function upsertBusinessSituation(data: any) {
  return data;
}

export async function updateBusinessSituationStatus(id: number, status: string) {
  return true;
}

export async function getSituationSnapshots(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return [];
}

export async function createSituationSnapshot(data: any) {
  return data;
}
