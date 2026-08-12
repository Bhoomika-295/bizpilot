import { createHash } from "node:crypto";
import {
  createDecisionEvent,
  getAllDecisionCandidates,
  getDecisionCandidateById,
  getDecisionCandidates,
  getDecisionEvents,
  getDecisionPriorities,
  getMarketSignals,
  getOpportunities,
  getScenarios,
  getStrategies,
  upsertDecisionCandidate,
  updateDecisionCandidateLifecycle,
  type DecisionCandidateWrite,
  type DecisionLifecycleStatus,
} from "../db";
import { calculateBusinessHealthScore, calculateBusinessMetrics, getDataFreshness } from "./businessMetricEngine";
import { getBusinessSituationTrends, type SituationTrendAnalysis } from "./situationTrendService";
import { evaluateCompetitorIntelligence, type CompetitorIntelligenceSummary } from "./competitiveIntelligenceService";

export const DECISION_CATEGORIES = ["RISK_RESPONSE", "GROWTH", "COST", "CUSTOMER", "COMPETITIVE", "OPERATIONS", "MARKET", "STRATEGY", "OTHER"] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];
export type DecisionPriority = "HIGH" | "MEDIUM" | "LOW";
export type DecisionUrgency = "NOW" | "SOON" | "MONITOR" | "NO URGENCY";
export type DecisionEvidenceStrength = "HIGH" | "MEDIUM" | "LIMITED";
export type DecisionReversibility = "REVERSIBLE" | "PARTIALLY REVERSIBLE" | "HARD TO REVERSE" | "UNKNOWN";
export type StrategicAlignment = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface EvidenceChainItem { type: string; id?: number; label: string; detail: string; }
export interface DecisionActionOption { label: string; rationale: string; reversible: DecisionReversibility; }
export interface DecisionCandidateView {
  id?: number; businessId: number; decisionKey: string; title: string; category: DecisionCategory;
  priority: DecisionPriority; priorityScore: number; urgency: DecisionUrgency; potentialImpact: "HIGH" | "MEDIUM" | "LOW";
  evidenceStrength: DecisionEvidenceStrength; confidence: "HIGH" | "MEDIUM" | "LIMITED"; sourceType: string;
  relatedSituationIds: number[]; relatedOpportunityIds: number[]; relatedCompetitorIds: number[]; relatedSignalIds: number[];
  relatedScenarioIds: number[]; relatedStrategyIds: number[]; evidenceChain: EvidenceChainItem[]; whyMatters: string;
  whatWeKnow: string[]; whatWeDontKnow: string[]; potentialConsequences: string; reversibility: DecisionReversibility;
  actionOptions: DecisionActionOption[]; recommendedNextStep?: string; recommendedNextStepReason?: string;
  strategicAlignment: StrategicAlignment; strategicAlignmentReason?: string; dependencyText?: string; conflictKeys: string[];
  status: DecisionLifecycleStatus; outcomeId?: number | null; sourceFingerprint: string; lastEvaluatedAt?: Date;
  expiresAt?: Date | null; createdAt?: Date; updatedAt?: Date;
}

export interface DecisionContext {
  businessId: number; situations: SituationTrendAnalysis[]; opportunities: any[]; competitors: CompetitorIntelligenceSummary[];
  marketSignals: any[]; scenarios: any[]; strategies: any[]; decisionPriorities: any[]; healthScore: any; freshness: any;
}
type Draft = Omit<DecisionCandidateView, "id" | "status" | "outcomeId" | "createdAt" | "updatedAt" | "lastEvaluatedAt" | "expiresAt" | "sourceFingerprint" | "priority" | "priorityScore"> & { priority: DecisionPriority; priorityScore: number; sourceFingerprint?: string };
const activeStatuses = new Set(["OPEN", "IN_REVIEW"]);

