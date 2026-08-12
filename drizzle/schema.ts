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
    actionPlanId: int("actionPlanId"),
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
    actionPlanIdx: index("outcomes_actionPlan_idx").on(table.businessId, table.actionPlanId),
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
 * Day 28 External World Intelligence & Early-Warning Radar.
 * External events retain source evidence and deterministic derived context;
 * review history preserves lifecycle decisions without deleting history.
 */
export const externalEvents = mysqlTable(
  "externalEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    source: varchar("source", { length: 255 }).notNull(),
    sourceType: varchar("sourceType", { length: 50 }).notNull().default("MARKET_SIGNAL"),
    title: varchar("title", { length: 512 }).notNull(),
    summary: text("summary").notNull(),
    referenceUrl: text("referenceUrl").notNull(),
    publishedAt: timestamp("publishedAt"),
    detectedAt: timestamp("detectedAt").defaultNow().notNull(),
    topic: varchar("topic", { length: 160 }).notNull().default("GENERAL_MARKET"),
    entitiesJson: text("entitiesJson"),
    geography: varchar("geography", { length: 160 }),
    eventType: varchar("eventType", { length: 60 }).notNull().default("OTHER"),
    evidenceStrength: varchar("evidenceStrength", { length: 40 }).notNull().default("MEDIUM"),
    freshness: varchar("freshness", { length: 40 }).notNull().default("CURRENT"),
    status: varchar("status", { length: 30 }).notNull().default("NEW"),
    normalizationKey: varchar("normalizationKey", { length: 255 }).notNull(),
    fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
    relevanceLevel: varchar("relevanceLevel", { length: 30 }).notNull().default("UNKNOWN"),
    relevanceReason: text("relevanceReason"),
    impactType: varchar("impactType", { length: 30 }).notNull().default("UNKNOWN"),
    impactAreasJson: text("impactAreasJson"),
    strategyImpact: varchar("strategyImpact", { length: 30 }).notNull().default("UNKNOWN"),
    strategyImpactReason: text("strategyImpactReason"),
    objectiveImpactsJson: text("objectiveImpactsJson"),
    trajectoryContextJson: text("trajectoryContextJson"),
    crossSignalContextJson: text("crossSignalContextJson"),
    trendKey: varchar("trendKey", { length: 255 }),
    trendState: varchar("trendState", { length: 30 }).notNull().default("ONE_OFF"),
    trendConfidence: varchar("trendConfidence", { length: 30 }).notNull().default("UNKNOWN"),
    watchItemsJson: text("watchItemsJson"),
    linkedStrategyIdsJson: text("linkedStrategyIdsJson"),
    linkedSituationIdsJson: text("linkedSituationIdsJson"),
    linkedOpportunityIdsJson: text("linkedOpportunityIdsJson"),
    linkedMonitoringEventId: int("linkedMonitoringEventId"),
    uncertainty: varchar("uncertainty", { length: 30 }).notNull().default("UNKNOWN"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("externalEvents_businessId_idx").on(table.businessId),
    statusIdx: index("externalEvents_status_idx").on(table.businessId, table.status),
    fingerprintIdx: index("externalEvents_fingerprint_idx").on(table.businessId, table.fingerprint),
    normalizationIdx: index("externalEvents_normalization_idx").on(table.businessId, table.normalizationKey),
    publishedAtIdx: index("externalEvents_publishedAt_idx").on(table.businessId, table.publishedAt),
  })
);
export type ExternalEvent = typeof externalEvents.$inferSelect;
export type InsertExternalEvent = typeof externalEvents.$inferInsert;

export const externalEventReviews = mysqlTable(
  "externalEventReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    eventId: int("eventId").notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 30 }),
    newStatus: varchar("newStatus", { length: 30 }),
    rationale: text("rationale"),
    evidenceJson: text("evidenceJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("externalEventReviews_businessId_idx").on(table.businessId),
    eventIdIdx: index("externalEventReviews_eventId_idx").on(table.businessId, table.eventId),
    createdAtIdx: index("externalEventReviews_createdAt_idx").on(table.businessId, table.createdAt),
  })
);
export type ExternalEventReview = typeof externalEventReviews.$inferSelect;
export type InsertExternalEventReview = typeof externalEventReviews.$inferInsert;

