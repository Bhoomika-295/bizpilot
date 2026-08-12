import { eq, and, or, desc, asc } from "drizzle-orm";
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
  InsertOutcome,
  externalDataSources,
  csvImports,
  competitors,
  marketSignals,
  strategyStates,
  strategyEvents,
  strategyVersions,
  scenarios,
  Scenario,
  InsertScenario,
  scenarioComparisons,
  ScenarioComparison,
  InsertScenarioComparison,
  scenarioHistory,
  ScenarioHistory,
  InsertScenarioHistory,
  opportunities,
  Opportunity,
  InsertOpportunity,
  competitorActivities,
  CompetitorActivity,
  InsertCompetitorActivity,
  decisionCandidates,
  decisionEvents,
  DecisionCandidate,
  InsertDecisionCandidate,
  monitoringEvents,
  monitoringPreferences,
  monitoringEventHistory,
  MonitoringEvent,
  InsertMonitoringEvent,
  InsertMonitoringPreference,
  InsertMonitoringEventHistory,
  signalRelationships,
  signalClusters,
  signalRelationshipHistory,
  SignalRelationship,
  InsertSignalRelationship,
  SignalCluster,
  InsertSignalCluster,
  InsertSignalRelationshipHistory,
  businessTrajectories,
  trajectoryForecastSnapshots,
  trajectoryLearningSignals,
  trajectoryHistory,
  BusinessTrajectory,
  InsertBusinessTrajectory,
  TrajectoryForecastSnapshot,
  InsertTrajectoryForecastSnapshot,
  InsertTrajectoryLearningSignal,
  InsertTrajectoryHistory,
  strategyHealthSnapshots,
  externalEvents,
  ExternalEvent,
  InsertExternalEvent,
  externalEventReviews,
  InsertExternalEventReview,
  ExternalEventReview,
  externalRadarSnapshots,
  InsertExternalRadarSnapshot,
  ExternalRadarSnapshot,
  attentionItems,
  AttentionItem,
  InsertAttentionItem,
  attentionReviewLogs,
  AttentionReviewLog,
  InsertAttentionReviewLog,
  scenarioAssumptions,
  scenarioReviews,
  foresightSignals,
  ForesightSignal,
  InsertForesightSignal,
  foresightWatchlist,
  ForesightWatchlistRecord,
  InsertForesightWatchlistRecord,
  businessMemories,
  InsertBusinessMemoryRecord,
  patternIntelligence,
  InsertPatternIntelligenceRecord,
  dailyBriefs,
  DailyBrief,
  InsertDailyBrief,
  actionPlans,
  ActionPlan,
  InsertActionPlan,
  actionPlanEvents,
  ActionPlanEvent,
  InsertActionPlanEvent,
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

export async function getStrategyVersions(businessId: number, strategyId: number, limit = 25) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategyVersions)
    .where(and(eq(strategyVersions.businessId, businessId), eq(strategyVersions.strategyId, strategyId)))
    .orderBy(desc(strategyVersions.versionNumber), desc(strategyVersions.createdAt))
    .limit(Math.min(limit, 100));
}

export async function createStrategyVersion(data: {
  businessId: number;
  strategyId: number;
  versionNumber: number;
  objective: string;
  targetMetric?: string | null;
  proposedActions?: string | null;
  expectedOutcome?: string | null;
  timeframe?: string | null;
  assumptions?: string | null;
  risks?: string | null;
  confidence?: string | null;
  changeReasonCategory?: string | null;
  rationale: string;
  evidenceJson?: string | null;
  reviewEventId?: number | null;
  versionStatus?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(strategyVersions).values({ ...data, versionStatus: data.versionStatus ?? "DRAFT" });
  return result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
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
  pathKey?: string;
  assumptionsJson: string;
  actionsJson?: string;
  affectedAreasJson: string;
  affectedMetricsJson?: string;
  expectedDirectionJson?: string;
  estimatedMetricsJson?: string;
  affectedSituationsJson?: string;
  strategicImplicationsJson?: string;
  risksJson?: string;
  opportunitiesJson?: string;
  evidenceJson?: string;
  expectedOutcome?: string;
  timeHorizon?: string;
  confidence?: string;
  uncertainty?: string;
  strategicFit?: string;
  strategicFitReason?: string;
  trajectoryAlignment?: string;
  trajectoryAlignmentReason?: string;
  monitoringStatus?: string;
  selectedDecisionId?: number;
  outcomeId?: number;
  evidenceQuality?: string;
  status?: "DRAFT" | "ACTIVE" | "UNDER_REVIEW" | "SELECTED" | "COMPLETED" | "INVALIDATED" | "ARCHIVED";
}) {
  const db = await getDb();
  if (!db) return null;

  const res = await db.insert(scenarios).values({
    businessId: data.businessId,
    title: data.title,
    description: data.description || null,
    scenarioType: data.scenarioType,
    pathKey: data.pathKey || null,
    assumptionsJson: data.assumptionsJson,
    actionsJson: data.actionsJson || null,
    affectedAreasJson: data.affectedAreasJson,
    affectedMetricsJson: data.affectedMetricsJson || null,
    expectedDirectionJson: data.expectedDirectionJson || null,
    estimatedMetricsJson: data.estimatedMetricsJson || null,
    affectedSituationsJson: data.affectedSituationsJson || null,
    strategicImplicationsJson: data.strategicImplicationsJson || null,
    risksJson: data.risksJson || null,
    opportunitiesJson: data.opportunitiesJson || null,
    evidenceJson: data.evidenceJson || null,
    expectedOutcome: data.expectedOutcome || null,
    timeHorizon: data.timeHorizon || null,
    confidence: data.confidence || null,
    uncertainty: data.uncertainty || null,
    strategicFit: data.strategicFit || null,
    strategicFitReason: data.strategicFitReason || null,
    trajectoryAlignment: data.trajectoryAlignment || null,
    trajectoryAlignmentReason: data.trajectoryAlignmentReason || null,
    monitoringStatus: data.monitoringStatus || null,
    selectedDecisionId: data.selectedDecisionId || null,
    outcomeId: data.outcomeId || null,
    evidenceQuality: data.evidenceQuality || "MEDIUM EVIDENCE",
    status: data.status || "ACTIVE",
  });

  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function deleteScenario(businessId: number, scenarioId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId)));
  return true;
}

