import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

/**
 * ============================================================
 * CORE AUTHENTICATION & MULTI-TENANCY
 * ============================================================
 */

/**
 * Users table — backed by Manus OAuth.
 * Each user can be associated with one or more businesses.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: index("openId_idx").on(table.openId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Businesses table — represents a tenant/workspace.
 * Each business is owned by a user and contains all related data.
 */
export const businesses = mysqlTable(
  "businesses",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 100 }),
    businessType: varchar("businessType", { length: 100 }),
    country: varchar("country", { length: 100 }),
    location: varchar("location", { length: 255 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    businessSize: varchar("businessSize", { length: 50 }),
    numberOfEmployees: int("numberOfEmployees"),
    description: text("description"),
    isDemo: boolean("isDemo").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userId_idx").on(table.userId),
  })
);

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

/**
 * Business Goals — user-selected goals for the business.
 * Supports ranking/prioritization for strategy evaluation.
 */
export const businessGoals = mysqlTable(
  "businessGoals",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    goal: varchar("goal", { length: 255 }).notNull(),
    priority: int("priority").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
  })
);

export type BusinessGoal = typeof businessGoals.$inferSelect;
export type InsertBusinessGoal = typeof businessGoals.$inferInsert;

/**
 * ============================================================
 * CORE BUSINESS DATA ENTITIES
 * ============================================================
 */

/**
 * Customers — core business entity.
 * Tracks customer information and relationships.
 */
export const customers = mysqlTable(
  "customers",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),
    company: varchar("company", { length: 255 }),
    location: varchar("location", { length: 255 }),
    status: mysqlEnum("status", ["active", "inactive", "prospect"]).default("active"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
  })
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Products/Services — offerings provided by the business.
 */