export const externalRadarSnapshots = mysqlTable(
  "externalRadarSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
    eventIdsJson: text("eventIdsJson").notNull(),
    radarJson: text("radarJson").notNull(),
    earlyWarningsJson: text("earlyWarningsJson").notNull(),
    trendGroupsJson: text("trendGroupsJson").notNull(),
    sourceFreshnessJson: text("sourceFreshnessJson").notNull(),
    lastEvaluatedAt: timestamp("lastEvaluatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("externalRadarSnapshots_businessId_idx").on(table.businessId),
    fingerprintIdx: index("externalRadarSnapshots_fingerprint_idx").on(table.businessId, table.fingerprint),
    evaluatedAtIdx: index("externalRadarSnapshots_evaluatedAt_idx").on(table.businessId, table.lastEvaluatedAt),
  })
);
export type ExternalRadarSnapshot = typeof externalRadarSnapshots.$inferSelect;
export type InsertExternalRadarSnapshot = typeof externalRadarSnapshots.$inferInsert;

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
    scenarioType: varchar("scenarioType", { length: 50 }).notNull().default("CUSTOM"), // PRICE_CHANGE, MARKETING_CHANGE, COST_CHANGE, DEMAND_CHANGE, COMPETITOR_CHANGE, CUSTOM, BASELINE, GROWTH, DEFENSIVE, INVESTMENT, COST_REDUCTION, COMPETITIVE_RESPONSE, OPPORTUNITY_EXPANSION
    pathKey: varchar("pathKey", { length: 120 }),
    assumptionsJson: text("assumptionsJson").notNull(), // JSON object or array of controlled assumptions
    actionsJson: text("actionsJson"),
    affectedAreasJson: text("affectedAreasJson").notNull(), // JSON array of potentially affected business areas
    affectedMetricsJson: text("affectedMetricsJson"),
    expectedDirectionJson: text("expectedDirectionJson"),
    estimatedMetricsJson: text("estimatedMetricsJson"), // JSON object of modeled estimates vs baseline
    affectedSituationsJson: text("affectedSituationsJson"), // JSON array of situations potentially affected
    strategicImplicationsJson: text("strategicImplicationsJson"), // JSON object or array of strategic implications
    risksJson: text("risksJson"),
    opportunitiesJson: text("opportunitiesJson"),
    evidenceJson: text("evidenceJson"),
    expectedOutcome: text("expectedOutcome"),
    timeHorizon: varchar("timeHorizon", { length: 80 }),
    confidence: varchar("confidence", { length: 20 }),
    uncertainty: varchar("uncertainty", { length: 20 }),
    strategicFit: varchar("strategicFit", { length: 20 }),
    strategicFitReason: text("strategicFitReason"),
    trajectoryAlignment: varchar("trajectoryAlignment", { length: 20 }),
    trajectoryAlignmentReason: text("trajectoryAlignmentReason"),
    monitoringStatus: varchar("monitoringStatus", { length: 40 }),
    selectedDecisionId: int("selectedDecisionId"),
    outcomeId: int("outcomeId"),
    evidenceQuality: varchar("evidenceQuality", { length: 50 }).notNull().default("MEDIUM EVIDENCE"), // HIGH EVIDENCE, MEDIUM EVIDENCE, LIMITED EVIDENCE
    status: mysqlEnum("status", ["DRAFT", "ACTIVE", "UNDER_REVIEW", "SELECTED", "COMPLETED", "INVALIDATED", "ARCHIVED"]).default("ACTIVE").notNull(),
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

export const scenarioComparisons = mysqlTable(
  "scenarioComparisons",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    comparisonKey: varchar("comparisonKey", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    scenarioIdsJson: text("scenarioIdsJson").notNull(),
    baselineScenarioId: int("baselineScenarioId"),
    scorecardJson: text("scorecardJson").notNull(),
    interpretation: text("interpretation").notNull(),
    uncertainty: varchar("uncertainty", { length: 20 }).notNull().default("UNKNOWN"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("scenarioComparisons_businessId_idx").on(table.businessId),
    comparisonKeyIdx: index("scenarioComparisons_comparisonKey_idx").on(table.businessId, table.comparisonKey),
    updatedAtIdx: index("scenarioComparisons_updatedAt_idx").on(table.businessId, table.updatedAt),
  })
);
export type ScenarioComparison = typeof scenarioComparisons.$inferSelect;
export type InsertScenarioComparison = typeof scenarioComparisons.$inferInsert;

export const scenarioHistory = mysqlTable(
  "scenarioHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    scenarioId: int("scenarioId").notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 30 }),
    newStatus: varchar("newStatus", { length: 30 }),
    detailsJson: text("detailsJson"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("scenarioHistory_businessId_idx").on(table.businessId),
    scenarioIdIdx: index("scenarioHistory_scenarioId_idx").on(table.businessId, table.scenarioId),
    timestampIdx: index("scenarioHistory_timestamp_idx").on(table.businessId, table.timestamp),
  })
);
export type ScenarioHistory = typeof scenarioHistory.$inferSelect;
export type InsertScenarioHistory = typeof scenarioHistory.$inferInsert;


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



/**
 * Competitor Activities table — stores tenant-scoped meaningful competitor behavior events,
 * activity types, trends, impact areas, and strategic relevance.
 */
export const competitorActivities = mysqlTable(
  "competitorActivities",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    competitorId: int("competitorId").notNull(),
    activityType: varchar("activityType", { length: 50 }).notNull().default("OTHER"), // PRICING, PRODUCT, MARKETING, EXPANSION, HIRING, PARTNERSHIP, POSITIONING, CUSTOMER, OPERATIONS, OTHER
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description").notNull(),
    sourceReference: varchar("sourceReference", { length: 512 }),
    relevanceLevel: varchar("relevanceLevel", { length: 50 }).notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH
    impactAreasJson: text("impactAreasJson").notNull(), // JSON array of impact areas (e.g. ["pricing", "demand"])
    activityTrend: varchar("activityTrend", { length: 50 }).notNull().default("STABLE"), // INCREASING, DECREASING, STABLE, NEW, UNKNOWN
    strategicRelevance: text("strategicRelevance"),
    detectedAt: timestamp("detectedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("competitorActivities_businessId_idx").on(table.businessId),
    competitorIdIdx: index("competitorActivities_competitorId_idx").on(table.competitorId),
    detectedAtIdx: index("competitorActivities_detectedAt_idx").on(table.detectedAt),
  })
);

export type CompetitorActivity = typeof competitorActivities.$inferSelect;
export type InsertCompetitorActivity = typeof competitorActivities.$inferInsert;

