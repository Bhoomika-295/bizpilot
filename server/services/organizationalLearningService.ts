import {
  getBusinessMemoryById,
  getBusinessMemoriesForBusiness,
  getDecisionCandidates,
  getActionPlansForBusiness,
  getRecentOutcomes,
  getStrategiesForBusiness,
  getScenarios,
  getForesightSignalsForBusiness,
  getRootCauseInvestigations,
  getPatternIntelligenceForBusiness,
  updateBusinessMemoryQuality,
} from "../db";
import {
  recordMemoryFromSignificantEvent,
  type BusinessMemoryPayload,
} from "./businessMemoryService";

export type LessonValidationStatus = "NEW" | "SUPPORTED" | "REPEATED" | "CONTRADICTED" | "SUPERSEDED" | "UNKNOWN";
export type MemoryConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface RelevanceExplanation {
  level: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  factors: Array<{ factor: string; contribution: number; explanation: string }>;
}

export interface LearningTimelineItem {
  id: number;
  memoryType: string;
  title: string;
  summary: string;
  createdAt: Date;
  sourceType: string | null;
  sourceId: number | null;
  timePeriod: string | null;
  validationStatus: string;
  evidenceConfidence: string;
  status: string;
  contradictionDetailsJson: string | null;
  relevance: RelevanceExplanation;
  linkedEntities: Array<{ type: string; id: number; label: string }>;
}

export interface OrganizationalLearningSnapshot {
  businessId: number;
  generatedAt: Date;
  timeline: LearningTimelineItem[];
  lessons: LearningTimelineItem[];
  contradictions: LearningTimelineItem[];
  patterns: any[];
  metrics: {
    memoryCount: number;
    lessonCount: number;
    validatedLessonCount: number;
    contradictionCount: number;
    repeatedPatternCount: number;
  };
}

