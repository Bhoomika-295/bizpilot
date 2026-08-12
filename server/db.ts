import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  businesses,
  businessGoals,
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
  strategyStates,
  strategyEvents,
  scenarios,
  Scenario,
  InsertScenario,
  opportunities,
  Opportunity,
  InsertOpportunity,
  competitorActivities,
  CompetitorActivity,
  InsertCompetitorActivity,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
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
    const values: InsertUser = {
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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
    businessType: data.businessType,
    country: data.country,
    location: data.location,
    currency: data.currency || "USD",
    businessSize: data.businessSize,
    numberOfEmployees: data.numberOfEmployees,
    isDemo: data.isDemo || false,
  });

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

export async function updateBusiness(
  businessId: number,
  data: Partial<{
    name: string;
    industry: string;
    businessType: string;
    country: string;
    location: string;
    currency: string;
    businessSize: string;
    numberOfEmployees: number;
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
 * BUSINESS GOALS OPERATIONS
 * ============================================================
 */

export async function createBusinessGoal(
  businessId: number,
  goal: string,
  priority: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(businessGoals).values({
    businessId,
    goal,
    priority,
  });
}

export async function getBusinessGoals(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businessGoals)
    .where(eq(businessGoals.businessId, businessId))
    .orderBy(asc(businessGoals.priority));
}

/**
 * ============================================================
 * CUSTOMER OPERATIONS
 * ============================================================
 */

export async function createCustomer(
  businessId: number,
  data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    location?: string;
    status?: "active" | "inactive" | "prospect";
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(customers).values({
    businessId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    location: data.location,
    status: data.status || "active",
    notes: data.notes,
  });
}

export async function getCustomers(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy(desc(customers.createdAt));
}

export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateCustomer(
  customerId: number,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    company: string;
    location: string;
    status: "active" | "inactive" | "prospect";
    notes: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, customerId));
}

export async function deleteCustomer(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(customers).where(eq(customers.id, customerId));
}

/**
 * ============================================================
 * PRODUCT OPERATIONS
 * ============================================================
 */

export async function createProduct(
  businessId: number,
  data: {
    name: string;
    description?: string;
    type?: "product" | "service";
    price?: number;
    cost?: number;
    status?: "active" | "inactive";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(products).values({
    businessId,
    name: data.name,
    description: data.description,
    type: data.type || "product",
    price: data.price ? String(data.price) : undefined,
    cost: data.cost ? String(data.cost) : undefined,
    status: data.status || "active",
  });
}

export async function getProducts(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId))
    .orderBy(desc(products.createdAt));
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateProduct(
  productId: number,
  data: Partial<{
    name: string;
    description: string;
    type: "product" | "service";
    price: number;
    cost: number;
    status: "active" | "inactive";
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.price !== undefined) updateData.price = String(data.price);
  if (data.cost !== undefined) updateData.cost = String(data.cost);

  return await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, productId));
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(products).where(eq(products.id, productId));
}

/**
 * ============================================================
 * TRANSACTION OPERATIONS
 * ============================================================
 */

export async function createTransaction(
  businessId: number,
  data: {
    customerId?: number;
    productId?: number;
    type?: "sale" | "refund" | "payment" | "other";
    amount: number;
    description?: string;
    transactionDate: Date;
    status?: "completed" | "pending" | "failed";
    source?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(transactions).values({
    businessId,
    customerId: data.customerId,
    productId: data.productId,
    type: data.type || "sale",
    amount: String(data.amount),
    description: data.description,
    transactionDate: data.transactionDate,
    status: data.status || "completed",
    source: data.source || "manual",
  });
}

export async function getTransactions(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .orderBy(desc(transactions.transactionDate));
}

export async function getTransactionById(transactionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteTransaction(transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(transactions).where(eq(transactions.id, transactionId));
}

/**
 * ============================================================
 * EXPENSE OPERATIONS
 * ============================================================
 */

export async function createExpense(
  businessId: number,
  data: {
    category: string;
    description?: string;
    amount: number;
    expenseDate: Date;
    status?: "completed" | "pending";
    source?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(expenses).values({
    businessId,
    category: data.category,
    description: data.description,
    amount: String(data.amount),
    expenseDate: data.expenseDate,
    status: data.status || "completed",
    source: data.source || "manual",
  });
}

export async function getExpenses(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(expenses)
    .where(eq(expenses.businessId, businessId))
    .orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(expenseId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteExpense(expenseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(expenses).where(eq(expenses.id, expenseId));
}

/**
 * ============================================================
 * BUSINESS METRICS OPERATIONS
 * ============================================================
 */

export async function getBusinessMetrics(businessId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get revenue from completed transactions
  const transactionResults = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        eq(transactions.status, "completed")
      )
    );

  const revenue = transactionResults.reduce(
    (sum, t) => sum + parseFloat(t.amount as any),
    0
  );

  // Get expenses
  const expenseResults = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.businessId, businessId),
        eq(expenses.status, "completed")
      )
    );

  const totalExpenses = expenseResults.reduce(
    (sum, e) => sum + parseFloat(e.amount as any),
    0
  );

  // Get customer count
  const customerCount = await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId));

  return {
    revenue,
    expenses: totalExpenses,
    profit: revenue - totalExpenses,
    transactionCount: transactionResults.length,
    customerCount: customerCount.length,
  };
}