export async function updateScenario(businessId: number, scenarioId: number, data: Partial<{
  title: string;
  description: string;
  pathKey: string;
  assumptionsJson: string;
  actionsJson: string;
  affectedAreasJson: string;
  affectedMetricsJson: string;
  expectedDirectionJson: string;
  risksJson: string;
  opportunitiesJson: string;
  evidenceJson: string;
  expectedOutcome: string;
  timeHorizon: string;
  confidence: string;
  uncertainty: string;
  strategicFit: string;
  strategicFitReason: string;
  trajectoryAlignment: string;
  trajectoryAlignmentReason: string;
  monitoringStatus: string;
  selectedDecisionId: number;
  outcomeId: number;
  status: "DRAFT" | "ACTIVE" | "UNDER_REVIEW" | "SELECTED" | "COMPLETED" | "INVALIDATED" | "ARCHIVED";
}>) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(scenarios)
    .set(data)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId)));
  return true;
}

export async function createScenarioHistory(data: InsertScenarioHistory) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(scenarioHistory).values(data);
  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getScenarioHistory(businessId: number, scenarioId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scenarioHistory)
    .where(and(eq(scenarioHistory.businessId, businessId), eq(scenarioHistory.scenarioId, scenarioId)))
    .orderBy(desc(scenarioHistory.timestamp))
    .limit(limit);
}

export async function getScenarioComparison(businessId: number, comparisonKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(scenarioComparisons)
    .where(and(eq(scenarioComparisons.businessId, businessId), eq(scenarioComparisons.comparisonKey, comparisonKey)))
    .orderBy(desc(scenarioComparisons.updatedAt))
    .limit(1);
  return rows[0] || null;
}

export async function upsertScenarioComparison(data: InsertScenarioComparison) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getScenarioComparison(data.businessId, data.comparisonKey);
  if (existing) {
    await db
      .update(scenarioComparisons)
      .set({
        title: data.title,
        scenarioIdsJson: data.scenarioIdsJson,
        baselineScenarioId: data.baselineScenarioId ?? null,
        scorecardJson: data.scorecardJson,
        interpretation: data.interpretation,
        uncertainty: data.uncertainty,
      })
      .where(and(eq(scenarioComparisons.id, existing.id), eq(scenarioComparisons.businessId, data.businessId)));
    return existing.id;
  }
  const res = await db.insert(scenarioComparisons).values(data);
  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getScenarioComparisons(businessId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scenarioComparisons)
    .where(eq(scenarioComparisons.businessId, businessId))
    .orderBy(desc(scenarioComparisons.updatedAt))
    .limit(limit);
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

/**
 * ============================================================
 * DECISION INTELLIGENCE OPERATIONS (DAY 20)
 * ============================================================
 */

export type DecisionLifecycleStatus = "OPEN" | "IN_REVIEW" | "DECIDED" | "DEFERRED" | "DISMISSED" | "EXPIRED";

export type DecisionCandidateWrite = Omit<InsertDecisionCandidate, "id" | "createdAt" | "updatedAt">;

export async function getDecisionCandidates(businessId: number, limit = 7) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(decisionCandidates)
    .where(eq(decisionCandidates.businessId, businessId))
    .orderBy(desc(decisionCandidates.priorityScore), asc(decisionCandidates.id))
    .limit(limit);
}

export async function getAllDecisionCandidates(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(decisionCandidates)
    .where(eq(decisionCandidates.businessId, businessId))
    .orderBy(desc(decisionCandidates.priorityScore), asc(decisionCandidates.id));
}