/**
 * ============================================================
 * DAY 20: DECISION INTELLIGENCE ENGINE TABLES
 * ============================================================
 *
 * Decision candidates are distinct from recommendations: they describe
 * questions that deserve human attention, retain the verified evidence chain,
 * and provide multiple possible next steps without forcing an action.
 */
export const decisionCandidates = mysqlTable(
  "decisionCandidates",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    decisionKey: varchar("decisionKey", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull().default("OTHER"),
    priority: varchar("priority", { length: 20 }).notNull().default("MEDIUM"),
    priorityScore: int("priorityScore").notNull().default(50),
    urgency: varchar("urgency", { length: 30 }).notNull().default("MONITOR"),
    potentialImpact: varchar("potentialImpact", { length: 30 }).notNull().default("MEDIUM"),
    evidenceStrength: varchar("evidenceStrength", { length: 30 }).notNull().default("MEDIUM"),
    confidence: varchar("confidence", { length: 30 }).notNull().default("MEDIUM"),
    sourceType: varchar("sourceType", { length: 50 }).notNull().default("OTHER"),
    relatedSituationIdsJson: text("relatedSituationIdsJson"),
    relatedOpportunityIdsJson: text("relatedOpportunityIdsJson"),
    relatedCompetitorIdsJson: text("relatedCompetitorIdsJson"),
    relatedSignalIdsJson: text("relatedSignalIdsJson"),
    relatedScenarioIdsJson: text("relatedScenarioIdsJson"),
    relatedStrategyIdsJson: text("relatedStrategyIdsJson"),
    evidenceChainJson: text("evidenceChainJson").notNull(),
    whyMatters: text("whyMatters").notNull(),
    whatWeKnowJson: text("whatWeKnowJson").notNull(),
    whatWeDontKnowJson: text("whatWeDontKnowJson").notNull(),
    potentialConsequences: text("potentialConsequences").notNull(),
    reversibility: varchar("reversibility", { length: 30 }).notNull().default("UNKNOWN"),
    actionOptionsJson: text("actionOptionsJson").notNull(),
    recommendedNextStep: text("recommendedNextStep"),
    recommendedNextStepReason: text("recommendedNextStepReason"),
    strategicAlignment: varchar("strategicAlignment", { length: 30 }).notNull().default("UNKNOWN"),
    strategicAlignmentReason: text("strategicAlignmentReason"),
    dependencyText: text("dependencyText"),
    conflictKeysJson: text("conflictKeysJson"),
    status: mysqlEnum("status", ["OPEN", "IN_REVIEW", "DECIDED", "DEFERRED", "DISMISSED", "EXPIRED"]).default("OPEN").notNull(),
    outcomeId: int("outcomeId"),
    sourceFingerprint: varchar("sourceFingerprint", { length: 255 }).notNull(),
    lastEvaluatedAt: timestamp("lastEvaluatedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("decisionCandidates_businessId_idx").on(table.businessId),
    statusIdx: index("decisionCandidates_status_idx").on(table.status),
    priorityScoreIdx: index("decisionCandidates_priorityScore_idx").on(table.priorityScore),
    decisionKeyIdx: index("decisionCandidates_decisionKey_idx").on(table.decisionKey),
  })
);

export type DecisionCandidate = typeof decisionCandidates.$inferSelect;
export type InsertDecisionCandidate = typeof decisionCandidates.$inferInsert;

export const decisionEvents = mysqlTable(
  "decisionEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    decisionId: int("decisionId").notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 30 }),
    newStatus: varchar("newStatus", { length: 30 }),
    detailsJson: text("detailsJson"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("decisionEvents_businessId_idx").on(table.businessId),
    decisionIdIdx: index("decisionEvents_decisionId_idx").on(table.decisionId),
    timestampIdx: index("decisionEvents_timestamp_idx").on(table.timestamp),
  })
);

export type DecisionEvent = typeof decisionEvents.$inferSelect;
export type InsertDecisionEvent = typeof decisionEvents.$inferInsert;

/**
 * ============================================================
 * DAY 22: CONTINUOUS MONITORING & INTELLIGENCE ALERTS
 * ============================================================
 *
 * Monitoring events are derived from verified intelligence changes. They
 * are not a generic notification queue: each row keeps its deterministic
 * fingerprint, evidence, related entities, and lifecycle history fields.
 */
