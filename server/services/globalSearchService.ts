import { getDb } from "../db";
import { 
  customers, 
  products, 
  transactions, 
  expenses, 
  actionPlans, 
  strategies, 
  recommendations, 
  competitors, 
  marketSignals, 
  scenarios, 
  businessMemories 
} from "../../drizzle/schema.postgres";
import { and, eq, ilike, or, desc, sql } from "drizzle-orm";

export interface SearchResultItem {
  id: string | number;
  entityType: 
    | "customer" 
    | "product" 
    | "transaction" 
    | "expense" 
    | "action_plan" 
    | "strategy" 
    | "recommendation" 
    | "competitor" 
    | "market_signal" 
    | "scenario" 
    | "business_memory";
  title: string;
  subtitle: string;
  status?: string;
  url: string;
  createdAt?: string | Date;
}

export interface GlobalSearchResponse {
  query: string;
  businessId: number;
  totalResults: number;
  results: SearchResultItem[];
}

export async function executeGlobalSearch(businessId: number, query: string, limitPerEntity = 5): Promise<GlobalSearchResponse> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return {
      query: trimmedQuery,
      businessId,
      totalResults: 0,
      results: [],
    };
  }

  const searchTerm = `%${trimmedQuery}%`;

  // 1. Search Customers
  const customerResults = await db
    .select()
    .from(customers)
    .where(and(eq(customers.businessId, businessId), or(ilike(customers.name, searchTerm), ilike(customers.email, searchTerm))))
    .limit(limitPerEntity);

  const customerItems: SearchResultItem[] = customerResults.map(c => ({
    id: c.id,
    entityType: "customer",
    title: c.name,
    subtitle: `${c.email || "No email"} · Spent: ₹${c.totalSpent || 0}`,
    status: c.status || "active",
    url: `/customers`,
    createdAt: c.createdAt,
  }));

  // 2. Search Products
  const productResults = await db
    .select()
    .from(products)
    .where(and(eq(products.businessId, businessId), or(ilike(products.name, searchTerm), ilike(products.category, searchTerm))))
    .limit(limitPerEntity);

  const productItems: SearchResultItem[] = productResults.map(p => ({
    id: p.id,
    entityType: "product",
    title: p.name,
    subtitle: `${p.category || "General"} · Price: ₹${p.price || 0}`,
    status: `${p.stock || 0} in stock`,
    url: `/products`,
    createdAt: p.createdAt,
  }));

  // 3. Search Transactions
  const transactionResults = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.businessId, businessId), or(ilike(transactions.type, searchTerm), ilike(transactions.description, searchTerm))))
    .limit(limitPerEntity);

  const transactionItems: SearchResultItem[] = transactionResults.map(t => ({
    id: t.id,
    entityType: "transaction",
    title: `${t.type.toUpperCase()} - ₹${t.amount}`,
    subtitle: t.description || `Transaction #${t.id}`,
    status: t.status || "completed",
    url: `/transactions`,
    createdAt: t.createdAt,
  }));

  // 4. Search Expenses
  const expenseResults = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.businessId, businessId), or(ilike(expenses.category, searchTerm), ilike(expenses.description, searchTerm))))
    .limit(limitPerEntity);

  const expenseItems: SearchResultItem[] = expenseResults.map(e => ({
    id: e.id,
    entityType: "expense",
    title: `${e.category} - ₹${e.amount}`,
    subtitle: e.description || `Expense #${e.id}`,
    status: "recorded",
    url: `/expenses`,
    createdAt: e.createdAt,
  }));

  // 5. Search Action Plans
  const actionResults = await db
    .select()
    .from(actionPlans)
    .where(and(eq(actionPlans.businessId, businessId), or(ilike(actionPlans.title, searchTerm), ilike(actionPlans.description, searchTerm))))
    .limit(limitPerEntity);

  const actionItems: SearchResultItem[] = actionResults.map(a => ({
    id: a.id,
    entityType: "action_plan",
    title: a.title,
    subtitle: a.description || "Action Plan",
    status: a.status || "pending",
    url: `/actions`,
    createdAt: a.createdAt,
  }));

  // 6. Search Strategies
  const strategyResults = await db
    .select()
    .from(strategies)
    .where(and(eq(strategies.businessId, businessId), or(ilike(strategies.title, searchTerm), ilike(strategies.description, searchTerm))))
    .limit(limitPerEntity);

  const strategyItems: SearchResultItem[] = strategyResults.map(s => ({
    id: s.id,
    entityType: "strategy",
    title: s.title,
    subtitle: s.description || "Strategy",
    status: s.status || "active",
    url: `/strategies`,
    createdAt: s.createdAt,
  }));

  // 7. Search Recommendations
  const recResults = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.businessId, businessId), or(ilike(recommendations.title, searchTerm), ilike(recommendations.description, searchTerm))))
    .limit(limitPerEntity);

  const recItems: SearchResultItem[] = recResults.map(r => ({
    id: r.id,
    entityType: "recommendation",
    title: r.title,
    subtitle: r.description || "Recommendation",
    status: r.priority || "medium",
    url: `/intelligence`,
    createdAt: r.createdAt,
  }));

  // 8. Search Competitors
  const compResults = await db
    .select()
    .from(competitors)
    .where(and(eq(competitors.businessId, businessId), or(ilike(competitors.name, searchTerm), ilike(competitors.strengths, searchTerm))))
    .limit(limitPerEntity);

  const compItems: SearchResultItem[] = compResults.map(c => ({
    id: c.id,
    entityType: "competitor",
    title: c.name,
    subtitle: c.strengths || "Competitor analysis",
    status: c.threatLevel || "moderate",
    url: `/competitors`,
    createdAt: c.createdAt,
  }));

  // 9. Search Scenarios
  const scenarioResults = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.businessId, businessId), or(ilike(scenarios.title, searchTerm), ilike(scenarios.description, searchTerm))))
    .limit(limitPerEntity);

  const scenarioItems: SearchResultItem[] = scenarioResults.map(s => ({
    id: s.id,
    entityType: "scenario",
    title: s.title,
    subtitle: s.description || "Scenario Simulation",
    status: s.status || "draft",
    url: `/scenarios`,
    createdAt: s.createdAt,
  }));

  // 10. Search Business Memories
  const memoryResults = await db
    .select()
    .from(businessMemories)
    .where(and(eq(businessMemories.businessId, businessId), or(ilike(businessMemories.title, searchTerm), ilike(businessMemories.content, searchTerm))))
    .limit(limitPerEntity);

  const memoryItems: SearchResultItem[] = memoryResults.map(m => ({
    id: m.id,
    entityType: "business_memory",
    title: m.title,
    subtitle: m.content || "Business Memory",
    status: m.category || "decision",
    url: `/memory`,
    createdAt: m.createdAt,
  }));

  const allResults: SearchResultItem[] = [
    ...customerItems,
    ...productItems,
    ...transactionItems,
    ...expenseItems,
    ...actionItems,
    ...strategyItems,
    ...recItems,
    ...compItems,
    ...scenarioItems,
    ...memoryItems,
  ];

  return {
    query: trimmedQuery,
    businessId,
    totalResults: allResults.length,
    results: allResults,
  };
}