export async function getDecisionCandidateById(businessId: number, decisionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(decisionCandidates)
    .where(and(eq(decisionCandidates.businessId, businessId), eq(decisionCandidates.id, decisionId)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertDecisionCandidate(data: DecisionCandidateWrite) {
  const db = await getDb();
  if (!db) return { id: null, created: false, changed: false, previous: null, row: null };

  const existingRows = await db
    .select()
    .from(decisionCandidates)
    .where(and(eq(decisionCandidates.businessId, data.businessId), eq(decisionCandidates.decisionKey, data.decisionKey)))
    .limit(1);
  const existing = existingRows[0] || null;

  if (existing) {
    const changed = existing.sourceFingerprint !== data.sourceFingerprint ||
      existing.priorityScore !== data.priorityScore ||
      existing.urgency !== data.urgency ||
      existing.evidenceStrength !== data.evidenceStrength ||
      existing.whyMatters !== data.whyMatters ||
      existing.strategicAlignment !== data.strategicAlignment ||
      existing.dependencyText !== (data.dependencyText || null) ||
      existing.conflictKeysJson !== (data.conflictKeysJson || null);

    if (!changed) {
      return {
        id: existing.id,
        created: false,
        changed: false,
        previous: existing,
        row: existing,
      };
    }

    await db
      .update(decisionCandidates)
      .set({
        ...data,
        status: existing.status,
        outcomeId: existing.outcomeId,
        updatedAt: new Date(),
        lastEvaluatedAt: new Date(),
      })
      .where(and(eq(decisionCandidates.businessId, data.businessId), eq(decisionCandidates.id, existing.id)));

    return {
      id: existing.id,
      created: false,
      changed: true,
      previous: existing,
      row: { ...existing, ...data, status: existing.status, id: existing.id },
    };
  }

  const res = await db.insert(decisionCandidates).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  return {
    id,
    created: true,
    changed: true,
    previous: null,
    row: id ? ({ ...data, id } as DecisionCandidate) : null,
  };
}

export async function updateDecisionCandidateLifecycle(
  businessId: number,
  decisionId: number,
  status: DecisionLifecycleStatus,
  outcomeId?: number | null,
  detailsJson?: string
) {
  const db = await getDb();
  if (!db) return null;

  const existing = await getDecisionCandidateById(businessId, decisionId);
  if (!existing) return null;
  if (existing.status === status && (outcomeId === undefined || existing.outcomeId === outcomeId)) return existing;

  await db
    .update(decisionCandidates)
    .set({
      status,
      outcomeId: outcomeId === undefined ? existing.outcomeId : outcomeId,
      updatedAt: new Date(),
    })
    .where(and(eq(decisionCandidates.businessId, businessId), eq(decisionCandidates.id, decisionId)));

  await createDecisionEvent({
    businessId,
    decisionId,
    eventType: "LIFECYCLE_CHANGED",
    previousStatus: existing.status,
    newStatus: status,
    detailsJson: detailsJson || JSON.stringify({ outcomeId: outcomeId ?? existing.outcomeId ?? null }),
  });

  return await getDecisionCandidateById(businessId, decisionId);
}

export async function createDecisionEvent(data: {
  businessId: number;
  decisionId: number;
  eventType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  detailsJson?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(decisionEvents).values({
    businessId: data.businessId,
    decisionId: data.decisionId,
    eventType: data.eventType,
    previousStatus: data.previousStatus || null,
    newStatus: data.newStatus || null,
    detailsJson: data.detailsJson || null,
  });
  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getDecisionEvents(businessId: number, decisionId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(decisionEvents)
    .where(and(eq(decisionEvents.businessId, businessId), eq(decisionEvents.decisionId, decisionId)))
    .orderBy(desc(decisionEvents.timestamp))
    .limit(limit);
}

export async function getOutcomeByIdForBusiness(businessId: number, outcomeId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(outcomes)
    .where(and(eq(outcomes.businessId, businessId), eq(outcomes.id, outcomeId)))
    .limit(1);
  return rows[0] || null;
}

export async function createActionLinkedOutcome(input: InsertOutcome) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(outcomes).values(input);
  return result;
}


/**
 * ============================================================
 * CONTINUOUS MONITORING OPERATIONS (DAY 22)
 * ============================================================
 */

export type MonitoringLifecycleStatus = "NEW" | "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
export type MonitoringEventWrite = Omit<InsertMonitoringEvent, "id" | "createdAt" | "updatedAt">;

const monitoringLevelScore: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export async function getMonitoringEvents(
  businessId: number,
  options: { limit?: number; status?: MonitoringLifecycleStatus; eventType?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(monitoringEvents.businessId, businessId)];
  if (options.status) conditions.push(eq(monitoringEvents.status, options.status));
  if (options.eventType) conditions.push(eq(monitoringEvents.eventType, options.eventType));
  return await db
    .select()
    .from(monitoringEvents)
    .where(and(...conditions))
    .orderBy(desc(monitoringEvents.priorityScore), desc(monitoringEvents.lastSeenAt), asc(monitoringEvents.id))
    .limit(Math.min(options.limit ?? 50, 100));
}

export async function getMonitoringEventById(businessId: number, eventId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(monitoringEvents)
    .where(and(eq(monitoringEvents.businessId, businessId), eq(monitoringEvents.id, eventId)))
    .limit(1);
  return rows[0] || null;
}

export async function getMonitoringEventByFingerprint(businessId: number, fingerprint: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(monitoringEvents)
    .where(and(eq(monitoringEvents.businessId, businessId), eq(monitoringEvents.fingerprint, fingerprint)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertMonitoringEvent(data: MonitoringEventWrite) {
  const db = await getDb();
  if (!db) return { id: null, created: false, changed: false, escalated: false, previous: null, row: null };

  const existing = await getMonitoringEventByFingerprint(data.businessId, data.fingerprint);
  if (!existing) {
    const res = await db.insert(monitoringEvents).values(data);
    const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
    const row = id ? ({ ...data, id } as MonitoringEvent) : null;
    if (id) {
      await createMonitoringEventHistory({
        businessId: data.businessId,
        eventId: id,
        eventType: "CREATED",
        newStatus: data.status || "NEW",
        newSeverity: data.severity,
        newPriority: data.priority,
        detailsJson: JSON.stringify({ fingerprint: data.fingerprint }),
      });
    }
    return { id, created: true, changed: true, escalated: false, previous: null, row };
  }

  const previousSeverityScore = monitoringLevelScore[existing.severity] || 0;
  const nextSeverityScore = monitoringLevelScore[data.severity || ""] || 0;
  const previousPriorityScore = monitoringLevelScore[existing.priority] || 0;
  const nextPriorityScore = monitoringLevelScore[data.priority || ""] || 0;
  const escalated = nextSeverityScore > previousSeverityScore || nextPriorityScore > previousPriorityScore;
  const contentChanged = existing.title !== data.title ||
    existing.summary !== data.summary ||
    existing.whatChanged !== data.whatChanged ||
    existing.whyMatters !== data.whyMatters ||
    existing.evidenceJson !== data.evidenceJson ||
    existing.currentState !== (data.currentState || null);

  const update: Partial<InsertMonitoringEvent> = {
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  };
  if (contentChanged || escalated) {
    Object.assign(update, {
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      firstDetectedAt: existing.firstDetectedAt,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
      status: existing.status === "DISMISSED" ? "DISMISSED" : existing.status === "RESOLVED" ? "ACTIVE" : existing.status,
      resolvedAt: existing.status === "RESOLVED" ? null : existing.resolvedAt,
      dismissedAt: existing.status === "DISMISSED" ? existing.dismissedAt : data.dismissedAt,
      dismissalReason: existing.status === "DISMISSED" ? existing.dismissalReason : data.dismissalReason,
    });
  }

  await db
    .update(monitoringEvents)
    .set(update)
    .where(and(eq(monitoringEvents.businessId, data.businessId), eq(monitoringEvents.id, existing.id)));

  if (contentChanged || escalated) {
    await createMonitoringEventHistory({
      businessId: data.businessId,
      eventId: existing.id,
      eventType: escalated ? "ESCALATED" : "UPDATED",
      previousStatus: existing.status,
      newStatus: existing.status === "DISMISSED" ? "DISMISSED" : existing.status === "RESOLVED" ? "ACTIVE" : existing.status,
      previousSeverity: existing.severity,
      newSeverity: data.severity,
      previousPriority: existing.priority,
      newPriority: data.priority,
      detailsJson: JSON.stringify({ contentChanged, escalated }),
    });
  }

  return {
    id: existing.id,
    created: false,
    changed: contentChanged || escalated,
    escalated,
    previous: existing,
    row: { ...existing, ...data, ...update, id: existing.id },
  };
}

export async function updateMonitoringEventLifecycle(
  businessId: number,
  eventId: number,
  status: MonitoringLifecycleStatus,
  detailsJson?: string,
  dismissalReason?: string | null
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getMonitoringEventById(businessId, eventId);
  if (!existing) return null;
  if (existing.status === status && !(status === "DISMISSED" && dismissalReason && dismissalReason !== existing.dismissalReason)) return existing;

  const now = new Date();
  const update: Partial<InsertMonitoringEvent> = { status, updatedAt: now };
  if (status === "RESOLVED") update.resolvedAt = now;
  if (status === "DISMISSED") {
    update.dismissedAt = now;
    update.dismissalReason = dismissalReason || existing.dismissalReason || null;
  }
  if (status !== "RESOLVED") update.resolvedAt = null;
  await db
    .update(monitoringEvents)
    .set(update)
    .where(and(eq(monitoringEvents.businessId, businessId), eq(monitoringEvents.id, eventId)));

  await createMonitoringEventHistory({
    businessId,
    eventId,
    eventType: "LIFECYCLE_CHANGED",
    previousStatus: existing.status,
    newStatus: status,
    detailsJson: detailsJson || JSON.stringify({ dismissalReason: dismissalReason || null }),
  });
  return await getMonitoringEventById(businessId, eventId);
}

export async function createMonitoringEventHistory(data: InsertMonitoringEventHistory) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(monitoringEventHistory).values(data);
  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getMonitoringEventHistory(businessId: number, eventId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(monitoringEventHistory)
    .where(and(eq(monitoringEventHistory.businessId, businessId), eq(monitoringEventHistory.eventId, eventId)))
    .orderBy(desc(monitoringEventHistory.timestamp), desc(monitoringEventHistory.id))
    .limit(Math.min(limit, 100));
}

export async function getMonitoringPreference(businessId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(monitoringPreferences)
    .where(eq(monitoringPreferences.businessId, businessId))
    .limit(1);
  return rows[0] || null;
}

export async function upsertMonitoringPreference(data: Omit<InsertMonitoringPreference, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getMonitoringPreference(data.businessId);
  if (!existing) {
    const res = await db.insert(monitoringPreferences).values(data);
    const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
    return id ? ({ ...data, id } as typeof monitoringPreferences.$inferSelect) : null;
  }
  await db
    .update(monitoringPreferences)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(monitoringPreferences.businessId, data.businessId), eq(monitoringPreferences.id, existing.id)));
  return await getMonitoringPreference(data.businessId);
}


export async function getAllMonitoringEvents(businessId: number) {
  return await getMonitoringEvents(businessId, { limit: 100 });
}

export async function getRecentOutcomes(businessId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(outcomes)
    .where(eq(outcomes.businessId, businessId))
    .orderBy(desc(outcomes.updatedAt), desc(outcomes.id))
    .limit(Math.min(limit, 100));
}


/**
 * ============================================================
 * CROSS-SIGNAL RELATIONSHIPS (DAY 23)
 * ============================================================
 */

export type SignalRelationshipLifecycleStatus = "NEW" | "ACTIVE" | "WEAKENING" | "RESOLVED";
export type SignalRelationshipWrite = Omit<InsertSignalRelationship, "id" | "createdAt" | "updatedAt">;
export type SignalClusterWrite = Omit<InsertSignalCluster, "id" | "createdAt" | "updatedAt">;

export async function getSignalRelationships(
  businessId: number,
  options: { limit?: number; status?: SignalRelationshipLifecycleStatus; relationshipType?: string; signalKey?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(signalRelationships.businessId, businessId)];
  if (options.status) conditions.push(eq(signalRelationships.status, options.status));
  if (options.relationshipType) conditions.push(eq(signalRelationships.relationshipType, options.relationshipType));
  if (options.signalKey) {
    conditions.push(or(eq(signalRelationships.signalAKey, options.signalKey), eq(signalRelationships.signalBKey, options.signalKey))!);
  }
  return await db
    .select()
    .from(signalRelationships)
    .where(and(...conditions))
    .orderBy(desc(signalRelationships.evidenceCount), desc(signalRelationships.lastObservedAt), asc(signalRelationships.id))
    .limit(Math.min(options.limit ?? 25, 100));
}

export async function getSignalRelationshipById(businessId: number, relationshipId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(signalRelationships)
    .where(and(eq(signalRelationships.businessId, businessId), eq(signalRelationships.id, relationshipId)))
    .limit(1);
  return rows[0] || null;
}

export async function getSignalRelationshipByKey(businessId: number, relationshipKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(signalRelationships)
    .where(and(eq(signalRelationships.businessId, businessId), eq(signalRelationships.relationshipKey, relationshipKey)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertSignalRelationship(data: SignalRelationshipWrite) {
  const db = await getDb();
  if (!db) return { id: null, created: false, changed: false, previous: null, row: null };

  const existing = await getSignalRelationshipByKey(data.businessId, data.relationshipKey);
  if (!existing) {
    const res = await db.insert(signalRelationships).values(data);
    const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
    const row = id ? ({ ...data, id } as SignalRelationship) : null;
    if (id) {
      await createSignalRelationshipHistory({
        businessId: data.businessId,
        relationshipId: id,
        eventType: "CREATED",
        newStatus: data.status || "NEW",
        newStrength: data.strength || "UNKNOWN",
        detailsJson: JSON.stringify({ relationshipKey: data.relationshipKey }),
      });
    }
    return { id, created: true, changed: true, previous: null, row };
  }

  const contentChanged = existing.relationshipType !== data.relationshipType ||
    existing.strength !== data.strength ||
    existing.stability !== data.stability ||
    existing.freshness !== data.freshness ||
    existing.evidenceCount !== data.evidenceCount ||
    existing.evidenceJson !== data.evidenceJson ||
    existing.relatedSituationIdsJson !== (data.relatedSituationIdsJson || null) ||
    existing.relatedOpportunityIdsJson !== (data.relatedOpportunityIdsJson || null) ||
    existing.relatedDecisionIdsJson !== (data.relatedDecisionIdsJson || null) ||
    existing.relatedStrategyIdsJson !== (data.relatedStrategyIdsJson || null) ||
    existing.relatedOutcomeIdsJson !== (data.relatedOutcomeIdsJson || null);
  const statusChanged = existing.status !== data.status;
  const now = new Date();
  const nextStatus = existing.status === "RESOLVED" && data.status !== "RESOLVED" ? "ACTIVE" : (data.status || existing.status);
  const update: Partial<InsertSignalRelationship> = {
    lastObservedAt: now,
    updatedAt: now,
    status: nextStatus,
  };
  if (contentChanged || statusChanged) {
    Object.assign(update, {
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      firstObservedAt: existing.firstObservedAt,
      lastObservedAt: now,
      updatedAt: now,
      status: nextStatus,
    });
  }

  if (contentChanged || statusChanged || existing.status === "RESOLVED") {
    await db
      .update(signalRelationships)
      .set(update)
      .where(and(eq(signalRelationships.businessId, data.businessId), eq(signalRelationships.id, existing.id)));
    await createSignalRelationshipHistory({
      businessId: data.businessId,
      relationshipId: existing.id,
      eventType: statusChanged ? "LIFECYCLE_CHANGED" : "UPDATED",
      previousStatus: existing.status,
      newStatus: nextStatus,
      previousStrength: existing.strength,
      newStrength: data.strength,
      detailsJson: JSON.stringify({ contentChanged, statusChanged }),
    });
  }

  return {
    id: existing.id,
    created: false,
    changed: contentChanged || statusChanged || existing.status === "RESOLVED",
    previous: existing,
    row: { ...existing, ...data, ...update, id: existing.id, status: nextStatus },
  };
}

export async function updateSignalRelationshipLifecycle(
  businessId: number,
  relationshipId: number,
  status: SignalRelationshipLifecycleStatus,
  detailsJson?: string
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getSignalRelationshipById(businessId, relationshipId);
  if (!existing || existing.status === status) return existing;
  await db
    .update(signalRelationships)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(signalRelationships.businessId, businessId), eq(signalRelationships.id, relationshipId)));
  await createSignalRelationshipHistory({
    businessId,
    relationshipId,
    eventType: "LIFECYCLE_CHANGED",
    previousStatus: existing.status,
    newStatus: status,
    previousStrength: existing.strength,
    newStrength: existing.strength,
    detailsJson,
  });
  return await getSignalRelationshipById(businessId, relationshipId);
}

export async function createSignalRelationshipHistory(data: InsertSignalRelationshipHistory) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(signalRelationshipHistory).values(data);
  return res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
}

export async function getSignalRelationshipHistory(businessId: number, relationshipId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(signalRelationshipHistory)
    .where(and(eq(signalRelationshipHistory.businessId, businessId), eq(signalRelationshipHistory.relationshipId, relationshipId)))
    .orderBy(desc(signalRelationshipHistory.timestamp), desc(signalRelationshipHistory.id))
    .limit(Math.min(limit, 100));
}

export async function getSignalClusters(businessId: number, options: { limit?: number; status?: SignalRelationshipLifecycleStatus; theme?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(signalClusters.businessId, businessId)];
  if (options.status) conditions.push(eq(signalClusters.status, options.status));
  if (options.theme) conditions.push(eq(signalClusters.theme, options.theme));
  return await db
    .select()
    .from(signalClusters)
    .where(and(...conditions))
    .orderBy(desc(signalClusters.evidenceCount), desc(signalClusters.lastObservedAt), asc(signalClusters.id))
    .limit(Math.min(options.limit ?? 15, 50));
}

export async function getSignalClusterById(businessId: number, clusterId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(signalClusters)
    .where(and(eq(signalClusters.businessId, businessId), eq(signalClusters.id, clusterId)))
    .limit(1);
  return rows[0] || null;
}

export async function getSignalClusterByKey(businessId: number, clusterKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(signalClusters)
    .where(and(eq(signalClusters.businessId, businessId), eq(signalClusters.clusterKey, clusterKey)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertSignalCluster(data: SignalClusterWrite) {
  const db = await getDb();
  if (!db) return { id: null, created: false, changed: false, previous: null, row: null };
  const existing = await getSignalClusterByKey(data.businessId, data.clusterKey);
  if (!existing) {
    const res = await db.insert(signalClusters).values(data);
    const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
    return { id, created: true, changed: true, previous: null, row: id ? ({ ...data, id } as SignalCluster) : null };
  }
  const changed = existing.relationshipIdsJson !== data.relationshipIdsJson ||
    existing.evidenceJson !== data.evidenceJson ||
    existing.strength !== data.strength ||
    existing.freshness !== data.freshness ||
    existing.status !== data.status;
  const update: Partial<InsertSignalCluster> = changed ? { ...data, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } : { lastObservedAt: new Date(), updatedAt: new Date() };
  await db.update(signalClusters).set(update).where(and(eq(signalClusters.businessId, data.businessId), eq(signalClusters.id, existing.id)));
  return { id: existing.id, created: false, changed, previous: existing, row: { ...existing, ...data, ...update, id: existing.id } };
}


/**
 * ============================================================
 * DAY 24 — BUSINESS TRAJECTORY PERSISTENCE
 * ============================================================
 */
export type BusinessTrajectoryWrite = Omit<InsertBusinessTrajectory, "id" | "createdAt" | "updatedAt">;
export type TrajectoryForecastSnapshotWrite = Omit<InsertTrajectoryForecastSnapshot, "id" | "createdAt" | "updatedAt">;
export type TrajectoryLearningSignalWrite = Omit<InsertTrajectoryLearningSignal, "id" | "createdAt">;
export type TrajectoryHistoryWrite = Omit<InsertTrajectoryHistory, "id" | "createdAt">;

export async function getBusinessTrajectories(
  businessId: number,
  options: { metricKey?: string; limit?: number } = {}
): Promise<BusinessTrajectory[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(businessTrajectories.businessId, businessId)];
  if (options.metricKey) conditions.push(eq(businessTrajectories.metricKey, options.metricKey));
  return db
    .select()
    .from(businessTrajectories)
    .where(and(...conditions))
    .orderBy(desc(businessTrajectories.updatedAt), asc(businessTrajectories.id))
    .limit(Math.min(options.limit ?? 25, 100));
}

export async function getBusinessTrajectoryById(businessId: number, trajectoryId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessTrajectories)
    .where(and(eq(businessTrajectories.businessId, businessId), eq(businessTrajectories.id, trajectoryId)))
    .limit(1);
  return rows[0] || null;
}

export async function getBusinessTrajectoryByMetric(businessId: number, metricKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessTrajectories)
    .where(and(eq(businessTrajectories.businessId, businessId), eq(businessTrajectories.metricKey, metricKey)))
    .orderBy(desc(businessTrajectories.updatedAt), desc(businessTrajectories.id))
    .limit(1);
  return rows[0] || null;
}

export async function upsertBusinessTrajectory(data: BusinessTrajectoryWrite) {
  const db = await getDb();
  if (!db) return { id: null, created: false, changed: false, previous: null, row: null };
  const existing = await getBusinessTrajectoryByMetric(data.businessId, data.metricKey);
  if (!existing) {
    const result = await db.insert(businessTrajectories).values(data);
    const id = result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
    return { id, created: true, changed: true, previous: null, row: id ? ({ ...data, id } as BusinessTrajectory) : null };
  }
  const changed = existing.status !== data.status ||
    existing.direction !== data.direction ||
    existing.momentum !== data.momentum ||
    existing.projectedValue !== data.projectedValue ||
    existing.earlyWarningsJson !== data.earlyWarningsJson ||
    existing.evidenceJson !== data.evidenceJson;
  const update: Partial<InsertBusinessTrajectory> = changed
    ? { ...data, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() }
    : { lastObservedAt: data.lastObservedAt, updatedAt: new Date() };
  await db
    .update(businessTrajectories)
    .set(update)
    .where(and(eq(businessTrajectories.businessId, data.businessId), eq(businessTrajectories.id, existing.id)));
  return { id: existing.id, created: false, changed, previous: existing, row: { ...existing, ...data, ...update, id: existing.id } };
}

export async function createTrajectoryForecastSnapshot(data: TrajectoryForecastSnapshotWrite) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(trajectoryForecastSnapshots).values(data);
  return result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
}

export async function getTrajectoryForecastSnapshots(
  businessId: number,
  options: { trajectoryId?: number; metricKey?: string; limit?: number } = {}
): Promise<TrajectoryForecastSnapshot[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(trajectoryForecastSnapshots.businessId, businessId)];
  if (options.trajectoryId !== undefined) conditions.push(eq(trajectoryForecastSnapshots.trajectoryId, options.trajectoryId));
  if (options.metricKey) conditions.push(eq(trajectoryForecastSnapshots.metricKey, options.metricKey));
  return db
    .select()
    .from(trajectoryForecastSnapshots)
    .where(and(...conditions))
    .orderBy(desc(trajectoryForecastSnapshots.forecastedAt), desc(trajectoryForecastSnapshots.id))
    .limit(Math.min(options.limit ?? 25, 100));
}

export async function getTrajectoryForecastSnapshotById(businessId: number, snapshotId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(trajectoryForecastSnapshots)
    .where(and(eq(trajectoryForecastSnapshots.businessId, businessId), eq(trajectoryForecastSnapshots.id, snapshotId)))
    .limit(1);
  return rows[0] || null;
}

export async function updateTrajectoryForecastActual(
  businessId: number,
  snapshotId: number,
  data: Pick<TrajectoryForecastSnapshotWrite, "actualValue" | "actualObservedAt" | "comparisonStatus" | "comparisonNotes">
) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(trajectoryForecastSnapshots)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(trajectoryForecastSnapshots.businessId, businessId), eq(trajectoryForecastSnapshots.id, snapshotId)));
  return await getTrajectoryForecastSnapshotById(businessId, snapshotId);
}

