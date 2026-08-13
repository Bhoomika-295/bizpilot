import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Compass,
  Gauge,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Waypoints,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";

const laneMeta = {
  NOW: { label: "Now", description: "Executive attention", icon: CircleAlert, tone: "border-red-200 bg-red-50/70 text-red-700" },
  NEXT: { label: "Next", description: "Move forward", icon: ArrowRight, tone: "border-amber-200 bg-amber-50/70 text-amber-700" },
  WATCH: { label: "Watch", description: "Keep in view", icon: Compass, tone: "border-sky-200 bg-sky-50/70 text-sky-700" },
} as const;

type LaneKey = keyof typeof laneMeta;
type InsightSourceType = "ATTENTION" | "DECISION" | "ACTION" | "SITUATION" | "STRATEGY" | "MEMORY" | "PATTERN" | "OUTCOME" | "FORESIGHT" | "SCENARIO" | "DIAGNOSTIC";
type InsightSelection = { sourceType: InsightSourceType; sourceId: number };

function sourceHref(sourceType: InsightSourceType, businessId: number) {
  if (sourceType === "ACTION") return `/actions/${businessId}`;
  if (sourceType === "MEMORY" || sourceType === "PATTERN") return `/memory/${businessId}`;
  if (sourceType === "DIAGNOSTIC") return `/why/${businessId}`;
  return `/dashboard/${businessId}`;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function healthTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-700";
  if (score >= 45) return "text-amber-700";
  return "text-red-700";
}

