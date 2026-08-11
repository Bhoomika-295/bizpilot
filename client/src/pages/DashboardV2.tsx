import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

type PeriodType = "last30" | "previous30";

export default function DashboardV2() {
  const { businessId } = useParams<{ businessId: string }>();
  const { user, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [period, setPeriod] = useState<PeriodType>("last30");
  const [now] = useState(() => new Date());

  // Keep query inputs stable for the lifetime of the dashboard view.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const periodStartDate = period === "last30" ? thirtyDaysAgo : sixtyDaysAgo;
  const periodEndDate = period === "last30" ? now : thirtyDaysAgo;

  // Fetch metrics
  const metricsQuery = trpc.businessMetrics.getMetrics.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate,
      periodEndDate,
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const healthScoreQuery = trpc.businessMetrics.getHealthScore.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate,
      periodEndDate,
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const freshnessQuery = trpc.businessMetrics.getDataFreshness.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const isLoading =
    metricsQuery.isLoading ||
    healthScoreQuery.isLoading ||
    freshnessQuery.isLoading;
  const queryError =
    metricsQuery.error || healthScoreQuery.error || freshnessQuery.error;
  const isAccessError = [
    metricsQuery.error,
    healthScoreQuery.error,
    freshnessQuery.error,
  ].some((error) => {
    const data = (error as { data?: { code?: string } } | null | undefined)?.data;
    return data?.code === "FORBIDDEN" || error?.message?.includes("access");
  });

  if (queryError) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[24rem] max-w-2xl items-center justify-center px-4">
          <Alert className="border-slate-200 bg-white">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <strong className="text-slate-900">
                  {isAccessError ? "Business unavailable" : "Dashboard unavailable"}
                </strong>
                <p className="mt-1 text-sm text-slate-600">
                  {isAccessError
                    ? "You do not have access to this business. Choose one of your businesses to continue."
                    : "We could not load this dashboard. Try again without changing your data."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void metricsQuery.refetch();
                  void healthScoreQuery.refetch();
                  void freshnessQuery.refetch();
                }}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
        </div>
      </DashboardLayout>
    );
  }

  const metrics = metricsQuery.data;
  const healthScore = healthScoreQuery.data;
  const freshness = freshnessQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Business Dashboard</h1>
            <p className="text-slate-600 mt-1">Real-time business metrics and insights</p>
          </div>

          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="previous30">Previous 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Business Health Score */}
        {healthScore && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-slate-700" />
                  BizPilot Business Health Score
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    healthScore.dataBasis === "demo"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                  }
                >
                  {healthScore.dataBasis === "demo"
                    ? "DEMO DATA"
                    : "REAL BUSINESS DATA"}
                </Badge>
              </div>
              <CardDescription>
                A transparent 0–100 indicator based on stored business signals. It is not a scientifically predictive measure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {healthScore.hasEnoughData &&
              healthScore.score !== null &&
              healthScore.percentage !== null ? (
                <>
                  <div className="flex items-baseline gap-4">
                    <div className="text-5xl font-bold text-slate-900">
                      {healthScore.score}
                    </div>
                    <div className="text-lg text-slate-600">/ 100</div>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {healthScore.explanation}
                  </p>
                  <div className="w-full bg-slate-200 rounded-full h-2" aria-label={`Health score ${healthScore.score} out of 100`}>
                    <div
                      className="bg-slate-800 h-2 rounded-full transition-[width] duration-200"
                      style={{ width: `${healthScore.percentage}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {healthScore.factors.map((factor) => (
                      <div
                        key={factor.name}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-800">{factor.name}</span>
                          <span className="text-slate-500">
                            {factor.points}/{factor.maxPoints}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{factor.summary}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Alert className="border-slate-200 bg-white">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Not enough data.</strong> {healthScore.explanation}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <MetricCard
              title="Revenue"
              value={metrics.revenue.value}
              previousValue={metrics.revenue.previousValue}
              change={metrics.revenue.change}
              percentChange={metrics.revenue.percentChange}
              hasData={metrics.revenue.hasData}
              currency="₹"
            />

            {/* Expenses */}
            <MetricCard
              title="Expenses"
              value={metrics.expenses.value}
              previousValue={metrics.expenses.previousValue}
              change={metrics.expenses.change}
              percentChange={metrics.expenses.percentChange}
              hasData={metrics.expenses.hasData}
              currency="₹"
              positiveWhenChangeNegative
            />

            {/* Estimated Profit */}
            <MetricCard
              title="Estimated Profit"
              value={metrics.estimatedProfit.value}
              previousValue={metrics.estimatedProfit.previousValue}
              change={metrics.estimatedProfit.change}
              percentChange={metrics.estimatedProfit.percentChange}
              hasData={metrics.estimatedProfit.hasData}
              currency="₹"
              subtitle="Based on available data"
            />

            {/* Transactions */}
            <MetricCard
              title="Transactions"
              value={metrics.transactionCount.value}
              previousValue={metrics.transactionCount.previousValue}
              change={metrics.transactionCount.change}
              percentChange={metrics.transactionCount.percentChange}
              hasData={metrics.transactionCount.hasData}
              isCount
            />
          </div>
        )}

        {/* Customer & Average Transaction Value */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {metrics.customers.total}
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  {metrics.customers.active} active, {metrics.customers.inactive} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Avg Transaction Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  ₹{metrics.averageTransactionValue.toFixed(2)}
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Per transaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Data Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full ${
                        freshness?.status === "up_to_date"
                          ? "bg-emerald-500"
                          : freshness?.status === "needs_refresh"
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-900">
                      {freshness?.label || "No business data available yet."}
                    </span>
                  </div>
                  {freshness?.lastUpdate ? (
                    <p className="text-xs text-slate-500">
                      Last updated {formatLastUpdated(freshness.lastUpdate)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Add a transaction, expense, or customer to establish a data timestamp.
                    </p>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="text-slate-600">Transactions</span>
                    <span className="font-semibold text-slate-900">
                      {freshness?.dataPoints.transactions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Customers</span>
                    <span className="font-semibold text-slate-900">
                      {freshness?.dataPoints.customers || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business Signals */}
        {metrics && healthScore && (
          <Card>
            <CardHeader>
              <CardTitle>Internal Business Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <SignalItem
                  positive={metrics.revenue.percentChange > 0}
                  text={
                    metrics.revenue.percentChange > 0
                      ? `Revenue increased by ${Math.abs(metrics.revenue.percentChange).toFixed(1)}%`
                      : `Revenue decreased by ${Math.abs(metrics.revenue.percentChange).toFixed(1)}%`
                  }
                />
                <SignalItem
                  positive={metrics.transactionCount.percentChange > 0}
                  text={
                    metrics.transactionCount.percentChange > 0
                      ? `Transaction volume increased by ${Math.abs(metrics.transactionCount.percentChange).toFixed(1)}%`
                      : `Transaction volume decreased by ${Math.abs(metrics.transactionCount.percentChange).toFixed(1)}%`
                  }
                />
                <SignalItem
                  positive={metrics.expenses.percentChange < 0}
                  text={
                    metrics.expenses.percentChange < 0
                      ? `Expenses decreased by ${Math.abs(metrics.expenses.percentChange).toFixed(1)}%`
                      : `Expenses increased by ${Math.abs(metrics.expenses.percentChange).toFixed(1)}%`
                  }
                  attention={metrics.expenses.percentChange > metrics.revenue.percentChange}
                />
                <SignalItem
                  positive={metrics.customers.active > metrics.customers.inactive}
                  text={`${metrics.customers.active} active customers vs ${metrics.customers.inactive} inactive`}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Quality Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Data Quality:</strong> All metrics are calculated from {freshness?.dataPoints.transactions || 0} transactions and {freshness?.dataPoints.customers || 0} customers in your database. Profit is estimated based on available transaction and expense data.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}

/**
 * Metric Card Component
 */
function formatLastUpdated(date: Date | string): string {
  const updatedAt = date instanceof Date ? date : new Date(date);
  const elapsedMs = Math.max(0, Date.now() - updatedAt.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  return updatedAt.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MetricCard({
  title,
  value,
  previousValue,
  change,
  percentChange,
  hasData,
  currency,
  isCount,
  subtitle,
  positiveWhenChangeNegative,
}: {
  title: string;
  value: number;
  previousValue: number;
  change: number;
  percentChange: number;
  hasData: boolean;
  currency?: string;
  isCount?: boolean;
  subtitle?: string;
  positiveWhenChangeNegative?: boolean;
}) {
  const isPositive = positiveWhenChangeNegative ? change <= 0 : change >= 0;
  const changePrefix = change >= 0 ? "+" : "-";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {hasData ? (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-slate-900">
                {currency}
                {isCount ? value : value.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm font-semibold ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : "-"}
                {Math.abs(percentChange).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-600">
                {changePrefix}{currency}{Math.abs(change).toFixed(isCount ? 0 : 2)} vs previous period
              </span>
            </div>
          </>
        ) : (
          <div className="text-slate-500 text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Signal Item Component
 */
function SignalItem({
  positive,
  text,
  attention,
}: {
  positive: boolean;
  text: string;
  attention?: boolean;
}) {
  const bgColor = attention
    ? "bg-yellow-50 border-yellow-200"
    : positive
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200";

  const iconColor = attention
    ? "text-yellow-600"
    : positive
      ? "text-green-600"
      : "text-red-600";

  const icon = attention ? "⚠️" : positive ? "✓" : "!";

  return (
    <div className={`p-3 rounded-lg border ${bgColor} flex items-start gap-3`}>
      <span className={`text-lg ${iconColor}`}>{icon}</span>
      <span className="text-sm text-slate-900">{text}</span>
    </div>
  );
}
