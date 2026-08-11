import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Database,
  LockKeyhole,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "wouter";

const principles = [
  {
    icon: BarChart3,
    title: "Decisions from your data",
    description:
      "See revenue, expenses, profit, customers, and transactions calculated from the records you provide.",
  },
  {
    icon: LockKeyhole,
    title: "Business-scoped by design",
    description:
      "Your workspace is isolated per business, with protected routes and server-side ownership checks.",
  },
  {
    icon: Sparkles,
    title: "AI-ready, not AI-theatre",
    description:
      "The product is prepared for adaptive intelligence while clearly separating live data, demo content, and future signals.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="BizPilot AI home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">BizPilot AI</span>
              <span className="block text-xs text-slate-500">Business intelligence, grounded</span>
            </span>
          </Link>
          <Button onClick={() => startLogin()} variant="outline" className="border-slate-300 bg-white">
            {isAuthenticated ? "Open workspace" : "Sign in"}
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Day 2: Business Data + Health Engine
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl">
              A clearer operating picture for your business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              BizPilot AI turns the business data you already have into a calm, useful command center. Start with honest metrics today; add adaptive intelligence as your data foundation grows.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button onClick={() => startLogin()} size="lg" className="bg-slate-950 px-6 text-white hover:bg-slate-800">
                {isAuthenticated ? "Continue to workspace" : "Create your workspace"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/auth">
                <Button variant="ghost" size="lg" className="text-slate-700">
                  See how it works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Demo states are labeled. External market signals are not presented as live until a source is connected.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-slate-200/50 blur-2xl" aria-hidden="true" />
            <Card className="relative overflow-hidden rounded-3xl border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Business briefing</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">A grounded view of today</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Preview</span>
                </div>
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-950 p-4 text-white">
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="mt-2 text-2xl font-semibold">₹—</p>
                    <p className="mt-1 text-xs text-slate-400">Connect data to calculate</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Health score</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">—</p>
                    <p className="mt-1 text-xs text-slate-500">Insufficient data</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Data status</p>
                      <p className="text-xs text-slate-500">No business data connected yet</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-1/4 rounded-full bg-slate-300" />
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Import a CSV when ready</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Map, validate, preview, and persist your records before they influence metrics.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Built for trust</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Useful before it is clever.</h2>
              <p className="mt-4 leading-7 text-slate-600">Every Day 1 metric is traceable to stored business records. Future recommendations will carry evidence, assumptions, confidence, and limitations instead of pretending certainty.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {principles.map((principle) => (
                <Card key={principle.title} className="rounded-2xl border-slate-200 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <principle.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-slate-900">{principle.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{principle.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span>BizPilot AI · Business data, clearly labeled.</span>
        <span>Live data, demo data, and future signals are kept distinct.</span>
      </footer>
    </div>
  );
}
