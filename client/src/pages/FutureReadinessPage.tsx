import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  Compass, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  HelpCircle, 
  Activity, 
  ArrowUpRight,
  Filter,
  RefreshCw,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function FutureReadinessPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = parseInt(params.businessId || "1", 10);
  const [selectedHorizon, setSelectedHorizon] = useState<string>("ALL");

  const { data, isLoading, refetch, isRefetching } = trpc.businessMetrics.getFutureReadiness.useQuery({
    businessId,
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-96 bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
        <Skeleton className="h-96 w-full bg-zinc-800" />
      </div>
    );
  }

  const outlooks = data?.outlooks || [];
  const assessments = data?.assessments || [];

  const filteredOutlooks = outlooks.filter((o: any) => 
    selectedHorizon === "ALL" || o.timeHorizon === selectedHorizon
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-background min-h-screen text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Compass className="w-4 h-4" />
            Strategic Foresight & Future Readiness v2
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Future Outlook & Readiness Cockpit</h1>
          <p className="text-muted-foreground mt-1">
            Evidence-backed emerging foresight signals, possible future outlooks, time horizons, assumptions, and multi-dimensional business readiness gaps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Intelligence
          </Button>
          <Link href={`/command-center/${businessId}`}>
            <Button size="sm" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Command Center
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/60 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Future Outlooks</CardTitle>
            <Compass className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outlooks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked across time horizons</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Readiness Assessments</CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-dimensional preparedness</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Foresight Signals</CardTitle>
            <Activity className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.signalCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Emerging market data points</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Simulated Scenarios</CardTitle>
            <Layers className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.scenarioCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Connected alternative paths</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="outlooks" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="outlooks" className="gap-2">
              <Compass className="w-4 h-4" />
              Future Outlooks & Triggers
            </TabsTrigger>
            <TabsTrigger value="readiness" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Business Readiness & Gaps
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Time Horizon:</span>
            <div className="flex gap-1">
              {["ALL", "NEAR_TERM", "MID_TERM", "LONG_TERM"].map((horizon) => (
                <Button
                  key={horizon}
                  variant={selectedHorizon === horizon ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedHorizon(horizon)}
                  className="text-xs h-7 px-2.5"
                >
                  {horizon === "ALL" ? "All" : horizon.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Outlooks Tab */}
        <TabsContent value="outlooks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOutlooks.map((outlook: any) => (
              <Card key={outlook.id} className="bg-card border-border/80 flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                      {outlook.outlookType}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {outlook.timeHorizon.replace("_", " ")}
                      </Badge>
                      <Badge variant={outlook.uncertaintyLevel === "HIGH" ? "destructive" : "outline"} className="text-xs">
                        Uncertainty: {outlook.uncertaintyLevel}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-semibold tracking-tight">{outlook.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 leading-relaxed text-muted-foreground">
                    {outlook.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Assumptions with Provenance */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modeled Assumptions & Provenance</h4>
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/40">
                      {outlook.assumptions?.map((item: any, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-foreground/90">{item.assumption}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                            {item.provenance}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observable Triggers */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Leading Indicators & Triggers</h4>
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/40">
                      {outlook.triggers?.map((trig: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-medium text-foreground">{trig.indicator}:</span>{" "}
                            <span className="text-muted-foreground">{trig.observableCondition}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {trig.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Readiness Tab */}
        <TabsContent value="readiness" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assessments.map((assessment: any) => (
              <Card key={assessment.id} className="bg-card border-border/80 flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold">
                      Readiness: {assessment.overallReadiness.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">ID: #{assessment.id}</span>
                  </div>
                  <CardTitle className="text-xl font-semibold tracking-tight">{assessment.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Dimensions */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preparedness Dimensions</h4>
                    <div className="space-y-2">
                      {assessment.dimensions?.map((dim: any, i: number) => (
                        <div key={i} className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span>{dim.dimension}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Score: {dim.score}/5</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {dim.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{dim.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Readiness Gaps */}
                  {assessment.gaps && assessment.gaps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identified Gaps & Mitigations</h4>
                      <div className="space-y-2">
                        {assessment.gaps.map((gap: any, i: number) => (
                          <div key={i} className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                              <span>{gap.title}</span>
                              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                                {gap.severity} Severity
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{gap.description}</p>
                            <p className="text-xs font-medium text-foreground/90 mt-1">
                              <span className="text-primary">Mitigation:</span> {gap.recommendedMitigation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision & Action Implications */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                      <h5 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Decision Implications</h5>
                      <p className="text-xs text-foreground/90">{assessment.decisionImplications?.[0] || "None specified."}</p>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                      <h5 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Action Implications</h5>
                      <p className="text-xs text-foreground/90">{assessment.actionImplications?.[0] || "None specified."}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
