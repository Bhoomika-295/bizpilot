import { eq, and, desc, gte, inArray, lte, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  businesses,
  customers,
  products,
  transactions,
  expenses,
  type Business,
  type Customer,
  type Product,
  type Transaction,
  type Expense,
} from "../../drizzle/schema";

/**
 * Business Data Service
 * 
 * Provides business-scoped access to all data entities.
 * ALL queries are restricted to the authenticated user's business.
 * 
 * CRITICAL: Never trust a businessId supplied directly by the client.
 * Always verify that the user owns the business before returning data.
 */

/**
 * Verify that a user owns a business
 * Returns the business if authorized, throws if not
 */
export async function verifyBusinessOwnership(
  userId: number,
  businessId: number
): Promise<Business> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const business = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)))
    .limit(1);

  if (business.length === 0) {
    throw new Error("Unauthorized: Business not found or access denied");
  }

  return business[0];
}

/**
 * Get all businesses for a user
 */
export async function getUserBusinesses(userId: number): Promise<Business[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId));
}

const DEMO_SOURCES = new Set(["demo", "sample", "seed"]);

/**
 * Resolve the trust label for a business dataset. The explicit business flag
 * wins, while the source fallback keeps legacy seeded workspaces honest.
 */
export function inferDataBasisFromSources(
  businessIsDemo: boolean | null | undefined,
  sources: Array<string | null | undefined>
): "demo" | "real" {
  if (businessIsDemo) return "demo";

  const normalizedSources = sources
    .filter((source): source is string => Boolean(source))
    .map((source) => source.trim().toLowerCase());

  if (
    normalizedSources.length > 0 &&
    normalizedSources.every((source) => DEMO_SOURCES.has(source))
  ) {
    return "demo";
  }

  return "real";
}

/**
 * Resolve demo/real status for an authorized business using the business flag
 * and persisted transaction/expense provenance.
 */
export async function getBusinessDataBasis(
  business: Business
): Promise<"demo" | "real"> {
  if (business.isDemo) return "demo";

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [transactionSources, expenseSources] = await Promise.all([
    db
      .select({ source: transactions.source })
      .from(transactions)
      .where(eq(transactions.businessId, business.id)),
    db
      .select({ source: expenses.source })
      .from(expenses)
      .where(eq(expenses.businessId, business.id)),
  ]);

  return inferDataBasisFromSources(business.isDemo, [
    ...transactionSources.map((row) => row.source),
    ...expenseSources.map((row) => row.source),
  ]);
}

/**
 * ============================================================
 * TRANSACTION DATA ACCESS
 * ============================================================
 */

/**
 * Get transactions for a business within a date range
 */
export async function getBusinessTransactions(
  businessId: number,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
        eq(transactions.status, "completed")
      )
    )
    .orderBy((t) => t.transactionDate);
}

/**
 * Get all transactions for a business (no date filter)
 */
export async function getAllBusinessTransactions(
  businessId: number
): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .orderBy((t) => t.transactionDate);
}

/**
 * ============================================================
 * EXPENSE DATA ACCESS
 * ============================================================
 */

/**
 * Get expenses for a business within a date range
 */
export async function getBusinessExpenses(
  businessId: number,
  startDate: Date,
  endDate: Date
): Promise<Expense[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.businessId, businessId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate),
        eq(expenses.status, "completed")
      )
    )
    .orderBy((e) => e.expenseDate);
}

/**
 * Get all expenses for a business (no date filter)
 */
export async function getAllBusinessExpenses(
  businessId: number
): Promise<Expense[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(expenses)
    .where(eq(expenses.businessId, businessId))
    .orderBy((e) => e.expenseDate);
}

/**
 * ============================================================
 * CUSTOMER DATA ACCESS
 * ============================================================
 */

/**
 * Get all customers for a business
 */
export async function getBusinessCustomers(
  businessId: number
): Promise<Customer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy((c) => c.name);
}

/**
 * Get customers active in a date range (have transactions)
 */
export async function getActiveCustomersInPeriod(
  businessId: number,
  startDate: Date,
  endDate: Date
): Promise<Customer[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get unique customer IDs that have transactions in this period
  const activeCustomerIds = await db
    .selectDistinct({ customerId: transactions.customerId })
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
        eq(transactions.status, "completed")
      )
    );

  if (activeCustomerIds.length === 0) return [];

  const customerIds = activeCustomerIds
    .map((row) => row.customerId)
    .filter((id) => id !== null) as number[];

  if (customerIds.length === 0) return [];

  return db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.businessId, businessId),
        inArray(customers.id, customerIds),
      )
    )
    .orderBy((c) => c.name);
}

/**
 * ============================================================
 * PRODUCT DATA ACCESS
 * ============================================================
 */

/**
 * Get all products for a business
 */
export async function getBusinessProducts(
  businessId: number
): Promise<Product[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId))
    .orderBy((p) => p.name);
}

/**
 * ============================================================
 * DATA STATISTICS
 * ============================================================
 */

/**
 * Get data statistics for a business
 */
export async function getBusinessDataStats(businessId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [
    customerCount,
    productCount,
    transactionCount,
    expenseCount,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.businessId, businessId)),
    db
      .select({ count: count() })
      .from(products)
      .where(eq(products.businessId, businessId)),
    db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.businessId, businessId)),
    db
      .select({ count: count() })
      .from(expenses)
      .where(eq(expenses.businessId, businessId)),
  ]);

  return {
    customers: customerCount[0]?.count || 0,
    products: productCount[0]?.count || 0,
    transactions: transactionCount[0]?.count || 0,
    expenses: expenseCount[0]?.count || 0,
  };
}

/**
 * Get the most recent stored update timestamp for transaction records.
 * Uses the existing updatedAt column, which also reflects record creation.
 */
export async function getLastTransactionUpdateDate(
  businessId: number
): Promise<Date | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ updatedAt: transactions.updatedAt })
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .orderBy(desc(transactions.updatedAt))
    .limit(1);

  return result.length > 0 ? result[0].updatedAt : null;
}

/** Get the most recent stored update timestamp for expense records. */
export async function getLastExpenseUpdateDate(
  businessId: number
): Promise<Date | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ updatedAt: expenses.updatedAt })
    .from(expenses)
    .where(eq(expenses.businessId, businessId))
    .orderBy(desc(expenses.updatedAt))
    .limit(1);

  return result.length > 0 ? result[0].updatedAt : null;
}

/** Get the most recent stored update timestamp for customer records. */
export async function getLastCustomerUpdateDate(
  businessId: number
): Promise<Date | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ updatedAt: customers.updatedAt })
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy(desc(customers.updatedAt))
    .limit(1);

  return result.length > 0 ? result[0].updatedAt : null;
}

/**
 * Get the most recent transaction business date for a business.
 * Kept for metric and historical activity calculations.
 */
export async function getLastTransactionDate(
  businessId: number
): Promise<Date | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ transactionDate: transactions.transactionDate })
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .orderBy(desc(transactions.transactionDate))
    .limit(1);

  return result.length > 0 ? result[0].transactionDate : null;
}

/** Get the most recent expense date for a business. */
export async function getLastExpenseDate(
  businessId: number
): Promise<Date | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ expenseDate: expenses.expenseDate })
    .from(expenses)
    .where(eq(expenses.businessId, businessId))
    .orderBy(desc(expenses.expenseDate))
    .limit(1);

  return result.length > 0 ? result[0].expenseDate : null;
}
