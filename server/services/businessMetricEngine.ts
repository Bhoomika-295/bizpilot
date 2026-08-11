import {
  getBusinessTransactions,
  getBusinessExpenses,
  getBusinessCustomers,
  getBusinessDataStats,
  getLastCustomerUpdateDate,
  getLastExpenseUpdateDate,
  getLastTransactionUpdateDate,
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
    previousActive: number;
    activeChange: number;
    activePercentChange: number;
    hasData: boolean;
    hasPreviousData: boolean;
  };
  averageTransactionValue: number;
  lastUpdated: Date;
}

export const BUSINESS_CHANGE_THRESHOLD_PERCENT = 5;

export const SIGNAL_PRIORITY_THRESHOLDS = {
  mediumPercent: 10,
  highPercent: 20,
} as const;

export type BusinessSignalPriority = "LOW" | "MEDIUM" | "HIGH";

export function getSignalPriority(percentChange: number): BusinessSignalPriority {
  const magnitude = Math.abs(percentChange);
  if (magnitude >= SIGNAL_PRIORITY_THRESHOLDS.highPercent) return "HIGH";
  if (magnitude >= SIGNAL_PRIORITY_THRESHOLDS.mediumPercent) return "MEDIUM";
  return "LOW";
}

export type BusinessChangeStatus =
  | "changes_detected"
  | "no_significant_changes"
  | "insufficient_data";

export interface BusinessChange {
  metric: "revenue" | "expenses" | "transactionCount" | "customers";
  label: string;
  direction: "increase" | "decrease";
  percentChange: number;
  absoluteChange: number;
  priority: BusinessSignalPriority;
  summary: string;
}

export interface BusinessChangeDetection {
  status: BusinessChangeStatus;
  thresholdPercent: number;
  changes: BusinessChange[];
  periodLabel: string;
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
  const previousActiveCustomerIds = new Set(
    previousTransactions
      .map((t) => t.customerId)
      .filter((id) => id !== null)
  );
  const previousActiveCustomers = previousActiveCustomerIds.size;
  const inactiveCustomers = Math.max(
    0,
    allCustomers.length - activeCustomers
  );
  const activeCustomerChange = activeCustomers - previousActiveCustomers;
  const activeCustomerPercentChange =
    previousActiveCustomers > 0
      ? (activeCustomerChange / previousActiveCustomers) * 100
      : 0;

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
      previousActive: previousActiveCustomers,
      activeChange: activeCustomerChange,
      activePercentChange: activeCustomerPercentChange,
      hasData: allCustomers.length > 0,
      hasPreviousData: previousTransactions.length > 0,
    },
    averageTransactionValue,
    lastUpdated: new Date(),
  };
}

/**
 * Identify meaningful internal changes from the current and previous comparable periods.
 * This intentionally uses the existing metric engine output and never external data.
 */
export function detectBusinessChanges(
  metrics: BusinessMetrics,
  thresholdPercent = BUSINESS_CHANGE_THRESHOLD_PERCENT
): BusinessChangeDetection {
  const candidates = [
    {
      metric: "revenue" as const,
      label: "Revenue",
      currentValue: metrics.revenue.value,
      previousValue: metrics.revenue.previousValue,
      percentChange: metrics.revenue.percentChange,
      hasData: metrics.revenue.hasData,
      hasPreviousData: metrics.revenue.hasPreviousData,
    },
    {
      metric: "expenses" as const,
      label: "Expenses",
      currentValue: metrics.expenses.value,
      previousValue: metrics.expenses.previousValue,
      percentChange: metrics.expenses.percentChange,
      hasData: metrics.expenses.hasData,
      hasPreviousData: metrics.expenses.hasPreviousData,
    },
    {
      metric: "transactionCount" as const,
      label: "Transaction volume",
      currentValue: metrics.transactionCount.value,
      previousValue: metrics.transactionCount.previousValue,
      percentChange: metrics.transactionCount.percentChange,
      hasData: metrics.transactionCount.hasData,
      hasPreviousData: metrics.transactionCount.hasPreviousData,
    },
    {
      metric: "customers" as const,
      label: "Customer activity",
      currentValue: metrics.customers.active,
      previousValue: metrics.customers.previousActive,
      percentChange: metrics.customers.activePercentChange,
      hasData: metrics.customers.hasData,
      hasPreviousData: metrics.customers.hasPreviousData,
    },
  ];

  const comparableCandidates = candidates.filter(
    (candidate) =>
      candidate.hasData &&
      candidate.hasPreviousData &&
      candidate.previousValue > 0
  );

  if (comparableCandidates.length === 0) {
    return {
      status: "insufficient_data",
      thresholdPercent,
      changes: [],
      periodLabel: "Current period vs previous comparable period",
    };
  }

  const changes = comparableCandidates
    .filter(
      (candidate) => Math.abs(candidate.percentChange) >= thresholdPercent
    )
    .map((candidate) => {
      const direction = candidate.percentChange >= 0 ? "increase" : "decrease";
      const absoluteChange = candidate.currentValue - candidate.previousValue;
      return {
        metric: candidate.metric,
        label: candidate.label,
        direction,
        percentChange: candidate.percentChange,
        absoluteChange,
        priority: getSignalPriority(candidate.percentChange),
        summary: `${candidate.label} ${direction === "increase" ? "increased" : "decreased"} ${Math.abs(candidate.percentChange).toFixed(1)}% compared with the previous period.`,
      } satisfies BusinessChange;
    });

  return {
    status: changes.length > 0 ? "changes_detected" : "no_significant_changes",
    thresholdPercent,
    changes,
    periodLabel: "Current period vs previous comparable period",
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
 * Get freshness information from the latest stored update timestamp.
 * This is deliberately not a real-time claim: it describes persisted records only.
 */
export type DataFreshnessStatus = "up_to_date" | "needs_refresh" | "no_data";

export interface DataFreshness {
  status: DataFreshnessStatus;
  label: string;
  lastUpdate: Date | null;
  daysSinceLastUpdate: number | null;
  dataPoints: Awaited<ReturnType<typeof getBusinessDataStats>>;
}

export function classifyDataFreshness(
  latestUpdate: Date | null,
  now = new Date()
): Pick<DataFreshness, "status" | "label" | "daysSinceLastUpdate"> {
  if (!latestUpdate) {
    return {
      status: "no_data",
      label: "No business data available yet.",
      daysSinceLastUpdate: null,
    };
  }

  const ageInMilliseconds = Math.max(0, now.getTime() - latestUpdate.getTime());
  const daysSinceLastUpdate = Math.floor(
    ageInMilliseconds / (1000 * 60 * 60 * 24)
  );

  if (ageInMilliseconds < 24 * 60 * 60 * 1000) {
    return {
      status: "up_to_date",
      label: "Up to date",
      daysSinceLastUpdate,
    };
  }

  return {
    status: "needs_refresh",
    label: "Needs refresh",
    daysSinceLastUpdate,
  };
}

export async function getDataFreshness(
  businessId: number
): Promise<DataFreshness> {
  const [lastTransactionUpdate, lastExpenseUpdate, lastCustomerUpdate, stats] =
    await Promise.all([
      getLastTransactionUpdateDate(businessId),
      getLastExpenseUpdateDate(businessId),
      getLastCustomerUpdateDate(businessId),
      getBusinessDataStats(businessId),
    ]);

  const latestUpdate = [
    lastTransactionUpdate,
    lastExpenseUpdate,
    lastCustomerUpdate,
  ]
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    ...classifyDataFreshness(latestUpdate),
    lastUpdate: latestUpdate,
    dataPoints: stats,
  };
}