function parse<T>(value: string | null | undefined, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function has(value: string, words: string[]) { const lower = value.toLowerCase(); return words.some((word) => lower.includes(word)); }
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 64); }
function rank(value: string) { return value.toUpperCase() === "HIGH" || value.toUpperCase() === "CRITICAL" ? 3 : value.toUpperCase() === "MEDIUM" ? 2 : 1; }
function category(value: string): DecisionCategory {
  if (has(value, ["compet", "rival", "pricing pressure"])) return "COMPETITIVE";
  if (has(value, ["customer", "churn", "retention", "demand"])) return "CUSTOMER";
  if (has(value, ["cost", "expense", "margin"])) return "COST";
  if (has(value, ["growth", "revenue", "expansion", "opportunity"])) return "GROWTH";
  if (has(value, ["operation", "capacity", "production", "process"])) return "OPERATIONS";
  if (has(value, ["market", "industry", "signal"])) return "MARKET";
  if (has(value, ["strategy", "strategic"])) return "STRATEGY";
  return "RISK_RESPONSE";
}
function evidence(count: number, explicit = ""): DecisionEvidenceStrength {
  if (explicit.toUpperCase().includes("HIGH")) return "HIGH";
  if (explicit.toUpperCase().includes("LIMITED")) return "LIMITED";
  return count >= 3 ? "HIGH" : count > 0 ? "MEDIUM" : "LIMITED";
}
function urgency(trend = "", priority = "", impact = "", freshness = "", opportunityUrgency = "", count = 0): DecisionUrgency {
  const stale = freshness === "needs_refresh" || freshness === "no_data";
  if (["WORSENING", "RECURRING"].includes(trend.toUpperCase()) && priority.toUpperCase() === "HIGH" && !stale) return "NOW";
  if (opportunityUrgency.toUpperCase() === "HIGH" && impact.toUpperCase() === "HIGH" && !stale) return "SOON";
  if (["HIGH", "INCREASING", "NEW"].includes(priority.toUpperCase()) || ["INCREASING", "NEW"].includes(trend.toUpperCase())) return "SOON";
  if (impact.toUpperCase() === "HIGH" && count >= 2) return "SOON";
  if (priority.toUpperCase() === "LOW" && impact.toUpperCase() === "LOW") return "NO URGENCY";
  return "MONITOR";
}
function alignment(title: string, kind: string, strategies: any[]) {
  const active = strategies.filter((s) => s.status === "active" || s.status === "planning");
  if (!active.length) return { value: "UNKNOWN" as StrategicAlignment, reason: "No active or planned strategy is available for comparison." };
  const decision = `${title} ${kind}`.toLowerCase();
  const scored = active.map((s) => {
    const objective = text(s.objective, "Current strategy"); const strategy = `${objective} ${text(s.proposedActions)} ${text(s.risks)}`.toLowerCase();
    const overlap = ["growth", "cost", "marketing", "customer", "pricing", "capacity", "retention", "efficiency", "revenue"].filter((term) => decision.includes(term) && strategy.includes(term)).length;
    const conflict = (has(decision, ["increase", "expand", "invest", "grow"]) && has(strategy, ["reduce", "cut", "minimize"])) || (has(decision, ["reduce", "cut", "minimize"]) && has(strategy, ["increase", "expand", "invest"]));
    return { objective, overlap, conflict };
  }).sort((a, b) => Number(b.conflict) - Number(a.conflict) || b.overlap - a.overlap)[0];
  if (scored.conflict) return { value: "LOW" as StrategicAlignment, reason: `This may conflict with the current strategy objective: ${scored.objective}.` };
  if (scored.overlap) return { value: "HIGH" as StrategicAlignment, reason: `This is directly related to the current strategy objective: ${scored.objective}.` };
  return { value: "MEDIUM" as StrategicAlignment, reason: `The current strategy objective is ${scored.objective}; the relationship requires review.` };
}
function reversibility(value: string): DecisionReversibility {
  if (has(value, ["major expansion", "long-term commitment", "acquisition"])) return "HARD TO REVERSE";
  if (has(value, ["price", "pricing", "capacity", "hire", "investment", "spend"])) return "PARTIALLY REVERSIBLE";
  if (has(value, ["monitor", "investigate", "review", "test", "scenario"])) return "REVERSIBLE";
  return "UNKNOWN";
}
function conflictKeys(title: string) {
  const keys: string[] = []; if (has(title, ["marketing", "campaign", "acquisition"])) keys.push("marketing");
  if (has(title, ["pricing", "price"])) keys.push("pricing"); if (has(title, ["capacity", "production", "expansion"])) keys.push("capacity");
  if (has(title, ["cost", "expense", "spend", "efficiency"])) keys.push("cost"); return keys;
}
function finish(draft: Omit<Draft, "priority" | "priorityScore">, context: DecisionContext): Draft {
  const priorityBase = rank(draft.category === "RISK_RESPONSE" ? "HIGH" : draft.potentialImpact) * 20;
  const evidenceBonus = draft.evidenceStrength === "HIGH" ? 15 : draft.evidenceStrength === "MEDIUM" ? 8 : 0;
  const urgencyBonus = draft.urgency === "NOW" ? 15 : draft.urgency === "SOON" ? 10 : draft.urgency === "MONITOR" ? 5 : 0;
  const trendBonus = /WORSENING|RECURRING/.test(`${draft.whyMatters} ${draft.title}`) ? 12 : /INCREASING|NEW/.test(`${draft.whyMatters} ${draft.title}`) ? 8 : 0;
  const stalePenalty = context.freshness?.status === "needs_refresh" ? 5 : context.freshness?.status === "no_data" ? 10 : 0;
  const alignmentBonus = draft.strategicAlignment === "LOW" ? 4 : 0;
  const sourceId = draft.relatedSituationIds[0] || draft.relatedOpportunityIds[0] || draft.relatedSignalIds[0];
  const existingPriority = context.decisionPriorities.find((p) => p.sourceType === draft.sourceType && p.sourceId === sourceId);
  const priorityContextBonus = existingPriority ? Math.min(10, Math.round(Number(existingPriority.priorityScore || 0) / 10)) : 0;
  const score = Math.max(10, Math.min(100, priorityBase + evidenceBonus + urgencyBonus + trendBonus + alignmentBonus + priorityContextBonus - stalePenalty));
  const priority: DecisionPriority = score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
  const fingerprint = hash({ ...draft, score, priority });
  return { ...draft, priority, priorityScore: score, sourceFingerprint: fingerprint };
}
function ids(value: unknown) { return (Array.isArray(value) ? value : []).filter((v): v is number => typeof v === "number"); }
function options(labels: string[]): DecisionActionOption[] { return labels.map((label) => ({ label, rationale: "Validate the evidence before committing resources or changing live business data.", reversible: "REVERSIBLE" })); }