export const monitoringEvents = mysqlTable(
  "monitoringEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull().default("OTHER"),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    whatChanged: text("whatChanged").notNull(),
    whyMatters: text("whyMatters").notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("MEDIUM"),
    priority: varchar("priority", { length: 20 }).notNull().default("MEDIUM"),
    priorityScore: int("priorityScore").notNull().default(50),
    sourceType: varchar("sourceType", { length: 50 }).notNull().default("OTHER"),
    sourceId: int("sourceId"),
    relatedEntityType: varchar("relatedEntityType", { length: 50 }),
    relatedEntityId: int("relatedEntityId"),
    relatedSituationIdsJson: text("relatedSituationIdsJson"),
    relatedOpportunityIdsJson: text("relatedOpportunityIdsJson"),
    relatedCompetitorIdsJson: text("relatedCompetitorIdsJson"),
    relatedDecisionIdsJson: text("relatedDecisionIdsJson"),
    relatedOutcomeIdsJson: text("relatedOutcomeIdsJson"),
    evidenceJson: text("evidenceJson").notNull(),
    recommendedReview: text("recommendedReview"),
    currentState: text("currentState"),
    fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["NEW", "ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).default("NEW").notNull(),
    detectedAt: timestamp("detectedAt").defaultNow().notNull(),
    firstDetectedAt: timestamp("firstDetectedAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
    dismissedAt: timestamp("dismissedAt"),
    dismissalReason: text("dismissalReason"),
    lastEscalatedAt: timestamp("lastEscalatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("monitoringEvents_businessId_idx").on(table.businessId),
    statusIdx: index("monitoringEvents_status_idx").on(table.status),
    fingerprintIdx: index("monitoringEvents_fingerprint_idx").on(table.fingerprint),
    detectedAtIdx: index("monitoringEvents_detectedAt_idx").on(table.detectedAt),
    priorityScoreIdx: index("monitoringEvents_priorityScore_idx").on(table.priorityScore),
  })
);

export type MonitoringEvent = typeof monitoringEvents.$inferSelect;
export type InsertMonitoringEvent = typeof monitoringEvents.$inferInsert;

export const monitoringPreferences = mysqlTable(
  "monitoringPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    enabledCategoriesJson: text("enabledCategoriesJson"),
    minimumPriority: varchar("minimumPriority", { length: 20 }).default("LOW").notNull(),
    minimumSeverity: varchar("minimumSeverity", { length: 20 }).default("LOW").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("monitoringPreferences_businessId_idx").on(table.businessId),
  })
);

export type MonitoringPreference = typeof monitoringPreferences.$inferSelect;
export type InsertMonitoringPreference = typeof monitoringPreferences.$inferInsert;

export const monitoringEventHistory = mysqlTable(
  "monitoringEventHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    eventId: int("eventId").notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 20 }),
    newStatus: varchar("newStatus", { length: 20 }),
    previousSeverity: varchar("previousSeverity", { length: 20 }),
    newSeverity: varchar("newSeverity", { length: 20 }),
    previousPriority: varchar("previousPriority", { length: 20 }),
    newPriority: varchar("newPriority", { length: 20 }),
    detailsJson: text("detailsJson"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("monitoringEventHistory_businessId_idx").on(table.businessId),
    eventIdIdx: index("monitoringEventHistory_eventId_idx").on(table.eventId),
    timestampIdx: index("monitoringEventHistory_timestamp_idx").on(table.timestamp),
  })
);

export type MonitoringEventHistory = typeof monitoringEventHistory.$inferSelect;
export type InsertMonitoringEventHistory = typeof monitoringEventHistory.$inferInsert;


/**
 * ============================================================
 * DAY 23: CROSS-SIGNAL INTELLIGENCE & RELATIONSHIP ANALYSIS
 * ============================================================
 *
 * These records describe relationships between already-verified signals.
 * They never replace or duplicate the underlying signal records and do not
 * encode causal claims. Relationship keys are canonical within a tenant so
 * repeated observations update one record instead of creating duplicates.
 */
export const signalRelationships = mysqlTable(
  "signalRelationships",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    relationshipKey: varchar("relationshipKey", { length: 255 }).notNull(),
    signalAType: varchar("signalAType", { length: 50 }).notNull(),
    signalAId: int("signalAId"),
    signalAKey: varchar("signalAKey", { length: 128 }).notNull(),
    signalBType: varchar("signalBType", { length: 50 }).notNull(),
    signalBId: int("signalBId"),
    signalBKey: varchar("signalBKey", { length: 128 }).notNull(),
    relationshipType: varchar("relationshipType", { length: 30 }).notNull().default("UNKNOWN"),
    strength: varchar("strength", { length: 20 }).notNull().default("UNKNOWN"),
    evidenceCount: int("evidenceCount").notNull().default(0),
    stability: varchar("stability", { length: 20 }).notNull().default("UNKNOWN"),
    freshness: varchar("freshness", { length: 20 }).notNull().default("UNKNOWN"),
    status: mysqlEnum("status", ["NEW", "ACTIVE", "WEAKENING", "RESOLVED"]).default("NEW").notNull(),
    firstObservedAt: timestamp("firstObservedAt").defaultNow().notNull(),
    lastObservedAt: timestamp("lastObservedAt").defaultNow().notNull(),
    relatedSituationIdsJson: text("relatedSituationIdsJson"),
    relatedOpportunityIdsJson: text("relatedOpportunityIdsJson"),
    relatedDecisionIdsJson: text("relatedDecisionIdsJson"),
    relatedStrategyIdsJson: text("relatedStrategyIdsJson"),
    relatedOutcomeIdsJson: text("relatedOutcomeIdsJson"),
    evidenceJson: text("evidenceJson").notNull(),
    whatWeKnowJson: text("whatWeKnowJson").notNull(),
    whatWeDontKnowJson: text("whatWeDontKnowJson").notNull(),
    explanation: text("explanation").notNull(),
    causalityStatus: varchar("causalityStatus", { length: 30 }).notNull().default("NOT_ESTABLISHED"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("signalRelationships_businessId_idx").on(table.businessId),
    relationshipKeyIdx: index("signalRelationships_relationshipKey_idx").on(table.relationshipKey),
    signalAIdx: index("signalRelationships_signalA_idx").on(table.signalAType, table.signalAId),
    signalBIdx: index("signalRelationships_signalB_idx").on(table.signalBType, table.signalBId),
    statusIdx: index("signalRelationships_status_idx").on(table.status),
    lastObservedAtIdx: index("signalRelationships_lastObservedAt_idx").on(table.lastObservedAt),
  })
);

