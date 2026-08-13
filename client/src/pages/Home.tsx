import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Layers,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const trustPoints = [
  { label: "Traceable", desc: "Every metric links directly to source records." },
  { label: "Business-scoped", desc: "Strict tenant isolation per business entity." },
  { label: "Grounded", desc: "Honest metrics without algorithmic invention." },
  { label: "Adaptable", desc: "Grows from raw transactions to advanced intelligence." },
];

const pillars = [
  {
    num: "01",
    title: "SEE",
    desc: "Understand performance, financials, customer health, and demand signals calculated directly from your records.",
  },
  {
    num: "02",
    title: "UNDERSTAND",
    desc: "Connect changes with empirical risks, opportunities, trends, and historical business context.",
  },
  {
    num: "03",
    title: "DECIDE",
    desc: "Evaluate trade-offs, structured options, and strategic implications before taking action.",
  },
  {
    num: "04",
    title: "LEARN",
    desc: "Track actions, execution health, observed outcomes, and validated lessons over time.",
  },
];

const architectureSteps = [
  { step: "DATA", desc: "Transactions, expenses, customers, products" },
  { step: "SIGNALS", desc: "Empirical trends, anomalies, and velocity" },
  { step: "SITUATIONS", desc: "Contextualized business movements" },
  { step: "RISKS & OPPORTUNITIES", desc: "Exposures, validation, and actionability" },
  { step: "DECISIONS", desc: "Structured trade-offs and confidence" },
  { step: "ACTIONS", desc: "Assigned owners and execution tracking" },
  { step: "OUTCOMES", desc: "Expected vs observed result propagation" },
];

const intelligenceAreas = [
  {
    title: "Business Performance",
    desc: "Explainable KPI health, target evaluation, and deterministic performance driver ranking.",
  },
  {
    title: "Financial Intelligence",
    desc: "Empirical financial health, margin analysis, cash pressure detection, and profitability drivers.",
  },
  {
    title: "Customer Intelligence",
    desc: "Retention, churn, purchase frequency, value distribution, and support pressure tracking.",
  },
  {
    title: "Risk & Opportunity",
    desc: "Likelihood, impact, exposure, evolution lifecycles, and actionable opportunity validation.",
  },
  {
    title: "Strategy",
    desc: "Adaptive strategy alignment, assumption health, drift detection, and versioned evolution.",
  },
  {
    title: "Decision Intelligence",
    desc: "Structured decision quality, multi-dimensional confidence, and complete follow-through chains.",
  },
  {
    title: "Execution",
    desc: "Real-time execution status, blocker detection, ownership accountability, and overdue tracking.",
  },
  {
    title: "Business Memory",
    desc: "Organizational learning, pattern intelligence, historical context search, and validated lessons.",
  },
];

