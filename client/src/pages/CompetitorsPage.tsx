import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, Globe, MapPin, Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, ArrowLeft } from "lucide-react";

export default function CompetitorsPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = parseInt(params.businessId || "0");
  const [, setLocation] = useLocation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [compLocation, setCompLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const utils = trpc.useUtils();
  const competitorsQuery = trpc.competitors.list.useQuery({ businessId }, { enabled: !!businessId });
  const competitors = competitorsQuery.data || [];

  const createMutation = trpc.competitors.create.useMutation({
    onSuccess: () => {
      utils.competitors.list.invalidate({ businessId });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const updateMutation = trpc.competitors.update.useMutation({
    onSuccess: () => {
      utils.competitors.list.invalidate({ businessId });
      setEditingCompetitor(null);
      setSelectedCompetitor(null);
      resetForm();
    },
  });

  const deleteMutation = trpc.competitors.delete.useMutation({
    onSuccess: () => {
      utils.competitors.list.invalidate({ businessId });
      setSelectedCompetitor(null);
    },
  });

  function resetForm() {
    setName("");
    setIndustry("");
    setWebsite("");
    setCompLocation("");
    setNotes("");
    setStatus("active");
  }

  function handleOpenEdit(comp: any) {
    setEditingCompetitor(comp);
    setName(comp.name);
    setIndustry(comp.industry || "");
    setWebsite(comp.website || "");
    setCompLocation(comp.location || "");
    setNotes(comp.notes || "");
    setStatus(comp.status || "active");
  }

  const activeCount = competitors.filter(c => c.status === "active").length;
  const uniqueIndustries = Array.from(new Set(competitors.map(c => c.industry).filter(Boolean))).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-600 hover:text-slate-900"
                onClick={() => setLocation(`/dashboard/${businessId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
              <span className="text-slate-300">/</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Competitor Watchlist</h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Maintain structured intelligence and strategic observations for key market competitors.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Competitor
          </Button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Competitors Tracked
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{competitors.length}</div>
              <p className="text-xs text-slate-500 mt-1">{activeCount} active in watchlist</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Industries Monitored
              </CardTitle>
              <Building2 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{uniqueIndustries}</div>
              <p className="text-xs text-slate-500 mt-1">Distinct sectors</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Watchlist Coverage
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {competitors.length > 0 ? "Good" : "No Records"}
              </div>
              <p className="text-xs text-slate-500 mt-1">Foundation ready</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid / List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-900">Watchlist Directory</CardTitle>
                <CardDescription>Select a competitor to inspect profile and strategic notes.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {competitors.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg p-6">
                    <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-900">No competitors tracked yet</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Add competitors to build your strategic watchlist and track market positioning.
                    </p>
                    <Button
                      onClick={() => {
                        resetForm();
                        setIsAddOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add first competitor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitors.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => setSelectedCompetitor(comp)}
                        className={`cursor-pointer rounded-lg border p-4 transition-all ${
                          selectedCompetitor?.id === comp.id
                            ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{comp.name}</h3>
                              <Badge
                                variant="outline"
                                className={comp.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]" : "border-slate-200 bg-slate-100 text-slate-600 text-[10px]"}
                              >
                                {comp.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              {comp.industry && <span>{comp.industry}</span>}
                              {comp.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {comp.location}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(comp.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Detail View */}
          <div>
            {selectedCompetitor ? (
              <Card className="border-slate-200 shadow-2xs bg-white sticky top-6">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">{selectedCompetitor.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(selectedCompetitor)}
                      >
                        <Edit2 className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this competitor?")) {
                            deleteMutation.mutate({ competitorId: selectedCompetitor.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {selectedCompetitor.industry || "General Industry"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  {selectedCompetitor.website && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <a
                        href={selectedCompetitor.website.startsWith("http") ? selectedCompetitor.website : `https://${selectedCompetitor.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {selectedCompetitor.website}
                      </a>
                    </div>
                  )}

                  {selectedCompetitor.location && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedCompetitor.location}</span>
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Strategic Notes</p>
                    <div className="rounded-md bg-slate-50 p-3 border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedCompetitor.notes || "No strategic observations recorded yet."}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Intelligence Status</p>
                    <div className="flex items-center justify-between rounded-md bg-slate-50 p-3 border border-slate-200">
                      <span className="text-xs font-medium text-slate-700">Future automation hook</span>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                        {selectedCompetitor.intelligenceStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
                    <span>Created: {new Date(selectedCompetitor.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(selectedCompetitor.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 shadow-2xs bg-slate-50/50">
                <CardContent className="py-12 text-center text-slate-500">
                  <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-medium">Select a competitor to view profile details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Add Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
              <DialogDescription>
                Add a competitor to your watchlist to track positioning and strategic observations.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                createMutation.mutate({
                  businessId,
                  name,
                  industry,
                  website,
                  location: compLocation,
                  notes,
                  status,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="comp-name">Competitor Name *</Label>
                <Input
                  id="comp-name"
                  placeholder="e.g. Acme Analytics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="comp-industry">Industry / Category</Label>
                  <Input
                    id="comp-industry"
                    placeholder="e.g. SaaS / BI"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-status">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="comp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="comp-website">Website</Label>
                  <Input
                    id="comp-website"
                    placeholder="e.g. competitor.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-location">Location</Label>
                  <Input
                    id="comp-location"
                    placeholder="e.g. San Francisco, CA"
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-notes">Strategic Observations & Notes</Label>
                <Textarea
                  id="comp-notes"
                  placeholder="e.g. Premium pricing, fast delivery, strong enterprise focus..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {createMutation.isPending ? "Adding..." : "Add Competitor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={!!editingCompetitor} onOpenChange={(open) => !open && setEditingCompetitor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Competitor</DialogTitle>
              <DialogDescription>
                Update watchlist information and strategic notes.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingCompetitor || !name.trim()) return;
                updateMutation.mutate({
                  competitorId: editingCompetitor.id,
                  data: {
                    name,
                    industry,
                    website,
                    location: compLocation,
                    notes,
                    status,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-comp-name">Competitor Name *</Label>
                <Input
                  id="edit-comp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-industry">Industry / Category</Label>
                  <Input
                    id="edit-comp-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-status">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="edit-comp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-website">Website</Label>
                  <Input
                    id="edit-comp-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-location">Location</Label>
                  <Input
                    id="edit-comp-location"
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-comp-notes">Strategic Observations & Notes</Label>
                <Textarea
                  id="edit-comp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCompetitor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
