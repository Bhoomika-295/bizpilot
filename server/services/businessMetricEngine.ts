import {
  getBusinessTransactions,
  getBusinessExpenses,
  getBusinessCustomers,
  getBusinessDataStats,
  getLastExpenseDate,
  getLastTransactionDate,
} from "./businessDataService";

/**
 * Business Metric Engine
 * 
 * Calculates business metrics from real database data.
 * All calculations are deterministic and based on actual records.
 */

export interface MetricResult {
  value: number;
  previousValue: number;
  change: number;
  percentChange: number;
  hasData: boolean;
  hasPreviousData: boolean;
}

export interface BusinessMetrics {
  revenue: MetricResult;
  expenses: MetricResult;
  estimatedProfit: MetricResult;
  transactionCount: MetricResult;
  customers: {
    total: number;
    active: number;
    inactive: number;
    hasData: boolean;
  };
  averageTransactionValue: number;
  lastUpdated: Date;
}

export type HealthScoreDataBasis = "demo" | "real";

export interface HealthScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  summary: string;
}

export interface BusinessHealthScore {
  score: number | null;
  maxScore: number;
  percentage: number | null;
  explanation: string;
  hasEnoughData: boolean;
  dataBasis: HealthScoreDataBasis;
  factors: HealthScoreFactor[];
}

/**
 * Calculate metrics for a business in a given period
 * Compares with the previous equivalent period
 */