const trustFeatures = [
  { title: "Tenant isolation", desc: "Strict database scoping ensures your business data remains completely private." },
  { title: "Evidence traceability", desc: "All insights cite underlying transactions, expenses, and records." },
  { title: "Grounded metrics", desc: "No fabricated values; calculations reflect real connected data." },
  { title: "Data freshness", desc: "Real-time freshness indicators show when records were last ingested." },
  { title: "No fabricated facts", desc: "Uncertain or missing data is transparently flagged as unknown." },
  { title: "Secure architecture", desc: "Enterprise-grade session management, TLS, and audit logging." },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#faf9f5] text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-[#faf9f5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="BizPilot home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-900">BizPilot</span>
              <span className="block text-xs text-slate-500">Business intelligence, grounded</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#product" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-block">
              Product
            </a>
            <a href="#architecture" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-block">
              Architecture
            </a>
            <a href="#trust" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-block">
              Security
            </a>
            <Button
              onClick={() => startLogin()}
              className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-transform active:scale-[0.97]"
            >
              {isAuthenticated ? "Open workspace" : "Sign in"}
            </Button>
          </div>
        </div>
      </header>

      <main className="overflow-hidden">
        {/* HERO SECTION */}
        <section className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pb-36 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              Advanced Executive Intelligence v2
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-6xl lg:text-7xl">
              A clearer operating picture for your business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              BizPilot turns the business data you already have into a calm, editorial command center. Honest metrics, grounded intelligence, and complete traceability without AI theatre.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                onClick={() => startLogin()}
                size="lg"
                className="bg-slate-900 px-7 py-6 text-base font-medium text-white hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-transform active:scale-[0.97]"
              >
                {isAuthenticated ? "Continue to workspace" : "Create your workspace"}
                <ArrowRight className="ml-2.5 h-4 w-4" />
              </Button>
              <a href="#product">
                <Button variant="outline" size="lg" className="border-slate-300 bg-white/80 px-6 py-6 text-base text-slate-700 hover:bg-slate-100">
                  See product tour
                </Button>
              </a>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Illustrative preview workspace. Strict tenant isolation. No artificial data fabrication.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-amber-100/40 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl shadow-slate-900/20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-400">Illustrative workspace</p>
                  <p className="mt-1 text-lg font-semibold text-white">Morning Business View</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 border border-slate-700">Preview</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Monthly Revenue</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">₹14,85,000</p>
                    <p className="mt-1 text-xs text-emerald-400 font-medium">+12.4% vs last month</p>
                  </div>
                  <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Health Score</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">88 / 100</p>
                    <p className="mt-1 text-xs text-amber-300 font-medium">Stable operating state</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-800/60 p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Top Priority Focus</span>
                    <span className="text-amber-400">High Urgency</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">Optimize working capital runway and resolve logistics bottleneck.</p>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Active Decision Chain</span>
                    <span>Verified Evidence</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    Situation → Driver Analysis → Risk Exposure → Board Decision → Assigned Execution → Outcome Learning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-slate-200/80 bg-white py-10" id="trust">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Built for business clarity
            </p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((tp) => (
                <div key={tp.label} className="text-center sm:text-left">
                  <p className="text-base font-semibold text-slate-900">{tp.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{tp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — WHAT BIZPILOT ACTUALLY DOES */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Core Methodology</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              From business data to decisions you can defend.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              BizPilot is engineered for executives who demand rigorous evidence, transparent unknown states, and verifiable accountability.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <Card key={p.num} className="rounded-3xl border-slate-200/80 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <span className="text-xs font-semibold tracking-widest text-amber-700">{p.num}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 4 — PRODUCT SHOWCASE */}
        <section className="border-y border-slate-200/80 bg-white py-24 lg:py-32" id="product">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Enterprise SaaS Architecture</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                The BizPilot Command Center
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                A unified operating environment built for executive synthesis. Every metric, risk, and priority in a single, grounded view.
              </p>
            </div>

            <div className="mt-16 rounded-3xl border border-slate-200 bg-slate-950 p-8 shadow-2xl lg:p-12 text-white">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 pb-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-amber-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Illustrative Executive Dashboard
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">Executive Command Center</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Tenant Isolated</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Evidence Verified</span>
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Financial Health</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">92 / 100</p>
                  <p className="mt-2 text-xs text-emerald-400 font-medium">Strong operating cash flow & margins</p>
                </div>
                <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Risks</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-400">2 Mitigated</p>
                  <p className="mt-2 text-xs text-slate-400">Zero unmitigated critical exposures</p>
                </div>
                <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Execution Velocity</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">94% On Track</p>
                  <p className="mt-2 text-xs text-emerald-400 font-medium">Zero overdue blockers</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-900 p-6 border border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Cross-Domain Intelligence Summary</p>
                  <span className="text-xs text-slate-400">Synced across 11 intelligence engines</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800/80">
                    <p className="text-slate-400 font-medium">Customer Watch</p>
                    <p className="mt-1 text-white font-semibold">Retention stable at 94.2%</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800/80">
                    <p className="text-slate-400 font-medium">Demand Pressure</p>
                    <p className="mt-1 text-white font-semibold">Enterprise tier accelerating</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800/80">
                    <p className="text-slate-400 font-medium">Strategy Health</p>
                    <p className="mt-1 text-white font-semibold">Assumptions holding firm</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800/80">
                    <p className="text-slate-400 font-medium">Business Memory</p>
                    <p className="mt-1 text-white font-semibold">3 validated lessons applied</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — HOW BIZPILOT THINKS */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32" id="architecture">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Core Architecture</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              How BizPilot thinks.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              A rigorous, deterministic intelligence pipeline that translates raw business records into defensible executive decisions.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {architectureSteps.map((s, idx) => (
              <div key={s.step} className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700 tracking-wider">0{idx + 1}</span>
                  <h3 className="mt-2 text-sm font-semibold tracking-tight text-slate-900">{s.step}</h3>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6 — INTELLIGENCE AREAS */}
        <section className="border-y border-slate-200/80 bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Comprehensive Coverage</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Eight specialized intelligence domains.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Designed to cover every dimension of modern business operations without gaps or AI fabrication.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {intelligenceAreas.map((area) => (
                <Card key={area.title} className="rounded-3xl border-slate-200/80 bg-[#faf9f5] p-6 shadow-none">
                  <CardContent className="p-0">
                    <h3 className="text-base font-semibold text-slate-900">{area.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{area.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7 — EXECUTIVE VIEW */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Executive Command</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Know what deserves your attention.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                The Executive Command Center synthesizes what changed, why it matters, what risks are emerging, and which decision requires your approval right now.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-amber-700 flex-shrink-0" />
                  <p className="text-sm text-slate-700"><strong>Why Now priorities</strong> ranked by actual business impact and evidence strength.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-amber-700 flex-shrink-0" />
                  <p className="text-sm text-slate-700"><strong>Root-cause traceability</strong> connecting high-level alerts directly to source records.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-amber-700 flex-shrink-0" />
                  <p className="text-sm text-slate-700"><strong>Human-in-the-loop decisions</strong> with structured trade-offs and confidence scores.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-400">Executive Briefing</p>
                  <p className="mt-1 text-lg font-semibold text-white">Priority Orchestration</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 border border-slate-700">Active</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-800/80 p-5 border border-slate-700/50">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Top Priority 01</span>
                    <span className="text-amber-400">Action Required</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Approve working capital reallocation for Q3 inventory expansion.</p>
                  <p className="mt-1.5 text-xs text-slate-300">Evidence: Cash flow buffer exceeds threshold; demand trend accelerating by 14%.</p>
                </div>
                <div className="rounded-2xl bg-slate-800/80 p-5 border border-slate-700/50">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Risk Exposure Watch</span>
                    <span className="text-emerald-400">Mitigated</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Vendor concentration risk evaluated and contingency supplier onboarded.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8 — BUILT FOR TRUST */}
        <section className="border-y border-slate-200/80 bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Enterprise Security & Compliance</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Built for absolute trust.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                We believe business intelligence must be completely transparent, secure, and verifiable.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trustFeatures.map((tf) => (
                <div key={tf.title} className="rounded-3xl border border-slate-200/80 bg-[#faf9f5] p-8">
                  <h3 className="text-base font-semibold text-slate-900">{tf.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{tf.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9 — FINAL CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-36 text-center">
          <div className="mx-auto max-w-3xl rounded-3xl bg-slate-950 px-8 py-20 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true" />
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Start with your data.<br />Build on trust.
            </h2>
            <p className="mt-6 text-lg text-slate-300 max-w-xl mx-auto">
              Connect the business data you already have and build a clearer operating picture over time.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                onClick={() => startLogin()}
                size="lg"
                className="bg-white px-8 py-6 text-base font-medium text-slate-950 hover:bg-slate-100 shadow-lg"
              >
                {isAuthenticated ? "Continue to workspace" : "Create your workspace"}
                <ArrowRight className="ml-2.5 h-4 w-4" />
              </Button>
              <a href="#product">
                <Button variant="outline" size="lg" className="border-slate-700 bg-transparent px-8 py-6 text-base text-white hover:bg-slate-900">
                  See how it works
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="block text-base font-semibold tracking-tight text-slate-900">BizPilot</span>
            <span className="mt-1 block text-sm text-slate-500">Business intelligence, grounded.</span>
            <p className="mt-4 text-xs text-slate-500">
              Strict tenant isolation. Live data, demo data, and future signals are kept strictly distinct.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li><a href="#product" className="hover:text-slate-900">Why BizPilot</a></li>
              <li><a href="#architecture" className="hover:text-slate-900">How it works</a></li>
              <li><a href="#trust" className="hover:text-slate-900">Security</a></li>
              <li><Link href="/auth" className="hover:text-slate-900">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">Resources</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li><a href="#trust" className="hover:text-slate-900">Documentation</a></li>
              <li><a href="#trust" className="hover:text-slate-900">Help center</a></li>
              <li><a href="#trust" className="hover:text-slate-900">Contact executive support</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">Compliance</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li><a href="#trust" className="hover:text-slate-900">Tenant Isolation</a></li>
              <li><a href="#trust" className="hover:text-slate-900">Evidence Traceability</a></li>
              <li><a href="#trust" className="hover:text-slate-900">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-slate-100 px-6 pt-8 text-xs text-slate-400 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} BizPilot. All rights reserved.</span>
          <span>Enterprise Business Intelligence v2</span>
        </div>
      </footer>
    </div>
  );
}
