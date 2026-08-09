import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Users, ShoppingCart, DollarSign, AlertCircle } from "lucide-react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { businessId } = useParams<{ businessId: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [activeTab, setActiveTab] = useState("overview");

  const businessQuery = trpc.business.get.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId }
  );

  const metricsQuery = trpc.metrics.getBusinessMetrics.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId }
  );

  const goalsQuery = trpc.businessGoals.list.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId }
  );

  const externalSourcesQuery = trpc.externalDataSources.list.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId }
  );

  const business = businessQuery.data;
  const metrics = metricsQuery.data;
  const goals = goalsQuery.data || [];
  const externalSources = externalSourcesQuery.data || [];

  if (!user || !businessId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (businessQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Business not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: business.currency || "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{business.name}</h1>
              <p className="text-slate-600 mt-1">
                {business.industry} • {business.location}
              </p>
            </div>
            {business.isDemo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">DEMO DATA</span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Business Briefing */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardHeader>
            <CardTitle>Business Briefing</CardTitle>
            {business.isDemo && (
              <CardDescription>Demo data — Replace with your real business information</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics ? (
                <div className="space-y-2 text-slate-700">
                  <p>
                    Your business generated <strong>{formatCurrency(metrics.revenue)}</strong> in
                    revenue from <strong>{metrics.transactionCount}</strong> transactions.
                  </p>
                  <p>
                    Operating expenses total <strong>{formatCurrency(metrics.expenses)}</strong>,
                    resulting in <strong>{formatCurrency(metrics.profit)}</strong> profit.
                  </p>
                  <p>
                    You have <strong>{metrics.customerCount}</strong> customers in your system.
                  </p>
                </div>
              ) : (
                <p className="text-slate-600">No data available yet. Start by adding customers and transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {metrics ? formatCurrency(metrics.revenue) : "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1">From transactions</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {metrics ? formatCurrency(metrics.expenses) : "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1">Operating costs</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics && metrics.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {metrics ? formatCurrency(metrics.profit) : "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1">Net result</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {metrics ? metrics.transactionCount : "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total records</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {metrics ? metrics.customerCount : "—"}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active records</p>
            </CardContent>
          </Card>
        </div>

        {/* Goals & Data Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Goals */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Business Goals
              </CardTitle>
              <CardDescription>
                {goals.length > 0
                  ? "Your prioritized business objectives"
                  : "No goals set yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map((goal, index) => (
                    <div key={goal.id} className="flex items-start gap-3 pb-2 border-b border-slate-100 last:border-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{goal.goal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Set your business goals in settings to track progress.</p>
              )}
            </CardContent>
          </Card>

          {/* Data Sources & Freshness */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Data Sources
              </CardTitle>
              <CardDescription>
                Status and freshness of your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Business Data</p>
                    <p className="text-xs text-slate-600">Customers, products, transactions</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      Connected
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Market Intelligence</p>
                    <p className="text-xs text-slate-600">Coming in future phase</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium">
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      Pending
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Competitor Intelligence</p>
                    <p className="text-xs text-slate-600">Future capability</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium">
                      <div className="w-2 h-2 bg-slate-600 rounded-full" />
                      Not connected
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TODAY Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>TODAY</CardTitle>
            <CardDescription>
              Real-time signals and opportunities (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600 mb-2">Market Changes</p>
                <p className="text-sm text-slate-500">No signals yet</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600 mb-2">Competitor Moves</p>
                <p className="text-sm text-slate-500">No signals yet</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600 mb-2">Opportunities</p>
                <p className="text-sm text-slate-500">No signals yet</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600 mb-2">Recommended Actions</p>
                <p className="text-sm text-slate-500">No signals yet</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Future Feature:</strong> This section will display real-time market signals,
                competitor intelligence, and AI-powered recommendations as we build out the intelligence layer.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