export async function createTrajectoryLearningSignal(data: TrajectoryLearningSignalWrite) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(trajectoryLearningSignals).values(data);
  return result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
}

export async function createTrajectoryHistory(data: TrajectoryHistoryWrite) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(trajectoryHistory).values(data);
  return result && Array.isArray(result) && result[0]?.insertId ? Number(result[0].insertId) : null;
}

export async function getTrajectoryHistory(businessId: number, trajectoryId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trajectoryHistory)
    .where(and(eq(trajectoryHistory.businessId, businessId), eq(trajectoryHistory.trajectoryId, trajectoryId)))
    .orderBy(desc(trajectoryHistory.timestamp), desc(trajectoryHistory.id))
    .limit(Math.min(limit, 100));
}


/**
 * ============================================================
 * DAY 28: EXTERNAL WORLD INTELLIGENCE & EARLY-WARNING RADAR
 * ============================================================
 */
export type ExternalEventStatus = "NEW" | "REVIEWED" | "RELEVANT" | "IRRELEVANT" | "MONITORING" | "RESOLVED" | "ARCHIVED";
export type ExternalEventWrite = Omit<InsertExternalEvent, "id" | "createdAt" | "updatedAt">;

export async function getExternalEvents(
  businessId: number,
  options: { limit?: number; status?: ExternalEventStatus; relevanceLevel?: string; eventType?: string } = {}
) {
  const db = await getDb();
  if (!db) return [] as ExternalEvent[];
  const conditions = [eq(externalEvents.businessId, businessId)];
  if (options.status) conditions.push(eq(externalEvents.status, options.status));
  if (options.relevanceLevel) conditions.push(eq(externalEvents.relevanceLevel, options.relevanceLevel));
  if (options.eventType) conditions.push(eq(externalEvents.eventType, options.eventType));
  return await db
    .select()
    .from(externalEvents)
    .where(and(...conditions))
    .orderBy(desc(externalEvents.updatedAt), desc(externalEvents.id))
    .limit(Math.min(options.limit ?? 100, 200));
}

