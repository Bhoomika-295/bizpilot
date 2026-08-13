import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  GitBranch,
  History,
  Link2,
  Loader2,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  Activity,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

const evidenceTone: Record<string, string> = {
  STRONG: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MODERATE: "bg-amber-100 text-amber-800 border-amber-200",
  WEAK: "bg-slate-100 text-slate-700 border-slate-200",
  UNKNOWN: "bg-rose-50 text-rose-700 border-rose-200",
};

function EvidenceBadge({ value }: { value?: string }) {
  const label = value || "UNKNOWN";
  return <Badge variant="outline" className={`text-[10px] uppercase tracking-[0.12em] ${evidenceTone[label] || evidenceTone.UNKNOWN}`}>{label}</Badge>;
}

function StatusBadge({ value }: { value?: string }) {
  return <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em] bg-background">{value || "OPEN"}</Badge>;
}

function WhyTree({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
  return (
    <div className="relative">
      <div className="flex items-start gap-2" style={{ paddingLeft: depth * 22 }}>
        {hasChildren ? (
          <button type="button" onClick={() => setOpen((value) => !value)} className="mt-1 rounded p-0.5 hover:bg-muted" aria-label={open ? "Collapse branch" : "Expand branch"}>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : <span className="w-4" />}
        <div className="flex-1 rounded-lg border bg-card px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{node?.label || "Unlabeled relationship"}</span>
            <EvidenceBadge value={node?.evidenceStrength} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{node?.status || "UNKNOWN"}</p>
        </div>
      </div>
      {open && hasChildren ? (
        <div className="mt-2 space-y-2 border-l border-dashed border-muted-foreground/30 pb-1 ml-4">
          {node.children.map((child: any) => <WhyTree key={child.id} node={child} depth={depth + 1} />)}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3"><CircleHelp className="h-6 w-6 text-primary" /></div>
        <h2 className="text-lg font-semibold tracking-tight">No root-cause investigation is recorded</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Start with a verified business problem. BizPilot will show related records, temporal relationships, counter-evidence, and unknowns only when those records exist.</p>
        <Button className="mt-5" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Investigate current signals
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RootCausePage() {
  const params = useParams<{ businessId: string }>();
  const businessId = Number(params.businessId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const investigationsQuery = trpc.businessMetrics.getRootCauseInvestigations.useQuery(
    { businessId },
    { enabled: Number.isFinite(businessId) && businessId > 0 }
  );
  const detailQuery = trpc.businessMetrics.getRootCauseInvestigation.useQuery(
    { businessId, investigationId: selectedId || 0 },
    { enabled: Number.isFinite(businessId) && businessId > 0 && Boolean(selectedId) }
  );
  const refreshMutation = trpc.businessMetrics.refreshRootCauseInvestigation.useMutation({
    onSuccess: async (result) => {
      setSelectedId(result.id || null);
      await investigationsQuery.refetch();
      await detailQuery.refetch();
    },
  });

  useEffect(() => {
    const first = investigationsQuery.data?.[0];
    if (selectedId === null && first?.id) setSelectedId(first.id);
  }, [investigationsQuery.data, selectedId]);

  const investigation = detailQuery.data || investigationsQuery.data?.find((row: any) => row.id === selectedId);
  const contributors = useMemo(() => Array.isArray(investigation?.contributors) ? investigation.contributors : [], [investigation]);
  const timeline = useMemo(() => Array.isArray(investigation?.timelineEvents) ? investigation.timelineEvents : [], [investigation]);
  const unknowns = useMemo(() => Array.isArray(investigation?.unknownFactors) ? investigation.unknownFactors : [], [investigation]);
  const counterEvidence = useMemo(() => Array.isArray(investigation?.counterEvidence) ? investigation.counterEvidence : [], [investigation]);
  const relationships = useMemo(() => Array.isArray(investigation?.relationships) ? investigation.relationships : [], [investigation]);

  const refresh = () => refreshMutation.mutate({
    businessId,
    problemTitle: "Current business situation",
    problemDescription: "Review verified records for possible contributors to the current business situation.",
    sourceType: "COMMAND_CENTER",
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1480px] space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><GitBranch className="h-3.5 w-3.5" /> Causal business intelligence</div>
            <h1 className="text-3xl font-semibold tracking-tight">WHY diagnostic workspace</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Trace relationships across verified business records. This workspace distinguishes observed events, temporal relationships, supported contributors, counter-evidence, and what remains unknown.</p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={refreshMutation.isPending}>
            {refreshMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh investigation
          </Button>
        </header>

        <Alert className="border-amber-200 bg-amber-50/60">
          <ShieldQuestion className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Evidence language guardrail</AlertTitle>
          <AlertDescription className="text-amber-900/80">A relationship or temporal sequence is not proof of causation. Review counter-evidence and unknown factors before making a decision.</AlertDescription>
        </Alert>

        {investigationsQuery.isLoading ? (
          <Card><CardContent className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
        ) : !investigation ? (
          <EmptyState onRefresh={refresh} isRefreshing={refreshMutation.isPending} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit xl:sticky xl:top-5">
              <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Investigations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {investigationsQuery.data?.map((row: any) => (
                  <button type="button" key={row.id} onClick={() => setSelectedId(row.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${row.id === selectedId ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-medium">{row.problemTitle}</span><StatusBadge value={row.status} /></div>
                    <div className="mt-2 flex items-center gap-2"><EvidenceBadge value={row.overallConfidence} /><span className="text-[11px] text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</span></div>
                  </button>
                ))}
                {!investigationsQuery.data?.length ? <p className="py-4 text-sm text-muted-foreground">No saved investigations yet.</p> : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="overflow-hidden border-primary/20">
                <CardHeader className="bg-gradient-to-br from-primary/[0.08] via-background to-background">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge value={investigation.status} /><EvidenceBadge value={investigation.evidenceStrength} /><span className="text-xs text-muted-foreground">Source: {investigation.sourceType}</span></div>
                      <CardTitle className="max-w-3xl text-2xl">{investigation.problemTitle}</CardTitle>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{investigation.problemDescription}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-3 text-right"><p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Overall confidence</p><p className="mt-1 text-lg font-semibold">{investigation.overallConfidence || "UNKNOWN"}</p><p className="text-xs text-muted-foreground">Not a probability</p></div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Possible contributors</p><p className="mt-1 text-2xl font-semibold">{contributors.length}</p></div>
                  <div><p className="text-xs text-muted-foreground">Counter-evidence</p><p className="mt-1 text-2xl font-semibold">{counterEvidence.length}</p></div>
                  <div><p className="text-xs text-muted-foreground">Unknown factors</p><p className="mt-1 text-2xl font-semibold">{unknowns.length}</p></div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <Card><CardHeader><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /><CardTitle className="text-base">WHY tree</CardTitle></div><p className="text-sm text-muted-foreground">Expandable relationship paths with evidence strength, not unsupported causal claims.</p></CardHeader><CardContent>{investigation.whyTree ? <WhyTree node={investigation.whyTree} /> : <p className="text-sm text-muted-foreground">No relationship tree is available.</p>}</CardContent></Card>
                <Card><CardHeader><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><CardTitle className="text-base">Top contributors</CardTitle></div></CardHeader><CardContent className="space-y-4">
                  {contributors.length ? contributors.map((factor: any, index: number) => <div key={factor.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><div><p className="text-sm font-medium">{factor.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{factor.description || "No description recorded."}</p></div></div><EvidenceBadge value={factor.evidenceStrength} /></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="rounded-full bg-muted px-2 py-1">{factor.relationshipType}</span><span className="rounded-full bg-muted px-2 py-1">{factor.temporalRelationship}</span><span className="rounded-full bg-muted px-2 py-1">Confidence: {factor.confidence}</span></div><Separator className="my-3" /><p className="text-xs font-medium">Why it ranks here</p><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{(factor.rankingExplanation || []).map((reason: string) => <li key={reason} className="flex gap-2"><span className="text-primary">•</span>{reason}</li>)}</ul><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-wider text-emerald-700">Supporting evidence</p><p className="mt-1 text-xs text-muted-foreground">{(factor.supportingEvidence || []).join("; ") || "None recorded"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-rose-700">Contradicting evidence</p><p className="mt-1 text-xs text-muted-foreground">{(factor.contradictingEvidence || []).join("; ") || "None recorded"}</p></div></div></div>) : <p className="text-sm text-muted-foreground">No verified contributor is available. The current relationship remains UNKNOWN.</p>}
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><CardTitle className="text-base">Verified relationship links</CardTitle></div>
                  <p className="text-sm text-muted-foreground">Persisted graph edges grounded in the current tenant’s records. These are relationship signals, not proof of causation.</p>
                </CardHeader>
                <CardContent>
                  {relationships.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {relationships.map((link: any) => (
                        <div key={link.id} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="text-[10px]">{link.relationshipType}</Badge><EvidenceBadge value={link.evidenceStrength} /><span className="text-[11px] text-muted-foreground">Confidence: {link.confidence}</span></div>
                          <p className="mt-2 text-sm font-medium">{link.fromType}{link.fromId ? ` #${link.fromId}` : ""} <span className="text-muted-foreground">→</span> {link.toType}{link.toId ? ` #${link.toId}` : ""}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{link.evidenceSummary || "No evidence summary recorded."}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No persisted relationship links are available for this investigation.</p>}
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardHeader><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><CardTitle className="text-base">Counter-evidence</CardTitle></div><p className="text-sm text-muted-foreground">Signals that weaken or limit the contributor interpretation.</p></CardHeader><CardContent>{counterEvidence.length ? <ul className="space-y-3">{counterEvidence.map((item: string) => <li key={item} className="flex gap-3 text-sm leading-6"><ArrowDownRight className="mt-1 h-4 w-4 shrink-0 text-rose-600" />{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No counter-evidence recorded.</p>}</CardContent></Card>
                <Card><CardHeader><div className="flex items-center gap-2"><ShieldQuestion className="h-4 w-4 text-amber-600" /><CardTitle className="text-base">What we do not know</CardTitle></div><p className="text-sm text-muted-foreground">Missing, unverified, or conflicting information that should constrain action.</p></CardHeader><CardContent>{unknowns.length ? <ul className="space-y-3">{unknowns.map((item: string) => <li key={item} className="flex gap-3 text-sm leading-6"><CircleHelp className="mt-1 h-4 w-4 shrink-0 text-amber-600" />{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No unknown factors recorded.</p>}</CardContent></Card>
              </div>

              <Card><CardHeader><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><CardTitle className="text-base">Temporal relationship timeline</CardTitle></div><p className="text-sm text-muted-foreground">A chronology of observed records. “Preceded” and “concurrent” describe sequence, not proof of cause.</p></CardHeader><CardContent>{timeline.length ? <div className="space-y-0">{timeline.map((event: any, index: number) => <div key={event.id} className="relative flex gap-4 pb-5 last:pb-0"><div className="flex flex-col items-center"><div className="mt-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />{index < timeline.length - 1 ? <div className="h-full w-px bg-border" /> : null}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium">{new Date(event.date).toLocaleDateString()}</span><Badge variant="secondary" className="text-[10px]">{event.eventType}</Badge><span className="text-xs text-muted-foreground">{event.temporalRelationship}</span></div><p className="mt-1 text-sm font-medium">{event.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{event.description || "No description recorded."}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Link2 className="h-3 w-3" /> Source: {event.sourceType}{event.sourceId ? ` #${event.sourceId}` : ""}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">No verified timeline events are available.</p>}</CardContent></Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground"><History className="h-3.5 w-3.5" /> Last updated {new Date(investigation.updatedAt).toLocaleString()} <span>·</span> <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tenant-scoped evidence</div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