function parseJson(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function asText(value: unknown, fallback = "Unknown") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function confidenceFromEvidence(hasExpected: boolean, hasActual: boolean, sourceConfidence?: string | null): MemoryConfidence {
  if (sourceConfidence === "HIGH" || (hasExpected && hasActual)) return "HIGH";
  if (sourceConfidence === "LOW" || sourceConfidence === "INSUFFICIENT_DATA") return "LOW";
  if (hasActual || hasExpected) return "MEDIUM";
  return "UNKNOWN";
}

function linkedEntitiesForMemory(memory: any): Array<{ type: string; id: number; label: string }> {
  const context = parseJson(memory.contextJson);
  const links = Array.isArray(context.linkedEntities) ? context.linkedEntities : [];
  const result = links
    .filter((link: any) => Number.isInteger(Number(link?.id)) && link?.type)
    .map((link: any) => ({ type: String(link.type), id: Number(link.id), label: asText(link.label, `${link.type} #${link.id}`) }));
  if (memory.sourceType && memory.sourceId) {
    result.unshift({ type: String(memory.sourceType), id: Number(memory.sourceId), label: `${memory.sourceType} #${memory.sourceId}` });
  }
  return Array.from(new Map(result.map((item) => [`${item.type}:${item.id}`, item])).values());
}

function relevanceForMemory(memory: any, query = ""): RelevanceExplanation {
  const context = parseJson(memory.contextJson);
  const condition = parseJson(memory.conditionMetadataJson);
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 3);
  const searchable = [memory.title, memory.summary, memory.memoryType, memory.sourceType, JSON.stringify(context), JSON.stringify(condition)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const factors: RelevanceExplanation["factors"] = [];
  const ageDays = Math.max(0, Math.round((Date.now() - new Date(memory.createdAt).getTime()) / 86_400_000));
  const recency = ageDays <= 90 ? 3 : ageDays <= 365 ? 2 : 1;
  factors.push({ factor: "Recency", contribution: recency, explanation: ageDays <= 90 ? "Recorded within the last 90 days." : ageDays <= 365 ? "Recorded within the last operating year." : "Older historical evidence remains available but is less recent." });

  const matchedTokens = queryTokens.filter((token) => searchable.includes(token)).length;
  const similarity = normalizedQuery ? Math.min(3, matchedTokens) : 0;
  if (normalizedQuery) factors.push({ factor: "Similarity", contribution: similarity, explanation: `${matchedTokens} of ${queryTokens.length} search term${queryTokens.length === 1 ? "" : "s"} matched the retained record.` });

  const businessRelevance = ["ACTIVE", "RELEVANT"].includes(String(memory.status)) ? 2 : 0;
  factors.push({ factor: "Business relevance", contribution: businessRelevance, explanation: businessRelevance ? "The memory is active or explicitly marked relevant." : "The memory is not currently marked active or relevant." });

  const strategicRelevance = ["STRATEGY", "DECISION", "LESSON", "PATTERN"].includes(String(memory.memoryType)) ? 2 : 1;
  factors.push({ factor: "Strategic relevance", contribution: strategicRelevance, explanation: strategicRelevance === 2 ? "The record is directly connected to strategy, decisions, lessons, or patterns." : "The record is supporting operational context." });

  const outcomeRelevance = ["OUTCOME", "LESSON"].includes(String(memory.memoryType)) || Boolean(context.outcome || context.actualOutcome) ? 2 : 0;
  factors.push({ factor: "Outcome relevance", contribution: outcomeRelevance, explanation: outcomeRelevance ? "The record includes observed outcome evidence." : "No explicit outcome evidence is attached." });

  const importance = String(memory.importance);
  const historicalImportance = importance === "CRITICAL" ? 3 : importance === "HIGH" ? 2 : importance === "MEDIUM" ? 1 : 0;
  factors.push({ factor: "Historical importance", contribution: historicalImportance, explanation: `${importance} importance is recorded by the business memory source.` });

  const score = factors.reduce((total, factor) => total + factor.contribution, 0);
  const level = score >= 10 ? "HIGH" : score >= 6 ? "MEDIUM" : "LOW";
  return { level, score, factors };
}

function memoryToTimelineItem(memory: any, query = ""): LearningTimelineItem {
  return {
    id: Number(memory.id),
    memoryType: String(memory.memoryType),
    title: String(memory.title),
    summary: String(memory.summary),
    createdAt: new Date(memory.createdAt),
    sourceType: memory.sourceType ?? null,
    sourceId: memory.sourceId ?? null,
    timePeriod: memory.timePeriod ?? null,
    validationStatus: String(memory.validationStatus || "UNKNOWN"),
    evidenceConfidence: String(memory.evidenceConfidence || "UNKNOWN"),
    status: String(memory.status || "UNKNOWN"),
    contradictionDetailsJson: memory.contradictionDetailsJson ?? null,
    relevance: relevanceForMemory(memory, query),
    linkedEntities: linkedEntitiesForMemory(memory),
  };
}

export async function getOrganizationalLearningSnapshot(businessId: number, options: { limit?: number; query?: string } = {}): Promise<OrganizationalLearningSnapshot> {
  const memories = await getBusinessMemoriesForBusiness(businessId, Math.min(options.limit ?? 100, 200));
  const patterns = await getPatternIntelligenceForBusiness(businessId);
  const timeline = memories.map((memory) => memoryToTimelineItem(memory, options.query));
  const lessons = timeline.filter((memory) => memory.memoryType === "LESSON" || memory.validationStatus !== "NEW");
  const contradictions = timeline.filter((memory) => memory.validationStatus === "CONTRADICTED" || Boolean(memory.contradictionDetailsJson));
  const repeatedPatternCount = patterns.filter((pattern: any) => Number(pattern.occurrences) >= 2 || ["REPEATED", "STRONG PATTERN"].includes(String(pattern.patternState))).length;
  return {
    businessId,
    generatedAt: new Date(),
    timeline,
    lessons,
    contradictions,
    patterns,
    metrics: {
      memoryCount: timeline.length,
      lessonCount: lessons.length,
      validatedLessonCount: lessons.filter((lesson) => ["SUPPORTED", "REPEATED"].includes(lesson.validationStatus)).length,
      contradictionCount: contradictions.length,
      repeatedPatternCount,
    },
  };
}

export async function validateBusinessMemoryLesson(
  businessId: number,
  memoryId: number,
  validationStatus: LessonValidationStatus,
  newEvidence?: string,
  conflictDescription?: string,
) {
  const current = await getBusinessMemoryById(businessId, memoryId);
  if (!current) return null;
  const existingContradiction = parseJson(current.contradictionDetailsJson);
  const contradictionDetails = validationStatus === "CONTRADICTED"
    ? JSON.stringify({
        ...existingContradiction,
        previousLesson: { id: current.id, title: current.title, summary: current.summary, timePeriod: current.timePeriod },
        newEvidence: asText(newEvidence, "New evidence was recorded without a detailed narrative."),
        conflict: asText(conflictDescription, "The new evidence does not support the current lesson under the present conditions."),
        currentStatus: "CONTRADICTED",
        detectedAt: new Date().toISOString(),
      })
    : current.contradictionDetailsJson;
  const confidence: MemoryConfidence = validationStatus === "UNKNOWN" ? "UNKNOWN" : validationStatus === "CONTRADICTED" ? "LOW" : current.evidenceConfidence === "HIGH" ? "HIGH" : "MEDIUM";
  const explanation = validationStatus === "CONTRADICTED"
    ? "A later evidence record conflicts with this lesson. The historical lesson remains unchanged and is retained for review."
    : validationStatus === "REPEATED"
      ? "The lesson has been observed across more than one source record or period."
      : validationStatus === "SUPPORTED"
        ? "A later evidence record supports the lesson without establishing causation."
        : `The lesson is currently marked ${validationStatus.toLowerCase()} pending further evidence.`;
  return updateBusinessMemoryQuality(businessId, memoryId, {
    validationStatus,
    evidenceConfidence: confidence,
    status: validationStatus === "SUPERSEDED" ? "SUPERSEDED" : "ACTIVE",
    contradictionDetailsJson: contradictionDetails,
    relevanceExplanation: explanation,
  });
}

function outcomeText(expected: unknown, actual: unknown) {
  const expectedText = expected === null || expected === undefined ? "not recorded" : String(expected);
  const actualText = actual === null || actual === undefined ? "not recorded" : String(actual);
  return { expectedText, actualText, sentence: `Expected: ${expectedText}. Observed: ${actualText}.` };
}

function periodFor(row: any) {
  return asText(row?.timeframe, row?.horizon || "Current Operating Period");
}

export async function extractLessonsFromLearningLoop(businessId: number): Promise<BusinessMemoryPayload[]> {
  const [outcomes, actions, strategies, decisions, scenarios, foresight, rootCauses] = await Promise.all([
    getRecentOutcomes(businessId, 100),
    getActionPlansForBusiness(businessId),
    getStrategiesForBusiness(businessId),
    getDecisionCandidates(businessId, 100),
    getScenarios(businessId),
    getForesightSignalsForBusiness(businessId),
    getRootCauseInvestigations(businessId, { limit: 50 }),
  ]);
  const created: BusinessMemoryPayload[] = [];
  const actionById = new Map(actions.map((row: any) => [Number(row.id), row]));
  const strategyById = new Map(strategies.map((row: any) => [Number(row.id), row]));
  const decisionByOutcomeId = new Map(decisions.filter((row: any) => row.outcomeId).map((row: any) => [Number(row.outcomeId), row]));

  for (const outcome of outcomes as any[]) {
    const expectedActual = outcomeText(outcome.predictedValue, outcome.actualValue ?? outcome.notes);
    const hasExpected = outcome.predictedValue !== null && outcome.predictedValue !== undefined;
    const hasActual = outcome.actualValue !== null && outcome.actualValue !== undefined || Boolean(outcome.notes);
    if (!hasExpected && !hasActual) continue;
    const action = outcome.actionPlanId ? actionById.get(Number(outcome.actionPlanId)) : null;
    const strategy = outcome.strategyId ? strategyById.get(Number(outcome.strategyId)) : null;
    const decision = decisionByOutcomeId.get(Number(outcome.id));
    const linkedEntities = [
      decision && { type: "DECISION", id: Number(decision.id), label: `Decision #${decision.id}` },
      strategy && { type: "STRATEGY", id: Number(strategy.id), label: `Strategy #${strategy.id}` },
      action && { type: "ACTION", id: Number(action.id), label: `Action #${action.id}` },
      { type: "OUTCOME", id: Number(outcome.id), label: `Outcome #${outcome.id}` },
    ].filter(Boolean);
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Outcome learning: ${asText(outcome.metric, "Recorded business outcome")}`,
      `A ${asText(outcome.metric, "business outcome")} was recorded. ${expectedActual.sentence} This retained evidence describes what happened; it does not establish causation on its own.`,
      "OUTCOME",
      Number(outcome.id),
      hasExpected && hasActual ? "HIGH" : "MEDIUM",
      {
        expectedOutcome: expectedActual.expectedText,
        actualOutcome: expectedActual.actualText,
        decisionId: decision?.id || null,
        strategyId: strategy?.id || null,
        actionPlanId: action?.id || null,
        outcome: outcome.notes || null,
        linkedEntities,
      },
      {
        timePeriod: periodFor(outcome),
        sourceOfTruth: "Outcome Record",
        evidenceConfidence: confidenceFromEvidence(hasExpected, hasActual),
        conditionMetadata: {
          metric: outcome.metric || null,
          decisionId: decision?.id || null,
          strategyId: strategy?.id || null,
          actionPlanId: action?.id || null,
          assumptions: strategy?.assumptions || null,
        },
        relevanceExplanation: "Relevant because this outcome records the expected-versus-observed result of a prior decision, strategy, or action.",
      },
    );
    created.push(lesson);
  }

  for (const strategy of strategies as any[]) {
    if (!strategy.actualOutcome && !strategy.lessonsLearned) continue;
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Strategy learning: ${strategy.objective}`,
      `Strategy context: ${asText(strategy.objective)}. Expected outcome: ${asText(strategy.expectedOutcome, "not recorded")}. Observed outcome: ${asText(strategy.actualOutcome || strategy.lessonsLearned, "not recorded")}. This is a retained strategy review, not a causal conclusion.`,
      "STRATEGY",
      Number(strategy.id),
      strategy.success === true ? "HIGH" : "MEDIUM",
      { strategyId: strategy.id, expectedOutcome: strategy.expectedOutcome, actualOutcome: strategy.actualOutcome, lesson: strategy.lessonsLearned, linkedEntities: [{ type: "STRATEGY", id: Number(strategy.id), label: `Strategy #${strategy.id}` }] },
      { timePeriod: strategy.timeframe || "Strategy review period", sourceOfTruth: "Strategy Record", evidenceConfidence: strategy.actualOutcome ? "HIGH" : "MEDIUM", conditionMetadata: { assumptions: strategy.assumptions || null, targetMetric: strategy.targetMetric || null }, relevanceExplanation: "Relevant to strategy review because the strategy contains an observed outcome or a recorded lesson." },
    );
    created.push(lesson);
  }

  for (const action of actions as any[]) {
    if (action.status !== "COMPLETED" || (!action.actualOutcome && !action.completionNotes)) continue;
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Action learning: ${action.title}`,
      `Action expected result: ${asText(action.expectedOutcome, "not recorded")}. Actual result: ${asText(action.actualOutcome || action.completionNotes, "not recorded")}. This action record is evidence for future review; it does not imply that the action alone caused the result.`,
      "ACTION",
      Number(action.id),
      action.actualOutcome ? "HIGH" : "MEDIUM",
      { actionPlanId: action.id, expectedOutcome: action.expectedOutcome, actualOutcome: action.actualOutcome, completionNotes: action.completionNotes, linkedEntities: [{ type: "ACTION", id: Number(action.id), label: `Action #${action.id}` }] },
      { timePeriod: action.completedAt ? new Date(action.completedAt).toISOString().slice(0, 10) : "Action review period", sourceOfTruth: "Action Plan Record", evidenceConfidence: action.actualOutcome ? "HIGH" : "MEDIUM", conditionMetadata: { actionType: action.actionType, sourceType: action.sourceType }, relevanceExplanation: "Relevant because a completed action has an explicit expected and/or observed result." },
    );
    created.push(lesson);
  }

  for (const scenario of scenarios as any[]) {
    if (!scenario.outcomeId || !["COMPLETED", "UNDER_REVIEW", "SELECTED"].includes(String(scenario.status))) continue;
    const outcome = (outcomes as any[]).find((row) => Number(row.id) === Number(scenario.outcomeId));
    const expectedActual = outcomeText(scenario.expectedOutcome, outcome?.actualValue ?? outcome?.notes);
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Scenario learning: ${scenario.title}`,
      `Scenario assumptions were recorded for ${scenario.title}. ${expectedActual.sentence} The comparison is retained as scenario learning and remains limited by the assumptions and unknowns recorded in the scenario.`,
      "SCENARIO",
      Number(scenario.id),
      scenario.evidenceQuality === "HIGH EVIDENCE" ? "HIGH" : "MEDIUM",
      { scenarioId: scenario.id, expectedOutcome: expectedActual.expectedText, actualOutcome: expectedActual.actualText, assumptions: parseJson(scenario.assumptionsJson), linkedEntities: [{ type: "SCENARIO", id: Number(scenario.id), label: `Scenario #${scenario.id}` }, outcome && { type: "OUTCOME", id: Number(outcome.id), label: `Outcome #${outcome.id}` }].filter(Boolean) },
      { timePeriod: scenario.timeHorizon || "Scenario review period", sourceOfTruth: "Scenario Record", evidenceConfidence: confidenceFromEvidence(Boolean(scenario.expectedOutcome), Boolean(outcome), scenario.evidenceQuality === "HIGH EVIDENCE" ? "HIGH" : "MEDIUM"), conditionMetadata: { assumptions: parseJson(scenario.assumptionsJson), affectedAreas: parseJson(scenario.affectedAreasJson) }, relevanceExplanation: "Relevant because a modeled scenario is being compared with a recorded outcome or review state." },
    );
    created.push(lesson);
  }

  for (const signal of foresight as any[]) {
    if (String(signal.status) !== "RESOLVED") continue;
    const evidence = parseJson(signal.evidenceJson);
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Foresight learning: ${signal.title}`,
      `A prior foresight signal was resolved. Recorded evidence: ${JSON.stringify(evidence)}. No claim is made about prediction accuracy beyond the evidence stored on the signal.`,
      "FORESIGHT",
      Number(signal.id),
      signal.confidence === "HIGH" ? "HIGH" : "MEDIUM",
      { foresightSignalId: signal.id, expectedSignal: signal.description, evidence, linkedEntities: [{ type: "FORESIGHT", id: Number(signal.id), label: `Foresight #${signal.id}` }] },
      { timePeriod: signal.horizon, sourceOfTruth: "Foresight Signal Record", evidenceConfidence: signal.confidence === "INSUFFICIENT_DATA" ? "LOW" : signal.confidence || "MEDIUM", validationStatus: "UNKNOWN", conditionMetadata: { signalType: signal.type, horizon: signal.horizon }, relevanceExplanation: "Relevant as a resolved foresight record; usefulness should be reviewed against later business evidence." },
    );
    created.push(lesson);
  }

  for (const investigation of rootCauses as any[]) {
    if (String(investigation.status) !== "RESOLVED") continue;
    const lesson = await recordMemoryFromSignificantEvent(
      businessId,
      "LESSON",
      `Root-cause learning: ${investigation.problemTitle}`,
      `Original diagnostic hypothesis: ${investigation.problemDescription}. The investigation was later marked resolved with ${asText(investigation.overallConfidence, "UNKNOWN")} confidence. Supporting evidence and unknown factors remain attached to the original investigation; this memory does not rewrite it or establish causation beyond that record.`,
      "ROOT_CAUSE",
      Number(investigation.id),
      investigation.overallConfidence === "HIGH" ? "HIGH" : "MEDIUM",
      { rootCauseInvestigationId: investigation.id, hypothesis: investigation.problemDescription, validationStatus: investigation.overallConfidence === "HIGH" ? "SUPPORTED" : "UNKNOWN", linkedEntities: [{ type: "ROOT_CAUSE", id: Number(investigation.id), label: `Investigation #${investigation.id}` }] },
      { timePeriod: new Date(investigation.updatedAt).toISOString().slice(0, 10), sourceOfTruth: "Root Cause Investigation Record", evidenceConfidence: investigation.overallConfidence || "UNKNOWN", validationStatus: investigation.overallConfidence === "HIGH" ? "SUPPORTED" : "UNKNOWN", conditionMetadata: { evidenceStrength: investigation.evidenceStrength, unknownFactors: parseJson(investigation.unknownFactorsJson) }, relevanceExplanation: "Relevant because a prior diagnostic investigation reached a recorded resolution state while retaining supporting and unknown evidence." },
    );
    created.push(lesson);
  }

  return created;
}

