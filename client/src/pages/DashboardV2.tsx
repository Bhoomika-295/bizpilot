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
} from "lucide-react";
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

  const updateSituationStatusMutation = trpc.businessMetrics.updateBusinessSituationStatus.useMutation({
    onSuccess: () => {
      businessSituationsQuery.refetch();
    },
  });

  const [selectedSituation, setSelectedSituation] = useState<any | null>(null);

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

        {/* Current Business Situations (Day 13) */}
        {businessSituationsQuery.data && businessSituationsQuery.data.length > 0 && (
          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      Current Business Situations
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                      SITUATION ENGINE v1
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Coherent operating situations grouped from internal changes and external market signals.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => businessSituationsQuery.refetch()}
                  className="border-slate-200 text-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Re-evaluate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessSituationsQuery.data.map((sit: any) => {
                  const isHigh = sit.priority === "HIGH";
                  const isMedium = sit.priority === "MEDIUM";
                  return (
                    <div
                      key={sit.id || sit.title}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                            {sit.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-xs ${
                                isHigh
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : isMedium
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-800 border-slate-200"
                              }`}
                            >
                              {sit.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">
                              {sit.status}
                            </Badge>
                          </div>
                        </div>

                        <h3 className="font-semibold text-slate-900 text-base">
                          {sit.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {sit.summary}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {sit.evidenceItems ? sit.evidenceItems.length : 0} evidence items
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSituation(sit)}
                          className="text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 h-8 px-2.5 text-xs font-medium"
                        >
                          View Evidence & Actions →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Situation Detail Modal */}
        {selectedSituation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {selectedSituation.category} Situation
                    </span>
                    <Badge
                      className={`text-xs ${
                        selectedSituation.priority === "HIGH"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : selectedSituation.priority === "MEDIUM"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {selectedSituation.priority} PRIORITY
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

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Operating Summary
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedSituation.summary}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Underlying Evidence & Signals ({selectedSituation.evidenceItems?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedSituation.evidenceItems?.map((ev: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="font-medium text-slate-900">{ev.label}</span>
                        <span className="text-slate-600">{ev.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Recommended Strategic Action
                  </h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedSituation.suggestedAction}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Lifecycle Status:</span>
                    {(["ACTIVE", "MONITORING", "RESOLVED"] as const).map((st) => (
                      <Button
                        key={st}
                        variant={selectedSituation.status === st ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedSituation.id) {
                            updateSituationStatusMutation.mutate({
                              businessId: parseInt(businessId || "0"),
                              situationId: selectedSituation.id,
                              status: st,
                            });
                            setSelectedSituation({ ...selectedSituation, status: st });
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