function situationDraft(s: SituationTrendAnalysis, c: DecisionContext): Draft | null {
  if (s.currentStatus === "RESOLVED" || !(s.currentPriority === "HIGH" || ["WORSENING", "NEW", "RECURRING"].includes(s.trendDirection))) return null;
  const kind = category(s.title); const e = evidence(s.timeline[0]?.supportingCount || 0); const a = alignment(s.title, kind, c.strategies);
  const title = `Review ${s.title.toLowerCase()}`;
  return finish({ businessId: c.businessId, decisionKey: `SITUATION:${s.situationId}`, title, category: kind, urgency: urgency(s.trendDirection, s.currentPriority, s.currentPriority, c.freshness?.status, "", s.timeline[0]?.supportingCount || 0), potentialImpact: s.currentPriority === "HIGH" || s.trendDirection === "WORSENING" ? "HIGH" : "MEDIUM", evidenceStrength: e, confidence: e === "HIGH" ? "HIGH" : e === "MEDIUM" ? "MEDIUM" : "LIMITED", sourceType: "SITUATION", relatedSituationIds: [s.situationId], relatedOpportunityIds: [], relatedCompetitorIds: [], relatedSignalIds: [], relatedScenarioIds: [], relatedStrategyIds: [], evidenceChain: [{ type: "SITUATION", id: s.situationId, label: s.title, detail: s.trendSummary }, { type: "SITUATION_TREND", label: "Trend direction", detail: `${s.trendDirection}; ${s.durationDays} days observed.` }], whyMatters: `${s.trendSummary} This ${s.currentPriority.toLowerCase()}-priority situation deserves a decision review.`, whatWeKnow: [s.trendSummary, `Current status: ${s.currentStatus}.`, `Current priority: ${s.currentPriority}.`], whatWeDontKnow: ["Whether the signals are causally related.", "Whether the pattern will persist beyond the current review period."], potentialConsequences: `If the pattern persists, ${s.title.toLowerCase()} may continue to constrain performance. The downstream consequence cannot be reliably estimated from current data.`, reversibility: reversibility(s.title), actionOptions: options(["Review the supporting evidence", "Run a related what-if scenario", "Monitor for another period"]), recommendedNextStep: e === "HIGH" ? "Review the supporting evidence before changing the current strategy." : undefined, recommendedNextStepReason: e === "HIGH" ? "Evidence is strong enough to justify review, but not to force an automatic action." : undefined, strategicAlignment: a.value, strategicAlignmentReason: a.reason, dependencyText: has(title, ["capacity", "expansion"]) ? "Validate demand before committing to capacity expansion." : undefined, conflictKeys: conflictKeys(title) }, c);
}
function opportunityDraft(o: any, c: DecisionContext): Draft | null {
  if (["DISMISSED", "EXPIRED", "PURSUED"].includes(o.status)) return null;
  const kind = category(`${o.title} ${o.category}`); const e = evidence(1, text(o.evidenceStrength)); const a = alignment(o.title, kind, c.strategies); const title = `Assess whether to pursue ${text(o.title, "this opportunity").toLowerCase()}`; const summary = text(o.summary, "An opportunity has been recorded for review.");
  return finish({ businessId: c.businessId, decisionKey: `OPPORTUNITY:${o.id}`, title, category: kind, urgency: urgency("", o.priority, o.potentialImpact, c.freshness?.status, o.urgency, 1), potentialImpact: ["HIGH", "MEDIUM", "LOW"].includes(o.potentialImpact) ? o.potentialImpact : "MEDIUM", evidenceStrength: e, confidence: e === "HIGH" ? "HIGH" : e === "MEDIUM" ? "MEDIUM" : "LIMITED", sourceType: "OPPORTUNITY", relatedSituationIds: ids(parse(o.supportingSituationsJson, [])), relatedOpportunityIds: [o.id], relatedCompetitorIds: [], relatedSignalIds: [], relatedScenarioIds: [], relatedStrategyIds: [], evidenceChain: [{ type: "OPPORTUNITY", id: o.id, label: o.title, detail: summary }, { type: "OPPORTUNITY_EVIDENCE", label: "Evidence strength", detail: text(o.evidenceStrength, "Recorded opportunity evidence") }], whyMatters: summary, whatWeKnow: [summary, `Opportunity priority is ${text(o.priority, "MEDIUM")}.`, `Potential impact is ${text(o.potentialImpact, "MEDIUM")}.`], whatWeDontKnow: ["Expected value cannot be quantified reliably from current data.", "Operational capacity and customer response remain uncertain."], potentialConsequences: "If the opportunity is not investigated, a potentially valuable path may remain untested. Its magnitude cannot be reliably estimated from current data.", reversibility: reversibility(o.title), actionOptions: options([text(o.potentialNextStep, "Investigate the opportunity drivers"), "Run a related scenario", "Monitor for another period"]), recommendedNextStep: e === "HIGH" ? text(o.potentialNextStep, "Review the opportunity evidence first.") : undefined, recommendedNextStepReason: e === "HIGH" ? "High-strength evidence supports review, but action remains a human decision." : undefined, strategicAlignment: a.value, strategicAlignmentReason: a.reason, dependencyText: has(o.title, ["capacity", "expansion"]) ? "Demand validation should be completed before capacity expansion." : undefined, conflictKeys: conflictKeys(title) }, c);
}
function competitorDraft(comp: CompetitorIntelligenceSummary, c: DecisionContext): Draft | null {
  if (comp.businessRelevance === "LOW" || comp.evidenceCount === 0) return null;
  const e = evidence(comp.evidenceCount, comp.businessRelevance === "HIGH" ? "HIGH" : "MEDIUM"); const title = `Review response to ${comp.competitorName} ${comp.primaryActivity.toLowerCase()} activity`; const a = alignment(title, "COMPETITIVE", c.strategies);
  return finish({ businessId: c.businessId, decisionKey: `COMPETITOR:${comp.competitorId}`, title, category: "COMPETITIVE", urgency: urgency(comp.trend, comp.businessRelevance, comp.businessRelevance, c.freshness?.status, "", comp.evidenceCount), potentialImpact: comp.businessRelevance === "HIGH" ? "HIGH" : "MEDIUM", evidenceStrength: e, confidence: e === "HIGH" ? "HIGH" : "MEDIUM", sourceType: "COMPETITOR", relatedSituationIds: [], relatedOpportunityIds: [], relatedCompetitorIds: [comp.competitorId], relatedSignalIds: [], relatedScenarioIds: [], relatedStrategyIds: [], evidenceChain: [{ type: "COMPETITOR", id: comp.competitorId, label: comp.competitorName, detail: `${comp.evidenceCount} tracked activities; ${comp.trend.toLowerCase()} trend.` }, ...comp.timeline.slice(0, 3).map((a) => ({ type: "COMPETITOR_ACTIVITY", id: a.id, label: a.title, detail: a.description }))], whyMatters: `${comp.whyItMatters} This activity is relevant enough to deserve review.`, whatWeKnow: [`${comp.competitorName} has ${comp.evidenceCount} tracked activities.`, `Primary activity: ${comp.primaryActivity.toLowerCase()}.`, `Activity trend: ${comp.trend.toLowerCase()}.`], whatWeDontKnow: ["Whether activity is causally related to customer behavior.", "The competitor's intended strategy.", "Customer price or offer sensitivity."], potentialConsequences: "If activity continues without review, competitive pressure may increase. The financial consequence cannot be reliably estimated from current data.", reversibility: reversibility(comp.primaryActivity), actionOptions: options(["Review competitor positioning", "Run a competitor scenario", "Monitor customer activity", "Maintain the current position"]), recommendedNextStep: e === "HIGH" ? "Review competitor positioning before changing your own pricing or offer." : undefined, recommendedNextStepReason: e === "HIGH" ? "Meaningful competitor activity is evidenced, but customer response remains uncertain." : undefined, strategicAlignment: a.value, strategicAlignmentReason: a.reason, conflictKeys: conflictKeys(title) }, c);
}
function marketDraft(signal: any, c: DecisionContext): Draft | null {
  const importance = Number(signal.importanceScore || 0); if (signal.relevanceLevel !== "HIGH" && importance < 4) return null;
  const title = `Investigate market signal: ${text(signal.title, "meaningful market change")}`; const kind = category(`${signal.title} ${signal.impactArea}`); const e = evidence(1, signal.relevanceLevel === "HIGH" ? "HIGH" : "MEDIUM"); const a = alignment(title, kind, c.strategies); const detail = text(signal.explanation || signal.snippet, "A meaningful market signal was recorded.");
  return finish({ businessId: c.businessId, decisionKey: `MARKET_SIGNAL:${signal.id}`, title, category: kind, urgency: urgency("", signal.relevanceLevel, importance >= 4 ? "HIGH" : "MEDIUM", c.freshness?.status, "", 1), potentialImpact: importance >= 4 ? "HIGH" : "MEDIUM", evidenceStrength: e, confidence: e === "HIGH" ? "HIGH" : "MEDIUM", sourceType: "MARKET_SIGNAL", relatedSituationIds: [], relatedOpportunityIds: [], relatedCompetitorIds: [], relatedSignalIds: [signal.id], relatedScenarioIds: [], relatedStrategyIds: [], evidenceChain: [{ type: "MARKET_SIGNAL", id: signal.id, label: signal.title, detail }, { type: "MARKET_SOURCE", label: "Source", detail: text(signal.source, "External market source") }], whyMatters: `${detail} Its ${text(signal.impactArea, "market").toLowerCase()} impact area makes it relevant for decision review.`, whatWeKnow: [detail, `Relevance: ${text(signal.relevanceLevel, "LOW")}.`, `Importance score: ${importance || "not scored"}.`], whatWeDontKnow: ["Whether the signal will persist.", "How directly it will affect this business.", "Whether it is causally related to internal changes."], potentialConsequences: "If the signal persists and is not investigated, a relevant market change may be missed. Its magnitude cannot be reliably estimated from current data.", reversibility: "REVERSIBLE", actionOptions: options(["Review the source and relevance", "Run a related scenario", "Monitor for corroboration"]), recommendedNextStep: e === "HIGH" ? "Review the market source and business relevance before changing the current plan." : undefined, recommendedNextStepReason: e === "HIGH" ? "The signal is highly relevant, but persistence and impact remain uncertain." : undefined, strategicAlignment: a.value, strategicAlignmentReason: a.reason, conflictKeys: conflictKeys(title) }, c);
}
function scenarioDraft(s: any, c: DecisionContext): Draft | null {
  if (s.status === "ARCHIVED") return null; const title = `Review scenario implication: ${text(s.title, "saved scenario")}`; const kind = category(`${s.title} ${s.scenarioType}`); const e = evidence(1, text(s.evidenceQuality)); const a = alignment(title, kind, c.strategies); const detail = text(s.description, `A ${text(s.scenarioType, "CUSTOM").toLowerCase()} scenario has been saved for review.`);
  return finish({ businessId: c.businessId, decisionKey: `SCENARIO:${s.id}`, title, category: kind, urgency: "MONITOR", potentialImpact: e === "HIGH" ? "HIGH" : "MEDIUM", evidenceStrength: e, confidence: e === "HIGH" ? "HIGH" : e === "MEDIUM" ? "MEDIUM" : "LIMITED", sourceType: "SCENARIO", relatedSituationIds: ids(parse(s.affectedSituationsJson, [])), relatedOpportunityIds: [], relatedCompetitorIds: [], relatedSignalIds: [], relatedScenarioIds: [s.id], relatedStrategyIds: [], evidenceChain: [{ type: "SCENARIO", id: s.id, label: s.title, detail }, { type: "SCENARIO_EVIDENCE", label: "Evidence quality", detail: text(s.evidenceQuality, "MEDIUM EVIDENCE") }], whyMatters: `${detail} It provides a controlled way to explore implications before deciding whether to act.`, whatWeKnow: [detail, `Scenario type: ${text(s.scenarioType, "CUSTOM")}.`, `Evidence quality: ${text(s.evidenceQuality, "MEDIUM EVIDENCE")}.`], whatWeDontKnow: ["Whether assumptions will hold.", "Whether modeled implications will occur.", "The operational response required."], potentialConsequences: "Ignoring the scenario leaves its assumptions unreviewed; a reliable quantitative consequence cannot be estimated from the scenario alone.", reversibility: "REVERSIBLE", actionOptions: options(["Review baseline versus scenario", "Test the scenario assumptions", "Keep the scenario for monitoring"]), recommendedNextStep: "Review scenario assumptions before deciding whether to act.", recommendedNextStepReason: "Scenario analysis is decision support and does not establish that it will occur.", strategicAlignment: a.value, strategicAlignmentReason: a.reason, conflictKeys: conflictKeys(title) }, c);
}