export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", ["product", "service"]).default("product"),
    price: decimal("price", { precision: 12, scale: 2 }),
    cost: decimal("cost", { precision: 12, scale: 2 }),
    status: mysqlEnum("status", ["active", "inactive"]).default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
  })
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Transactions — revenue records (sales, payments, etc.).
 * Core data for business health metrics.
 */
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    customerId: int("customerId"),
    productId: int("productId"),
    type: mysqlEnum("type", ["sale", "refund", "payment", "other"]).default("sale"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: varchar("description", { length: 255 }),
    transactionDate: timestamp("transactionDate").notNull(),
    status: mysqlEnum("status", ["completed", "pending", "failed"]).default("completed"),
    source: varchar("source", { length: 100 }).default("manual"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    transactionDateIdx: index("transactionDate_idx").on(table.transactionDate),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Expenses — cost records (operating expenses, COGS, etc.).
 * Core data for business health metrics and profit calculation.
 */
export const expenses = mysqlTable(
  "expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    expenseDate: timestamp("expenseDate").notNull(),
    status: mysqlEnum("status", ["completed", "pending"]).default("completed"),
    source: varchar("source", { length: 100 }).default("manual"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    expenseDateIdx: index("expenseDate_idx").on(table.expenseDate),
  })
);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * ============================================================
 * INTELLIGENCE FOUNDATION MODELS
 * ============================================================
 */

/**
 * Business Events — core event log for the business.
 * Tracks significant business activities for analysis and learning.
 * Foundation for future real-time intelligence.
 */
export const businessEvents = mysqlTable(
  "businessEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 100 }),
    entityId: int("entityId"),
    metadata: json("metadata"),
    source: varchar("source", { length: 100 }).default("system"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    eventTypeIdx: index("eventType_idx").on(table.eventType),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type BusinessEvent = typeof businessEvents.$inferSelect;
export type InsertBusinessEvent = typeof businessEvents.$inferInsert;

/**
 * Recommendations — AI-generated or system recommendations.
 * Tracks recommendation lifecycle: creation → acceptance → action → outcome.
 */
export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    evidence: text("evidence"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    assumptions: text("assumptions"),
    expectedImpact: text("expectedImpact"),
    risk: text("risk"),
    status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed", "OPEN", "COMPLETED", "DISMISSED"]).default("pending"),
    actionTaken: text("actionTaken"),
    outcome: text("outcome"),
    outcomeValue: decimal("outcomeValue", { precision: 12, scale: 2 }),
    outcomeStatus: mysqlEnum("outcomeStatus", ["Positive", "Neutral", "Negative", "Unknown"]).default("Unknown"),
    outcomeNote: text("outcomeNote"),
    metricBefore: decimal("metricBefore", { precision: 12, scale: 2 }),
    metricAfter: decimal("metricAfter", { precision: 12, scale: 2 }),
    observedChange: varchar("observedChange", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

/**
 * Strategies — business strategies and their outcomes.
 * Tracks strategic initiatives: planning → execution → measurement → learning.
 */
export const strategies = mysqlTable(
  "strategies",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    objective: varchar("objective", { length: 255 }).notNull(),
    targetMetric: varchar("targetMetric", { length: 255 }),
    baseline: decimal("baseline", { precision: 12, scale: 2 }),
    proposedActions: text("proposedActions"),
    expectedOutcome: text("expectedOutcome"),
    timeframe: varchar("timeframe", { length: 100 }),
    assumptions: text("assumptions"),
    risks: text("risks"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    status: mysqlEnum("status", ["planning", "active", "completed", "abandoned"]).default("planning"),
    actualOutcome: text("actualOutcome"),
    actualValue: decimal("actualValue", { precision: 12, scale: 2 }),
    success: boolean("success"),
    lessonsLearned: text("lessonsLearned"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

/**
 * Outcomes — results from recommendations and strategies.
 * Tracks actual vs. predicted outcomes for continuous learning.
 */
export const outcomes = mysqlTable(
  "outcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    recommendationId: int("recommendationId"),
    strategyId: int("strategyId"),
    predictedValue: decimal("predictedValue", { precision: 12, scale: 2 }),
    actualValue: decimal("actualValue", { precision: 12, scale: 2 }),
    metric: varchar("metric", { length: 255 }),
    timeframe: varchar("timeframe", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
  })
);

export type Outcome = typeof outcomes.$inferSelect;
export type InsertOutcome = typeof outcomes.$inferInsert;

/**
 * ============================================================
 * EXTERNAL DATA SOURCE INFRASTRUCTURE
 * ============================================================
 */

/**
 * External Data Sources — metadata for all external data ingestion.
 * Tracks SOURCE, TIMESTAMP, FRESHNESS, RELIABILITY, PROVENANCE.
 * Foundation for future real-time intelligence integration.
 */
export const externalDataSources = mysqlTable(
  "externalDataSources",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    sourceType: mysqlEnum("sourceType", ["api", "webhook", "polling", "manual", "other"]).default("manual"),
    dataType: varchar("dataType", { length: 100 }),
    status: mysqlEnum("status", ["connected", "disconnected", "error", "pending"]).default("pending"),
    lastFetched: timestamp("lastFetched"),
    lastUpdated: timestamp("lastUpdated"),
    freshness: mysqlEnum("freshness", ["live", "near-real-time", "periodic", "historical", "unknown"]).default("unknown"),
    reliability: decimal("reliability", { precision: 3, scale: 2 }),
    provenance: text("provenance"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    sourceIdx: index("source_idx").on(table.source),
  })
);

export type ExternalDataSource = typeof externalDataSources.$inferSelect;
export type InsertExternalDataSource = typeof externalDataSources.$inferInsert;

/**
 * ============================================================
 * CSV IMPORT TRACKING
 * ============================================================
 */

/**
 * CSV Imports — tracks all CSV import operations for audit trail.
 */
export const csvImports = mysqlTable(
  "csvImports",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    totalRows: int("totalRows"),
    importedRows: int("importedRows"),
    skippedRows: int("skippedRows"),
    warnings: json("warnings"),
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
  })
);

export type CsvImport = typeof csvImports.$inferSelect;
export type InsertCsvImport = typeof csvImports.$inferInsert;


/**
 * Competitors table — stores tenant-scoped competitor watchlist for market intelligence.
 */
export const competitors = mysqlTable(
  "competitors",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 100 }),
    website: varchar("website", { length: 255 }),
    location: varchar("location", { length: 255 }),
    notes: text("notes"),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    intelligenceStatus: varchar("intelligenceStatus", { length: 100 }).default("Not connected yet").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("competitors_businessId_idx").on(table.businessId),
  })
);

export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = typeof competitors.$inferInsert;


/**
 * Market Signals table — stores tenant-scoped external market intelligence signals.
 */