export async function getExternalEventById(businessId: number, eventId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(externalEvents)
    .where(and(eq(externalEvents.businessId, businessId), eq(externalEvents.id, eventId)))
    .limit(1);
  return rows[0] || null;
}

export async function getExternalEventByFingerprint(businessId: number, fingerprint: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(externalEvents)
    .where(and(eq(externalEvents.businessId, businessId), eq(externalEvents.fingerprint, fingerprint)))
    .limit(1);
  return rows[0] || null;
}

export async function getExternalEventsByNormalizationKey(businessId: number, normalizationKey: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(externalEvents)
    .where(and(eq(externalEvents.businessId, businessId), eq(externalEvents.normalizationKey, normalizationKey)))
    .orderBy(desc(externalEvents.detectedAt), desc(externalEvents.id))
    .limit(20);
}

export async function createExternalEvent(data: ExternalEventWrite) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(externalEvents).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  return id ? await getExternalEventById(data.businessId, id) : null;
}

export async function updateExternalEvent(
  businessId: number,
  eventId: number,
  data: Partial<Omit<InsertExternalEvent, "id" | "businessId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(externalEvents)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(externalEvents.businessId, businessId), eq(externalEvents.id, eventId)));
  return await getExternalEventById(businessId, eventId);
}

export async function createExternalEventReview(data: Omit<InsertExternalEventReview, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(externalEventReviews).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  return id ? ({ ...data, id } as ExternalEventReview) : null;
}

