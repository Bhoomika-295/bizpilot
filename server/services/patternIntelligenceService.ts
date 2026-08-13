import {
  getPatternIntelligenceForBusiness,
  upsertPatternIntelligence,
  getBusinessMemoriesForBusiness,
} from "../db";

export interface PatternPayload {
  id: number;
  businessId: number;
  patternType: string;
  title: string;
  description: string;
  occurrences: number;
  firstDetected: Date;
  lastDetected: Date;
  typicalResponse: string | null;
  historicalOutcome: string;
  confidence: string;
  patternState: string;
  currentRelevance: string;
  lessonsLearned: string | null;
  evidenceJson: string | null;
  conditionPathJson: string | null;
  status: string;
}

function parseContext(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function outcomeLabel(value: unknown): "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "UNKNOWN" {
  const text = String(value || "").toLowerCase();
  if (!text) return "UNKNOWN";
  if (["positive", "improve", "improved", "success", "stabilized", "favorable", "increase"].some((term) => text.includes(term))) return "POSITIVE";
  if (["negative", "declin", "failure", "delay", "pressure", "weaken", "ineffective", "decrease"].some((term) => text.includes(term))) return "NEGATIVE";
  if (["neutral", "mixed", "unchanged"].some((term) => text.includes(term))) return "NEUTRAL";
  return "UNKNOWN";
}

function currentRelevanceFor(lastDetected: Date) {
  const ageDays = Math.max(0, Math.round((Date.now() - new Date(lastDetected).getTime()) / 86_400_000));
  return ageDays <= 90 ? "HIGH" : ageDays <= 365 ? "MEDIUM" : "LOW";
}

function buildConditionPath(items: any[]) {
  const conditions = Array.from(new Set(items.flatMap((item) => {
    const context = parseContext(item.contextJson);
    const condition = context.condition || context.conditions || context.category || context.situation;
    return Array.isArray(condition) ? condition.map(String) : condition ? [String(condition)] : [];
  })));
  const decisions = Array.from(new Set(items.flatMap((item) => {
    const context = parseContext(item.contextJson);
    return context.decision || context.decisionId ? [String(context.decision || `Decision #${context.decisionId}`)] : item.memoryType === "DECISION" ? [item.title] : [];
  })));
  const actions = Array.from(new Set(items.flatMap((item) => {
    const context = parseContext(item.contextJson);
    return context.action || context.actionPlanId ? [String(context.action || `Action #${context.actionPlanId}`)] : item.memoryType === "ACTION" ? [item.title] : [];
  })));
  const outcomes = Array.from(new Set(items.flatMap((item) => {
    const context = parseContext(item.contextJson);
    return context.outcome || context.actualOutcome ? [String(context.outcome || context.actualOutcome)] : [];
  })));
  return { conditions, decisions, actions, outcomes };
}

/**
 * Scan business history and memories to detect recurring condition → decision → action → outcome patterns.
 * Repeated observations are promoted without claiming unsupported causality.
 */