export async function calculateBusinessMetrics(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<BusinessMetrics> {
  // Calculate previous period dates
  const periodDuration =
    periodEndDate.getTime() - periodStartDate.getTime();
  const previousPeriodEndDate = new Date(periodStartDate.getTime());
  const previousPeriodStartDate = new Date(
    periodStartDate.getTime() - periodDuration
  );

  // Fetch data for current and previous periods
  const [
    currentTransactions,
    previousTransactions,
    currentExpenses,
    previousExpenses,
    allCustomers,
  ] = await Promise.all([
    getBusinessTransactions(businessId, periodStartDate, periodEndDate),
    getBusinessTransactions(
      businessId,
      previousPeriodStartDate,
      previousPeriodEndDate
    ),
    getBusinessExpenses(businessId, periodStartDate, periodEndDate),
    getBusinessExpenses(
      businessId,
      previousPeriodStartDate,
      previousPeriodEndDate
    ),
    getBusinessCustomers(businessId),
  ]);

  // Calculate revenue metrics
  const currentRevenue = sumTransactionAmounts(currentTransactions);
  const previousRevenue = sumTransactionAmounts(previousTransactions);
  const revenueChange = currentRevenue - previousRevenue;
  const revenuePercentChange =
    previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;

  // Calculate expense metrics
  const currentExpenses_total = sumExpenseAmounts(currentExpenses);
  const previousExpenses_total = sumExpenseAmounts(previousExpenses);
  const expenseChange = currentExpenses_total - previousExpenses_total;
  const expensePercentChange =
    previousExpenses_total > 0
      ? (expenseChange / previousExpenses_total) * 100
      : 0;

  // Calculate profit
  const estimatedProfit = currentRevenue - currentExpenses_total;
  const previousProfit = previousRevenue - previousExpenses_total;
  const profitChange = estimatedProfit - previousProfit;
  const profitPercentChange =
    previousProfit !== 0 ? (profitChange / Math.abs(previousProfit)) * 100 : 0;

  // Calculate transaction metrics
  const transactionCountChange =
    currentTransactions.length - previousTransactions.length;
  const transactionPercentChange =
    previousTransactions.length > 0
      ? (transactionCountChange / previousTransactions.length) * 100
      : 0;

  // Calculate average transaction value
  const averageTransactionValue =
    currentTransactions.length > 0
      ? currentRevenue / currentTransactions.length
      : 0;

  // Categorize customers as active/inactive
  const activeCustomerIds = new Set(
    currentTransactions
      .map((t) => t.customerId)
      .filter((id) => id !== null)
  );
  const activeCustomers = activeCustomerIds.size;
  const inactiveCustomers = Math.max(
    0,
    allCustomers.length - activeCustomers
  );

  return {
    revenue: {
      value: currentRevenue,
      previousValue: previousRevenue,
      change: revenueChange,
      percentChange: revenuePercentChange,
      hasData: currentTransactions.length > 0,
      hasPreviousData: previousTransactions.length > 0,
    },
    expenses: {
      value: currentExpenses_total,
      previousValue: previousExpenses_total,
      change: expenseChange,
      percentChange: expensePercentChange,
      hasData: currentExpenses.length > 0,
      hasPreviousData: previousExpenses.length > 0,
    },
    estimatedProfit: {
      value: estimatedProfit,
      previousValue: previousProfit,
      change: profitChange,
      percentChange: profitPercentChange,
      hasData: currentTransactions.length > 0 || currentExpenses.length > 0,
      hasPreviousData: previousTransactions.length > 0 || previousExpenses.length > 0,
    },
    transactionCount: {
      value: currentTransactions.length,
      previousValue: previousTransactions.length,
      change: transactionCountChange,
      percentChange: transactionPercentChange,
      hasData: currentTransactions.length > 0,
      hasPreviousData: previousTransactions.length > 0,
    },
    customers: {
      total: allCustomers.length,
      active: activeCustomers,
      inactive: inactiveCustomers,
      hasData: allCustomers.length > 0,
    },
    averageTransactionValue,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate Business Health Score
 * 
 * IMPORTANT: This is an initial product metric, not scientifically accurate.
 * It becomes more sophisticated in future versions.
 * 
 * Factors considered:
 * - Revenue trend (0-25 points)
 * - Expense trend (0-25 points)
 * - Customer activity (0-25 points)
 * - Transaction activity (0-25 points)
 */
export async function calculateBusinessHealthScore(
  businessId: number,
  periodStartDate: Date,
  periodEndDate: Date,
  dataBasis: HealthScoreDataBasis = "real"
): Promise<BusinessHealthScore> {
  const metrics = await calculateBusinessMetrics(
    businessId,
    periodStartDate,
    periodEndDate
  );

  // A trend is only meaningful when both periods contain the relevant data.
  // This prevents a missing previous period from being treated as "stable".
  const factors: HealthScoreFactor[] = [];

  if (metrics.revenue.hasData && metrics.revenue.hasPreviousData) {
    const points = pointsForRevenueTrend(metrics.revenue.percentChange);
    factors.push({
      name: "Revenue trend",
      points,
      maxPoints: 25,
      summary: revenueSummary(metrics.revenue.percentChange),
    });
  }

  if (metrics.expenses.hasData && metrics.expenses.hasPreviousData) {
    const points = pointsForExpenseTrend(metrics.expenses.percentChange);
    factors.push({
      name: "Expense trend",
      points,
      maxPoints: 25,
      summary: expenseSummary(metrics.expenses.percentChange),
    });
  }

  if (metrics.customers.hasData && metrics.customers.active > 0) {
    const activeRatio = metrics.customers.active / metrics.customers.total;
    const points = pointsForCustomerActivity(activeRatio);
    factors.push({
      name: "Customer activity",
      points,
      maxPoints: 25,
      summary: customerSummary(activeRatio),
    });
  }

  if (
    metrics.transactionCount.hasData &&
    metrics.transactionCount.hasPreviousData
  ) {
    const points = pointsForTransactionTrend(
      metrics.transactionCount.percentChange
    );
    factors.push({
      name: "Transaction trend",
      points,
      maxPoints: 25,
      summary: transactionSummary(metrics.transactionCount.percentChange),
    });
  }

  const hasEnoughData = factors.length >= 2;
  if (!hasEnoughData) {
    return {
      score: null,
      maxScore: 100,
      percentage: null,
      explanation:
        "Not enough data. Add records across at least two comparable business signals to calculate a meaningful score.",
      hasEnoughData: false,
      dataBasis,
      factors,
    };
  }

  const score = Math.round(
    (factors.reduce((total, factor) => total + factor.points, 0) /
      (factors.length * 25)) *
      100
  );

  return {
    score,
    maxScore: 100,
    percentage: score,
    explanation: generateHealthExplanation(factors, score),
    hasEnoughData: true,
    dataBasis,
    factors,
  };
}

/**
 * Helper: Sum transaction amounts
 */
function sumTransactionAmounts(transactions: any[]): number {
  return transactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount || "0");
    return sum + amount;
  }, 0);
}