/**
 * ============================================================
 * BUSINESS EVENT OPERATIONS
 * ============================================================
 */

export async function createBusinessEvent(
  businessId: number,
  data: {
    eventType: string;
    entity?: string;
    entityId?: number;
    metadata?: Record<string, any>;
    source?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(businessEvents).values({
    businessId,
    eventType: data.eventType,
    entity: data.entity,
    entityId: data.entityId,
    metadata: data.metadata,
    source: data.source || "system",
  });
}

export async function getBusinessEvents(businessId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(businessEvents)
    .where(eq(businessEvents.businessId, businessId))
    .orderBy(desc(businessEvents.timestamp))
    .limit(limit);
}

/**
 * ============================================================
 * CSV IMPORT OPERATIONS
 * ============================================================
 */

export async function createCsvImport(
  businessId: number,
  data: {
    fileName: string;
    entityType: string;
    totalRows?: number;
    status?: "pending" | "processing" | "completed" | "failed";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(csvImports).values({
    businessId,
    fileName: data.fileName,
    entityType: data.entityType,
    totalRows: data.totalRows,
    status: data.status || "pending",
  });
}

export async function updateCsvImport(
  importId: number,
  data: Partial<{
    importedRows: number;
    skippedRows: number;
    warnings: Record<string, any>[];
    status: "pending" | "processing" | "completed" | "failed";
    errorMessage: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(csvImports)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(csvImports.id, importId));
}

/**
 * ============================================================
 * RECOMMENDATION OPERATIONS
 * ============================================================
 */

export async function createRecommendation(
  businessId: number,
  data: {
    title: string;
    description?: string;
    category?: string;
    evidence?: string;
    confidence?: number;
    assumptions?: string;
    expectedImpact?: string;
    risk?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(recommendations).values({
    businessId,
    title: data.title,
    description: data.description,
    category: data.category,
    evidence: data.evidence,
    confidence: data.confidence ? String(data.confidence) : undefined,
    assumptions: data.assumptions,
    expectedImpact: data.expectedImpact,
    risk: data.risk,
    status: "pending",
  });
}

export async function getRecommendations(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.businessId, businessId))
    .orderBy(desc(recommendations.createdAt));
}

/**
 * ============================================================
 * STRATEGY OPERATIONS
 * ============================================================
 */

export async function createStrategy(
  businessId: number,
  data: {
    objective: string;
    targetMetric?: string;
    baseline?: number;
    proposedActions?: string;
    expectedOutcome?: string;
    timeframe?: string;
    assumptions?: string;
    risks?: string;
    confidence?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(strategies).values({
    businessId,
    objective: data.objective,
    targetMetric: data.targetMetric,
    baseline: data.baseline ? String(data.baseline) : undefined,
    proposedActions: data.proposedActions,
    expectedOutcome: data.expectedOutcome,
    timeframe: data.timeframe,
    assumptions: data.assumptions,
    risks: data.risks,
    confidence: data.confidence ? String(data.confidence) : undefined,
    status: "planning",
  });
}

export async function getStrategies(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(strategies)
    .where(eq(strategies.businessId, businessId))
    .orderBy(desc(strategies.createdAt));
}

/**
 * ============================================================
 * EXTERNAL DATA SOURCE OPERATIONS
 * ============================================================
 */

export async function createExternalDataSource(
  businessId: number,
  data: {
    name: string;
    source: string;
    sourceType?: "api" | "webhook" | "polling" | "manual" | "other";
    dataType?: string;
    freshness?: "live" | "near-real-time" | "periodic" | "historical" | "unknown";
    reliability?: number;
    provenance?: string;
    metadata?: Record<string, any>;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(externalDataSources).values({
    businessId,
    name: data.name,
    source: data.source,
    sourceType: data.sourceType || "manual",
    dataType: data.dataType,
    freshness: data.freshness || "unknown",
    reliability: data.reliability ? String(data.reliability) : undefined,
    provenance: data.provenance,
    metadata: data.metadata,
    status: "pending",
  });
}

export async function getExternalDataSources(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(externalDataSources)
    .where(eq(externalDataSources.businessId, businessId))
    .orderBy(desc(externalDataSources.createdAt));
}


/**
 * ============================================================
 * COMPETITOR WATCHLIST OPERATIONS
 * ============================================================
 */

export async function createCompetitor(
  businessId: number,
  data: {
    name: string;
    industry?: string;
    website?: string;
    location?: string;
    notes?: string;
    status?: "active" | "inactive";
    intelligenceStatus?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(competitors).values({
    businessId,
    name: data.name,
    industry: data.industry || null,
    website: data.website || null,
    location: data.location || null,
    notes: data.notes || null,
    status: data.status || "active",
    intelligenceStatus: data.intelligenceStatus || "Not connected yet",
  });

  return result;
}

export async function getCompetitors(businessId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId))
    .orderBy(desc(competitors.createdAt));
}

export async function getCompetitorById(competitorId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(competitors)
    .where(eq(competitors.id, competitorId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateCompetitor(
  competitorId: number,
  data: Partial<{
    name: string;
    industry: string;
    website: string;
    location: string;
    notes: string;
    status: "active" | "inactive";
    intelligenceStatus: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(competitors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(competitors.id, competitorId));
}

export async function deleteCompetitor(competitorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(competitors).where(eq(competitors.id, competitorId));
}





/**
 * ============================================================
 * MARKET SIGNALS OPERATIONS
 * ============================================================
 */

export async function createMarketSignal(
  businessId: number,
  data: {
    title: string;
    source: string;
    sourceUrl: string;
    publishedAt?: Date;
    relatedEntity: string;
    snippet?: string;
    relevanceStatus?: string;
    relevanceLevel?: string;
    impactArea?: string;
    importanceScore?: number;
    explanation?: string;
    externalId?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(marketSignals).values({
    businessId,
    title: data.title,
    source: data.source,
    sourceUrl: data.sourceUrl,
    publishedAt: data.publishedAt || null,
    relatedEntity: data.relatedEntity,
    snippet: data.snippet || null,
    relevanceStatus: data.relevanceStatus || "relevant",
    relevanceLevel: data.relevanceLevel || "LOW",
    impactArea: data.impactArea || "General Market",
    importanceScore: data.importanceScore || 1,
    explanation: data.explanation || null,
    externalId: data.externalId || null,
  });
}

export async function getMarketSignals(businessId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(marketSignals)
    .where(eq(marketSignals.businessId, businessId))
    .orderBy(desc(marketSignals.publishedAt), desc(marketSignals.discoveredAt))
    .limit(limit);
}

export async function clearMarketSignals(businessId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(marketSignals).where(eq(marketSignals.businessId, businessId));
}

export async function updateRecommendationStatus(
  recommendationId: number,
  status: "pending" | "accepted" | "rejected" | "completed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(recommendations)
    .set({ status, updatedAt: new Date() })
    .where(eq(recommendations.id, recommendationId));
}

export async function updateRecommendationOutcome(
  recommendationId: number,
  data: {
    outcomeStatus: "Positive" | "Neutral" | "Negative" | "Unknown";
    outcomeNote?: string;
    metricBefore?: number;
    metricAfter?: number;
    observedChange?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(recommendations)
    .set({
      outcomeStatus: data.outcomeStatus,
      outcomeNote: data.outcomeNote || null,
      metricBefore: data.metricBefore !== undefined ? String(data.metricBefore) : null,
      metricAfter: data.metricAfter !== undefined ? String(data.metricAfter) : null,
      observedChange: data.observedChange || null,
      updatedAt: new Date(),
    })
    .where(eq(recommendations.id, recommendationId));
}

import { businessSituations, type InsertBusinessSituation } from "../drizzle/schema";

export async function getBusinessSituations(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(businessSituations)
    .where(eq(businessSituations.businessId, businessId))
    .orderBy(desc(businessSituations.updatedAt));
}

export async function getBusinessSituationById(situationId: number) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.select().from(businessSituations).where(eq(businessSituations.id, situationId));
  return res[0] || null;
}

export async function upsertBusinessSituation(data: InsertBusinessSituation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if active situation with same title & category already exists for business
  const existing = await db
    .select()
    .from(businessSituations)
    .where(eq(businessSituations.businessId, data.businessId));
  const match = existing.find(
    (s) => s.title === data.title && s.category === data.category && (s.status === "ACTIVE" || s.status === "MONITORING")
  );

  if (match) {
    await db
      .update(businessSituations)
      .set({
        summary: data.summary,
        priority: data.priority,
        supportingSignalsJson: data.supportingSignalsJson,
        supportingCount: data.supportingCount,
        freshnessInfo: data.freshnessInfo,
        updatedAt: new Date(),
      })
      .where(eq(businessSituations.id, match.id));
    return match.id;
  }

  const result = await db.insert(businessSituations).values(data);
  return Number(result[0].insertId);
}

export async function updateBusinessSituationStatus(
  situationId: number,
  status: "ACTIVE" | "MONITORING" | "RESOLVED"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(businessSituations)
    .set({ status, updatedAt: new Date() })
    .where(eq(businessSituations.id, situationId));
}

import { situationSnapshots, type InsertSituationSnapshot } from "../drizzle/schema";

export async function createSituationSnapshot(data: {
  businessId: number;
  situationId: number;
  title: string;
  summary: string;
  priority: string;
  status: string;
  category: string;
  trendDirection: string;
  supportingCount: number;
  internalEvidenceCount: number;
  externalEvidenceCount: number;
  metricValuesJson?: string;
  freshnessInfo?: string;
  timestamp?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Prevent duplicate consecutive snapshots if state is identical
  const latest = await db
    .select()
    .from(situationSnapshots)
    .where(eq(situationSnapshots.situationId, data.situationId))
    .orderBy(desc(situationSnapshots.timestamp))
    .limit(1);

  if (
    latest.length > 0 &&
    latest[0].title === data.title &&
    latest[0].summary === data.summary &&
    latest[0].priority === data.priority &&
    latest[0].status === data.status &&
    latest[0].trendDirection === data.trendDirection &&
    latest[0].supportingCount === data.supportingCount
  ) {
    // Duplicate state within recent refresh; skip duplicate insert
    return latest[0].id;
  }

  const res = await db.insert(situationSnapshots).values({
    businessId: data.businessId,
    situationId: data.situationId,
    title: data.title,
    summary: data.summary,
    priority: data.priority,
    status: data.status,
    category: data.category,
    trendDirection: data.trendDirection,
    supportingCount: data.supportingCount,
    internalEvidenceCount: data.internalEvidenceCount,
    externalEvidenceCount: data.externalEvidenceCount,
    metricValuesJson: data.metricValuesJson || null,
    freshnessInfo: data.freshnessInfo || null,
    timestamp: data.timestamp || new Date(),
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getSituationSnapshots(situationId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(situationSnapshots)
    .where(eq(situationSnapshots.situationId, situationId))
    .orderBy(desc(situationSnapshots.timestamp))
    .limit(limit);
}

export async function getBusinessSituationSnapshots(businessId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(situationSnapshots)
    .where(eq(situationSnapshots.businessId, businessId))
    .orderBy(desc(situationSnapshots.timestamp))
    .limit(limit);
}

import { decisionPriorities, type InsertDecisionPriority } from "../drizzle/schema";

export async function upsertDecisionPriority(data: {
  businessId: number;
  sourceType: string;
  sourceId?: number;
  title: string;
  priorityLevel: string;
  priorityScore: number;
  urgency: string;
  impact: string;
  trend: string;
  reason: string;
  whyNow: string;
  evidenceJson: string;
  freshnessNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if priority already exists for this business + source
  const existing = await db
    .select()
    .from(decisionPriorities)
    .where(
      and(
        eq(decisionPriorities.businessId, data.businessId),
        eq(decisionPriorities.sourceType, data.sourceType),
        eq(decisionPriorities.sourceId, data.sourceId || 0)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(decisionPriorities)
      .set({
        title: data.title,
        priorityLevel: data.priorityLevel,
        priorityScore: data.priorityScore,
        urgency: data.urgency,
        impact: data.impact,
        trend: data.trend,
        reason: data.reason,
        whyNow: data.whyNow,
        evidenceJson: data.evidenceJson,
        freshnessNote: data.freshnessNote || null,
        updatedAt: new Date(),
      })
      .where(eq(decisionPriorities.id, existing[0].id));
    return existing[0].id;
  }

  const res = await db.insert(decisionPriorities).values({
    businessId: data.businessId,
    sourceType: data.sourceType,
    sourceId: data.sourceId || null,
    title: data.title,
    priorityLevel: data.priorityLevel,
    priorityScore: data.priorityScore,
    urgency: data.urgency,
    impact: data.impact,
    trend: data.trend,
    reason: data.reason,
    whyNow: data.whyNow,
    evidenceJson: data.evidenceJson,
    freshnessNote: data.freshnessNote || null,
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getDecisionPriorities(businessId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(decisionPriorities)
    .where(eq(decisionPriorities.businessId, businessId))
    .orderBy(desc(decisionPriorities.priorityScore))
    .limit(limit);
}

/**
 * ============================================================
 * DAY 16: ADAPTIVE STRATEGY ENGINE HELPERS
 * ============================================================
 */

export async function upsertStrategyState(data: {
  businessId: number;
  recommendationId: number;
  supportingSituationIdsJson?: string;
  supportingSignalIdsJson?: string;
  priorityAtGeneration?: string;
  situationTrendAtGeneration?: string;
  metricSnapshotJson?: string;
  marketSignalRefsJson?: string;
  evaluationStatus?: "KEEP" | "UPDATE" | "DEPRIORITIZE" | "REPLACE" | "EXPIRED" | "ACTIVE" | "COMPLETED" | "DISMISSED";
  reason?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(strategyStates)
    .where(and(eq(strategyStates.businessId, data.businessId), eq(strategyStates.recommendationId, data.recommendationId)));

  if (existing.length > 0) {
    await db
      .update(strategyStates)
      .set({
        supportingSituationIdsJson: data.supportingSituationIdsJson || existing[0].supportingSituationIdsJson,
        supportingSignalIdsJson: data.supportingSignalIdsJson || existing[0].supportingSignalIdsJson,
        priorityAtGeneration: data.priorityAtGeneration || existing[0].priorityAtGeneration,
        situationTrendAtGeneration: data.situationTrendAtGeneration || existing[0].situationTrendAtGeneration,
        metricSnapshotJson: data.metricSnapshotJson || existing[0].metricSnapshotJson,
        marketSignalRefsJson: data.marketSignalRefsJson || existing[0].marketSignalRefsJson,
        evaluationStatus: data.evaluationStatus || existing[0].evaluationStatus,
        reason: data.reason || existing[0].reason,
        updatedAt: new Date(),
      })
      .where(eq(strategyStates.id, existing[0].id));
    return existing[0].id;
  }

  const res = await db.insert(strategyStates).values({
    businessId: data.businessId,
    recommendationId: data.recommendationId,
    supportingSituationIdsJson: data.supportingSituationIdsJson || null,
    supportingSignalIdsJson: data.supportingSignalIdsJson || null,
    priorityAtGeneration: data.priorityAtGeneration || null,
    situationTrendAtGeneration: data.situationTrendAtGeneration || null,
    metricSnapshotJson: data.metricSnapshotJson || null,
    marketSignalRefsJson: data.marketSignalRefsJson || null,
    evaluationStatus: data.evaluationStatus || "KEEP",
    reason: data.reason || null,
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getStrategyStates(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategyStates)
    .where(eq(strategyStates.businessId, businessId))
    .orderBy(desc(strategyStates.updatedAt));
}

export async function createStrategyEvent(data: {
  businessId: number;
  recommendationId?: number;
  eventType: string;
  previousStrategyTitle?: string;
  newStrategyTitle?: string;
  evaluationResult?: string;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const res = await db.insert(strategyEvents).values({
    businessId: data.businessId,
    recommendationId: data.recommendationId || null,
    eventType: data.eventType,
    previousStrategyTitle: data.previousStrategyTitle || null,
    newStrategyTitle: data.newStrategyTitle || null,
    evaluationResult: data.evaluationResult || null,
    reason: data.reason || null,
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getStrategyEvents(businessId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategyEvents)
    .where(eq(strategyEvents.businessId, businessId))
    .orderBy(desc(strategyEvents.timestamp))
    .limit(limit);
}

/**
 * ============================================================
 * DAY 17: SCENARIO INTELLIGENCE DATABASE HELPERS
 * ============================================================
 */

export async function getScenarios(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.businessId, businessId))
    .orderBy(desc(scenarios.createdAt));
}

export async function getScenarioById(businessId: number, scenarioId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertScenario(data: {
  businessId: number;
  title: string;
  description?: string;
  scenarioType: string;
  assumptionsJson: string;
  affectedAreasJson: string;
  estimatedMetricsJson?: string;
  affectedSituationsJson?: string;
  strategicImplicationsJson?: string;
  evidenceQuality?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}) {
  const db = await getDb();
  if (!db) return null;

  const res = await db.insert(scenarios).values({
    businessId: data.businessId,
    title: data.title,
    description: data.description || null,
    scenarioType: data.scenarioType,
    assumptionsJson: data.assumptionsJson,
    affectedAreasJson: data.affectedAreasJson,
    estimatedMetricsJson: data.estimatedMetricsJson || null,
    affectedSituationsJson: data.affectedSituationsJson || null,
    strategicImplicationsJson: data.strategicImplicationsJson || null,
    evidenceQuality: data.evidenceQuality || "MEDIUM EVIDENCE",
    status: data.status || "ACTIVE",
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function deleteScenario(businessId: number, scenarioId: number) {
  const db = await getDb();
  if (!db) return false;
  const res = await db
    .delete(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId)));
  return true;
}


export async function getOpportunities(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.businessId, businessId))
    .orderBy(desc(opportunities.createdAt));
}

export async function getOpportunityById(businessId: number, opportunityId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, opportunityId), eq(opportunities.businessId, businessId)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertOpportunity(data: {
  businessId: number;
  title: string;
  summary: string;
  category?: string;
  priority?: string;
  evidenceStrength?: string;
  potentialImpact?: string;
  urgency?: string;
  status?: "NEW" | "ACTIVE" | "MONITORING" | "PURSUED" | "DISMISSED" | "EXPIRED";
  supportingSignalsJson?: string;
  supportingSituationsJson?: string;
  supportingMetricsJson?: string;
  potentialNextStep?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const res = await db.insert(opportunities).values({
    businessId: data.businessId,
    title: data.title,
    summary: data.summary,
    category: data.category || "GROWTH",
    priority: data.priority || "MEDIUM",
    evidenceStrength: data.evidenceStrength || "MEDIUM EVIDENCE",
    potentialImpact: data.potentialImpact || "MEDIUM",
    urgency: data.urgency || "MEDIUM",
    status: data.status || "NEW",
    supportingSignalsJson: data.supportingSignalsJson || null,
    supportingSituationsJson: data.supportingSituationsJson || null,
    supportingMetricsJson: data.supportingMetricsJson || null,
    potentialNextStep: data.potentialNextStep || null,
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function updateOpportunityStatus(businessId: number, opportunityId: number, status: "NEW" | "ACTIVE" | "MONITORING" | "PURSUED" | "DISMISSED" | "EXPIRED") {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(opportunities)
    .set({ status })
    .where(and(eq(opportunities.id, opportunityId), eq(opportunities.businessId, businessId)));
  return true;
}



/**
 * ============================================================
 * COMPETITOR ACTIVITIES OPERATIONS (DAY 19)
 * ============================================================
 */

export async function createCompetitorActivity(
  businessId: number,
  data: {
    competitorId: number;
    activityType?: string;
    title: string;
    description: string;
    sourceReference?: string;
    relevanceLevel?: string;
    impactAreasJson?: string;
    activityTrend?: string;
    strategicRelevance?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [res] = await db.insert(competitorActivities).values({
    businessId,
    competitorId: data.competitorId,
    activityType: data.activityType || "OTHER",
    title: data.title,
    description: data.description,
    sourceReference: data.sourceReference || null,
    relevanceLevel: data.relevanceLevel || "MEDIUM",
    impactAreasJson: data.impactAreasJson || JSON.stringify([]),
    activityTrend: data.activityTrend || "STABLE",
    strategicRelevance: data.strategicRelevance || null,
  });

  return res && res.insertId ? Number(res.insertId) : null;
}

export async function getCompetitorActivities(businessId: number, competitorId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(competitorActivities.businessId, businessId)];
  if (competitorId) {
    conditions.push(eq(competitorActivities.competitorId, competitorId));
  }

  return await db
    .select()
    .from(competitorActivities)
    .where(and(...conditions))
    .orderBy(desc(competitorActivities.detectedAt));
}
