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

export interface BusinessHealthScore {
  score: number;
  maxScore: number;
  percentage: number;
  explanation: string;
  hasEnoughData: boolean;
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
    },
    expenses: {
      value: currentExpenses_total,
      previousValue: previousExpenses_total,
      change: expenseChange,
      percentChange: expensePercentChange,
      hasData: currentExpenses.length > 0,
    },
    estimatedProfit: {
      value: estimatedProfit,
      previousValue: previousProfit,
      change: profitChange,
      percentChange: profitPercentChange,
      hasData: currentTransactions.length > 0 || currentExpenses.length > 0,
    },
    transactionCount: {
      value: currentTransactions.length,
      previousValue: previousTransactions.length,
      change: transactionCountChange,
      percentChange: transactionPercentChange,
      hasData: currentTransactions.length > 0,
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
  periodEndDate: Date
): Promise<BusinessHealthScore> {
  const metrics = await calculateBusinessMetrics(
    businessId,
    periodStartDate,
    periodEndDate
  );

  // Check if we have enough data
  const totalDataPoints =
    (metrics.revenue.hasData ? 1 : 0) +
    (metrics.expenses.hasData ? 1 : 0) +
    (metrics.customers.hasData ? 1 : 0) +
    (metrics.transactionCount.hasData ? 1 : 0);

  if (totalDataPoints === 0) {
    return {
      score: 0,
      maxScore: 100,
      percentage: 0,
      explanation:
        "Not enough data yet. Add transactions and expenses to generate a reliable health score.",
      hasEnoughData: false,
    };
  }

  let score = 0;
  const factors: string[] = [];

  // Revenue trend (0-25 points)
  if (metrics.revenue.hasData) {
    if (metrics.revenue.percentChange > 10) {
      score += 25;
      factors.push("Revenue is increasing strongly");
    } else if (metrics.revenue.percentChange > 0) {
      score += 20;
      factors.push("Revenue is improving");
    } else if (metrics.revenue.percentChange > -10) {
      score += 10;
      factors.push("Revenue is stable");
    } else {
      score += 5;
      factors.push("Revenue is declining");
    }
  }

  // Expense trend (0-25 points)
  // Lower expenses or controlled growth is better
  if (metrics.expenses.hasData) {
    if (metrics.expenses.percentChange < -5) {
      score += 25;
      factors.push("Expenses are decreasing");
    } else if (metrics.expenses.percentChange < 5) {
      score += 20;
      factors.push("Expenses are well-controlled");
    } else if (metrics.expenses.percentChange < 15) {
      score += 10;
      factors.push("Expenses are growing");
    } else {
      score += 5;
      factors.push("Expenses are growing rapidly");
    }
  }

  // Customer activity (0-25 points)
  if (metrics.customers.hasData) {
    const activeRatio =
      metrics.customers.total > 0
        ? metrics.customers.active / metrics.customers.total
        : 0;

    if (activeRatio > 0.7) {
      score += 25;
      factors.push("Customer activity is strong");
    } else if (activeRatio > 0.5) {
      score += 20;
      factors.push("Customer activity is good");
    } else if (activeRatio > 0.3) {
      score += 10;
      factors.push("Customer activity is moderate");
    } else {
      score += 5;
      factors.push("Customer activity is low");
    }
  }

  // Transaction activity (0-25 points)
  if (metrics.transactionCount.hasData) {
    if (metrics.transactionCount.percentChange > 15) {
      score += 25;
      factors.push("Transaction volume is increasing");
    } else if (metrics.transactionCount.percentChange > 0) {
      score += 20;
      factors.push("Transaction volume is growing");
    } else if (metrics.transactionCount.percentChange > -10) {
      score += 10;
      factors.push("Transaction volume is stable");
    } else {
      score += 5;
      factors.push("Transaction volume is declining");
    }
  }

  // Normalize score based on data points available
  const normalizedScore = Math.round(
    (score / (totalDataPoints * 25)) * 100
  );

  return {
    score: normalizedScore,
    maxScore: 100,
    percentage: normalizedScore,
    explanation: generateHealthExplanation(factors, metrics),
    hasEnoughData: totalDataPoints >= 2,
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

/**
 * Generate human-readable health explanation
 */
function generateHealthExplanation(
  factors: string[],
  metrics: BusinessMetrics
): string {
  if (factors.length === 0) {
    return "Not enough data to assess health.";
  }

  const mainFactor = factors[0];
  const additionalFactors = factors.slice(1, 2);

  let explanation = `Health is ${
    metrics.revenue.percentChange > 5 ? "improving" : "stable"
  }. ${mainFactor}.`;

  if (additionalFactors.length > 0) {
    explanation += ` ${additionalFactors[0]}.`;
  }

  return explanation;
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