export async function getExternalEventReviews(businessId: number, eventId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [] as ExternalEventReview[];
  return await db
    .select()
    .from(externalEventReviews)
    .where(and(eq(externalEventReviews.businessId, businessId), eq(externalEventReviews.eventId, eventId)))
    .orderBy(desc(externalEventReviews.createdAt), desc(externalEventReviews.id))
    .limit(Math.min(limit, 100));
}

export async function getExternalRadarSnapshotByFingerprint(businessId: number, fingerprint: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(externalRadarSnapshots)
    .where(and(eq(externalRadarSnapshots.businessId, businessId), eq(externalRadarSnapshots.fingerprint, fingerprint)))
    .orderBy(desc(externalRadarSnapshots.lastEvaluatedAt), desc(externalRadarSnapshots.id))
    .limit(1);
  return rows[0] || null;
}

export async function getLatestExternalRadarSnapshot(businessId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(externalRadarSnapshots)
    .where(eq(externalRadarSnapshots.businessId, businessId))
    .orderBy(desc(externalRadarSnapshots.lastEvaluatedAt), desc(externalRadarSnapshots.id))
    .limit(1);
  return rows[0] || null;
}

export async function upsertExternalRadarSnapshot(data: Omit<InsertExternalRadarSnapshot, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getExternalRadarSnapshotByFingerprint(data.businessId, data.fingerprint);
  if (existing) {
    await db
      .update(externalRadarSnapshots)
      .set({ ...data, updatedAt: new Date(), lastEvaluatedAt: data.lastEvaluatedAt || new Date() })
      .where(and(eq(externalRadarSnapshots.businessId, data.businessId), eq(externalRadarSnapshots.id, existing.id)));
    return await getExternalRadarSnapshotByFingerprint(data.businessId, data.fingerprint);
  }
  const res = await db.insert(externalRadarSnapshots).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  if (!id) return null;
  const rows = await db
    .select()
    .from(externalRadarSnapshots)
    .where(and(eq(externalRadarSnapshots.businessId, data.businessId), eq(externalRadarSnapshots.id, id)))
    .limit(1);
  return rows[0] || null;
}