export function buildConditionAwarePatternView(pattern: any) {
  const evidence = parseJson(pattern.evidenceJson);
  const conditionPath = parseJson(pattern.conditionPathJson);
  return {
    id: Number(pattern.id),
    title: String(pattern.title),
    description: String(pattern.description),
    firstObserved: pattern.firstDetected,
    mostRecent: pattern.lastDetected,
    occurrences: Number(pattern.occurrences || 0),
    patternState: String(pattern.patternState || (Number(pattern.occurrences) >= 3 ? "STRONG PATTERN" : Number(pattern.occurrences) >= 2 ? "REPEATED" : "OBSERVED ONCE")),
    confidence: String(pattern.confidence || "UNKNOWN"),
    conditions: conditionPath.conditions || evidence.conditions || [],
    decisions: conditionPath.decisions || evidence.decisions || [],
    actions: conditionPath.actions || evidence.actions || [],
    outcomes: conditionPath.outcomes || evidence.outcomes || [],
    supportingEvidence: evidence.supportingEvidence || evidence.sourceMemoryIds || [],
    contradictingEvidence: evidence.contradictingEvidence || [],
    lesson: pattern.lessonsLearned || null,
    currentRelevance: String(pattern.currentRelevance || "UNKNOWN"),
    status: String(pattern.status || "UNKNOWN"),
  };
}
