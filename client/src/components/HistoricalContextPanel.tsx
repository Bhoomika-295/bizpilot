import { AlertCircle, History, Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getHistoricalContextViewState } from "@/lib/historicalContext";

type HistoricalContextPanelProps = {
  businessId: number;
  queryType: string;
  categoryOrMetric?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function HistoricalContextPanel({
  businessId,
  queryType,
  categoryOrMetric,
  title = "Historical context",
  description = "Past evidence is shown only when retained business memories match this review.",
  compact = false,
}: HistoricalContextPanelProps) {
  const [, setLocation] = useLocation();
  const contextQuery = trpc.businessMemory.getHistoricalContext.useQuery(
    { businessId, queryType, categoryOrMetric: categoryOrMetric?.trim() || undefined },
    { enabled: businessId > 0 && queryType.trim().length > 0 },
  );
  const context = contextQuery.data;
  const viewState = getHistoricalContextViewState({
    isLoading: contextQuery.isLoading,
    isError: contextQuery.isError,
    similarCount: context?.similarCount,
  });

  return (
    <Card className={`border-indigo-100 bg-indigo-50/60 shadow-none ${compact ? "" : ""}`}>
      <CardHeader className={compact ? "px-4 pb-2 pt-4" : "pb-3"}>
        <CardTitle className="flex items-center gap-2 text-sm text-indigo-950">
          <History className="h-4 w-4 text-indigo-600" />
          {title}
          <Badge variant="outline" className="border-indigo-200 bg-white/70 text-[10px] text-indigo-700">
            EVIDENCE ONLY
          </Badge>
        </CardTitle>
        <p className="text-xs leading-relaxed text-indigo-900/80">{description}</p>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4" : "pt-0"}>
        {viewState === "loading" ? (
          <div className="flex items-center gap-2 text-xs text-indigo-900/70">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking retained business memory…
          </div>
        ) : viewState === "error" ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Historical context is temporarily unavailable. The current review remains unchanged.
          </div>
        ) : viewState === "empty" || !context ? (
          <p className="text-xs leading-relaxed text-indigo-900">
            No comparable memory is available yet. BizPilot will keep this boundary explicit rather than infer a past outcome.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-950">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <strong>{context.similarCount}</strong> comparable memory record{context.similarCount === 1 ? "" : "s"} retained for this business.
              {context.sourceMemoryIds.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-indigo-700"
                  onClick={() => setLocation(`/memory/${businessId}`)}
                >
                  Open memory workspace
                </Button>
              )}
            </div>
            {context.lastOccurrenceSummary && (
              <div className="rounded-md border border-indigo-100 bg-white/80 p-3 text-xs leading-relaxed text-indigo-950">
                <p className="font-semibold uppercase tracking-wider text-indigo-800">Last retained occurrence</p>
                <p className="mt-1">{context.lastOccurrenceSummary}</p>
              </div>
            )}
            {context.relevantLessons.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">Relevant lessons</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-indigo-950">
                  {context.relevantLessons.map((lesson, index) => <li key={`${lesson}-${index}`}>{lesson}</li>)}
                </ul>
              </div>
            )}
            {context.pastResponses.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">Past responses</p>
                <div className="mt-1 space-y-2">
                  {context.pastResponses.map((response) => (
                    <div key={response.memoryId} className="rounded-md border border-indigo-100 bg-white/80 p-2 text-xs leading-relaxed text-indigo-950">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{response.title}</strong>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-indigo-700" onClick={() => setLocation(`/memory/${businessId}`)}>
                          Memory #{response.memoryId}
                        </Button>
                      </div>
                      <span>{response.outcome} — {response.response}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoricalContextSkeleton() {
  return <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>;
}
