/**
 * BizPilot PostgreSQL / Supabase Schema (Phase 1 Migration Preparation)
 * 
 * Converted from MySQL schema (drizzle/schema.ts) to PostgreSQL (pg-core)
 * maintaining exact table names, column semantics, primary keys, relationships,
 * and tenant ownership fields (`businessId`).
 * 
 * NOTE: This schema file is prepared for Supabase PostgreSQL migration
 * but is not active until the final cutover phase.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  json,
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
  monthlyRevenueTarget: decimal("monthly_revenue_target", { precision: 15, scale: 2 }),
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
  totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 15, scale: 2 }),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  customerId: integer("customer_id"),
  productId: integer("product_id"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).default("sale").notNull(),
  source: varchar("source", { length: 50 }).default("manual").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  source: varchar("source", { length: 50 }).default("manual").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessEvents = pgTable("business_events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  payload: json("payload"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  priority: varchar("priority", { length: 50 }).default("medium").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  objective: text("objective").notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  progress: integer("progress").default(0).notNull(),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outcomes = pgTable("outcomes", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  strategyId: integer("strategy_id"),
  title: varchar("title", { length: 255 }).notNull(),
  result: text("result").notNull(),
  metrics: json("metrics"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const externalDataSources = pgTable("external_data_sources", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("connected").notNull(),
  config: json("config"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const csvImports = pgTable("csv_imports", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  recordCount: integer("record_count").notNull(),
  status: varchar("status", { length: 50 }).default("success").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketSignals = pgTable("market_signals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  sentiment: varchar("sentiment", { length: 50 }).default("neutral").notNull(),
  payload: json("payload"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
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
  potentialValue: decimal("potential_value", { precision: 15, scale: 2 }),
  status: varchar("status", { length: 50 }).default("identified").notNull(),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("not_started").notNull(),
  owner: varchar("owner", { length: 255 }),
  dueDate: timestamp("due_date"),
  payload: json("payload"),
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
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