/**
 * Helper: Sum expense amounts
 */
function sumExpenseAmounts(expenses: any[]): number {
  return expenses.reduce((sum, e) => {
    const amount = parseFloat(e.amount || "0");
    return sum + amount;
  }, 0);
}

function pointsForRevenueTrend(percentChange: number): number {
  if (percentChange > 10) return 25;
  if (percentChange > 0) return 20;
  if (percentChange > -10) return 10;
  return 5;
}

function pointsForExpenseTrend(percentChange: number): number {
  if (percentChange < -5) return 25;
  if (percentChange < 5) return 20;
  if (percentChange < 15) return 10;
  return 5;
}

function pointsForCustomerActivity(activeRatio: number): number {
  if (activeRatio > 0.7) return 25;
  if (activeRatio > 0.5) return 20;
  if (activeRatio > 0.3) return 10;
  return 5;
}

function pointsForTransactionTrend(percentChange: number): number {
  if (percentChange > 15) return 25;
  if (percentChange > 0) return 20;
  if (percentChange > -10) return 10;
  return 5;
}

function revenueSummary(percentChange: number): string {
  if (percentChange > 10) return "Revenue is increasing strongly.";
  if (percentChange > 0) return "Revenue is improving.";
  if (percentChange > -10) return "Revenue is stable.";
  return "Revenue is declining.";
}

function expenseSummary(percentChange: number): string {
  if (percentChange < -5) return "Expenses are decreasing.";
  if (percentChange < 5) return "Expenses are well controlled.";
  if (percentChange < 15) return "Expenses are growing.";
  return "Expenses are growing rapidly.";
}

function customerSummary(activeRatio: number): string {
  if (activeRatio > 0.7) return "Customer activity is strong.";
  if (activeRatio > 0.5) return "Customer activity is good.";
  if (activeRatio > 0.3) return "Customer activity is moderate.";
  return "Customer activity is low.";
}

function transactionSummary(percentChange: number): string {
  if (percentChange > 15) return "Transaction volume is increasing.";
  if (percentChange > 0) return "Transaction volume is growing.";
  if (percentChange > -10) return "Transaction volume is stable.";
  return "Transaction volume is declining.";
}

/** Generate an explanation from the calculated score factors. */
function generateHealthExplanation(
  factors: HealthScoreFactor[],
  score: number
): string {
  const status = score >= 70 ? "improving" : score >= 50 ? "stable" : "needs attention";
  const summaries = factors
    .slice(0, 2)
    .map((factor) => factor.summary)
    .join(" ");

  return `Business health is ${status}. ${summaries}`;
}

/**
 * Get data freshness information
 */
export async function getDataFreshness(businessId: number) {
  const [lastTransactionDate, lastExpenseDate, stats] = await Promise.all([
    getLastTransactionDate(businessId),
    getLastExpenseDate(businessId),
    getBusinessDataStats(businessId),
  ]);
  const latestActivityDate = [lastTransactionDate, lastExpenseDate]
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const now = new Date();
  let freshness = "unknown";
  let freshnessDays = null;

  if (latestActivityDate) {
    const daysSinceLastUpdate = Math.floor(
      (now.getTime() - latestActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    freshnessDays = daysSinceLastUpdate;

    if (daysSinceLastUpdate === 0) {
      freshness = "today";
    } else if (daysSinceLastUpdate === 1) {
      freshness = "yesterday";
    } else if (daysSinceLastUpdate < 7) {
      freshness = "this week";
    } else if (daysSinceLastUpdate < 30) {
      freshness = "this month";
    } else {
      freshness = "older";
    }
  }

  return {
    lastUpdate: latestActivityDate,
    freshness,
    daysSinceLastUpdate: freshnessDays,
    dataPoints: stats,
  };
}