export async function getStrategiesForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategies)
    .where(eq(strategies.businessId, businessId))
    .orderBy(desc(strategies.updatedAt), desc(strategies.id));
}

export async function getBusinessesForExternalRadar(businessId: number) {
  return await getBusinessById(businessId);
}

export async function getCompetitorActivityByBusiness(businessId: number) {
  return await getCompetitorActivities(businessId);
}

export async function getRecommendationsForExternalRadar(businessId: number) {
  return await getRecommendations(businessId);
}

export async function getSituationsForExternalRadar(businessId: number) {
  return await getBusinessSituations(businessId);
}

export async function getOpportunitiesForExternalRadar(businessId: number) {
  return await getOpportunities(businessId);
}

export async function getOutcomesForExternalRadar(businessId: number) {
  return await getRecentOutcomes(businessId, 20);
}

export async function getMarketSignalsForExternalRadar(businessId: number, limit = 100) {
  return await getMarketSignals(businessId, Math.min(limit, 200));
}

export async function getCompetitorsForExternalRadar(businessId: number) {
  return await getCompetitors(businessId);
}

export async function getCrossSignalRelationshipsForExternalRadar(businessId: number) {
  return await getSignalRelationships(businessId, { limit: 100 });
}

export async function getTrajectoriesForExternalRadar(businessId: number) {
  return await getBusinessTrajectories(businessId, { limit: 50 });
}

export async function getStrategyHealthSnapshotsForExternalRadar(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(strategyHealthSnapshots)
    .where(eq(strategyHealthSnapshots.businessId, businessId))
    .orderBy(desc(strategyHealthSnapshots.lastEvaluatedAt), desc(strategyHealthSnapshots.id))
    .limit(50);
}

export async function getExternalEventHistoryForBusiness(businessId: number, eventId: number) {
  return await getExternalEventReviews(businessId, eventId, 50);
}

export async function setExternalEventStatus(
  businessId: number,
  eventId: number,
  status: ExternalEventStatus,
  action: string,
  rationale?: string
) {
  const existing = await getExternalEventById(businessId, eventId);
  if (!existing) return null;
  if (existing.status === status && !rationale) return existing;
  const updated = await updateExternalEvent(businessId, eventId, { status });
  await createExternalEventReview({
    businessId,
    eventId,
    action,
    previousStatus: existing.status,
    newStatus: status,
    rationale: rationale || null,
    evidenceJson: JSON.stringify({ fingerprint: existing.fingerprint, referenceUrl: existing.referenceUrl }),
  });
  return updated;
}

/**
 * Day 28 compatibility aliases keep the service readable while ensuring all
 * persistence remains tenant-scoped through the shared helpers above.
 */
export const getExternalRadarEvents = getExternalEvents;
export const getExternalRadarEventById = getExternalEventById;
export const updateExternalRadarEventStatus = setExternalEventStatus;
export const getExternalRadarEventHistory = getExternalEventHistoryForBusiness;
export const getExternalRadarSnapshot = getLatestExternalRadarSnapshot;


export async function getAttentionItemsForBusiness(businessId: number, options?: { tier?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(attentionItems.businessId, businessId)];
  if (options?.tier) conditions.push(eq(attentionItems.tier, options.tier));
  if (options?.status) conditions.push(eq(attentionItems.status, options.status as any));
  return await db
    .select()
    .from(attentionItems)
    .where(and(...conditions))
    .orderBy(desc(attentionItems.priorityScore), desc(attentionItems.updatedAt));
}

export async function getAttentionItemById(businessId: number, itemId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(attentionItems)
    .where(and(eq(attentionItems.businessId, businessId), eq(attentionItems.id, itemId)))
    .limit(1);
  return rows[0] || null;
}

export async function createAttentionItem(data: Omit<InsertAttentionItem, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(attentionItems).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  if (!id) return null;
  return await getAttentionItemById(data.businessId, id);
}

export async function updateAttentionItem(businessId: number, itemId: number, data: Partial<InsertAttentionItem>) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(attentionItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(attentionItems.businessId, businessId), eq(attentionItems.id, itemId)));
  return await getAttentionItemById(businessId, itemId);
}

export async function getAttentionReviewLogsForBusiness(businessId: number, attentionItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(attentionReviewLogs)
    .where(and(eq(attentionReviewLogs.businessId, businessId), eq(attentionReviewLogs.attentionItemId, attentionItemId)))
    .orderBy(desc(attentionReviewLogs.createdAt));
}

export async function createAttentionReviewLogEntry(data: Omit<InsertAttentionReviewLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(attentionReviewLogs).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  if (!id) return null;
  const rows = await db
    .select()
    .from(attentionReviewLogs)
    .where(and(eq(attentionReviewLogs.businessId, data.businessId), eq(attentionReviewLogs.id, id)))
    .limit(1);
  return rows[0] || null;
}


export async function getLatestStrategyHealthSnapshot(businessId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(strategyHealthSnapshots)
    .where(eq(strategyHealthSnapshots.businessId, businessId))
    .orderBy(desc(strategyHealthSnapshots.lastEvaluatedAt), desc(strategyHealthSnapshots.id))
    .limit(1);
  return rows[0] || null;
}

export async function getLatestDailyBrief(businessId: number, briefDate?: string) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(dailyBriefs.businessId, businessId)];
  if (briefDate) {
    conditions.push(eq(dailyBriefs.briefDate, briefDate));
  }
  const rows = await db
    .select()
    .from(dailyBriefs)
    .where(and(...conditions))
    .orderBy(desc(dailyBriefs.createdAt), desc(dailyBriefs.id))
    .limit(1);
  return rows[0] || null;
}

export async function createDailyBrief(data: InsertDailyBrief) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(dailyBriefs).values(data);
  const id = res && Array.isArray(res) && res[0]?.insertId ? Number(res[0].insertId) : null;
  if (!id) return null;
  const rows = await db
    .select()
    .from(dailyBriefs)
    .where(and(eq(dailyBriefs.businessId, data.businessId), eq(dailyBriefs.id, id)))
    .limit(1);
  return rows[0] || null;
}


/**
 * ============================================================
 * DAY 31–32: ACTION PLAN OPERATIONS
 * ============================================================
 */
export async function createActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(actionPlans).values(data);
}

export async function getActionPlansForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.businessId, businessId))
    .orderBy(desc(actionPlans.updatedAt));
}