export type SignalRelationship = typeof signalRelationships.$inferSelect;
export type InsertSignalRelationship = typeof signalRelationships.$inferInsert;

export const signalClusters = mysqlTable(
  "signalClusters",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    clusterKey: varchar("clusterKey", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    theme: varchar("theme", { length: 50 }).notNull().default("OTHER"),
    interpretation: text("interpretation").notNull(),
    relationshipType: varchar("relationshipType", { length: 30 }).notNull().default("UNKNOWN"),
    strength: varchar("strength", { length: 20 }).notNull().default("UNKNOWN"),
    stability: varchar("stability", { length: 20 }).notNull().default("UNKNOWN"),
    freshness: varchar("freshness", { length: 20 }).notNull().default("UNKNOWN"),
    evidenceCount: int("evidenceCount").notNull().default(0),
    relationshipIdsJson: text("relationshipIdsJson").notNull(),
    signalKeysJson: text("signalKeysJson").notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    relatedSituationIdsJson: text("relatedSituationIdsJson"),
    relatedOpportunityIdsJson: text("relatedOpportunityIdsJson"),
    relatedDecisionIdsJson: text("relatedDecisionIdsJson"),
    relatedStrategyIdsJson: text("relatedStrategyIdsJson"),
    relatedOutcomeIdsJson: text("relatedOutcomeIdsJson"),
    status: mysqlEnum("status", ["NEW", "ACTIVE", "WEAKENING", "RESOLVED"]).default("NEW").notNull(),
    firstObservedAt: timestamp("firstObservedAt").defaultNow().notNull(),
    lastObservedAt: timestamp("lastObservedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("signalClusters_businessId_idx").on(table.businessId),
    clusterKeyIdx: index("signalClusters_clusterKey_idx").on(table.clusterKey),
    statusIdx: index("signalClusters_status_idx").on(table.status),
    lastObservedAtIdx: index("signalClusters_lastObservedAt_idx").on(table.lastObservedAt),
  })
);

export type SignalCluster = typeof signalClusters.$inferSelect;
export type InsertSignalCluster = typeof signalClusters.$inferInsert;

export const signalRelationshipHistory = mysqlTable(
  "signalRelationshipHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    relationshipId: int("relationshipId").notNull(),
    eventType: varchar("eventType", { length: 40 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 20 }),
    newStatus: varchar("newStatus", { length: 20 }),
    previousStrength: varchar("previousStrength", { length: 20 }),
    newStrength: varchar("newStrength", { length: 20 }),
    detailsJson: text("detailsJson"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("signalRelationshipHistory_businessId_idx").on(table.businessId),
    relationshipIdIdx: index("signalRelationshipHistory_relationshipId_idx").on(table.relationshipId),
    timestampIdx: index("signalRelationshipHistory_timestamp_idx").on(table.timestamp),
  })
);

export type SignalRelationshipHistory = typeof signalRelationshipHistory.$inferSelect;
export type InsertSignalRelationshipHistory = typeof signalRelationshipHistory.$inferInsert;


/**
 * ============================================================
 * DAY 24 — BUSINESS TRAJECTORY & FORECAST LEARNING FOUNDATION
 * ============================================================
 */

/**
 * Business trajectories — deterministic, evidence-backed direction and momentum
 * for a forecastable metric. Values are stored as snapshots so the dashboard can
 * reuse the latest calculation without recomputing on every render.
 */
export const businessTrajectories = mysqlTable(
  "businessTrajectories",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    metricKey: varchar("metricKey", { length: 80 }).notNull(),
    metricLabel: varchar("metricLabel", { length: 120 }).notNull(),
    currentValue: decimal("currentValue", { precision: 18, scale: 2 }),
    previousValue: decimal("previousValue", { precision: 18, scale: 2 }),
    direction: mysqlEnum("direction", ["IMPROVING", "DECLINING", "STABLE", "VOLATILE", "INSUFFICIENT_DATA"]).notNull(),
    momentum: mysqlEnum("momentum", ["ACCELERATING", "DECELERATING", "STABLE", "UNKNOWN"]).notNull(),
    forecastWindow: int("forecastWindow"),
    projectedValue: decimal("projectedValue", { precision: 18, scale: 2 }),
    projectedDirection: varchar("projectedDirection", { length: 80 }),
    confidenceLevel: mysqlEnum("confidenceLevel", ["HIGH", "MEDIUM", "LOW", "UNKNOWN"]).notNull(),
    dataSufficiency: mysqlEnum("dataSufficiency", ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]).notNull(),
    volatility: mysqlEnum("volatility", ["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).notNull(),
    status: mysqlEnum("status", ["HEALTHY_GROWTH", "STABLE", "SLOWING_GROWTH", "EARLY_DECLINE", "ACCELERATING_DECLINE", "RECOVERING", "VOLATILE", "INSUFFICIENT_DATA"]).notNull(),
    evidenceCount: int("evidenceCount").notNull().default(0),
    freshness: varchar("freshness", { length: 20 }).notNull().default("UNKNOWN"),
    lastObservedAt: timestamp("lastObservedAt"),
    evidenceJson: text("evidenceJson").notNull(),
    supportingSignalsJson: text("supportingSignalsJson").notNull(),
    contradictingSignalsJson: text("contradictingSignalsJson").notNull(),
    earlyWarningsJson: text("earlyWarningsJson").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("businessTrajectories_businessId_idx").on(table.businessId),
    metricKeyIdx: index("businessTrajectories_metricKey_idx").on(table.businessId, table.metricKey),
    statusIdx: index("businessTrajectories_status_idx").on(table.businessId, table.status),
    updatedAtIdx: index("businessTrajectories_updatedAt_idx").on(table.businessId, table.updatedAt),
  })
);
export type BusinessTrajectory = typeof businessTrajectories.$inferSelect;
export type InsertBusinessTrajectory = typeof businessTrajectories.$inferInsert;