export const marketSignals = mysqlTable(
  "marketSignals",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    source: varchar("source", { length: 255 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    publishedAt: timestamp("publishedAt"),
    discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
    relatedEntity: varchar("relatedEntity", { length: 255 }).notNull(),
    snippet: text("snippet"),
    relevanceStatus: varchar("relevanceStatus", { length: 100 }).default("relevant").notNull(),
    relevanceLevel: varchar("relevanceLevel", { length: 50 }).default("LOW").notNull(),
    impactArea: varchar("impactArea", { length: 100 }).default("General Market").notNull(),
    importanceScore: int("importanceScore").default(1).notNull(),
    explanation: text("explanation"),
    externalId: varchar("externalId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("marketSignals_businessId_idx").on(table.businessId),
    publishedAtIdx: index("marketSignals_publishedAt_idx").on(table.publishedAt),
  })
);

export type MarketSignal = typeof marketSignals.$inferSelect;
export type InsertMarketSignal = typeof marketSignals.$inferInsert;

/**
 * Business Situations — groups related internal changes and external market signals
 * into coherent operating situations (Growth, Decline, Cost Pressure, Competitive Pressure, Mixed Signals, etc.).
 */
export const businessSituations = mysqlTable(
  "businessSituations",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    priority: varchar("priority", { length: 50 }).notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, MONITORING, RESOLVED
    category: varchar("category", { length: 100 }).notNull().default("Stable"), // Growth, Decline, Cost Pressure, Competitive Pressure, Mixed Signals, etc.
    supportingSignalsJson: text("supportingSignalsJson").notNull(), // JSON array of internal/external evidence items
    supportingCount: int("supportingCount").notNull().default(0),
    freshnessInfo: varchar("freshnessInfo", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type BusinessSituation = typeof businessSituations.$inferSelect;
export type InsertBusinessSituation = typeof businessSituations.$inferInsert;

/**
 * Situation Snapshots — preserves historical state snapshots of business situations
 * over time for trend intelligence and timeline views.
 */
export const situationSnapshots = mysqlTable(
  "situationSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    situationId: int("situationId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    priority: varchar("priority", { length: 50 }).notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, MONITORING, RESOLVED
    category: varchar("category", { length: 100 }).notNull().default("Stable"),
    trendDirection: varchar("trendDirection", { length: 50 }).notNull().default("STABLE"), // IMPROVING, WORSENING, STABLE, NEW, RESOLVED, RECURRING
    supportingCount: int("supportingCount").notNull().default(0),
    internalEvidenceCount: int("internalEvidenceCount").notNull().default(0),
    externalEvidenceCount: int("externalEvidenceCount").notNull().default(0),
    metricValuesJson: text("metricValuesJson"),
    freshnessInfo: varchar("freshnessInfo", { length: 255 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("situationSnapshots_businessId_idx").on(table.businessId),
    situationIdIdx: index("situationSnapshots_situationId_idx").on(table.situationId),
    timestampIdx: index("situationSnapshots_timestamp_idx").on(table.timestamp),
  })
);

export type SituationSnapshot = typeof situationSnapshots.$inferSelect;
export type InsertSituationSnapshot = typeof situationSnapshots.$inferInsert;

/**
 * Decision Priorities — ranks top operating situations and insights for Today's Strategic Focus.
 */
export const decisionPriorities = mysqlTable(
  "decisionPriorities",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    sourceType: varchar("sourceType", { length: 50 }).notNull().default("SITUATION"), // SITUATION, SIGNAL, METRIC
    sourceId: int("sourceId"),
    title: varchar("title", { length: 255 }).notNull(),
    priorityLevel: varchar("priorityLevel", { length: 50 }).notNull().default("MEDIUM"), // CRITICAL, HIGH, MEDIUM, LOW
    priorityScore: int("priorityScore").notNull().default(50),
    urgency: varchar("urgency", { length: 100 }).notNull().default("Normal"),
    impact: varchar("impact", { length: 100 }).notNull().default("Moderate"),
    trend: varchar("trend", { length: 50 }).notNull().default("STABLE"), // IMPROVING, WORSENING, STABLE, NEW, RESOLVED, RECURRING
    reason: text("reason").notNull(),
    whyNow: text("whyNow").notNull(),
    evidenceJson: text("evidenceJson").notNull(), // JSON array of evidence items
    freshnessNote: varchar("freshnessNote", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("decisionPriorities_businessId_idx").on(table.businessId),
    priorityScoreIdx: index("decisionPriorities_priorityScore_idx").on(table.priorityScore),
  })
);

export type DecisionPriority = typeof decisionPriorities.$inferSelect;
export type InsertDecisionPriority = typeof decisionPriorities.$inferInsert;

/**
 * ============================================================
 * DAY 16: ADAPTIVE STRATEGY ENGINE TABLES
 * ============================================================
 */

export const strategyStates = mysqlTable(
  "strategyStates",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    recommendationId: int("recommendationId").notNull(),
    supportingSituationIdsJson: text("supportingSituationIdsJson"),
    supportingSignalIdsJson: text("supportingSignalIdsJson"),
    priorityAtGeneration: varchar("priorityAtGeneration", { length: 50 }),
    situationTrendAtGeneration: varchar("situationTrendAtGeneration", { length: 50 }),
    metricSnapshotJson: text("metricSnapshotJson"),
    marketSignalRefsJson: text("marketSignalRefsJson"),
    evaluationStatus: mysqlEnum("evaluationStatus", ["KEEP", "UPDATE", "DEPRIORITIZE", "REPLACE", "EXPIRED", "ACTIVE", "COMPLETED", "DISMISSED"]).default("KEEP"),
    reason: text("reason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    recommendationIdIdx: index("recommendationId_idx").on(table.recommendationId),
  })
);

export type StrategyState = typeof strategyStates.$inferSelect;
export type InsertStrategyState = typeof strategyStates.$inferInsert;

export const strategyEvents = mysqlTable(
  "strategyEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    recommendationId: int("recommendationId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    previousStrategyTitle: varchar("previousStrategyTitle", { length: 255 }),
    newStrategyTitle: varchar("newStrategyTitle", { length: 255 }),
    evaluationResult: varchar("evaluationResult", { length: 50 }),
    reason: text("reason"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessId_idx").on(table.businessId),
    recommendationIdIdx: index("recommendationId_idx").on(table.recommendationId),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type StrategyEvent = typeof strategyEvents.$inferSelect;
export type InsertStrategyEvent = typeof strategyEvents.$inferInsert;


/**
 * ============================================================
 * DAY 17: SCENARIO & WHAT-IF INTELLIGENCE TABLE
 * ============================================================
 */

export const scenarios = mysqlTable(
  "scenarios",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    scenarioType: varchar("scenarioType", { length: 50 }).notNull().default("CUSTOM"), // PRICE_CHANGE, MARKETING_CHANGE, COST_CHANGE, DEMAND_CHANGE, COMPETITOR_CHANGE, CUSTOM
    assumptionsJson: text("assumptionsJson").notNull(), // JSON object of controlled assumptions (e.g., priceChangePct: 10)
    affectedAreasJson: text("affectedAreasJson").notNull(), // JSON array of potentially affected business areas
    estimatedMetricsJson: text("estimatedMetricsJson"), // JSON object of modeled estimates vs baseline
    affectedSituationsJson: text("affectedSituationsJson"), // JSON array of situations potentially affected
    strategicImplicationsJson: text("strategicImplicationsJson"), // JSON object or array of strategic implications
    evidenceQuality: varchar("evidenceQuality", { length: 50 }).notNull().default("MEDIUM EVIDENCE"), // HIGH EVIDENCE, MEDIUM EVIDENCE, LIMITED EVIDENCE
    status: mysqlEnum("status", ["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("scenarios_businessId_idx").on(table.businessId),
    statusIdx: index("scenarios_status_idx").on(table.status),
  })
);

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = typeof scenarios.$inferInsert;


export const opportunities = mysqlTable(
  "opportunities",
  {
    id: int("id").primaryKey().autoincrement(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    category: varchar("category", { length: 50 }).notNull().default("GROWTH"), // GROWTH, MARKET, CUSTOMER, COMPETITIVE, PRODUCT, OPERATIONAL, EFFICIENCY, STRATEGIC
    priority: varchar("priority", { length: 20 }).notNull().default("MEDIUM"), // HIGH, MEDIUM, LOW
    evidenceStrength: varchar("evidenceStrength", { length: 50 }).notNull().default("MEDIUM EVIDENCE"), // HIGH EVIDENCE, MEDIUM EVIDENCE, LIMITED EVIDENCE
    potentialImpact: varchar("potentialImpact", { length: 20 }).notNull().default("MEDIUM"), // HIGH, MEDIUM, LOW
    urgency: varchar("urgency", { length: 20 }).notNull().default("MEDIUM"), // HIGH, MEDIUM, LOW
    status: mysqlEnum("status", ["NEW", "ACTIVE", "MONITORING", "PURSUED", "DISMISSED", "EXPIRED"]).default("NEW").notNull(),
    supportingSignalsJson: text("supportingSignalsJson"), // JSON array of supporting internal/external signals
    supportingSituationsJson: text("supportingSituationsJson"), // JSON array of related business situations
    supportingMetricsJson: text("supportingMetricsJson"), // JSON array or object of supporting metrics
    potentialNextStep: text("potentialNextStep"), // Suggested investigation step
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("opportunities_businessId_idx").on(table.businessId),
    statusIdx: index("opportunities_status_idx").on(table.status),
    categoryIdx: index("opportunities_category_idx").on(table.category),
  })
);

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;
