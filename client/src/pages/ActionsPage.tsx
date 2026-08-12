import { useMemo, useState, type ElementType } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, CircleDashed, Clock3, ListChecks, Loader2, LockKeyhole, Pencil, Play, Plus, RefreshCw, RotateCcw, ShieldCheck, Target, TimerReset, XCircle } from "lucide-react";
import { toast } from "sonner";

const FILTERS = ["ALL", "OVERDUE", "PROPOSED", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLES: Record<string, string> = {
  PROPOSED: "border-slate-200 bg-slate-50 text-slate-700",
  APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-indigo-200 bg-indigo-50 text-indigo-700",
  BLOCKED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  EXPIRED: "border-slate-200 bg-slate-100 text-slate-500",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ActionsPage() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>();
  const businessId = Number(businessIdParam || 0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [actualOutcome, setActualOutcome] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const queueQuery = trpc.actionPlans.queue.useQuery({ businessId }, { enabled: businessId > 0 });
  const detailQuery = trpc.actionPlans.detail.useQuery(
    { businessId, actionPlanId: selectedId || 0 },
    { enabled: businessId > 0 && !!selectedId }
  );
  const refresh = () => {
    void queueQuery.refetch();
    if (selectedId) void detailQuery.refetch();
  };

  const createMutation = trpc.actionPlans.create.useMutation({
    onSuccess: (action) => {
      toast.success("Action proposed and ready for approval");
      setIsCreateOpen(false);
      resetCreateForm();
      refresh();
      if (action?.id) setSelectedId(action.id);
    },
    onError: (error) => toast.error(error.message),
  });
  const editMutation = trpc.actionPlans.edit.useMutation({
    onSuccess: () => { toast.success("Action details updated"); setIsEditOpen(false); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const approveMutation = trpc.actionPlans.approve.useMutation({ onSuccess: () => { toast.success("Action approved"); refresh(); }, onError: (error) => toast.error(error.message) });
  const startMutation = trpc.actionPlans.start.useMutation({ onSuccess: () => { toast.success("Action moved into execution"); refresh(); }, onError: (error) => toast.error(error.message) });
  const blockMutation = trpc.actionPlans.block.useMutation({ onSuccess: () => { toast.success("Action marked blocked"); setIsBlockOpen(false); setBlockReason(""); refresh(); }, onError: (error) => toast.error(error.message) });
  const unblockMutation = trpc.actionPlans.unblock.useMutation({ onSuccess: () => { toast.success("Action unblocked"); refresh(); }, onError: (error) => toast.error(error.message) });
  const completeMutation = trpc.actionPlans.complete.useMutation({ onSuccess: () => { toast.success("Outcome captured and action completed"); setIsCompleteOpen(false); setActualOutcome(""); setCompletionNotes(""); refresh(); }, onError: (error) => toast.error(error.message) });
  const cancelMutation = trpc.actionPlans.cancel.useMutation({ onSuccess: () => { toast.success("Action cancelled"); refresh(); }, onError: (error) => toast.error(error.message) });
  const reopenMutation = trpc.actionPlans.reopen.useMutation({ onSuccess: () => { toast.success("Action reopened for follow-through"); refresh(); }, onError: (error) => toast.error(error.message) });

  const actions = queueQuery.data?.actions || [];
  const filteredActions = useMemo(() => actions.filter((action: any) => filter === "ALL" || (filter === "OVERDUE" ? action.overdue : action.status === filter)), [actions, filter]);
  const selectedAction: any = detailQuery.data?.action || actions.find((action: any) => action.id === selectedId);
  const summary = queueQuery.data?.summary;
  const metricCards: Array<{ label: string; value: string | number; Icon: ElementType; color: string }> = [
    { label: "Active execution", value: summary?.active ?? 0, Icon: TimerReset, color: "text-indigo-600" },
    { label: "Overdue", value: summary?.overdue ?? 0, Icon: Clock3, color: "text-rose-600" },
    { label: "Blocked", value: summary?.blocked ?? 0, Icon: LockKeyhole, color: "text-amber-600" },
    { label: "Completed", value: summary?.completed ?? 0, Icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Outcome capture", value: `${summary?.outcomeCaptureRate ?? 0}%`, Icon: Target, color: "text-slate-600" },
  ];
  const pending = createMutation.isPending || editMutation.isPending || approveMutation.isPending || startMutation.isPending || blockMutation.isPending || unblockMutation.isPending || completeMutation.isPending || cancelMutation.isPending || reopenMutation.isPending;

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setExpectedOutcome("");
    setPriority("MEDIUM");
    setDueDate("");
  }

  function openCreate() {
    resetCreateForm();
    setIsCreateOpen(true);
  }

  function openEdit() {
    if (!selectedAction) return;
    setTitle(selectedAction.title || "");
    setDescription(selectedAction.description || "");
    setExpectedOutcome(selectedAction.expectedOutcome || "");
    setPriority(selectedAction.priority || "MEDIUM");
    setDueDate(selectedAction.dueDate ? new Date(selectedAction.dueDate).toISOString().slice(0, 16) : "");
    setIsEditOpen(true);
  }

  function submitEdit() {
    if (!selectedAction) return;
    editMutation.mutate({
      businessId,
      actionPlanId: selectedAction.id,
      title,
      description,
      expectedOutcome,
      priority: priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      dueDate: dueDate ? new Date(dueDate) : null,
    });
  }

  function submitCreate() {
    createMutation.mutate({
      businessId,
      title,
      description,
      expectedOutcome,
      priority: priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      sourceType: "MANUAL",
      actionType: "REVIEW",
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600" onClick={() => setLocation(`/dashboard/${businessId}`)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
              </Button>
              <span className="text-slate-300">/</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Actions</h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">Convert verified intelligence into accountable, measurable business follow-through.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={queueQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${queueQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
            <Button onClick={openCreate} className="bg-slate-900 text-white hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" />Propose action</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {metricCards.map(({ label, value, Icon, color }) => (
            <Card key={label} className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div><div className="mt-2 text-2xl font-bold text-slate-900">{value}</div></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-lg text-slate-900">Execution queue</CardTitle><CardDescription>Prioritized from due dates, inherited intelligence priority, and lifecycle state.</CardDescription></div><div className="flex flex-wrap gap-1">{FILTERS.map((item) => <Button key={item} variant={filter === item ? "default" : "ghost"} size="sm" className={filter === item ? "bg-slate-900 text-white" : "text-slate-500"} onClick={() => setFilter(item)}>{item.replace("_", " ")}</Button>)}</div></div></CardHeader>
            <CardContent className="space-y-3 p-4">
              {queueQuery.isLoading ? <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading actions…</div> : filteredActions.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 px-6 py-14 text-center"><ListChecks className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-sm font-semibold text-slate-900">No actions in this view</h3><p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">Propose a specific next step from verified business intelligence, or change the filter to inspect another lifecycle state.</p><Button className="mt-4 bg-slate-900 text-white" size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Propose first action</Button></div> : filteredActions.map((action: any) => <button key={action.id} onClick={() => setSelectedId(action.id)} className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedId === action.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-slate-900">{action.title}</h3><Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[action.status] || ""}`}>{action.status.replace("_", " ")}</Badge>{action.overdue && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700">OVERDUE</Badge>}</div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{action.description}</p></div><span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{action.priority}</span></div><div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{formatDate(action.dueDate)}</span><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{action.sourceType}</span></div></button>)}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-3"><CardTitle className="text-lg text-slate-900">Action detail</CardTitle><CardDescription>Review the evidence, owner, lifecycle history, and measured outcome.</CardDescription></CardHeader>
            <CardContent className="p-5">
              {!selectedAction ? <div className="py-16 text-center"><CircleDashed className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">Select an action to inspect its execution record.</p><p className="mt-1 text-xs text-slate-500">Every state change is retained in the action history.</p></div> : <div className="space-y-5"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={STATUS_STYLES[selectedAction.status] || ""}>{selectedAction.status.replace("_", " ")}</Badge><Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] text-slate-600">{selectedAction.priority} PRIORITY</Badge>{selectedAction.overdue && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700">OVERDUE</Badge>}</div><div className="mt-3 flex items-start justify-between gap-3"><h2 className="text-xl font-bold text-slate-900">{selectedAction.title}</h2><Button variant="outline" size="sm" onClick={openEdit} disabled={pending}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button></div><p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedAction.description}</p></div><div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs"><div><span className="text-slate-500">Source</span><p className="mt-1 font-semibold text-slate-800">{selectedAction.sourceType}{selectedAction.sourceId ? ` #${selectedAction.sourceId}` : ""}</p></div><div><span className="text-slate-500">Due</span><p className="mt-1 font-semibold text-slate-800">{formatDate(selectedAction.dueDate)}</p></div><div><span className="text-slate-500">Expected outcome</span><p className="mt-1 font-semibold text-slate-800">{selectedAction.expectedOutcome || "Not recorded"}</p></div><div><span className="text-slate-500">Owner</span><p className="mt-1 font-semibold text-slate-800">{selectedAction.ownerUserId ? `Workspace owner #${selectedAction.ownerUserId}` : "Unassigned"}</p></div></div>{selectedAction.blockReason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Blocked:</strong> {selectedAction.blockReason}</div>}{selectedAction.actualOutcome && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800"><CheckCircle2 className="h-4 w-4" />Observed outcome</div><p className="mt-2 text-sm leading-relaxed text-emerald-950">{selectedAction.actualOutcome}</p>{selectedAction.completionNotes && <p className="mt-2 text-xs text-emerald-800">{selectedAction.completionNotes}</p>}</div>}<div className="flex flex-wrap gap-2">{selectedAction.status === "PROPOSED" && <Button disabled={pending} onClick={() => approveMutation.mutate({ businessId, actionPlanId: selectedAction.id })} className="bg-slate-900 text-white"><ShieldCheck className="mr-2 h-4 w-4" />Approve</Button>}{selectedAction.status === "APPROVED" && <Button disabled={pending} onClick={() => startMutation.mutate({ businessId, actionPlanId: selectedAction.id })} className="bg-indigo-600 text-white hover:bg-indigo-700"><Play className="mr-2 h-4 w-4" />Start execution</Button>}{selectedAction.status === "IN_PROGRESS" && <><Button disabled={pending} onClick={() => setIsCompleteOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" />Capture outcome</Button><Button disabled={pending} variant="outline" onClick={() => setIsBlockOpen(true)}><LockKeyhole className="mr-2 h-4 w-4" />Block</Button></>}{selectedAction.status === "BLOCKED" && <Button disabled={pending} onClick={() => unblockMutation.mutate({ businessId, actionPlanId: selectedAction.id })} className="bg-indigo-600 text-white hover:bg-indigo-700"><RotateCcw className="mr-2 h-4 w-4" />Unblock</Button>}{["COMPLETED", "CANCELLED", "EXPIRED"].includes(selectedAction.status) && <Button disabled={pending} variant="outline" onClick={() => reopenMutation.mutate({ businessId, actionPlanId: selectedAction.id, reason: "Reopened after review of current business context." })}><RotateCcw className="mr-2 h-4 w-4" />Reopen</Button>}{!["COMPLETED", "CANCELLED", "EXPIRED"].includes(selectedAction.status) && <Button disabled={pending} variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => cancelMutation.mutate({ businessId, actionPlanId: selectedAction.id, reason: "Cancelled by workspace owner after review." })}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}</div><div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lifecycle history</h3><div className="mt-3 space-y-2">{(detailQuery.data?.history || []).slice(0, 6).map((event: any) => <div key={event.id} className="flex items-start gap-3 rounded-md border border-slate-100 p-3"><div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400" /><div><p className="text-xs font-semibold text-slate-800">{event.eventType.replace("_", " ")}</p><p className="mt-0.5 text-[11px] text-slate-500">{event.previousStatus || "—"} → {event.newStatus || "—"} · {formatDate(event.createdAt)}</p></div></div>)}{!detailQuery.data?.history?.length && <p className="text-xs text-slate-500">No lifecycle events recorded yet.</p>}</div></div></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Propose a business action</DialogTitle><DialogDescription>Capture a concrete next step tied to a measurable outcome. New actions require approval before execution.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="action-title">Action title</Label><Input id="action-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Validate pricing response with five retained customers" /></div><div><Label htmlFor="action-description">Evidence and next step</Label><Textarea id="action-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What verified signal or decision does this action follow, and what will be done?" rows={4} /></div><div><Label htmlFor="action-outcome">Expected outcome</Label><Textarea id="action-outcome" value={expectedOutcome} onChange={(event) => setExpectedOutcome(event.target.value)} placeholder="What observable result will confirm or challenge the action?" rows={3} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CRITICAL">Critical</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="LOW">Low</SelectItem></SelectContent></Select></div><div><Label htmlFor="action-due">Due date</Label><Input id="action-due" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button disabled={createMutation.isPending || title.trim().length < 8 || description.trim().length < 20 || expectedOutcome.trim().length < 1} onClick={submitCreate} className="bg-slate-900 text-white">{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create proposal</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit action</DialogTitle><DialogDescription>Update the action without losing its lifecycle history. Changes remain connected to the originating business evidence.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="edit-action-title">Action title</Label><Input id="edit-action-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="edit-action-description">Description</Label><Textarea id="edit-action-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></div><div><Label htmlFor="edit-action-outcome">Expected outcome</Label><Textarea id="edit-action-outcome" value={expectedOutcome} onChange={(event) => setExpectedOutcome(event.target.value)} rows={3} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CRITICAL">Critical</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="LOW">Low</SelectItem></SelectContent></Select></div><div><Label htmlFor="edit-action-due">Due date</Label><Input id="edit-action-due" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button disabled={editMutation.isPending || title.trim().length < 8 || description.trim().length < 20 || expectedOutcome.trim().length < 1} onClick={submitEdit} className="bg-slate-900 text-white">{editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}><DialogContent><DialogHeader><DialogTitle>Capture observed outcome</DialogTitle><DialogDescription>Record what happened; do not mark an action complete without an evidence-based result.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="actual-outcome">Observed outcome</Label><Textarea id="actual-outcome" value={actualOutcome} onChange={(event) => setActualOutcome(event.target.value)} placeholder="What changed, and what was observed?" rows={4} /></div><div><Label htmlFor="completion-notes">Completion notes</Label><Textarea id="completion-notes" value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Add measurement context, source, or caveats." rows={3} /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Cancel</Button><Button disabled={completeMutation.isPending || actualOutcome.trim().length < 10 || completionNotes.trim().length < 5 || !selectedAction} onClick={() => selectedAction && completeMutation.mutate({ businessId, actionPlanId: selectedAction.id, actualOutcome, completionNotes })} className="bg-emerald-600 text-white hover:bg-emerald-700">Capture outcome</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}><DialogContent><DialogHeader><DialogTitle>Block action</DialogTitle><DialogDescription>Capture the dependency or constraint so the action can be revisited deliberately.</DialogDescription></DialogHeader><div><Label htmlFor="block-reason">Block reason</Label><Textarea id="block-reason" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="What prevents execution right now?" rows={4} /></div><DialogFooter><Button variant="outline" onClick={() => setIsBlockOpen(false)}>Cancel</Button><Button disabled={blockMutation.isPending || blockReason.trim().length < 5 || !selectedAction} onClick={() => selectedAction && blockMutation.mutate({ businessId, actionPlanId: selectedAction.id, reason: blockReason })} className="bg-amber-600 text-white hover:bg-amber-700">Mark blocked</Button></DialogFooter></DialogContent></Dialog>
    </DashboardLayout>
  );
}