/**
 * Forecast snapshots — immutable forecast observations used later for
 * forecast-vs-actual comparisons and learning signals.
 */
export const trajectoryForecastSnapshots = mysqlTable(
  "trajectoryForecastSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    trajectoryId: int("trajectoryId").notNull(),
    metricKey: varchar("metricKey", { length: 80 }).notNull(),
    forecastWindow: int("forecastWindow").notNull(),
    forecastedAt: timestamp("forecastedAt").defaultNow().notNull(),
    observedThrough: timestamp("observedThrough").notNull(),
    currentValue: decimal("currentValue", { precision: 18, scale: 2 }),
    projectedValue: decimal("projectedValue", { precision: 18, scale: 2 }),
    projectedDirection: varchar("projectedDirection", { length: 80 }),
    trajectoryStatus: varchar("trajectoryStatus", { length: 40 }).notNull(),
    confidenceLevel: varchar("confidenceLevel", { length: 20 }).notNull(),
    dataSufficiency: varchar("dataSufficiency", { length: 20 }).notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    actualValue: decimal("actualValue", { precision: 18, scale: 2 }),
    actualObservedAt: timestamp("actualObservedAt"),
    comparisonStatus: varchar("comparisonStatus", { length: 40 }),
    comparisonNotes: text("comparisonNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("trajectoryForecastSnapshots_businessId_idx").on(table.businessId),
    trajectoryIdIdx: index("trajectoryForecastSnapshots_trajectoryId_idx").on(table.businessId, table.trajectoryId),
    metricKeyIdx: index("trajectoryForecastSnapshots_metricKey_idx").on(table.businessId, table.metricKey),
    forecastedAtIdx: index("trajectoryForecastSnapshots_forecastedAt_idx").on(table.businessId, table.forecastedAt),
  })
);
export type TrajectoryForecastSnapshot = typeof trajectoryForecastSnapshots.$inferSelect;
export type InsertTrajectoryForecastSnapshot = typeof trajectoryForecastSnapshots.$inferInsert;

/**
 * Forecast learning signals — small, auditable events that connect forecast
 * results to the existing outcomes/learning loop without calibrating a model.
 */
export const trajectoryLearningSignals = mysqlTable(
  "trajectoryLearningSignals",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    forecastSnapshotId: int("forecastSnapshotId").notNull(),
    metricKey: varchar("metricKey", { length: 80 }).notNull(),
    signalType: varchar("signalType", { length: 40 }).notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("trajectoryLearningSignals_businessId_idx").on(table.businessId),
    snapshotIdIdx: index("trajectoryLearningSignals_snapshotId_idx").on(table.businessId, table.forecastSnapshotId),
    metricKeyIdx: index("trajectoryLearningSignals_metricKey_idx").on(table.businessId, table.metricKey),
  })
);
export type TrajectoryLearningSignal = typeof trajectoryLearningSignals.$inferSelect;
export type InsertTrajectoryLearningSignal = typeof trajectoryLearningSignals.$inferInsert;

/**
 * Trajectory history — lifecycle/evidence changes for auditability and detail
 * views. It is intentionally separate from immutable forecast snapshots.
 */
export const trajectoryHistory = mysqlTable(
  "trajectoryHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    trajectoryId: int("trajectoryId").notNull(),
    eventType: varchar("eventType", { length: 40 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 40 }),
    newStatus: varchar("newStatus", { length: 40 }),
    detailsJson: text("detailsJson"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("trajectoryHistory_businessId_idx").on(table.businessId),
    trajectoryIdIdx: index("trajectoryHistory_trajectoryId_idx").on(table.businessId, table.trajectoryId),
    timestampIdx: index("trajectoryHistory_timestamp_idx").on(table.businessId, table.timestamp),
  })
);
export type TrajectoryHistory = typeof trajectoryHistory.$inferSelect;
export type InsertTrajectoryHistory = typeof trajectoryHistory.$inferInsert;


/**
 * ============================================================
 * DAY 27: STRATEGY HEALTH & ADAPTIVE MONITORING TABLES
 * ============================================================
 */