export async function getActionPlanById(businessId: number, actionPlanId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(actionPlans)
    .where(and(eq(actionPlans.businessId, businessId), eq(actionPlans.id, actionPlanId)))
    .limit(1);
  return rows[0];
}

export async function updateActionPlan(
  businessId: number,
  actionPlanId: number,
  data: Partial<InsertActionPlan>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(actionPlans)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(actionPlans.businessId, businessId), eq(actionPlans.id, actionPlanId)));
}

export async function createActionPlanEvent(data: InsertActionPlanEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(actionPlanEvents).values(data);
}

export async function getActionPlanEvents(businessId: number, actionPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionPlanEvents)
    .where(and(eq(actionPlanEvents.businessId, businessId), eq(actionPlanEvents.actionPlanId, actionPlanId)))
    .orderBy(desc(actionPlanEvents.createdAt));
}


export async function getStrategyById(businessId: number, strategyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(strategies)
    .where(and(eq(strategies.businessId, businessId), eq(strategies.id, strategyId)))
    .limit(1);
  return rows[0];
}

export async function getScenarioAssumptions(businessId: number, scenarioId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(scenarioAssumptions)
    .where(and(eq(scenarioAssumptions.businessId, businessId), eq(scenarioAssumptions.scenarioId, scenarioId)))
    .orderBy(desc(scenarioAssumptions.createdAt));
}

export async function createScenarioAssumption(data: {
  businessId: number;
  scenarioId: number;
  metric: string;
  baselineValue: string;
  scenarioValue: string;
  percentageChange?: string;
  unit?: string;
  source?: string;
  confidence?: string;
  rationale?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(scenarioAssumptions).values({
    businessId: data.businessId,
    scenarioId: data.scenarioId,
    metric: data.metric,
    baselineValue: data.baselineValue,
    scenarioValue: data.scenarioValue,
    percentageChange: data.percentageChange || null,
    unit: data.unit || "INR",
    source: data.source || "USER_ASSUMPTION",
    confidence: data.confidence || "MEDIUM",
    rationale: data.rationale || null,
  });
  return res[0]?.insertId || null;
}

export async function getScenarioReviews(businessId: number, scenarioId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(scenarioReviews)
    .where(and(eq(scenarioReviews.businessId, businessId), eq(scenarioReviews.scenarioId, scenarioId)))
    .orderBy(desc(scenarioReviews.createdAt));
}

export async function createScenarioReview(data: {
  businessId: number;
  scenarioId: number;
  metric: string;
  predictedChange: string;
  actualChange: string;
  difference: string;
  status?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(scenarioReviews).values({
    businessId: data.businessId,
    scenarioId: data.scenarioId,
    metric: data.metric,
    predictedChange: data.predictedChange,
    actualChange: data.actualChange,
    difference: data.difference,
    status: data.status || "CLOSE",
    notes: data.notes || null,
  });
  return res[0]?.insertId || null;
}

export async function getForesightSignalsForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foresightSignals).where(eq(foresightSignals.businessId, businessId));
}

export async function createForesightSignal(data: InsertForesightSignal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(foresightSignals).values(data);
  const [created] = await db.select().from(foresightSignals).where(eq(foresightSignals.id, result.insertId));
  return created;
}

export async function updateForesightSignal(id: number, businessId: number, data: Partial<InsertForesightSignal>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(foresightSignals).set(data).where(and(eq(foresightSignals.id, id), eq(foresightSignals.businessId, businessId)));
  const [updated] = await db.select().from(foresightSignals).where(eq(foresightSignals.id, id));
  return updated;
}

export async function getForesightWatchlistForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foresightWatchlist).where(eq(foresightWatchlist.businessId, businessId));
}

export async function createForesightWatchlistRecord(data: InsertForesightWatchlistRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(foresightWatchlist).values(data);
  const [created] = await db.select().from(foresightWatchlist).where(eq(foresightWatchlist.id, result.insertId));
  return created;
}

export async function removeForesightWatchlistRecord(id: number, businessId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(foresightWatchlist).where(and(eq(foresightWatchlist.id, id), eq(foresightWatchlist.businessId, businessId)));
  return true;
}

export async function getBusinessMemoriesForBusiness(businessId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(desc(businessMemories.createdAt))
    .limit(limit);
}

export async function createBusinessMemory(data: InsertBusinessMemoryRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deduplicate: check if similar recent memory exists for same sourceType and sourceId within last 24h
  if (data.sourceType && data.sourceId) {
    const [existing] = await db
      .select()
      .from(businessMemories)
      .where(
        and(
          eq(businessMemories.businessId, data.businessId),
          eq(businessMemories.sourceType, data.sourceType),
          eq(businessMemories.sourceId, data.sourceId),
          eq(businessMemories.memoryType, String(data.memoryType))
        )
      )
      .orderBy(desc(businessMemories.createdAt))
      .limit(1);

    if (existing) {
      // If found within 24 hours and summary is similar or same status, return existing or update timestamp
      const ageHours = (Date.now() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        return existing;
      }
    }
  }

  const [result] = await db.insert(businessMemories).values(data);
  const [created] = await db.select().from(businessMemories).where(eq(businessMemories.id, result.insertId));
  return created;
}

export async function getPatternIntelligenceForBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(patternIntelligence)
    .where(eq(patternIntelligence.businessId, businessId))
    .orderBy(desc(patternIntelligence.occurrences), desc(patternIntelligence.lastDetected));
}

export async function upsertPatternIntelligence(data: InsertPatternIntelligenceRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if pattern with same title / patternType already exists
  const [existing] = await db
    .select()
    .from(patternIntelligence)
    .where(
      and(
        eq(patternIntelligence.businessId, data.businessId),
        eq(patternIntelligence.patternType, String(data.patternType)),
        eq(patternIntelligence.title, String(data.title))
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(patternIntelligence)
      .set({
        patternType: data.patternType,
        title: data.title,
        description: data.description,
        occurrences: data.occurrences,
        firstDetected: data.firstDetected,
        lastDetected: data.lastDetected,
        typicalResponse: data.typicalResponse,
        historicalOutcome: data.historicalOutcome,
        confidence: data.confidence,
        currentRelevance: data.currentRelevance,
        lessonsLearned: data.lessonsLearned,
        evidenceJson: data.evidenceJson,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(patternIntelligence.id, existing.id));
    const [updated] = await db.select().from(patternIntelligence).where(eq(patternIntelligence.id, existing.id));
    return updated;
  } else {
    const [result] = await db.insert(patternIntelligence).values(data);
    const [created] = await db.select().from(patternIntelligence).where(eq(patternIntelligence.id, result.insertId));
    return created;
  }
}