export function generateDecisionCandidates(c: DecisionContext): Draft[] {
  const drafts: Draft[] = [];
  c.situations.forEach((s) => { const d = situationDraft(s, c); if (d) drafts.push(d); });
  c.opportunities.forEach((o) => { const d = opportunityDraft(o, c); if (d) drafts.push(d); });
  c.competitors.forEach((x) => { const d = competitorDraft(x, c); if (d) drafts.push(d); });
  c.marketSignals.slice(0, 8).forEach((s) => { const d = marketDraft(s, c); if (d) drafts.push(d); });
  c.scenarios.filter((s) => s.status === "ACTIVE").slice(0, 3).forEach((s) => { const d = scenarioDraft(s, c); if (d) drafts.push(d); });
  const unique = Array.from(new Map(drafts.map((d) => [d.decisionKey, d])).values());
  for (let i = 0; i < unique.length; i += 1) for (let j = i + 1; j < unique.length; j += 1) {
    const a = unique[i]; const b = unique[j]; const shared = a.conflictKeys.filter((key) => b.conflictKeys.includes(key));
    if (shared.length && ((has(a.title, ["increase", "expand", "invest", "pursue"]) && has(b.title, ["reduce", "cut", "maintain", "defer"])) || (has(b.title, ["increase", "expand", "invest", "pursue"]) && has(a.title, ["reduce", "cut", "maintain", "defer"])))) { a.conflictKeys.push(`CONFLICT:${shared.join(",")}`); b.conflictKeys.push(`CONFLICT:${shared.join(",")}`); }
  }
  return unique.sort((a, b) => b.priorityScore - a.priorityScore || a.decisionKey.localeCompare(b.decisionKey));
}