export const strategyHealthSnapshots = mysqlTable(
  "strategyHealthSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    strategyId: int("strategyId").notNull(),
    healthState: varchar("healthState", { length: 50 }).notNull().default("HEALTHY"),
    objectivePerformance: varchar("objectivePerformance", { length: 50 }).notNull().default("ON_TRACK"),
    trajectoryAlignment: varchar("trajectoryAlignment", { length: 50 }).notNull().default("ON_TRACK"),
    assumptionState: varchar("assumptionState", { length: 50 }).notNull().default("VALIDATED"),
    environmentFit: varchar("environmentFit", { length: 50 }).notNull().default("STABLE"),
    historicalEvidence: varchar("historicalEvidence", { length: 50 }).notNull().default("MIXED"),
    strategicFit: varchar("strategicFit", { length: 50 }).notNull().default("HIGH"),
    dataConfidence: varchar("dataConfidence", { length: 50 }).notNull().default("HIGH"),
    reviewPriority: varchar("reviewPriority", { length: 50 }).notNull().default("LOW"),
    evidenceSummaryJson: text("evidenceSummaryJson"),
    reviewQuestionsJson: text("reviewQuestionsJson"),
    evidenceFingerprint: varchar("evidenceFingerprint", { length: 255 }),
    snapshotJson: text("snapshotJson"),
    lastEvaluatedAt: timestamp("lastEvaluatedAt").defaultNow().notNull(),
    nextReviewAt: timestamp("nextReviewAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("strategyHealthSnapshots_businessId_idx").on(table.businessId),
    strategyIdIdx: index("strategyHealthSnapshots_strategyId_idx").on(table.strategyId),
  })
);

export type StrategyHealthSnapshot = typeof strategyHealthSnapshots.$inferSelect;
export type InsertStrategyHealthSnapshot = typeof strategyHealthSnapshots.$inferInsert;

export const strategyReviewEvents = mysqlTable(
  "strategyReviewEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    strategyId: int("strategyId").notNull(),
    eventType: varchar("eventType", { length: 80 }).notNull(),
    reviewPriority: varchar("reviewPriority", { length: 50 }).notNull().default("MEDIUM"),
    reason: text("reason").notNull(),
    evidenceJson: text("evidenceJson"),
    reviewerDecision: varchar("reviewerDecision", { length: 50 }),
    changeReasonCategory: varchar("changeReasonCategory", { length: 60 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("strategyReviewEvents_businessId_idx").on(table.businessId),
    strategyIdIdx: index("strategyReviewEvents_strategyId_idx").on(table.strategyId),
  })
);

export type StrategyReviewEvent = typeof strategyReviewEvents.$inferSelect;
export type InsertStrategyReviewEvent = typeof strategyReviewEvents.$inferInsert;

export const strategyVersions = mysqlTable(
  "strategyVersions",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    strategyId: int("strategyId").notNull(),
    versionNumber: int("versionNumber").notNull(),
    objective: varchar("objective", { length: 255 }).notNull(),
    targetMetric: varchar("targetMetric", { length: 255 }),
    proposedActions: text("proposedActions"),
    expectedOutcome: text("expectedOutcome"),
    timeframe: varchar("timeframe", { length: 100 }),
    assumptions: text("assumptions"),
    risks: text("risks"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    changeReasonCategory: varchar("changeReasonCategory", { length: 60 }),
    rationale: text("rationale").notNull(),
    evidenceJson: text("evidenceJson"),
    reviewEventId: int("reviewEventId"),
    versionStatus: varchar("versionStatus", { length: 30 }).notNull().default("DRAFT"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("strategyVersions_businessId_idx").on(table.businessId),
    strategyIdIdx: index("strategyVersions_strategyId_idx").on(table.businessId, table.strategyId),
    versionIdx: index("strategyVersions_version_idx").on(table.businessId, table.strategyId, table.versionNumber),
  })
);
export type StrategyVersion = typeof strategyVersions.$inferSelect;
export type InsertStrategyVersion = typeof strategyVersions.$inferInsert;


/**
 * ============================================================
 * DAY 29: BUSINESS ATTENTION ENGINE & INTELLIGENCE PRIORITIZATION v1
 * ============================================================
 *
 * Continuously aggregates and prioritizes meaningful items across the intelligence
 * system into NOW, NEXT, WATCH, and BACKGROUND tiers with deterministic factor weights
 * and explainable evidence chains.
 */
export const attentionItems = mysqlTable(
  "attentionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    tier: varchar("tier", { length: 20 }).notNull().default("WATCH"), // NOW, NEXT, WATCH, BACKGROUND
    sourceType: varchar("sourceType", { length: 50 }).notNull().default("OTHER"),
    sourceId: int("sourceId"),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    category: varchar("category", { length: 50 }).notNull().default("SITUATION"),
    priority: varchar("priority", { length: 20 }).notNull().default("MEDIUM"), // CRITICAL, HIGH, MEDIUM, LOW
    priorityScore: int("priorityScore").notNull().default(50),
    impact: varchar("impact", { length: 20 }).notNull().default("UNKNOWN"), // LOW, MEDIUM, HIGH, UNKNOWN
    urgency: varchar("urgency", { length: 20 }).notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
    strategicRelevance: varchar("strategicRelevance", { length: 20 }).notNull().default("UNKNOWN"),
    trajectoryRelevance: varchar("trajectoryRelevance", { length: 20 }).notNull().default("UNKNOWN"),
    evidenceStrength: varchar("evidenceStrength", { length: 20 }).notNull().default("MEDIUM"),
    freshness: varchar("freshness", { length: 20 }).notNull().default("FRESH"),
    crossSignalSupport: boolean("crossSignalSupport").notNull().default(false),
    businessSpecificRelevance: text("businessSpecificRelevance"),
    explanationJson: text("explanationJson").notNull(), // reasons list, underlying entity references, factor weights
    status: mysqlEnum("status", ["NEW", "ACTIVE", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "DISMISSED", "EXPIRED"]).default("NEW").notNull(),
    dismissalReason: varchar("dismissalReason", { length: 50 }),
    resolvedAt: timestamp("resolvedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("attentionItems_businessId_idx").on(table.businessId),
    tierIdx: index("attentionItems_tier_idx").on(table.tier),
    statusIdx: index("attentionItems_status_idx").on(table.status),
    priorityScoreIdx: index("attentionItems_priorityScore_idx").on(table.priorityScore),
    sourceIdx: index("attentionItems_source_idx").on(table.sourceType, table.sourceId),
  })
);

