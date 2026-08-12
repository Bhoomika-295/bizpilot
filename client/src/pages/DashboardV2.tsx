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
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Minus,
  ExternalLink,
  RefreshCw,
  Globe,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
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

  const changesQuery = trpc.businessMetrics.getChanges.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate,
      periodEndDate,
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const briefingQuery = trpc.businessMetrics.getBriefing.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate,
      periodEndDate,
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const marketSignalsQuery = trpc.businessMetrics.getMarketSignals.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const strategyBriefingQuery = trpc.businessMetrics.getStrategyBriefing.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate,
      periodEndDate,
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const businessSituationsQuery = trpc.businessMetrics.getBusinessSituations.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate: periodStartDate.toISOString(),
      periodEndDate: periodEndDate.toISOString(),
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const situationTrendsQuery = trpc.businessMetrics.getSituationTrends.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate: periodStartDate.toISOString(),
      periodEndDate: periodEndDate.toISOString(),
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const decisionPrioritiesQuery = trpc.businessMetrics.getDecisionPriorities.useQuery(
    {
      businessId: parseInt(businessId || "0"),
      periodStartDate: periodStartDate.toISOString(),
      periodEndDate: periodEndDate.toISOString(),
    },
    { enabled: !!businessId && isAuthenticated }
  );

  const updateSituationStatusMutation = trpc.businessMetrics.updateBusinessSituationStatus.useMutation({
    onSuccess: () => {
      businessSituationsQuery.refetch();
    },
  });

  const adaptiveTimelineQuery = trpc.businessMetrics.getAdaptiveStrategyTimeline.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const reevaluateStrategiesMutation = trpc.businessMetrics.reevaluateStrategies.useMutation({
    onSuccess: () => {
      adaptiveTimelineQuery.refetch();
      strategyBriefingQuery.refetch();
      toast.success("Strategies re-evaluated against current business context");
    },
    onError: (err: any) => {
      toast.error(`Re-evaluation failed: ${err.message}`);
    },
  });

  const [selectedSituation, setSelectedSituation] = useState<any | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<any | null>(null);
  const [isScenarioBuilderOpen, setIsScenarioBuilderOpen] = useState(false);
  const [selectedScenarioModal, setSelectedScenarioModal] = useState<any | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);

  const decisionQueueQuery = trpc.businessMetrics.getDecisionQueue.useQuery(
    { businessId: parseInt(businessId || "0"), limit: 7 },
    { enabled: !!businessId && isAuthenticated }
  );
  const decisionDetailQuery = trpc.businessMetrics.getDecisionDetail.useQuery(
    { businessId: parseInt(businessId || "0"), decisionId: selectedDecision?.id || 0 },
    { enabled: !!businessId && isAuthenticated && !!selectedDecision?.id }
  );
  const refreshDecisionQueueMutation = trpc.businessMetrics.refreshDecisionQueue.useMutation({
    onSuccess: (result) => {
      decisionQueueQuery.refetch();
      toast.success(result.message);
    },
    onError: (err: any) => toast.error(`Decision refresh failed: ${err.message}`),
  });
  const updateDecisionStatusMutation = trpc.businessMetrics.updateDecisionStatus.useMutation({
    onSuccess: () => {
      decisionQueueQuery.refetch();
      decisionDetailQuery.refetch();
      toast.success("Decision status updated");
    },
    onError: (err: any) => toast.error(`Decision status update failed: ${err.message}`),
  });

  const opportunitiesQuery = trpc.businessMetrics.getOpportunities.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const competitorIntelligenceQuery = trpc.businessMetrics.getCompetitorIntelligence.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const [selectedCompetitor, setSelectedCompetitor] = useState<any | null>(null);

  const updateOpportunityStatusMutation = trpc.businessMetrics.updateOpportunityStatus.useMutation({
    onSuccess: () => {
      opportunitiesQuery.refetch();
      toast.success("Opportunity status updated");
    },
  });

  const scenariosQuery = trpc.businessMetrics.getScenarios.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const createScenarioMutation = trpc.businessMetrics.createScenario.useMutation({
    onSuccess: () => {
      scenariosQuery.refetch();
      setIsScenarioBuilderOpen(false);
      toast.success("Scenario simulated & recorded successfully");
    },
    onError: (err: any) => {
      toast.error(`Failed to create scenario: ${err.message}`);
    },
  });

  const deleteScenarioMutation = trpc.businessMetrics.deleteScenario.useMutation({
    onSuccess: () => {
      scenariosQuery.refetch();
      toast.success("Scenario deleted");
    },
  });

  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<number, boolean>>({});

  const utils = trpc.useUtils();
  const updateStrategyStatusMutation = trpc.businessMetrics.updateStrategyStatus.useMutation({
    onSuccess: () => {
      utils.businessMetrics.getStrategyBriefing.invalidate({
        businessId: parseInt(businessId || "0"),
        periodStartDate,
        periodEndDate,
      });
    },
  });
  const refreshSignalsMutation = trpc.businessMetrics.refreshMarketSignals.useMutation({
    onSuccess: (data) => {
      utils.businessMetrics.getMarketSignals.setData(
        { businessId: parseInt(businessId || "0") },
        { signals: data.signals, lastUpdated: data.lastUpdated }
      );
    },
  });

  const isLoading =
    metricsQuery.isLoading ||
    healthScoreQuery.isLoading ||
    freshnessQuery.isLoading ||
    changesQuery.isLoading ||
    briefingQuery.isLoading;
  const queryError =
    metricsQuery.error ||
    healthScoreQuery.error ||
    freshnessQuery.error ||
    changesQuery.error ||
    briefingQuery.error;
  const isAccessError = [
    metricsQuery.error,
    healthScoreQuery.error,
    freshnessQuery.error,
    changesQuery.error,
    briefingQuery.error,
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
                  void changesQuery.refetch();
                  void briefingQuery.refetch();
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
  const changes = changesQuery.data;
  const briefing = briefingQuery.data;

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

        {/* Strategy Copilot (Day 11) */}
        {strategyBriefingQuery.data && (
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-md">
            <CardHeader className="space-y-3 pb-4 border-b border-indigo-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Strategy Copilot
                    </CardTitle>
                    <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-medium">
                      AI STRATEGY COPILOT V1
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 text-slate-600">
                    What deserves your attention right now based on internal metrics and external market signals.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {strategyBriefingQuery.data.staleWarning && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 text-sm">
                    {strategyBriefingQuery.data.staleWarning}
                  </AlertDescription>
                </Alert>
              )}

              {strategyBriefingQuery.data.status === "insufficient_data" ? (
                <div className="py-6 text-center text-slate-500">
                  <p className="font-medium">Insufficient data for strategic recommendations.</p>
                  <p className="text-sm mt-1">Connect business transactions or customers to generate grounded recommendations.</p>
                </div>
              ) : strategyBriefingQuery.data.recommendations.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <p className="font-medium">No critical actions required at this time.</p>
                  <p className="text-sm mt-1">Operating performance is stable.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {strategyBriefingQuery.data.recommendations.map((rec, index) => {
                    const isExpanded = expandedEvidenceIds[rec.id || index] || false;
                    const isCompleted = rec.status === "COMPLETED";
                    const isDismissed = rec.status === "DISMISSED";

                    return (
                      <div
                        key={rec.id || index}
                        className={`p-4 rounded-xl border transition-all ${
                          isCompleted
                            ? "border-emerald-200 bg-emerald-50/30 opacity-75"
                            : isDismissed
                            ? "border-slate-200 bg-slate-100 opacity-60"
                            : "border-indigo-100 bg-white shadow-xs hover:shadow-sm"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  rec.priority === "HIGH"
                                    ? "border-rose-200 bg-rose-50 text-rose-700 font-semibold"
                                    : rec.priority === "MEDIUM"
                                    ? "border-amber-200 bg-amber-50 text-amber-700 font-semibold"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                                }
                              >
                                {rec.priority} PRIORITY
                              </Badge>
                              {isCompleted && (
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800">
                                  COMPLETED
                                </Badge>
                              )}
                              {isDismissed && (
                                <Badge variant="outline" className="border-slate-300 bg-slate-200 text-slate-700">
                                  DISMISSED
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 mt-1">{rec.title}</h3>
                            <p className="text-sm text-slate-700 font-medium">{rec.recommendation}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {rec.id && !isCompleted && !isDismissed && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() =>
                                    updateStrategyStatusMutation.mutate({
                                      businessId: parseInt(businessId || "0"),
                                      recommendationId: rec.id!,
                                      status: "COMPLETED",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Mark Completed
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-slate-500 hover:text-slate-700"
                                  onClick={() =>
                                    updateStrategyStatusMutation.mutate({
                                      businessId: parseInt(businessId || "0"),
                                      recommendationId: rec.id!,
                                      status: "DISMISSED",
                                    })
                                  }
                                >
                                  Dismiss
                                </Button>
                              </>
                            )}
                            {rec.id && (isCompleted || isDismissed) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-slate-500 hover:text-slate-700"
                                onClick={() =>
                                  updateStrategyStatusMutation.mutate({
                                    businessId: parseInt(businessId || "0"),
                                    recommendationId: rec.id!,
                                    status: "OPEN",
                                  })
                                }
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Why this recommendation */}
                        <div className="mt-3 text-sm text-slate-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/60">
                          <strong className="text-slate-800 font-semibold">Why this recommendation:</strong> {rec.reason}
                        </div>

                        {/* Suggested next step */}
                        <div className="mt-2 text-sm text-slate-700 flex items-center gap-2">
                          <span className="font-semibold text-slate-900">Suggested next step:</span>
                          <span>{rec.suggestedNextStep}</span>
                        </div>

                        {/* Evidence Toggle */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEvidenceIds((prev) => ({
                                ...prev,
                                [rec.id || index]: !prev[rec.id || index],
                              }))
                            }
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {isExpanded ? "Hide evidence" : "View evidence"} ({rec.evidence.length} metrics)
                          </button>
                          <span className="text-xs text-slate-400">Confidence: {rec.confidence}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pl-3 border-l-2 border-indigo-300 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-r-lg">
                            <div className="font-semibold text-slate-700">Underlying Evidence & Facts:</div>
                            {rec.evidence.map((ev, evIdx) => (
                              <div key={evIdx} className="flex justify-between text-slate-600">
                                <span>{ev.label}:</span>
                                <span className="font-medium text-slate-900">{ev.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Opportunity Intelligence Card (Day 18) */}
        <Card className="border-slate-300 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    Opportunity Intelligence & Potential Growth
                  </CardTitle>
                  <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 font-medium">
                    OPPORTUNITY ENGINE v1
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Identify potentially valuable business opportunities supported by internal strength, favorable market signals, and recurring demand patterns.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => opportunitiesQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Scan Opportunities
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {opportunitiesQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : opportunitiesQuery.data && opportunitiesQuery.data.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Detected Opportunities ({opportunitiesQuery.data.length})
                </div>
                {opportunitiesQuery.data.map((opp: any) => {
                  const signals = JSON.parse(opp.supportingSignalsJson || "[]");
                  const situations = JSON.parse(opp.supportingSituationsJson || "[]");
                  const metrics = JSON.parse(opp.supportingMetricsJson || "[]");
                  return (
                    <div
                      key={opp.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{opp.title}</h4>
                            <Badge
                              variant="outline"
                              className={
                                opp.priority === "HIGH"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium"
                                  : opp.priority === "MEDIUM"
                                    ? "border-blue-200 bg-blue-50 text-blue-700 font-medium"
                                    : "border-slate-200 bg-slate-50 text-slate-600 font-medium"
                              }
                            >
                              {opp.priority} PRIORITY
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                              {opp.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{opp.summary}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setSelectedOpportunity(opp)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
                          >
                            <Sparkles className="h-3 w-3" />
                            Explore Opportunity
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div>
                          <span className="font-semibold text-slate-700">Evidence:</span> {opp.evidenceStrength}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Potential Impact:</span> {opp.potentialImpact}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Status:</span>{" "}
                          <span className="capitalize font-medium text-slate-900">{opp.status.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-blue-400" />
                <h4 className="mt-2 text-sm font-medium text-slate-900">No Opportunities Detected Yet</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  BizPilot scans customer activity, market sentiment, profit corridors, and scenario outcomes to surface growth opportunities.
                </p>
                <Button
                  size="sm"
                  onClick={() => opportunitiesQuery.refetch()}
                  disabled={opportunitiesQuery.isLoading}
                  className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${opportunitiesQuery.isLoading ? "animate-spin" : ""}`} />
                  Scan Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitive Strategy Intelligence Card (Day 19) */}
        <Card className="border-slate-300 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    Competitive Strategy Intelligence
                  </CardTitle>
                  <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 font-medium">
                    COMPETITIVE INTEL v2
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Track competitor behavior trends, pricing/product moves, and correlated internal business impact.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => competitorIntelligenceQuery.refetch()}
                  disabled={competitorIntelligenceQuery.isLoading}
                  className="gap-1.5 text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${competitorIntelligenceQuery.isLoading ? "animate-spin" : ""}`} />
                  Refresh Intelligence
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {competitorIntelligenceQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : competitorIntelligenceQuery.data && competitorIntelligenceQuery.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitorIntelligenceQuery.data.map((comp: any) => (
                  <div
                    key={comp.competitorId}
                    className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{comp.competitorName}</h4>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={
                              comp.businessRelevance === "HIGH"
                                ? "border-red-200 bg-red-50 text-red-700 text-[10px]"
                                : comp.businessRelevance === "MEDIUM"
                                ? "border-amber-200 bg-amber-50 text-amber-700 text-[10px]"
                                : "border-slate-200 bg-slate-50 text-slate-600 text-[10px]"
                            }
                          >
                            {comp.businessRelevance} RELEVANCE
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              comp.trend === "INCREASING"
                                ? "border-purple-200 bg-purple-50 text-purple-700 text-[10px]"
                                : "border-slate-200 bg-slate-50 text-slate-600 text-[10px]"
                            }
                          >
                            {comp.trend}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <span className="text-slate-400">Activity:</span>{" "}
                          <span className="font-semibold text-slate-800">{comp.activityLevel}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Primary Move:</span>{" "}
                          <span className="font-semibold text-slate-800">{comp.primaryActivity}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed italic">
                        "{comp.whyItMatters}"
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {comp.evidenceCount} verified signals
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setSelectedCompetitor(comp)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        View Intelligence & Timeline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <Shield className="mx-auto h-8 w-8 text-purple-400" />
                <h4 className="mt-2 text-sm font-medium text-slate-900">No Competitor Intelligence Tracked</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Add competitors in the watchlist or scan market signals to begin tracking behavioral trends and internal correlations.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenario & What-If Intelligence Card (Day 17) */}
        <Card className="border-slate-300 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    Scenario Intelligence & What-If Simulations
                  </CardTitle>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium">
                    SCENARIO ENGINE v1
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Explore structured decision simulations ("What if price increases 10%?") with baseline comparison, impact mapping, range-based estimates, and strategic implications.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scenariosQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Scenarios
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsScenarioBuilderOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  New Scenario Simulation
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {scenariosQuery.data && scenariosQuery.data.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Recorded Scenarios ({scenariosQuery.data.length})
                </div>
                {scenariosQuery.data.map((sc: any, idx: number) => {
                  const affected = JSON.parse(sc.affectedAreasJson || "[]");
                  const assumptions = JSON.parse(sc.assumptionsJson || "{}");
                  return (
                    <div key={sc.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 font-medium text-xs">
                            {sc.scenarioType.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                            {sc.evidenceQuality}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {new Date(sc.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteScenarioMutation.mutate({ businessId: parseInt(businessId || "0"), scenarioId: sc.id })}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-base">{sc.title}</h3>
                          <p className="text-sm text-slate-600 mt-0.5">{sc.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedScenarioModal(sc)}
                          className="shrink-0 text-xs border-slate-300 bg-white text-slate-700"
                        >
                          Compare Baseline vs Scenario →
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Assumptions:</span>
                        {Object.entries(assumptions).map(([k, v]: [string, any], aIdx: number) => (
                          <span key={aIdx} className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            {k}: <strong className="text-slate-900">{String(v)}</strong>
                          </span>
                        ))}
                        <span className="text-slate-300">|</span>
                        <span className="font-semibold text-slate-700">Potentially Affected:</span>
                        {affected.slice(0, 3).map((area: string, afIdx: number) => (
                          <span key={afIdx} className="bg-emerald-50/80 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/60">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <Sparkles className="h-8 w-8 text-emerald-500 mx-auto" />
                <div className="text-sm font-semibold text-slate-800">No scenarios simulated yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "New Scenario Simulation" to test controlled assumptions like price changes, cost adjustments, or demand variations against your baseline metrics without altering live data.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsScenarioBuilderOpen(true)}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Create First Scenario
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adaptive Strategy Evolution & Re-evaluation (Day 16) */}
        <Card className="border-slate-300 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    Adaptive Strategy & Evolution Timeline
                  </CardTitle>
                  <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-medium">
                    ADAPTIVE STRATEGY ENGINE v1
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Continuously re-evaluates recommendations against changing conditions, keeping strategies stable unless evidence demands update or replacement.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adaptiveTimelineQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Timeline
                </Button>
                <Button
                  size="sm"
                  onClick={() => reevaluateStrategiesMutation.mutate({ businessId: parseInt(businessId || "0") })}
                  disabled={reevaluateStrategiesMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {reevaluateStrategiesMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Re-evaluate Strategies
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {adaptiveTimelineQuery.data?.events && adaptiveTimelineQuery.data.events.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Recent Strategy Re-evaluation Events ({adaptiveTimelineQuery.data.events.length})
                </div>
                {adaptiveTimelineQuery.data.events.slice(0, 5).map((ev: any, idx: number) => {
                  const isKeep = ev.evaluationResult === "KEEP";
                  const isReplace = ev.evaluationResult === "REPLACE";
                  const isDeprioritize = ev.evaluationResult === "DEPRIORITIZE";
                  return (
                    <div key={ev.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                          <Badge
                            variant="outline"
                            className={`font-semibold ${
                              isKeep
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : isReplace
                                ? "border-purple-300 bg-purple-50 text-purple-700"
                                : isDeprioritize
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-blue-300 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {ev.evaluationResult || ev.eventType}
                          </Badge>
                        </div>
                        {ev.previousStrategyTitle && (
                          <span className="text-xs text-slate-500">
                            From: <strong className="text-slate-700">{ev.previousStrategyTitle}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {ev.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No adaptive strategy re-evaluation events recorded yet. Click <strong>Re-evaluate Strategies</strong> above to assess current context.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decisions That Need Attention (Day 20) */}
        {decisionQueueQuery.data && (
          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">Decisions That Need Attention</CardTitle>
                    <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-medium">DECISION INTELLIGENCE v1</Badge>
                  </div>
                  <CardDescription className="mt-1">A ranked queue of evidence-backed questions—not automatic actions—so you can decide what deserves review first.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshDecisionQueueMutation.mutate({ businessId: parseInt(businessId || "0") })}
                  disabled={refreshDecisionQueueMutation.isPending}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshDecisionQueueMutation.isPending ? "animate-spin" : ""}`} />
                  Refresh Queue
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {decisionQueueQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {decisionQueueQuery.data.slice(0, 7).map((decision: any, idx: number) => {
                    const tone = decision.priority === "HIGH" ? "border-red-300 bg-red-50 text-red-700" : decision.priority === "MEDIUM" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-slate-50 text-slate-700";
                    return (
                      <button
                        type="button"
                        key={decision.id || decision.decisionKey || idx}
                        onClick={() => setSelectedDecision(decision)}
                        className="group w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-sm transition-all space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex shrink-0 items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{idx + 1}</span>
                            <span className="font-semibold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{decision.title}</span>
                            <Badge variant="outline" className={`shrink-0 text-xs font-semibold ${tone}`}>{decision.priority}</Badge>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">Score {decision.priorityScore}/100</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{decision.whyMatters}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Urgency: <strong className="text-slate-700">{decision.urgency}</strong></span>
                          <span>Impact: <strong className="text-slate-700">{decision.potentialImpact}</strong></span>
                          <span>Evidence: <strong className="text-slate-700">{decision.evidenceStrength}</strong></span>
                          <span>Status: <strong className="text-slate-700">{decision.status}</strong></span>
                          <span className="ml-auto text-indigo-600 font-medium group-hover:underline">View evidence & options →</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">No decision candidate is currently supported by meaningful verified intelligence.</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Strategic Focus (Day 15) */}
        {decisionPrioritiesQuery.data && decisionPrioritiesQuery.data.length > 0 && (
          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      Today's Strategic Focus
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700 font-medium">
                      DECISION PRIORITY ENGINE v1
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    What deserves your attention first, ranked by impact, urgency, trends, and business health.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => decisionPrioritiesQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Priorities
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-3">
                {decisionPrioritiesQuery.data.slice(0, 3).map((item: any, idx: number) => {
                  const isCritical = item.priorityLevel === "CRITICAL";
                  const isHigh = item.priorityLevel === "HIGH";
                  const isMedium = item.priorityLevel === "MEDIUM";
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => setSelectedPriority(item)}
                      className="group cursor-pointer bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                            {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-2xl font-semibold px-2 py-0.5 ${
                              isCritical
                                ? "border-red-300 bg-red-50 text-red-700"
                                : isHigh
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : isMedium
                                ? "border-blue-300 bg-blue-50 text-blue-700"
                                : "border-slate-300 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {item.priorityLevel}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          Trend: <span className="text-slate-900 font-semibold">{item.trend}</span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {item.reason}
                      </p>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong className="text-slate-800">Why now?</strong> {item.whyNow}
                        </div>
                        {item.freshnessNote && (
                          <div className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {item.freshnessNote}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span>Urgency: <strong className="text-slate-700">{item.urgency}</strong></span>
                          <span>•</span>
                          <span>Impact: <strong className="text-slate-700">{item.impact}</strong></span>
                        </div>
                        <span className="text-indigo-600 font-medium group-hover:underline">
                          View evidence & drill-down →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business Trends & Situation Timeline (Day 14) */}
        {situationTrendsQuery.data && situationTrendsQuery.data.length > 0 && (
          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      Business Trends & Situation Timeline
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                      TREND INTELLIGENCE v1
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Historical tracking and deterministic trend interpretation of active business situations.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => situationTrendsQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Trends
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {situationTrendsQuery.data.map((trend: any) => {
                  const isHigh = trend.currentPriority === "HIGH";
                  const isMedium = trend.currentPriority === "MEDIUM";
                  const isWorsening = trend.trendDirection === "WORSENING";
                  const isImproving = trend.trendDirection === "IMPROVING";
                  const isRecurring = trend.trendDirection === "RECURRING";

                  return (
                    <div
                      key={trend.situationId}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                            Trend: {trend.trendDirection}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-xs ${
                                isWorsening
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : isImproving
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : isRecurring
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-800 border-slate-200"
                              }`}
                            >
                              {trend.trendDirection}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">
                              {trend.currentPriority}
                            </Badge>
                          </div>
                        </div>

                        <h3 className="font-semibold text-slate-900 text-base">
                          {trend.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {trend.trendSummary}
                        </p>

                        {trend.changesSinceLastReview && trend.changesSinceLastReview.length > 0 && (
                          <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                            <strong>What Changed:</strong> {trend.changesSinceLastReview[0]}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Active for {trend.durationDays} day{trend.durationDays === 1 ? "" : "s"} ({trend.timeline.length} snapshots)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSituation(trend)}
                          className="text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 h-8 px-2.5 text-xs font-medium"
                        >
                          View Timeline & History →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision Priority Evidence Drill-Down Modal (Day 15) */}
        {selectedPriority && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700 font-medium">
                      DECISION FOCUS
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`font-semibold ${
                        selectedPriority.priorityLevel === "CRITICAL"
                          ? "border-red-300 bg-red-50 text-red-700"
                          : selectedPriority.priorityLevel === "HIGH"
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-blue-300 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {selectedPriority.priorityLevel} PRIORITY
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedPriority.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPriority(null)}
                  className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Why Now?
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedPriority.whyNow}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Business Impact</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedPriority.impact}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Trend Direction</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedPriority.trend}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Business Reason & Analysis
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedPriority.reason}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Supporting Evidence & Facts
                  </h4>
                  <div className="space-y-2">
                    {selectedPriority.evidence && selectedPriority.evidence.length > 0 ? (
                      selectedPriority.evidence.map((ev: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="font-medium text-slate-600">{ev.label}:</span>
                          <span className="font-semibold text-slate-900">{ev.value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        No supplementary evidence recorded.
                      </div>
                    )}
                  </div>
                </div>

                {selectedPriority.freshnessNote && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-xs">
                      <strong>Data Freshness Note:</strong> {selectedPriority.freshnessNote}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Urgency: <strong className="text-slate-700">{selectedPriority.urgency}</strong>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPriority(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decision Intelligence Detail Modal (Day 20) */}
        {selectedDecision && (() => {
          const decision: any = (decisionDetailQuery.data as any)?.decision || selectedDecision;
          const events: any[] = (decisionDetailQuery.data as any)?.events || [];
          const canReview = decision.status === "OPEN";
          const canDecide = decision.status === "OPEN" || decision.status === "IN_REVIEW";
          const canReopen = decision.status === "DEFERRED" || decision.status === "DISMISSED" || decision.status === "EXPIRED";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-6 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">DECISION INTELLIGENCE</Badge>
                      <Badge variant="outline" className={decision.priority === "HIGH" ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}>{decision.priority} PRIORITY</Badge>
                      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">{decision.status}</Badge>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{decision.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{decision.category} · {decision.sourceType} · Score {decision.priorityScore}/100</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDecision(null)} className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0">✕</Button>
                </div>

                {decisionDetailQuery.isLoading && <div className="text-sm text-slate-500">Loading the evidence chain…</div>}
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Why this matters</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-indigo-50 p-3 rounded-lg border border-indigo-100">{decision.whyMatters}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[["Urgency", decision.urgency], ["Potential impact", decision.potentialImpact], ["Evidence strength", decision.evidenceStrength], ["Reversibility", decision.reversibility]].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                        <div className="text-sm font-semibold text-slate-900 mt-1">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Evidence chain</h4>
                    <div className="space-y-2">
                      {decision.evidenceChain?.length ? decision.evidenceChain.map((item: any, idx: number) => (
                        <div key={`${item.type}-${item.id || idx}`} className="flex gap-3 bg-white p-3 rounded-lg border border-slate-200">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">{idx + 1}</span>
                          <div><div className="text-xs font-semibold text-slate-900">{item.label}</div><div className="text-xs text-slate-600 mt-0.5">{item.detail}</div></div>
                        </div>
                      )) : <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">No evidence chain is available.</div>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100"><h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-2">What we know</h4><ul className="space-y-1 text-sm text-emerald-950 list-disc pl-4">{(decision.whatWeKnow || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul></div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100"><h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">What we do not know</h4><ul className="space-y-1 text-sm text-amber-950 list-disc pl-4">{(decision.whatWeDontKnow || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul></div>
                  </div>

                  <div><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Potential consequences</h4><p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{decision.potentialConsequences}</p></div>

                  <div>
                    <div className="flex items-center justify-between mb-2"><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action options</h4><Button variant="outline" size="sm" onClick={() => setIsScenarioBuilderOpen(true)} className="border-indigo-200 text-indigo-700">Explore Scenario</Button></div>
                    <div className="grid gap-2">{(decision.actionOptions || []).map((option: any, idx: number) => <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white"><div className="text-sm font-semibold text-slate-900">{option.label}</div><div className="text-xs text-slate-600 mt-1">{option.rationale} · {option.reversible}</div></div>)}</div>
                  </div>

                  {decision.recommendedNextStep && <Alert className="border-indigo-200 bg-indigo-50"><Shield className="h-4 w-4 text-indigo-700" /><AlertDescription className="text-indigo-950 text-sm"><strong>Recommended next step:</strong> {decision.recommendedNextStep}{decision.recommendedNextStepReason ? ` ${decision.recommendedNextStepReason}` : ""}</AlertDescription></Alert>}
                  {decision.strategicAlignmentReason && <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200"><strong>Strategic relationship:</strong> {decision.strategicAlignment} — {decision.strategicAlignmentReason}</div>}
                  {decision.dependencyText && <div className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-200"><strong>Dependency:</strong> {decision.dependencyText}</div>}
                  {decision.conflictKeys?.some((key: string) => key.startsWith("CONFLICT:")) && <div className="text-sm text-red-900 bg-red-50 p-3 rounded-lg border border-red-200"><strong>Potential conflict:</strong> This decision shares a resource or topic with another decision in the queue. Review the related options before committing.</div>}

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    {canReview && <Button size="sm" onClick={() => updateDecisionStatusMutation.mutate({ businessId: parseInt(businessId || "0"), decisionId: decision.id, status: "IN_REVIEW" })}>Start review</Button>}
                    {canDecide && <Button size="sm" variant="outline" onClick={() => updateDecisionStatusMutation.mutate({ businessId: parseInt(businessId || "0"), decisionId: decision.id, status: "DECIDED" })}>Mark decided</Button>}
                    {canDecide && <Button size="sm" variant="outline" onClick={() => updateDecisionStatusMutation.mutate({ businessId: parseInt(businessId || "0"), decisionId: decision.id, status: "DEFERRED" })}>Defer</Button>}
                    {canDecide && <Button size="sm" variant="outline" onClick={() => updateDecisionStatusMutation.mutate({ businessId: parseInt(businessId || "0"), decisionId: decision.id, status: "DISMISSED" })}>Dismiss</Button>}
                    {canReopen && <Button size="sm" variant="outline" onClick={() => updateDecisionStatusMutation.mutate({ businessId: parseInt(businessId || "0"), decisionId: decision.id, status: "OPEN" })}>Reopen</Button>}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedDecision(null)}>Close</Button>
                  </div>

                  {events.length > 0 && <div className="border-t border-slate-100 pt-4"><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Decision history</h4><div className="space-y-2">{events.slice(0, 5).map((event: any) => <div key={event.id} className="text-xs text-slate-600 flex justify-between gap-3"><span><strong className="text-slate-800">{event.eventType}</strong>{event.newStatus ? ` · ${event.newStatus}` : ""}</span><span>{event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}</span></div>)}</div></div>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Scenario Builder / New Simulation Modal (Day 17) */}
        {isScenarioBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium">
                    WHAT-IF SIMULATION BUILDER
                  </Badge>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Simulate Business Scenario</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsScenarioBuilderOpen(false)}
                  className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const title = (form.elements.namedItem("title") as HTMLInputElement).value;
                  const description = (form.elements.namedItem("description") as HTMLInputElement).value;
                  const scenarioType = (form.elements.namedItem("scenarioType") as HTMLSelectElement).value;
                  const paramVal = parseFloat((form.elements.namedItem("paramVal") as HTMLInputElement).value || "10");

                  let assumptions: Record<string, any> = {};
                  if (scenarioType === "PRICE_CHANGE") assumptions = { priceChangePct: paramVal };
                  else if (scenarioType === "MARKETING_CHANGE") assumptions = { marketingSpendNew: paramVal };
                  else if (scenarioType === "COST_CHANGE") assumptions = { costChangePct: paramVal };
                  else if (scenarioType === "DEMAND_CHANGE") assumptions = { demandChangePct: paramVal };
                  else assumptions = { customAdjustment: paramVal };

                  createScenarioMutation.mutate({
                    businessId: parseInt(businessId || "0"),
                    title,
                    description,
                    scenarioType,
                    assumptions,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Scenario Title
                  </label>
                  <input
                    name="title"
                    required
                    defaultValue="Q3 Price Adjustment Test"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Description & Context
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue="Testing impact of pricing adjustments on margin and competitive positioning."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Scenario Type
                  </label>
                  <select
                    name="scenarioType"
                    defaultValue="PRICE_CHANGE"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="PRICE_CHANGE">Price Change (%)</option>
                    <option value="MARKETING_CHANGE">Marketing Spend (₹)</option>
                    <option value="COST_CHANGE">Operating Cost Change (%)</option>
                    <option value="DEMAND_CHANGE">Demand / Volume Change (%)</option>
                    <option value="COMPETITOR_CHANGE">Competitor Response Analysis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Primary Assumption Value (e.g. 10 for +10% or 75000 for budget)
                  </label>
                  <input
                    name="paramVal"
                    type="number"
                    step="any"
                    required
                    defaultValue="10"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsScenarioBuilderOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createScenarioMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {createScenarioMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Simulate & Save Scenario
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Baseline vs Scenario Comparison Modal (Day 17) */}
        {selectedScenarioModal && (() => {
          const sc = selectedScenarioModal;
          const est = JSON.parse(sc.estimatedMetricsJson || "{}");
          const affected = JSON.parse(sc.affectedAreasJson || "[]");
          const situations = JSON.parse(sc.affectedSituationsJson || "[]");
          const implications = JSON.parse(sc.strategicImplicationsJson || "[]");
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium">
                        BASELINE VS SCENARIO COMPARISON
                      </Badge>
                      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                        {sc.evidenceQuality}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{sc.title}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{sc.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedScenarioModal(null)}
                    className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-5">
                  {/* Estimated Financial Impact */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Financial & Metric Estimates
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {est.baselineRevenue !== undefined && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">Baseline Revenue</div>
                          <div className="text-base font-bold text-slate-900">₹{est.baselineRevenue.toLocaleString()}</div>
                          <div className="text-xs text-emerald-600 font-medium mt-1">
                            Estimated: ₹{est.estimatedRevenue?.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {est.baselineProfit !== undefined && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">Baseline Profit</div>
                          <div className="text-base font-bold text-slate-900">₹{est.baselineProfit.toLocaleString()}</div>
                          <div className="text-xs text-emerald-600 font-medium mt-1">
                            Estimated: ₹{est.estimatedNetProfit?.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {est.baselineExpenses !== undefined && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">Baseline Expenses</div>
                          <div className="text-base font-bold text-slate-900">₹{est.baselineExpenses.toLocaleString()}</div>
                          <div className="text-xs text-amber-600 font-medium mt-1">
                            Estimated: ₹{est.estimatedExpenses?.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    {est.note && <p className="text-xs text-slate-500 mt-2 italic">{est.note}</p>}
                  </div>

                  {/* Affected Operating Situations */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Projected Impact on Active Situations
                    </h4>
                    <div className="space-y-2">
                      {situations.map((sit: any, sIdx: number) => (
                        <div key={sIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <strong className="text-slate-800">{sit.title}</strong>
                            <div className="text-slate-500">Current Priority: {sit.current}</div>
                          </div>
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            {sit.projected}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Implications */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Strategic Implications for Copilot Recommendations
                    </h4>
                    <div className="space-y-2">
                      {implications.map((imp: any, iIdx: number) => (
                        <div key={iIdx} className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs space-y-1">
                          <div className="font-semibold text-indigo-900">{imp.strategyTitle}</div>
                          <div className="text-indigo-700 leading-relaxed">{imp.implication}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Affected Areas */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">Affected Business Areas:</span>
                    {affected.map((area: string, aIdx: number) => (
                      <span key={aIdx} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {area}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedScenarioModal(null)}
                    >
                      Close Comparison
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Opportunity Detail Modal (Day 18) */}
        {selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        selectedOpportunity.priority === "HIGH"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : selectedOpportunity.priority === "MEDIUM"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                      }
                    >
                      {selectedOpportunity.priority} PRIORITY
                    </Badge>
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      {selectedOpportunity.category}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedOpportunity.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOpportunity(null)}
                  className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Opportunity Summary
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedOpportunity.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence Strength</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedOpportunity.evidenceStrength}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Potential Impact</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedOpportunity.potentialImpact}</div>
                  </div>
                </div>

                {selectedOpportunity.recommendedAction && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Recommended Strategic Action
                    </h4>
                    <p className="text-sm font-medium text-slate-900 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      {selectedOpportunity.recommendedAction}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Status:</span>
                    {(["NEW", "ACTIVE", "PURSUED", "DISMISSED"] as const).map((st) => (
                      <Button
                        key={st}
                        variant={selectedOpportunity.status === st ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          updateOpportunityStatusMutation.mutate({
                            businessId: parseInt(businessId || "0"),
                            opportunityId: selectedOpportunity.id,
                            status: st,
                          });
                          setSelectedOpportunity({ ...selectedOpportunity, status: st });
                        }}
                        className="text-xs h-7 px-2.5"
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOpportunity(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Situation Timeline & Trend Detail Modal (Day 14) */}
        {selectedSituation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Trend: {selectedSituation.trendDirection || selectedSituation.category}
                    </span>
                    <Badge
                      className={`text-xs ${
                        (selectedSituation.currentPriority || selectedSituation.priority) === "HIGH"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : (selectedSituation.currentPriority || selectedSituation.priority) === "MEDIUM"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {selectedSituation.currentPriority || selectedSituation.priority} PRIORITY
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedSituation.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSituation(null)}
                  className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Trend & Summary
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedSituation.trendSummary || selectedSituation.summary}
                  </p>
                </div>

                {selectedSituation.changesSinceLastReview && selectedSituation.changesSinceLastReview.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      What Changed Since Last Review
                    </h4>
                    <ul className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                      {selectedSituation.changesSinceLastReview.map((ch: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          <span>{ch}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Situation History Timeline ({selectedSituation.timeline?.length || 1} snapshots)
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedSituation.timeline && selectedSituation.timeline.length > 0 ? (
                      selectedSituation.timeline.map((snap: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">
                              {snap.trendDirection} ({snap.priority}) — {snap.summary}
                            </div>
                            <div className="text-slate-500">
                              {new Date(snap.timestamp).toLocaleString()} • {snap.supportingCount} supporting signals
                            </div>
                          </div>
                          <Badge variant="outline" className="text-2xs border-slate-300 text-slate-700">
                            {snap.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        Initial observation recorded.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Lifecycle Status:</span>
                    {(["ACTIVE", "MONITORING", "RESOLVED"] as const).map((st) => (
                      <Button
                        key={st}
                        variant={(selectedSituation.currentStatus || selectedSituation.status) === st ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const sitId = selectedSituation.situationId || selectedSituation.id;
                          if (sitId) {
                            updateSituationStatusMutation.mutate({
                              businessId: parseInt(businessId || "0"),
                              situationId: sitId,
                              status: st,
                            });
                            setSelectedSituation({
                              ...selectedSituation,
                              currentStatus: st,
                              status: st,
                            });
                          }
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSituation(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Intelligence Briefing */}
        {briefing && (
          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      Business Intelligence Briefing
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                      FACTUAL BRIEFING
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    What matters right now based on stored performance signals ({briefing.periodLabel}).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {briefing.status === "insufficient_data" ? (
                <Alert className="border-slate-200 bg-slate-50">
                  <AlertCircle className="h-4 w-4 text-slate-600" />
                  <AlertDescription className="text-slate-700">
                    <strong>Not enough historical data to generate a reliable briefing.</strong> Add records in comparable periods to establish a baseline.
                  </AlertDescription>
                </Alert>
              ) : briefing.status === "no_significant_changes" ? (
                <Alert className="border-slate-200 bg-white">
                  <Minus className="h-4 w-4 text-slate-500" />
                  <AlertDescription className="text-slate-700">
                    No significant business changes detected. Operating metrics are stable relative to the previous period.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2">
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      {briefing.headlineSummary.join(" ")}.
                    </p>
                    <p className="text-xs text-slate-600">
                      {briefing.positiveSignalSummary} {briefing.primaryAttentionSummary}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Prioritized Signals & Explanation
                    </h4>
                    {briefing.items.map((item) => {
                      const isHigh = item.priority === "HIGH";
                      const isIncrease = item.direction === "increase";
                      const Icon = isIncrease ? TrendingUp : TrendingDown;
                      return (
                        <div
                          key={item.metric}
                          className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon
                                className={`h-4 w-4 ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                                aria-hidden="true"
                              />
                              <span className="text-sm font-bold text-slate-900">
                                {item.label} {isIncrease ? "increased" : "decreased"} {Math.abs(item.percentChange).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                aria-label={`${item.priority} signal priority`}
                                className={getSignalPriorityBadgeClass(item.priority)}
                              >
                                {item.priority} PRIORITY
                              </Badge>
                            </div>
                          </div>

                          <div className="text-sm text-slate-700 space-y-1">
                            <p className="font-medium text-slate-900">Why it matters:</p>
                            <p className="text-slate-600 leading-relaxed">{item.explanation}</p>
                          </div>

                          <div className="rounded-md bg-slate-50 p-3 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                            <div>
                              <span className="font-medium text-slate-700">Evidence:</span> Current period: <strong className="text-slate-900">{item.currentValue.toLocaleString()}</strong> | Previous period: <strong className="text-slate-900">{item.previousValue.toLocaleString()}</strong> | Change: <strong className={isIncrease ? "text-emerald-700" : "text-amber-700"}>{isIncrease ? "+" : ""}{item.percentChange.toFixed(1)}%</strong>
                            </div>
                          </div>

                          {item.suggestedNextStep && (
                            <div className="pt-1 flex items-center justify-between text-xs text-slate-700 border-t border-slate-100">
                              <span className="font-semibold text-slate-800">Suggested next step:</span>
                              <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded font-medium">{item.suggestedNextStep}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Internal Business Changes */}
        {changes && (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>What Changed</CardTitle>
                  <CardDescription className="mt-1">
                    {changes.periodLabel}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-300 bg-slate-50 text-slate-700"
                >
                  INTERNAL BUSINESS SIGNAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {changes.status === "insufficient_data" ? (
                <Alert className="border-slate-200 bg-slate-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Not enough historical data to detect changes. Add records in comparable periods to establish a baseline.
                  </AlertDescription>
                </Alert>
              ) : changes.status === "no_significant_changes" ? (
                <Alert className="border-slate-200 bg-white">
                  <Minus className="h-4 w-4" />
                  <AlertDescription>No significant changes detected.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {changes.changes.map((change) => {
                    const isIncrease = change.direction === "increase";
                    const Icon = isIncrease ? TrendingUp : TrendingDown;
                    return (
                      <div
                        key={change.metric}
                        className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-3"
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 ${isIncrease ? "text-emerald-600" : "text-amber-600"}`}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {change.label}
                            </p>
                            <Badge
                              variant="outline"
                              aria-label={`${change.priority} signal priority`}
                              className={getSignalPriorityBadgeClass(change.priority)}
                            >
                              {change.priority}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {change.summary}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Real-Time Market Signals (Day 9) */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Market Signals & Industry Watch</CardTitle>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    REAL-TIME
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  External news coverage and industry intelligence relevant to your business and competitors.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {marketSignalsQuery.data?.lastUpdated && (
                  <span className="text-xs text-slate-500">
                    Updated {formatLastUpdated(marketSignalsQuery.data.lastUpdated)}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshSignalsMutation.mutate({ businessId: parseInt(businessId || "0") })}
                  disabled={refreshSignalsMutation.isPending}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshSignalsMutation.isPending ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {marketSignalsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : marketSignalsQuery.data?.signals && marketSignalsQuery.data.signals.length > 0 ? (
              <div className="space-y-3">
                {marketSignalsQuery.data.signals.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <a
                        href={sig.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-600"
                      >
                        <span>{sig.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                      </a>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                        {sig.relatedEntity}
                      </Badge>
                    </div>
                    {sig.snippet && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {sig.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                      <span className="font-medium text-slate-700">{sig.source}</span>
                      <span>•</span>
                      <span>
                        {sig.publishedAt
                          ? new Date(sig.publishedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently published"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <Globe className="mx-auto h-8 w-8 text-slate-300" />
                <h4 className="mt-2 text-sm font-medium text-slate-900">No Market Signals Available</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Click Refresh to scan external news sources and competitor mentions for your industry.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshSignalsMutation.mutate({ businessId: parseInt(businessId || "0") })}
                  disabled={refreshSignalsMutation.isPending}
                  className="mt-4 gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshSignalsMutation.isPending ? "animate-spin" : ""}`} />
                  Scan Market Signals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Quality Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Data Quality:</strong> All metrics are calculated from {freshness?.dataPoints.transactions || 0} transactions and {freshness?.dataPoints.customers || 0} customers in your database. Profit is estimated based on available transaction and expense data.
          </AlertDescription>
        </Alert>
      </div>

      {/* Competitor Detail & Timeline Modal (Day 19) */}
      {selectedCompetitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedCompetitor.competitorName}</h3>
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 text-xs">
                    {selectedCompetitor.trend} TREND
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Industry: {selectedCompetitor.industry || "General"} {selectedCompetitor.website ? `• ${selectedCompetitor.website}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCompetitor(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Activity Level</span>
                  <strong className="text-slate-900 text-sm">{selectedCompetitor.activityLevel}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Primary Activity</span>
                  <strong className="text-slate-900 text-sm">{selectedCompetitor.primaryActivity}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Business Relevance</span>
                  <strong className="text-slate-900 text-sm">{selectedCompetitor.businessRelevance}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Why It Matters</h4>
                <p className="text-xs text-slate-700 bg-purple-50/50 p-3 rounded-lg border border-purple-100 leading-relaxed italic">
                  "{selectedCompetitor.whyItMatters}"
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Competitor Activity Timeline</h4>
                {selectedCompetitor.timeline && selectedCompetitor.timeline.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedCompetitor.timeline.map((act: any) => (
                      <div key={act.id} className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{act.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.detectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{act.description}</p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">{act.activityType}</span>
                          <span>Impact areas: {act.impactAreas.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No recorded activity events for this competitor.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                size="sm"
                onClick={() => setSelectedCompetitor(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                Close Intelligence
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/**
 * Metric Card Component
 */
function getSignalPriorityBadgeClass(priority: "LOW" | "MEDIUM" | "HIGH"): string {
  if (priority === "HIGH") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (priority === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

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
