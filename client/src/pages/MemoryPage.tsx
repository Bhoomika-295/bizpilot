import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BrainCircuit, CalendarDays, ChevronRight, CircleDot, History, Lightbulb, Loader2, RefreshCw, Search, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

const MEMORY_TYPES = ["ALL", "SITUATION", "DECISION", "STRATEGY", "OUTCOME", "ACTION"];
const IMPORTANCE_STYLES: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
};
const OUTCOME_STYLES: Record<string, string> = {
  POSITIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEGATIVE: "border-rose-200 bg-rose-50 text-rose-700",
  MIXED: "border-amber-200 bg-amber-50 text-amber-700",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function parseContext(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function MemoryTimeline({ businessId, onOpenMemory }: { businessId: number; onOpenMemory: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const timelineQuery = trpc.businessMemory.getTimeline.useQuery({ businessId, limit: 100 });
  const memories = useMemo(() => {
    const source = timelineQuery.data || [];
    const normalized = query.trim().toLowerCase();
    return source.filter((memory) => {
      const matchesType = type === "ALL" || memory.memoryType === type;
      const matchesQuery = !normalized || memory.title.toLowerCase().includes(normalized) || memory.summary.toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [query, timelineQuery.data, type]);

  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900"><History className="h-5 w-5 text-indigo-600" />Business Memory Timeline</CardTitle>
            <CardDescription className="mt-1">Significant events retained as evidence for future decisions. Nothing here is presented as a prediction.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching} aria-label="Refresh memory timeline">
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${timelineQuery.isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memory titles and summaries" className="pl-9" aria-label="Search business memory" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MEMORY_TYPES.map((item) => <Button key={item} size="sm" variant={type === item ? "default" : "outline"} className={type === item ? "bg-slate-900 text-white" : "text-slate-600"} onClick={() => setType(item)}>{item}</Button>)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {timelineQuery.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div> : timelineQuery.isError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />Memory timeline unavailable</div><p className="mt-1">The workspace could not load historical evidence. Try again when the business connection is available.</p></div> : memories.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 px-6 py-12 text-center"><History className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-sm font-semibold text-slate-800">No memories match this view</h3><p className="mt-1 text-xs text-slate-500">Significant situations, decisions, strategies, actions, and outcomes will appear here as the business generates evidence.</p></div> : <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">{memories.map((memory) => <button key={memory.id} onClick={() => onOpenMemory(memory.id)} className="group relative flex w-full gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><span className="relative z-10 mt-1 flex h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-indigo-500 ring-1 ring-indigo-200" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-800">{memory.title}</h3><Badge variant="outline" className="text-[10px]">{memory.memoryType}</Badge><Badge variant="outline" className={`text-[10px] ${IMPORTANCE_STYLES[memory.importance] || ""}`}>{memory.importance}</Badge></div><span className="shrink-0 text-[11px] text-slate-500">{formatDate(memory.createdAt)}</span></div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{memory.summary}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Source-linked memory</span>{memory.sourceType && <span>{memory.sourceType}{memory.sourceId ? ` #${memory.sourceId}` : ""}</span>}<ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" /></div></div></button>)}</div>}
      </CardContent>
    </Card>
  );
}

function MemoryDetail({ businessId, memoryId, onClose }: { businessId: number; memoryId: number | null; onClose: () => void }) {
  const detailQuery = trpc.businessMemory.getDetail.useQuery({ businessId, memoryId: memoryId || 0 }, { enabled: memoryId !== null });
  if (memoryId === null) return null;
  const memory = detailQuery.data;
  const context = parseContext(memory?.contextJson);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Business memory detail"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">MEMORY RECORD</Badge>{memory && <Badge variant="outline" className={IMPORTANCE_STYLES[memory.importance] || ""}>{memory.importance} IMPORTANCE</Badge>}</div><h2 className="mt-2 text-xl font-bold text-slate-900">{detailQuery.isLoading ? "Loading memory…" : memory?.title || "Memory not found"}</h2><p className="mt-1 text-xs text-slate-500">{memory ? `${memory.memoryType} · ${formatDate(memory.createdAt)}` : "This record may no longer be available."}</p></div><Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500" aria-label="Close memory detail">✕</Button></div>{detailQuery.isLoading ? <div className="space-y-3 py-6"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-20 w-full" /></div> : !memory ? <div className="py-10 text-center text-sm text-slate-500">The selected memory could not be found.</div> : <div className="space-y-5 pt-5"><div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-800">Summary</h3><p className="mt-2 text-sm leading-relaxed text-indigo-950">{memory.summary}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-[11px] uppercase tracking-wider text-slate-500">Evidence source</span><p className="mt-1 text-sm font-semibold text-slate-900">{memory.sourceType || "Internal business event"}{memory.sourceId ? ` #${memory.sourceId}` : ""}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-[11px] uppercase tracking-wider text-slate-500">Record status</span><p className="mt-1 text-sm font-semibold text-slate-900">{memory.status}</p></div></div>{Object.keys(context).length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Captured context</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(context).map(([key, value]) => <div key={key} className="rounded-md border border-slate-100 bg-white p-3"><span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{key.replaceAll("_", " ")}</span><p className="mt-1 text-sm text-slate-800">{typeof value === "string" ? value : JSON.stringify(value)}</p></div>)}</div></div>}<div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span>Business memory is tenant-scoped and evidence-linked.</span><Button variant="outline" size="sm" onClick={onClose}>Close</Button></div></div>}</div></div>;
}

function PatternRadar({ businessId, onOpenMemory }: { businessId: number; onOpenMemory: (id: number) => void }) {
  const patternsQuery = trpc.businessMemory.getPatterns.useQuery({ businessId });
  const patterns = patternsQuery.data || [];
  return <Card className="border-slate-200 bg-white shadow-2xs"><CardHeader className="border-b border-slate-100 pb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg text-slate-900"><Target className="h-5 w-5 text-amber-600" />Pattern Intelligence Radar</CardTitle><CardDescription className="mt-1">Recurring patterns require repeated memory evidence. Each lesson remains traceable to source memory IDs.</CardDescription></div><Button variant="outline" size="sm" onClick={() => patternsQuery.refetch()} disabled={patternsQuery.isFetching}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${patternsQuery.isFetching ? "animate-spin" : ""}`} />Re-scan history</Button></div></CardHeader><CardContent className="p-4">{patternsQuery.isLoading ? <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((item) => <Skeleton key={item} className="h-44 w-full" />)}</div> : patternsQuery.isError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />Pattern scan unavailable</div><p className="mt-1">Historical patterns could not be loaded for this business.</p></div> : patterns.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 px-6 py-12 text-center"><CircleDot className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-sm font-semibold text-slate-800">No recurring pattern confirmed yet</h3><p className="mt-1 text-xs text-slate-500">BizPilot needs at least two matching memory records before it promotes an event into a recurring pattern.</p></div> : <div className="grid gap-3 md:grid-cols-2">{patterns.map((pattern) => { const outcomeIcon = pattern.historicalOutcome === "POSITIVE" ? TrendingUp : pattern.historicalOutcome === "NEGATIVE" ? TrendingDown : CircleDot; const OutcomeIcon = outcomeIcon; let sourceIds: number[] = []; try { sourceIds = pattern.evidenceJson ? JSON.parse(pattern.evidenceJson).sourceMemoryIds || [] : []; } catch { sourceIds = []; } return <div key={pattern.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{pattern.confidence} CONFIDENCE</Badge><Badge variant="outline" className={OUTCOME_STYLES[pattern.historicalOutcome] || ""}>{pattern.historicalOutcome}</Badge></div><h3 className="mt-3 text-base font-semibold text-slate-900">{pattern.title}</h3></div><OutcomeIcon className={`h-5 w-5 ${pattern.historicalOutcome === "POSITIVE" ? "text-emerald-600" : pattern.historicalOutcome === "NEGATIVE" ? "text-rose-600" : "text-slate-400"}`} /></div><p className="mt-2 text-xs leading-relaxed text-slate-600">{pattern.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md border border-slate-200 bg-white p-2"><span className="text-slate-500">Occurrences</span><p className="mt-1 font-semibold text-slate-900">{pattern.occurrences}</p></div><div className="rounded-md border border-slate-200 bg-white p-2"><span className="text-slate-500">Current relevance</span><p className="mt-1 font-semibold text-slate-900">{pattern.currentRelevance}</p></div></div><div className="mt-3 rounded-md border border-amber-100 bg-amber-50/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Lesson learned</p><p className="mt-1 text-xs leading-relaxed text-amber-950">{pattern.lessonsLearned || "No lesson has been captured yet."}</p></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[11px] text-slate-500">Evidence: {sourceIds.length || pattern.occurrences} source memories</span>{sourceIds.slice(0, 3).map((id) => <Button key={id} size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-indigo-700" onClick={() => onOpenMemory(id)}>Memory #{id}</Button>)}</div></div>; })}</div>}
      </CardContent>
    </Card>;
}

function MemoryAssistant({ businessId }: { businessId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [lastAnsweredQuestion, setLastAnsweredQuestion] = useState("");
  const assistantQuery = trpc.businessMemory.queryAssistant.useQuery({ businessId, question: submittedQuestion }, { enabled: submittedQuestion.trim().length > 0 });
  useEffect(() => {
    if (!assistantQuery.data || !submittedQuestion || submittedQuestion === lastAnsweredQuestion) return;
    const result = assistantQuery.data;
    const sourceText = result.sources?.length ? `\n\nEvidence: ${result.sources.map((source) => `${source.title} (${formatDate(source.date)})`).join("; ")}.` : "";
    const patternText = result.patterns?.length ? `\n\nPatterns: ${result.patterns.map((pattern) => `${pattern.title} (${pattern.occurrences} occurrences)`).join("; ")}.` : "";
    setMessages((current) => [...current, { role: "assistant", content: `${result.answer}${sourceText}${patternText}` }]);
    setLastAnsweredQuestion(submittedQuestion);
  }, [assistantQuery.data, lastAnsweredQuestion, submittedQuestion]);
  const handleSend = (content: string) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) return;
    setMessages((current) => [...current, { role: "user", content: normalizedContent }]);
    setLastAnsweredQuestion("");
    if (normalizedContent === submittedQuestion.trim()) {
      void assistantQuery.refetch();
      return;
    }
    setSubmittedQuestion(normalizedContent);
  };
  return <Card className="border-slate-200 bg-white shadow-2xs"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="flex items-center gap-2 text-lg text-slate-900"><BrainCircuit className="h-5 w-5 text-indigo-600" />Memory Assistant</CardTitle><CardDescription>Ask about documented history. Answers are deterministic and cite matching memory records or confirmed patterns.</CardDescription></CardHeader><CardContent className="p-4">{assistantQuery.isError && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">The memory assistant could not answer this query. Try a shorter question about a known situation, decision, or pattern.</div>}{assistantQuery.isLoading && <div className="mb-3 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Searching retained business evidence…</div>}<AIChatBox messages={messages} onSendMessage={handleSend} isLoading={assistantQuery.isLoading} height={"min(520px, 58vh)"} placeholder="Ask: What happened the last time retention declined?" emptyStateMessage="Ask a question about your business history" suggestedPrompts={["What recurring patterns should I review?", "What happened the last time retention declined?", "Which decisions have historical evidence?"]} /></CardContent></Card>;
}

export default function MemoryPage() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>();
  const businessId = Number(businessIdParam || 0);
  const [selectedMemoryId, setSelectedMemoryId] = useState<number | null>(null);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return <DashboardLayout><div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><div className="flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4" />Business workspace unavailable</div><p className="mt-2 text-sm leading-relaxed">This memory workspace needs a valid business selected from your authenticated workspace.</p></div></DashboardLayout>;
  }
  return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">BUSINESS MEMORY</Badge><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">DETERMINISTIC EVIDENCE</Badge></div><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">History that informs the next decision.</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">BizPilot retains significant business events, detects recurring patterns only after repeated evidence, and keeps historical context available without inventing explanations.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><Sparkles className="h-4 w-4 text-indigo-600" />Tenant-scoped to business #{businessId}</div></div><Tabs defaultValue="timeline" className="space-y-4"><TabsList className="grid w-full max-w-xl grid-cols-3 bg-slate-100"><TabsTrigger value="timeline">Timeline</TabsTrigger><TabsTrigger value="patterns">Pattern radar</TabsTrigger><TabsTrigger value="assistant">Ask memory</TabsTrigger></TabsList><TabsContent value="timeline" className="mt-0"><MemoryTimeline businessId={businessId} onOpenMemory={setSelectedMemoryId} /></TabsContent><TabsContent value="patterns" className="mt-0"><PatternRadar businessId={businessId} onOpenMemory={setSelectedMemoryId} /></TabsContent><TabsContent value="assistant" className="mt-0"><MemoryAssistant businessId={businessId} /></TabsContent></Tabs><div className="grid gap-4 md:grid-cols-3"><Card className="border-slate-200 bg-slate-50"><CardContent className="flex gap-3 p-4"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /><div><p className="text-sm font-semibold text-slate-900">Chronological evidence</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Review significant events in the order they entered the business record.</p></div></CardContent></Card><Card className="border-slate-200 bg-slate-50"><CardContent className="flex gap-3 p-4"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold text-slate-900">Lessons, not guesses</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Pattern lessons are derived from repeated evidence and retained source links.</p></div></CardContent></Card><Card className="border-slate-200 bg-slate-50"><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-semibold text-slate-900">Evidence boundaries</p><p className="mt-1 text-xs leading-relaxed text-slate-600">When the record is silent, BizPilot says there is not enough evidence.</p></div></CardContent></Card></div></div><MemoryDetail businessId={businessId} memoryId={selectedMemoryId} onClose={() => setSelectedMemoryId(null)} /></DashboardLayout>;
}