function statusTone(status: string) {
  if (["CRITICAL", "HIGH", "BLOCKED", "OVERDUE", "STALE"].includes(status.toUpperCase())) return "border-red-200 bg-red-50 text-red-700";
  if (["WATCH", "MEDIUM", "AGING", "IN_REVIEW"].includes(status.toUpperCase())) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function MetricCard({ label, value, supporting, icon: Icon, tone = "text-foreground" }: { label: string; value: string | number; supporting: string; icon: typeof Gauge; tone?: string }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className={cn("mt-3 text-3xl font-semibold tracking-tight", tone)}>{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{supporting}</p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-2.5 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-5 w-1/2" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Skeleton className="h-[420px] rounded-2xl" /><Skeleton className="h-[420px] rounded-2xl" /></div>
    </div>
  );
}

export default function CommandCenterPage() {
  const { businessId: rawBusinessId } = useParams<{ businessId?: string }>();
  const businessId = Number(rawBusinessId);
  const validBusiness = Number.isInteger(businessId) && businessId > 0;
  const [, setLocation] = useLocation();
  const [activeLane, setActiveLane] = useState<LaneKey>("NOW");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightSelection | null>(null);
  const snapshotQuery = trpc.commandCenter.getSnapshot.useQuery({ businessId }, { enabled: validBusiness, refetchOnWindowFocus: false });
  const briefQuery = trpc.commandCenter.getExecutiveBrief.useQuery({ businessId }, { enabled: validBusiness, refetchOnWindowFocus: false });
  const searchQuery = trpc.commandCenter.globalSearch.useQuery({ businessId, query: query.trim() }, { enabled: validBusiness && query.trim().length >= 2, refetchOnWindowFocus: false });
  const detailQuery = trpc.commandCenter.getInsightDetail.useQuery(
    { businessId, sourceType: selectedInsight?.sourceType ?? "ATTENTION", sourceId: selectedInsight?.sourceId ?? 1 },
    { enabled: validBusiness && selectedInsight !== null, refetchOnWindowFocus: false }
  );
  const snapshot = snapshotQuery.data;
  const brief = briefQuery.data;
  const activePriorities = useMemo(() => snapshot?.priorities[activeLane.toLowerCase() as "now" | "next" | "watch"] ?? [], [activeLane, snapshot]);

  if (!validBusiness) {
    return <DashboardLayout><div className="flex min-h-[70vh] items-center justify-center p-6"><Card className="max-w-md border-dashed"><CardContent className="space-y-4 p-8 text-center"><XCircle className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="text-xl font-semibold">Business context required</h1><p className="text-sm text-muted-foreground">Open the Executive Command Center from an authenticated business workspace.</p><Button asChild><Link href="/profile">Open profile</Link></Button></CardContent></Card></div></DashboardLayout>;
  }

  if (snapshotQuery.isLoading || briefQuery.isLoading) return <DashboardLayout><PageSkeleton /></DashboardLayout>;

  if (snapshotQuery.isError || !snapshot) {
    return <DashboardLayout><div className="flex min-h-[70vh] items-center justify-center p-6"><Card className="max-w-lg border-red-200"><CardContent className="space-y-4 p-8 text-center"><CircleAlert className="mx-auto h-10 w-10 text-red-600" /><h1 className="text-xl font-semibold">Command Center unavailable</h1><p className="text-sm text-muted-foreground">{snapshotQuery.error?.message || "Verified executive outputs could not be loaded."}</p><Button onClick={() => snapshotQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card></div></DashboardLayout>;
  }

  const lane = laneMeta[activeLane];
  const LaneIcon = lane.icon;
  const healthScore = snapshot.health.score;

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.09),_transparent_28rem),linear-gradient(180deg,_#f8fafc_0%,_#f4f7fb_100%)]">
        <div className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-5 border-b border-border/70 pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="h-3.5 w-3.5" /> BizPilot / Executive Command Center <Badge variant="outline" className="ml-1 border-primary/20 bg-primary/5 text-primary">Live synthesis</Badge></div>
              <p className="mb-2 text-sm font-medium text-slate-500">{getTimeGreeting()} — here is the verified operating picture.</p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">A clear view of what the business should do next.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{snapshot.headline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSearchOpen(true)}><Search className="mr-2 h-4 w-4" />Global search</Button>
              <Button variant="outline" onClick={() => { snapshotQuery.refetch(); briefQuery.refetch(); }} disabled={snapshotQuery.isFetching}><RefreshCw className={cn("mr-2 h-4 w-4", snapshotQuery.isFetching && "animate-spin")} />Refresh outputs</Button>
              <Button onClick={() => setLocation(`/dashboard/${businessId}`)}>Open full dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-primary/15 bg-slate-950 text-white shadow-lg shadow-slate-900/10"><CardHeader className="border-b border-white/10 pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-cyan-300" />Morning business view</CardTitle><p className="text-xs text-white/55">{getTimeGreeting()} · Since the last verified review</p></CardHeader><CardContent className="space-y-3 p-5"><p className="text-sm leading-6 text-white/80">{snapshot.headline}</p><div className="grid gap-2 sm:grid-cols-2">{[snapshot.trend.changeCount > 0 ? snapshot.trend.summary : "No verified business change is currently surfaced.", `${snapshot.strategy.state.replaceAll("_", " ")} strategy state · ${snapshot.strategy.trajectoryAlignment.replaceAll("_", " ")} trajectory alignment`, snapshot.signals.pendingDecisionCount > 0 ? `${snapshot.signals.pendingDecisionCount} decision${snapshot.signals.pendingDecisionCount === 1 ? "" : "s"} waiting for review.` : "No pending decision candidate is currently recorded.", snapshot.memory.validatedLessonCount > 0 ? `${snapshot.memory.validatedLessonCount} validated lesson${snapshot.memory.validatedLessonCount === 1 ? "" : "s"} inform the next review${snapshot.memory.contradictionCount > 0 ? `; ${snapshot.memory.contradictionCount} conflict${snapshot.memory.contradictionCount === 1 ? "" : "s"} need human review.` : "."}` : "No validated organizational lesson is currently recorded."].map((item, index) => <div key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/70">{item}</div>)}</div></CardContent></Card>
            <Card className="border-border/70 bg-white/90"><CardHeader className="border-b border-border/60 pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Waypoints className="h-5 w-5 text-primary" />Strategic position</CardTitle><p className="text-xs text-muted-foreground">A compact view of the active strategy, pressure signals, and learning base.</p></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current strategy health</p><p className="mt-1 text-sm font-semibold">{snapshot.strategy.state.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.strategy.summary}</p></div><div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pressure and watch signals</p><p className="mt-1 text-sm font-semibold">{snapshot.signals.openSituationCount} open situations · {snapshot.signals.activeForesightCount} foresight signals</p><p className="mt-1 text-xs text-muted-foreground">Only persisted active records are counted.</p></div><div className="rounded-xl border border-border/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent outcomes</p><p className="mt-1 text-sm font-semibold">{snapshot.signals.recentOutcomeCount} outcome records</p><p className="mt-1 text-xs text-muted-foreground">Outcome records remain linked to their underlying review history.</p></div></CardContent></Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
            <Card className="overflow-hidden border-primary/20 bg-slate-950 text-white shadow-lg shadow-slate-900/10">
              <CardContent className="relative flex min-h-32 items-center gap-5 overflow-hidden p-5">
                <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5"><div className="text-center"><p className={cn("text-2xl font-semibold", healthScore === null ? "text-white/50" : healthScore >= 70 ? "text-emerald-300" : healthScore >= 45 ? "text-amber-300" : "text-red-300")}>{healthScore === null ? "—" : healthScore}</p><p className="text-[9px] uppercase tracking-[0.18em] text-white/50">Health</p></div></div>
                <div className="relative min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Executive signal</p><p className="mt-2 line-clamp-3 text-sm leading-5 text-white/80">{snapshot.health.explanation}</p><Badge variant="outline" className="mt-3 border-white/15 bg-white/5 text-white/70">{snapshot.health.dataBasis} data basis</Badge></div>
              </CardContent>
            </Card>
            <MetricCard label="Priority queue" value={snapshot.priorities.total} supporting={`${snapshot.priorities.now.length} Now-tier`} icon={Target} tone="text-red-700" />
            <MetricCard label="Execution risk" value={snapshot.execution.riskLevel} supporting={`${snapshot.execution.overdue} overdue · ${snapshot.execution.blocked} blocked`} icon={TimerReset} tone={snapshot.execution.riskLevel === "LOW" ? "text-emerald-700" : "text-amber-700"} />
            <MetricCard label="Strategy state" value={snapshot.strategy.state.replaceAll("_", " ")} supporting={snapshot.strategy.objectivePerformance.replaceAll("_", " ")} icon={Waypoints} tone="text-sky-700" />
            <MetricCard label="Validated learning" value={snapshot.memory.validatedLessonCount} supporting={`${snapshot.memory.recurringPatternCount} recurring patterns · ${snapshot.memory.contradictionCount} conflicts`} icon={BrainCircuit} tone="text-violet-700" />
            <MetricCard label="Future paths" value={snapshot.signals.activeScenarioCount} supporting={`${snapshot.signals.activeForesightCount} foresight signals`} icon={Compass} tone="text-indigo-700" />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/70 bg-white/80"><CardContent className="flex items-start gap-4 p-5"><div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700"><Compass className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Business trend</p><Badge variant="outline" className={cn("text-[10px]", statusTone(snapshot.trend.state))}>{snapshot.trend.state.replaceAll("_", " ")}</Badge></div><p className="mt-2 text-sm font-medium">{snapshot.trend.summary}</p><p className="mt-1 text-xs text-muted-foreground">The trend signal is derived from the current persisted Daily Brief change summary.</p></div></CardContent></Card>
            <Card className="border-border/70 bg-white/80"><CardContent className="flex items-start gap-4 p-5"><div className="rounded-2xl bg-red-50 p-3 text-red-700"><CircleAlert className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Decision urgency</p><Badge variant="outline" className={cn("text-[10px]", statusTone(snapshot.urgency.level))}>{snapshot.urgency.level}</Badge></div><p className="mt-2 text-sm font-medium">{snapshot.urgency.summary}</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.urgency.nowCount} Now-tier · {snapshot.urgency.nextCount} Next-tier items in the verified queue.</p></div></CardContent></Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="border-border/70 bg-white/85 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5 text-primary" />Priority order</CardTitle><p className="mt-1 text-sm text-muted-foreground">Every item is linked to an existing verified engine output.</p></div><div className="flex rounded-xl border bg-muted/30 p-1">{(Object.keys(laneMeta) as LaneKey[]).map((key) => { const MetaIcon = laneMeta[key].icon; return <button key={key} onClick={() => setActiveLane(key)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors", activeLane === key ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground")}><MetaIcon className="h-3.5 w-3.5" />{laneMeta[key].label}<span className="ml-0.5 text-[10px] opacity-60">{snapshot.priorities[key.toLowerCase() as "now" | "next" | "watch"].length}</span></button>; })}</div></div></CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-xs", lane.tone)}><LaneIcon className="h-4 w-4" /><span className="font-semibold">{lane.description}</span><span className="ml-auto opacity-70">{activePriorities.length} items</span></div>
                {activePriorities.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><h3 className="mt-3 font-semibold">No verified items in {lane.label}</h3><p className="mt-1 text-sm text-muted-foreground">The current intelligence queue does not support a priority here.</p></div> : activePriorities.map((priority) => <PriorityRow key={priority.key} priority={priority} businessId={businessId} onNavigate={setLocation} onInspect={(sourceType, sourceId) => sourceId && setSelectedInsight({ sourceType: sourceType as InsightSourceType, sourceId })} />)}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-primary/15 bg-white/90 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Layers3 className="h-5 w-5 text-primary" />Executive brief</CardTitle><p className="text-xs text-muted-foreground">{brief ? `Generated ${formatDate(brief.generatedAt)} · ${brief.narrativeMode.replaceAll("_", " ")}` : "No brief available"}</p></CardHeader><CardContent className="space-y-4">{brief?.sections.map((section) => <div key={section.key} className="border-l-2 border-primary/20 pl-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{section.title}</p><Badge variant="outline" className={cn("text-[10px]", statusTone(section.status))}>{section.status}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{section.summary}</p>{section.evidence.length > 0 && <p className="mt-2 text-[11px] text-foreground/70">Evidence: {section.evidence.join(" · ")}</p>}</div>)}<div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Decision prompt</p><p className="mt-2 text-sm leading-5 text-white/80">{brief?.decisionPrompt}</p></div></CardContent></Card>
              <Card className="border-border/70 bg-white/90 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5 text-primary" />Search the business</CardTitle><p className="text-xs text-muted-foreground">Search real memories, decisions, actions, situations, strategies, outcomes, scenarios, and foresight signals.</p></CardHeader><CardContent><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. pricing, retention, blocked action" className="pl-9" /></div>{query.trim().length > 0 && query.trim().length < 2 && <p className="mt-2 text-xs text-muted-foreground">Enter at least 2 characters.</p>}{searchQuery.isFetching && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Searching verified records…</div>}{searchQuery.isError && <p className="mt-4 text-xs text-red-600">Search could not be completed.</p>}{searchQuery.data && <div className="mt-4 space-y-2">{searchQuery.data.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No verified record matches that query.</div> : searchQuery.data.map((result) => <button key={`${result.resultType}-${result.recordId}`} onClick={() => setSelectedInsight({ sourceType: result.resultType, sourceId: result.recordId })} className="group flex w-full items-start gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><div className="mt-0.5 rounded-lg bg-primary/5 p-2 text-primary"><ShieldCheck className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{result.title}</p><Badge variant="outline" className={cn("text-[10px]", statusTone(result.status))}>{result.resultType}</Badge></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.summary}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>)}</div>}</CardContent></Card>
            </div>
          </section>

          <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Global business search</DialogTitle><DialogDescription>Search verified strategies, situations, decisions, actions, outcomes, learning, memories, patterns, and foresight signals.</DialogDescription></DialogHeader><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business record…" className="pl-9" /></div>{searchQuery.isFetching && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Searching verified records…</div>}{searchQuery.data && <div className="max-h-[50vh] space-y-2 overflow-y-auto">{searchQuery.data.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No verified record matches that query.</div> : searchQuery.data.map((result) => <button key={`modal-${result.resultType}-${result.recordId}`} onClick={() => { setSearchOpen(false); setSelectedInsight({ sourceType: result.resultType, sourceId: result.recordId }); }} className="group flex w-full items-start gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><div className="mt-0.5 rounded-lg bg-primary/5 p-2 text-primary"><ShieldCheck className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{result.title}</p><Badge variant="outline" className="text-[10px]">{result.resultType}</Badge></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.summary}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></button>)}</div>}</DialogContent></Dialog>
          <Dialog open={selectedInsight !== null} onOpenChange={(open) => !open && setSelectedInsight(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{detailQuery.data?.title || "Verified insight detail"}</DialogTitle><DialogDescription>Source-linked context from the current business workspace. Only persisted records are shown.</DialogDescription></DialogHeader>{detailQuery.isFetching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading verified insight…</div>}{detailQuery.isError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailQuery.error?.message || "Verified insight detail could not be loaded."}</div>}{detailQuery.data && <div className="space-y-5"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{detailQuery.data.sourceType}</Badge><Badge variant="outline" className={cn("text-[10px]", statusTone(detailQuery.data.status))}>{detailQuery.data.status}</Badge><Button size="sm" variant="outline" onClick={() => setLocation(sourceHref(detailQuery.data.sourceType, businessId))}>Open source <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Button></div><div className="rounded-xl border border-border/70 bg-muted/20 p-4"><p className="text-sm font-medium">{detailQuery.data.summary}</p><p className="mt-2 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground/80">Why now:</span> {detailQuery.data.whyNow}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>{detailQuery.data.evidence.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No additional evidence fields are recorded.</p> : <div className="mt-2 space-y-2">{detailQuery.data.evidence.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</div>)}</div>}</div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Intelligence chain</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{detailQuery.data.chain.map((stage, index) => <div key={`${stage.stage}-${index}`} className="rounded-lg border border-primary/15 bg-primary/[0.03] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{stage.stage}</p><p className="mt-1 text-xs leading-5 text-foreground/80">{stage.label}</p></div>)}</div></div></div>}</DialogContent></Dialog>

          <section className="grid gap-4 md:grid-cols-3"><Card className="bg-white/80"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Waypoints className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Strategy alignment</p><p className="mt-1 text-sm font-medium">{snapshot.strategy.trajectoryAlignment.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.strategy.summary}</p></div></CardContent></Card><Card className="bg-white/80"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><BrainCircuit className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Memory signal</p><p className="mt-1 text-sm font-medium">{snapshot.memory.validatedLessonCount} validated lessons retained</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.memory.recurringPatternCount} recurring patterns meet the evidence threshold; {snapshot.memory.contradictionCount} conflict{snapshot.memory.contradictionCount === 1 ? "" : "s"} remain{snapshot.memory.contradictionCount === 1 ? "s" : ""} visible for review.</p></div></CardContent></Card><Card className="bg-white/80"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><CalendarClock className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Data freshness</p><p className="mt-1 text-sm font-medium">{snapshot.freshness.label}</p><p className="mt-1 text-xs text-muted-foreground">Last executive brief: {formatDate(snapshot.freshness.lastBriefAt)}</p></div></CardContent></Card></section>
        </div>
      </main>
    </DashboardLayout>
  );
}

function PriorityRow({ priority, businessId, onNavigate, onInspect }: { priority: any; businessId: number; onNavigate: (path: string) => void; onInspect: (sourceType: string, sourceId: number | null) => void }) {
  return <button onClick={() => priority.sourceId ? onInspect(priority.source, priority.sourceId) : onNavigate(sourceHref(priority.source as InsightSourceType, businessId))} className="group flex w-full items-start gap-4 rounded-2xl border border-border/70 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-xs font-semibold text-primary">{priority.source.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-900">{priority.title}</p><Badge variant="outline" className={cn("text-[10px]", statusTone(priority.priority))}>{priority.priority}</Badge><Badge variant="outline" className="text-[10px]">{priority.source}</Badge></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{priority.summary}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground/60"><span><span className="font-semibold text-foreground/80">Why now:</span> {priority.whyNow}</span>{priority.evidence.length > 0 && <span>Evidence: {priority.evidence.join(" · ")}</span>}</div></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>;
}
