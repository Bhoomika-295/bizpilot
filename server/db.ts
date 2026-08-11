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