export async function detectAndUpsertPatterns(businessId: number): Promise<PatternPayload[]> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 200);
  const grouped: Record<string, typeof memories> = {};
  for (const memory of memories) {
    if (!["SITUATION", "DECISION", "STRATEGY", "ACTION", "OUTCOME", "LESSON", "PATTERN"].includes(String(memory.memoryType))) continue;
    const key = memory.title.trim().toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(memory);
  }

  for (const [key, items] of Object.entries(grouped)) {
    if (items.length < 2) continue;
    const ordered = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const occurrences = items.length;
    const outcomes = items.map((item) => outcomeLabel(parseContext(item.contextJson).outcome || parseContext(item.contextJson).actualOutcome));
    const knownOutcomes = outcomes.filter((outcome) => outcome !== "UNKNOWN");
    const hasPositive = knownOutcomes.includes("POSITIVE");
    const hasNegative = knownOutcomes.includes("NEGATIVE");
    const historicalOutcome = hasPositive && hasNegative ? "MIXED" : hasPositive ? "POSITIVE" : hasNegative ? "NEGATIVE" : "UNKNOWN";
    const patternState = hasPositive && hasNegative ? "CONTRADICTED" : occurrences >= 3 ? "STRONG PATTERN" : "REPEATED";
    const confidence = patternState === "STRONG PATTERN" ? "HIGH" : patternState === "CONTRADICTED" ? "LOW" : "MEDIUM";
    const conditionPath = buildConditionPath(items);
    const supportingEvidence = items.filter((item) => outcomeLabel(parseContext(item.contextJson).outcome || parseContext(item.contextJson).actualOutcome) !== "NEGATIVE").map((item) => item.id);
    const contradictingEvidence = items.filter((item) => outcomeLabel(parseContext(item.contextJson).outcome || parseContext(item.contextJson).actualOutcome) === "NEGATIVE").map((item) => item.id);
    const lesson = patternState === "CONTRADICTED"
      ? "The repeated situation has mixed observed outcomes. Review the conditions before treating any response as generally effective."
      : historicalOutcome === "POSITIVE"
        ? "The repeated situation has been associated with favorable recorded outcomes under the observed conditions; causation is not established."
        : historicalOutcome === "NEGATIVE"
          ? "The repeated situation has been associated with pressured recorded outcomes under the observed conditions; causation is not established."
          : "The repeated situation is supported by multiple records, but outcome evidence remains limited.";

    await upsertPatternIntelligence({
      businessId,
      patternType: "RECURRING_SITUATION",
      title: last.title,
      description: `Observed ${occurrences} times between ${new Date(first.createdAt).toLocaleDateString()} and ${new Date(last.createdAt).toLocaleDateString()}. This is a recurring association, not an unsupported causal claim.`,
      occurrences,
      firstDetected: new Date(first.createdAt),
      lastDetected: new Date(last.createdAt),
      typicalResponse: "Review the current conditions and compare the linked decision, action, and outcome evidence.",
      historicalOutcome,
      confidence,
      currentRelevance: currentRelevanceFor(new Date(last.createdAt)),
      lessonsLearned: lesson,
      evidenceJson: JSON.stringify({ sourceMemoryIds: items.map((item) => item.id), supportingEvidence, contradictingEvidence, conditions: conditionPath.conditions, decisions: conditionPath.decisions, actions: conditionPath.actions, outcomes: conditionPath.outcomes }),
      conditionPathJson: JSON.stringify(conditionPath),
      patternState,
      status: patternState === "CONTRADICTED" ? "CONTRADICTED" : "CONFIRMED",
    });
  }

  const allPatterns = await getPatternIntelligenceForBusiness(businessId);
  return allPatterns as PatternPayload[];
}

/**
 * Get patterns for a business.
 */
export async function getBusinessPatterns(businessId: number): Promise<PatternPayload[]> {
  const patterns = await getPatternIntelligenceForBusiness(businessId);
  return patterns as PatternPayload[];
}

export async function getConditionAwarePatternDetail(businessId: number, patternId: number) {
  const patterns = await getPatternIntelligenceForBusiness(businessId);
  const pattern = patterns.find((item: any) => Number(item.id) === patternId);
  if (!pattern) return null;
  const evidence = pattern.evidenceJson ? JSON.parse(pattern.evidenceJson) : {};
  const conditionPath = pattern.conditionPathJson ? JSON.parse(pattern.conditionPathJson) : {};
  return {
    ...pattern,
    conditions: conditionPath.conditions || evidence.conditions || [],
    decisions: conditionPath.decisions || evidence.decisions || [],
    actions: conditionPath.actions || evidence.actions || [],
    outcomes: conditionPath.outcomes || evidence.outcomes || [],
    supportingEvidence: evidence.supportingEvidence || evidence.sourceMemoryIds || [],
    contradictingEvidence: evidence.contradictingEvidence || [],
    currentRelevanceExplanation: pattern.currentRelevance === "HIGH" ? "The pattern was observed recently enough to inform current review." : pattern.currentRelevance === "MEDIUM" ? "The pattern is historical and should be compared with current conditions." : "The pattern is older and should not be treated as current without new evidence.",
  };
}
