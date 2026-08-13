import { useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, ArrowLeft, CheckCircle2, CircleDashed, GitBranch, LockKeyhole, RefreshCw, Target, TriangleAlert, type LucideIcon } from "lucide-react";

const HEALTH_STYLES: Record<string, string> = {
  HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  AT_RISK: "border-amber-200 bg-amber-50 text-amber-700",
  BLOCKED: "border-rose-200 bg-rose-50 text-rose-700",
  OVERDUE: "border-orange-200 bg-orange-50 text-orange-700",
  UNKNOWN: "border-slate-200 bg-slate-50 text-slate-600",
};

const GAP_STYLES: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
};

function labelize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function DecisionOutcomePage() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>();
  const businessId = Number(businessIdParam || 0);
  const [, setLocation] = useLocation();
  const [selectedDecisionId, setSelectedDecisionId] = useState<number | null>(null);
  const followThroughQuery = trpc.actionPlans.followThrough.useQuery({ businessId }, { enabled: businessId > 0 });
  const selectedChainQuery = trpc.actionPlans.decisionToOutcome.useQuery(
    { businessId, decisionId: selectedDecisionId || 0 },
    { enabled: businessId > 0 && selectedDecisionId !== null }
  );
  const summary = followThroughQuery.data;
  const selectedChain = selectedChainQuery.data || summary?.chains.find((chain) => chain.decisionId === selectedDecisionId);
  const metricCards: Array<{ label: string; value: number; Icon: LucideIcon; color: string }> = summary ? [
    { label: "Decisions made", value: summary.decisionsMade, Icon: Target, color: "text-indigo-600" },
    { label: "Actions completed", value: summary.actionsCompleted, Icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Blocked actions", value: summary.blockedActions, Icon: LockKeyhole, color: "text-rose-600" },
    { label: "Reviews pending", value: summary.outcomesAwaitingReview, Icon: TriangleAlert, color: "text-amber-600" },
  ] : [];

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-slate-50/60">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => setLocation(`/command-center/${businessId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Command Center
              </Button>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><GitBranch className="h-6 w-6" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Operational intelligence</p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Decision → Outcome</h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">Trace what the business decided, what was executed, what happened, and where human review is still required.</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => void followThroughQuery.refetch()} disabled={followThroughQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${followThroughQuery.isFetching ? "animate-spin" : ""}`} /> Refresh chain
            </Button>
          </div>

          {followThroughQuery.isLoading ? (
            <Card><CardContent className="flex min-h-48 items-center justify-center text-sm text-slate-500">Loading verified follow-through records…</CardContent></Card>
          ) : followThroughQuery.isError ? (
            <Card className="border-rose-200"><CardContent className="flex min-h-48 items-center justify-center text-sm text-rose-700">{followThroughQuery.error.message}</CardContent></Card>
          ) : !summary || summary.chains.length === 0 ? (
            <Card><CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 text-center"><CircleDashed className="h-8 w-8 text-slate-400" /><p className="font-medium text-slate-800">No decision chains are recorded yet</p><p className="max-w-md text-sm text-slate-500">Decisions, action plans, and observed outcomes will appear here once they are recorded in this business workspace.</p></CardContent></Card>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map(({ label, value, Icon, color }) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p></div><Icon className={`h-6 w-6 ${color}`} /></CardContent></Card>)}
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                <Card>
                  <CardHeader><CardTitle>Decision chain register</CardTitle><CardDescription>Select a decision to inspect its complete operational chain and any follow-through gaps.</CardDescription></CardHeader>
                  <CardContent className="space-y-3">
                    {summary.chains.map((chain) => {
                      const highGaps = chain.gaps.filter((gap) => gap.severity === "HIGH").length;
                      const atRisk = chain.actions.filter((action) => ["AT_RISK", "BLOCKED", "OVERDUE"].includes(action.executionHealth)).length;
                      return <button key={chain.decisionId} type="button" onClick={() => setSelectedDecisionId(chain.decisionId)} className={`w-full rounded-xl border p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${selectedDecisionId === chain.decisionId ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-white"}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><p className="font-semibold text-slate-900">{chain.decisionTitle}</p><p className="mt-1 text-xs text-slate-500">Decision status: {labelize(chain.decisionStatus)} · {chain.actions.length} action{chain.actions.length === 1 ? "" : "s"} · {chain.outcomes.length} outcome{chain.outcomes.length === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{labelize(chain.decisionStatus)}</Badge>{highGaps > 0 && <Badge className="border-rose-200 bg-rose-50 text-rose-700">{highGaps} high gap{highGaps === 1 ? "" : "s"}</Badge>}{atRisk > 0 && <Badge className="border-amber-200 bg-amber-50 text-amber-700">{atRisk} execution risk{atRisk === 1 ? "" : "s"}</Badge>}</div></div>
                      </button>;
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Morning follow-through</CardTitle><CardDescription>High-severity gaps are surfaced for human review; nothing is auto-created or auto-closed.</CardDescription></CardHeader>
                  <CardContent className="space-y-3">
                    {summary.morningReview.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No high-severity follow-through gaps are currently supported by the recorded data.</div> : summary.morningReview.map((item) => <div key={`${item.kind}-${item.decisionId}-${item.actionId}-${item.outcomeId}`} className="rounded-xl border border-rose-200 bg-rose-50/70 p-4"><p className="font-medium text-rose-900">{item.title}</p><p className="mt-1 text-sm text-rose-800">{item.detail}</p></div>)}
                  </CardContent>
                </Card>
              </div>

              {selectedChain ? <Card>
                <CardHeader><CardTitle>{selectedChain.decisionTitle}</CardTitle><CardDescription>Linked evidence chain: Decision → Action → Execution → Outcome → Lesson</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2"><Badge variant="outline">Decision: {labelize(selectedChain.decisionStatus)}</Badge><Badge variant="outline">{selectedChain.actions.length} actions</Badge><Badge variant="outline">{selectedChain.outcomes.length} outcomes</Badge></div>
                  <Separator />
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{selectedChain.nodes.map((node, index) => <div key={`${node.type}-${node.id}-${index}`} className="relative rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{labelize(node.type)}</Badge><span className="text-xs text-slate-400">{node.recorded ? "Recorded" : "Unknown"}</span></div><p className="mt-3 font-medium text-slate-900">{node.label}</p><p className="mt-1 text-sm text-slate-600">{node.detail}</p><p className="mt-3 text-xs text-slate-500">Status: {labelize(node.status)}</p></div>)}</div>
                  {selectedChain.actions.length > 0 && <div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Execution health</h3><div className="space-y-2">{selectedChain.actions.map((action) => <div key={action.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium text-slate-900">{action.title}</p><p className="text-sm text-slate-600">{action.executionHealthReason}</p></div><div className="flex flex-wrap items-center gap-2"><Badge className={HEALTH_STYLES[action.executionHealth] || HEALTH_STYLES.UNKNOWN}>{labelize(action.executionHealth)}</Badge>{action.blockedDurationHours > 0 && <span className="text-xs text-slate-500">Blocked {action.blockedDurationHours}h</span>}<span className="text-xs text-slate-500">{action.outcomeReviewed ? "Outcome reviewed" : action.hasOutcome ? "Review pending" : "No outcome"}</span></div></div>)}</div></div>}
                  <div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Gaps and review prompts</h3>{selectedChain.gaps.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No unresolved chain gaps are currently supported by the recorded evidence.</div> : <div className="grid gap-3 md:grid-cols-2">{selectedChain.gaps.map((gap, index) => <div key={`${gap.kind}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><p className="font-medium text-slate-900">{gap.title}</p><Badge className={GAP_STYLES[gap.severity]}>{labelize(gap.severity)}</Badge></div><p className="mt-2 text-sm text-slate-600">{gap.explanation}</p></div>)}</div>}</div>
                </CardContent>
              </Card> : <Card><CardContent className="flex min-h-32 items-center justify-center text-sm text-slate-500">Select a decision above to inspect its linked operational evidence.</CardContent></Card>}
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
