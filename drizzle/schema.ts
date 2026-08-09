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
    status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending"),
    actionTaken: text("actionTaken"),
    outcome: text("outcome"),
    outcomeValue: decimal("outcomeValue", { precision: 12, scale: 2 }),
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
