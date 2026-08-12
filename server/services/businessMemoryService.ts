import {
  getBusinessMemoriesForBusiness,
  createBusinessMemory,
  getStrategiesForBusiness,
  getRecentOutcomes,
  getDecisionCandidates,
  getActionPlansForBusiness,
  getBusinessSituations,
  getPatternIntelligenceForBusiness,
} from "../db";

export interface BusinessMemoryPayload {
  id: number;
  businessId: number;
  memoryType: string;
  title: string;
  summary: string;
  sourceType: string | null;
  sourceId: number | null;
  importance: string;
  status: string;
  contextJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Automatically capture significant business events as memories with deduplication.
 */
export async function recordMemoryFromSignificantEvent(
  businessId: number,
  memoryType: string,
  title: string,
  summary: string,
  sourceType?: string,
  sourceId?: number,
  importance: string = "MEDIUM",
  context?: Record<string, any>
): Promise<BusinessMemoryPayload> {
  const memory = await createBusinessMemory({
    businessId,
    memoryType,
    title,
    summary,
    sourceType: sourceType || null,
    sourceId: sourceId || null,
    importance,
    status: "ACTIVE",
    contextJson: context ? JSON.stringify(context) : null,
  });
  return memory as BusinessMemoryPayload;
}

/**
 * Get chronological timeline of business memories.
 */
export async function getBusinessMemoryTimeline(businessId: number, limit = 50): Promise<BusinessMemoryPayload[]> {
  const memories = await getBusinessMemoriesForBusiness(businessId, limit);
  return memories as BusinessMemoryPayload[];
}

/**
 * Get detail view for a specific memory including source traceability.
 */
export async function getBusinessMemoryDetail(businessId: number, memoryId: number): Promise<BusinessMemoryPayload | null> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 200);
  const found = memories.find((m) => m.id === memoryId);
  return (found as BusinessMemoryPayload) || null;
}

/**
 * Retrieve historical context for a current situation or entity based on deterministic matching.
 */
export async function getHistoricalContextForQuery(
  businessId: number,
  queryType: string,
  categoryOrMetric?: string
): Promise<{
  similarCount: number;
  lastOccurrenceSummary: string | null;
  relevantLessons: string[];
  pastResponses: Array<{ memoryId: number; title: string; outcome: string; response: string }>;
  sourceMemoryIds: number[];
}> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 200);
  
  const normalizedQueryType = queryType.trim().toLowerCase();
  const normalizedCategory = categoryOrMetric?.trim().toLowerCase();

  const matches = memories.filter((m) => {
    const typeMatches =
      !normalizedQueryType ||
      [m.memoryType, m.sourceType]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.trim().toLowerCase() === normalizedQueryType);

    const searchableContext = [m.title, m.summary, m.contextJson]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();
    const categoryMatches = !normalizedCategory || searchableContext.includes(normalizedCategory);

    return typeMatches && categoryMatches;
  });

  const relevantLessons: string[] = [];
  const pastResponses: Array<{ memoryId: number; title: string; outcome: string; response: string }> = [];
  const sourceMemoryIds: number[] = matches.map((memory) => memory.id);

  for (const m of matches) {
    if (m.contextJson) {
      try {
        const parsed = JSON.parse(m.contextJson);
        if (parsed.lesson) relevantLessons.push(parsed.lesson);
        if (parsed.outcome && parsed.response) {
          pastResponses.push({
            memoryId: m.id,
            title: m.title,
            outcome: parsed.outcome,
            response: parsed.response,
          });
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }

  const lastMatch = matches[0];
  const lastOccurrenceSummary = lastMatch ? `${lastMatch.title}: ${lastMatch.summary}` : null;

  return {
    similarCount: matches.length,
    lastOccurrenceSummary,
    relevantLessons: relevantLessons.slice(0, 3),
    pastResponses: pastResponses.slice(0, 3),
    sourceMemoryIds: sourceMemoryIds.slice(0, 6),
  };
}

/**
 * Search and filter business memories.
 */
const MEMORY_QUERY_STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "did",
  "does",
  "for",
  "happened",
  "has",
  "have",
  "how",
  "in",
  "is",
  "last",
  "me",
  "of",
  "on",
  "our",
  "should",
  "the",
  "this",
  "to",
  "what",
  "when",
  "which",
  "with",
  "you",
]);

function tokenizeMemoryQuery(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9%]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !MEMORY_QUERY_STOP_WORDS.has(token))
    )
  );
}

function scoreMemoryText(tokens: string[], fields: Array<string | null | undefined>): number {
  const searchableText = fields.filter((value): value is string => Boolean(value)).join(" ").toLowerCase();
  return tokens.reduce((score, token) => score + (searchableText.includes(token) ? 1 : 0), 0);
}

export async function queryBusinessMemory(
  businessId: number,
  question: string
): Promise<{
  answer: string;
  sources: Array<{ id: number; title: string; summary: string; date: Date }>;
  patterns: Array<{ title: string; occurrences: number; lesson: string | null }>;
}> {
  const tokens = tokenizeMemoryQuery(question);
  if (tokens.length === 0) {
    return {
      answer: "BizPilot does not have enough historical evidence to answer this confidently.",
      sources: [],
      patterns: [],
    };
  }

  const [memories, patterns] = await Promise.all([
    getBusinessMemoriesForBusiness(businessId, 50),
    getPatternIntelligenceForBusiness(businessId),
  ]);

  const matchedMemories = memories
    .map((memory) => ({
      memory,
      score: scoreMemoryText(tokens, [memory.memoryType, memory.title, memory.summary, memory.contextJson]),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.memory.createdAt.getTime() - left.memory.createdAt.getTime())
    .slice(0, 3);

  const matchedPatterns = patterns
    .map((pattern) => ({
      pattern,
      score: scoreMemoryText(tokens, [pattern.patternType, pattern.title, pattern.description, pattern.lessonsLearned]),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.pattern.occurrences - left.pattern.occurrences)
    .slice(0, 3);

  if (matchedMemories.length === 0 && matchedPatterns.length === 0) {
    return {
      answer: "BizPilot does not have enough historical evidence to answer this confidently.",
      sources: [],
      patterns: [],
    };
  }

  return {
    answer: `Based on ${matchedMemories.length} historical memories and ${matchedPatterns.length} verified patterns in BizPilot business memory:`,
    sources: matchedMemories.map(({ memory }) => ({
      id: memory.id,
      title: memory.title,
      summary: memory.summary,
      date: memory.createdAt,
    })),
    patterns: matchedPatterns.map(({ pattern }) => ({
      title: pattern.title,
      occurrences: pattern.occurrences,
      lesson: pattern.lessonsLearned,
    })),
  };
}

export async function searchBusinessMemories(
  businessId: number,
  filters: {
    query?: string;
    memoryType?: string;
    importance?: string;
    status?: string;
  }
): Promise<BusinessMemoryPayload[]> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 300);
  return memories.filter((m) => {
    if (filters.memoryType && filters.memoryType !== "ALL" && m.memoryType !== filters.memoryType) {
      return false;
    }
    if (filters.importance && filters.importance !== "ALL" && m.importance !== filters.importance) {
      return false;
    }
    if (filters.status && filters.status !== "ALL" && m.status !== filters.status) {
      return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchSummary = m.summary.toLowerCase().includes(q);
      if (!matchTitle && !matchSummary) return false;
    }
    return true;
  }) as BusinessMemoryPayload[];
}
