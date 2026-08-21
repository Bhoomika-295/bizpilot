/**
 * BizPilot PostgreSQL / Supabase schema.
 *
 * This file mirrors the already-deployed public-schema objects discovered by
 * the read-only Phase 1 inspection. It is intentionally code-only: no
 * migration or database write is performed by this change.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  json,
  jsonb,
  integer,
  bigint,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("login_method", { length: 50 }),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  lastSignedIn: timestamp("last_signed_in"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  industry: varchar("industry", { length: 255 }),
  monthlyRevenueTarget: numeric("monthly_revenue_target", { precision: 15, scale: 2, mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  totalSpent: numeric("total_spent", { precision: 15, scale: 2, mode: "number" }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 15, scale: 2, mode: "number" }).notNull(),
  category: varchar("category", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  customerId: integer("customer_id"),
  productId: integer("product_id"),
  amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
  description: text("description"),
  vendor: varchar("vendor", { length: 255 }),
  expenseDate: timestamp("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessEvents = pgTable("business_events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessGoals = pgTable("business_goals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  goalType: varchar("goal_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: integer("priority").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  impactScore: integer("impact_score"),
  actionPayload: jsonb("action_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  objective: text("objective").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  metricsSnapshot: jsonb("metrics_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outcomes = pgTable("outcomes", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id"),
  businessId: integer("business_id").notNull(),
  resultSummary: text("result_summary").notNull(),
  successMetricDelta: numeric("success_metric_delta", { precision: 15, scale: 2, mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const externalDataSources = pgTable("external_data_sources", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  sourceType: varchar("source_type", { length: 100 }).notNull(),
  payload: jsonb("payload"),
  freshnessTimestamp: timestamp("freshness_timestamp").notNull(),
  reliabilityScore: numeric("reliability_score", { precision: 5, scale: 2, mode: "number" }),
  provenance: text("provenance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const csvImports = pgTable("csv_imports", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  importedRows: integer("imported_rows").notNull(),
  skippedRows: integer("skipped_rows").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  marketShare: numeric("market_share", { precision: 5, scale: 2, mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketSignals = pgTable("market_signals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  url: text("url"),
  publishedAt: timestamp("published_at").notNull(),
  relevanceLevel: varchar("relevance_level", { length: 50 }).notNull(),
  impactArea: varchar("impact_area", { length: 100 }),
  importanceScore: integer("importance_score").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assumptions: json("assumptions"),
  results: json("results"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  potentialValue: numeric("potential_value", { precision: 15, scale: 2, mode: "number" }),
  status: varchar("status", { length: 50 }).notNull(),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  steps: jsonb("steps"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessMemories = pgTable("business_memories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  payload: json("payload"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patternIntelligence = pgTable("pattern_intelligence", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  patternName: varchar("pattern_name", { length: 255 }).notNull(),
  description: text("description"),
  confidence: numeric("confidence", { precision: 5, scale: 2, mode: "number" }),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyBriefs = pgTable("daily_briefs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  briefDate: timestamp("brief_date").notNull(),
  summary: text("summary").notNull(),
  metricsSnapshot: jsonb("metrics_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type BusinessEvent = typeof businessEvents.$inferSelect;
export type BusinessGoal = typeof businessGoals.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Outcome = typeof outcomes.$inferSelect;
export type ExternalDataSource = typeof externalDataSources.$inferSelect;
export type CsvImport = typeof csvImports.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type MarketSignal = typeof marketSignals.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type BusinessMemory = typeof businessMemories.$inferSelect;
export type PatternIntelligence = typeof patternIntelligence.$inferSelect;
export type DailyBrief = typeof dailyBriefs.$inferSelect;