function toWrite(d: Draft): DecisionCandidateWrite {
  return { businessId: d.businessId, decisionKey: d.decisionKey, title: d.title, category: d.category, priority: d.priority, priorityScore: d.priorityScore, urgency: d.urgency, potentialImpact: d.potentialImpact, evidenceStrength: d.evidenceStrength, confidence: d.confidence, sourceType: d.sourceType, relatedSituationIdsJson: JSON.stringify(d.relatedSituationIds), relatedOpportunityIdsJson: JSON.stringify(d.relatedOpportunityIds), relatedCompetitorIdsJson: JSON.stringify(d.relatedCompetitorIds), relatedSignalIdsJson: JSON.stringify(d.relatedSignalIds), relatedScenarioIdsJson: JSON.stringify(d.relatedScenarioIds), relatedStrategyIdsJson: JSON.stringify(d.relatedStrategyIds), evidenceChainJson: JSON.stringify(d.evidenceChain), whyMatters: d.whyMatters, whatWeKnowJson: JSON.stringify(d.whatWeKnow), whatWeDontKnowJson: JSON.stringify(d.whatWeDontKnow), potentialConsequences: d.potentialConsequences, reversibility: d.reversibility, actionOptionsJson: JSON.stringify(d.actionOptions), recommendedNextStep: d.recommendedNextStep || null, recommendedNextStepReason: d.recommendedNextStepReason || null, strategicAlignment: d.strategicAlignment, strategicAlignmentReason: d.strategicAlignmentReason || null, dependencyText: d.dependencyText || null, conflictKeysJson: JSON.stringify(d.conflictKeys), status: "OPEN", outcomeId: null, sourceFingerprint: d.sourceFingerprint || hash(d), lastEvaluatedAt: new Date(), expiresAt: null } as DecisionCandidateWrite;
}
function view(row: any): DecisionCandidateView { return { id: row.id, businessId: row.businessId, decisionKey: row.decisionKey, title: row.title, category: row.category, priority: row.priority, priorityScore: row.priorityScore, urgency: row.urgency, potentialImpact: row.potentialImpact, evidenceStrength: row.evidenceStrength, confidence: row.confidence, sourceType: row.sourceType, relatedSituationIds: parse(row.relatedSituationIdsJson, []), relatedOpportunityIds: parse(row.relatedOpportunityIdsJson, []), relatedCompetitorIds: parse(row.relatedCompetitorIdsJson, []), relatedSignalIds: parse(row.relatedSignalIdsJson, []), relatedScenarioIds: parse(row.relatedScenarioIdsJson, []), relatedStrategyIds: parse(row.relatedStrategyIdsJson, []), evidenceChain: parse(row.evidenceChainJson, []), whyMatters: row.whyMatters, whatWeKnow: parse(row.whatWeKnowJson, []), whatWeDontKnow: parse(row.whatWeDontKnowJson, []), potentialConsequences: row.potentialConsequences, reversibility: row.reversibility, actionOptions: parse(row.actionOptionsJson, []), recommendedNextStep: row.recommendedNextStep || undefined, recommendedNextStepReason: row.recommendedNextStepReason || undefined, strategicAlignment: row.strategicAlignment, strategicAlignmentReason: row.strategicAlignmentReason || undefined, dependencyText: row.dependencyText || undefined, conflictKeys: parse(row.conflictKeysJson, []), status: row.status, outcomeId: row.outcomeId, sourceFingerprint: row.sourceFingerprint, lastEvaluatedAt: row.lastEvaluatedAt, expiresAt: row.expiresAt, createdAt: row.createdAt, updatedAt: row.updatedAt }; }