export type AttentionItem = typeof attentionItems.$inferSelect;
export type InsertAttentionItem = typeof attentionItems.$inferInsert;

export const attentionReviewLogs = mysqlTable(
  "attentionReviewLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    attentionItemId: int("attentionItemId").notNull(),
    action: varchar("action", { length: 30 }).notNull(), // ACKNOWLEDGE, DISMISS, RESOLVE, REOPEN
    reason: varchar("reason", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("attentionReviewLogs_businessId_idx").on(table.businessId),
    itemIdx: index("attentionReviewLogs_itemIdx").on(table.attentionItemId),
  })
);

export type AttentionReviewLog = typeof attentionReviewLogs.$inferSelect;
export type InsertAttentionReviewLog = typeof attentionReviewLogs.$inferInsert;

/**
 * ============================================================
 * DAY 30: DAILY BUSINESS INTELLIGENCE BRIEF v1 TABLES
 * ============================================================
 */
export const dailyBriefs = mysqlTable(
  "dailyBriefs",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    briefDate: varchar("briefDate", { length: 30 }).notNull(), // YYYY-MM-DD
    executiveOpening: text("executiveOpening").notNull(),
    healthSummaryJson: text("healthSummaryJson").notNull(),
    changesSummaryJson: text("changesSummaryJson").notNull(),
    attentionSummaryJson: text("attentionSummaryJson").notNull(),
    externalRadarJson: text("externalRadarJson").notNull(),
    opportunitiesThreatsJson: text("opportunitiesThreatsJson").notNull(),
    strategyStatusJson: text("strategyStatusJson").notNull(),
    decisionsSummaryJson: text("decisionsSummaryJson").notNull(),
    actionsSummaryJson: text("actionsSummaryJson"),
    outcomesJson: text("outcomesJson").notNull(),
    fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("dailyBriefs_businessId_idx").on(table.businessId),
    briefDateIdx: index("dailyBriefs_briefDate_idx").on(table.briefDate),
  })
);

export type DailyBrief = typeof dailyBriefs.$inferSelect;
export type InsertDailyBrief = typeof dailyBriefs.$inferInsert;


/**
 * ============================================================
 * DAY 31–32: INTELLIGENT ACTION PLANNING & EXECUTION LOOP v1
 * ============================================================
 * Actions are business-intelligence follow-through records, not generic tasks.
 * They preserve the verified source relationship and require explicit user state changes.
 */
export const actionPlans = mysqlTable(
  "actionPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    actionType: varchar("actionType", { length: 40 }).notNull().default("REVIEW"),
    status: mysqlEnum("status", ["PROPOSED", "APPROVED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED", "EXPIRED"]).default("PROPOSED").notNull(),
    priority: varchar("priority", { length: 20 }).notNull().default("MEDIUM"),
    sourceType: varchar("sourceType", { length: 40 }).notNull().default("MANUAL"),
    sourceId: int("sourceId"),
    decisionId: int("decisionId"),
    strategyId: int("strategyId"),
    objectiveId: int("objectiveId"),
    situationId: int("situationId"),
    opportunityId: int("opportunityId"),
    threatId: int("threatId"),
    ownerUserId: int("ownerUserId"),
    dueDate: timestamp("dueDate"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    blockedAt: timestamp("blockedAt"),
    completedBy: int("completedBy"),
    expectedOutcome: text("expectedOutcome"),
    actualOutcome: text("actualOutcome"),
    evidence: text("evidence"),
    blockReason: text("blockReason"),
    completionNotes: text("completionNotes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("actionPlans_businessId_idx").on(table.businessId),
    statusIdx: index("actionPlans_status_idx").on(table.businessId, table.status),
    dueDateIdx: index("actionPlans_dueDate_idx").on(table.businessId, table.dueDate),
    ownerIdx: index("actionPlans_ownerUserId_idx").on(table.businessId, table.ownerUserId),
    sourceIdx: index("actionPlans_source_idx").on(table.businessId, table.sourceType, table.sourceId),
    decisionIdx: index("actionPlans_decisionId_idx").on(table.businessId, table.decisionId),
    strategyIdx: index("actionPlans_strategyId_idx").on(table.businessId, table.strategyId),
  })
);
export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;

export const actionPlanEvents = mysqlTable(
  "actionPlanEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull(),
    actionPlanId: int("actionPlanId").notNull(),
    eventType: varchar("eventType", { length: 40 }).notNull(),
    previousStatus: varchar("previousStatus", { length: 20 }),
    newStatus: varchar("newStatus", { length: 20 }),
    actorUserId: int("actorUserId").notNull(),
    detailsJson: text("detailsJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: index("actionPlanEvents_businessId_idx").on(table.businessId),
    actionPlanIdx: index("actionPlanEvents_actionPlanId_idx").on(table.businessId, table.actionPlanId),
    createdAtIdx: index("actionPlanEvents_createdAt_idx").on(table.businessId, table.createdAt),
  })
);
export type ActionPlanEvent = typeof actionPlanEvents.$inferSelect;
export type InsertActionPlanEvent = typeof actionPlanEvents.$inferInsert;