export async function loadDecisionContext(businessId: number, start = new Date(Date.now() - 30 * 86400000), end = new Date()): Promise<DecisionContext> {
  const [situations, opportunities, competitors, marketSignals, scenarios, strategies, decisionPriorities, healthScore, freshness] = await Promise.all([getBusinessSituationTrends(businessId), getOpportunities(businessId), evaluateCompetitorIntelligence(businessId), getMarketSignals(businessId), getScenarios(businessId), getStrategies(businessId), getDecisionPriorities(businessId, 20), calculateBusinessHealthScore(businessId, start, end), getDataFreshness(businessId)]);
  return { businessId, situations, opportunities, competitors, marketSignals, scenarios, strategies, decisionPriorities, healthScore, freshness };
}

export async function refreshDecisionCandidates(businessId: number, start?: Date, end?: Date) {
  const context = await loadDecisionContext(businessId, start, end); const drafts = generateDecisionCandidates(context); const keys = new Set(drafts.map((d) => d.decisionKey)); let createdCount = 0; let changedCount = 0;
  for (const draft of drafts) { const result = await upsertDecisionCandidate(toWrite(draft)); if (!result.id) continue; if (result.created) { createdCount += 1; await createDecisionEvent({ businessId, decisionId: result.id, eventType: "DETECTED", newStatus: "OPEN", detailsJson: JSON.stringify({ decisionKey: draft.decisionKey, sourceType: draft.sourceType }) }); } else if (result.changed) { changedCount += 1; await createDecisionEvent({ businessId, decisionId: result.id, eventType: "EVIDENCE_CHANGED", previousStatus: result.previous?.status, newStatus: result.previous?.status, detailsJson: JSON.stringify({ sourceFingerprint: draft.sourceFingerprint }) }); } }
  const existing = await getAllDecisionCandidates(businessId); if (keys.size) for (const row of existing) if (!keys.has(row.decisionKey) && activeStatuses.has(row.status) && row.lastEvaluatedAt && Date.now() - new Date(row.lastEvaluatedAt).getTime() > 30 * 86400000) await updateDecisionCandidateLifecycle(businessId, row.id, "EXPIRED", row.outcomeId, JSON.stringify({ reason: "No longer supported by current verified intelligence." }));
  const decisions = (await getDecisionCandidates(businessId, 7)).map(view);
  return { decisions, generatedCount: drafts.length, createdCount, changedCount, message: !drafts.length ? "No decision candidate is currently supported by meaningful verified intelligence." : !createdCount && !changedCount ? "Decision priorities remain unchanged." : "Decision queue refreshed from current verified intelligence.", refreshedAt: new Date() };
}
export async function getDecisionQueue(businessId: number, limit = 7) { return (await getDecisionCandidates(businessId, Math.min(Math.max(limit, 1), 7))).map(view); }
export async function getDecisionDetail(businessId: number, decisionId: number) { const row = await getDecisionCandidateById(businessId, decisionId); return row ? { decision: view(row), events: await getDecisionEvents(businessId, decisionId, 50) } : null; }
export function canTransitionDecision(current: DecisionLifecycleStatus, next: DecisionLifecycleStatus) { const allowed: Record<DecisionLifecycleStatus, DecisionLifecycleStatus[]> = { OPEN: ["IN_REVIEW", "DEFERRED", "DISMISSED", "EXPIRED"], IN_REVIEW: ["DECIDED", "DEFERRED", "DISMISSED", "EXPIRED"], DECIDED: [], DEFERRED: ["OPEN", "IN_REVIEW", "DISMISSED", "EXPIRED"], DISMISSED: ["OPEN"], EXPIRED: ["OPEN"] }; return current === next || allowed[current].includes(next); }
export async function updateDecisionLifecycle(businessId: number, decisionId: number, status: DecisionLifecycleStatus, details?: string) { const existing = await getDecisionCandidateById(businessId, decisionId); if (!existing) return null; if (!canTransitionDecision(existing.status as DecisionLifecycleStatus, status)) throw new Error(`Invalid decision lifecycle transition from ${existing.status} to ${status}.`); const row = await updateDecisionCandidateLifecycle(businessId, decisionId, status, undefined, details); return row ? view(row) : null; }
export async function linkDecisionOutcome(businessId: number, decisionId: number, outcomeId: number) { const existing = await getDecisionCandidateById(businessId, decisionId); if (!existing) return null; const row = await updateDecisionCandidateLifecycle(businessId, decisionId, existing.status as DecisionLifecycleStatus, outcomeId, JSON.stringify({ outcomeId, linked: true })); if (row && existing.outcomeId !== outcomeId) await createDecisionEvent({ businessId, decisionId, eventType: "OUTCOME_LINKED", previousStatus: existing.status, newStatus: existing.status, detailsJson: JSON.stringify({ outcomeId }) }); return row ? view(row) : null; }
export async function getDecisionHistory(businessId: number, decisionId: number, limit = 50) { const row = await getDecisionCandidateById(businessId, decisionId); return row ? { decision: view(row), events: await getDecisionEvents(businessId, decisionId, limit) } : null; }
