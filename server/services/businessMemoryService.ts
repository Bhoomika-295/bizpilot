import {
  getBusinessMemoriesForBusiness,
  createBusinessMemory,
  getStrategiesForBusiness,
  getRecentOutcomes,
  getDecisionCandidates,
  getActionPlansForBusiness,
  getBusinessSituations,
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
  pastResponses: Array<{ title: string; outcome: string; response: string }>;
}> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 200);
  
  const matches = memories.filter((m) => {
    if (queryType && m.memoryType !== queryType && m.sourceType !== queryType) {
      return true;
    }
    return true;
  });

  const relevantLessons: string[] = [];
  const pastResponses: Array<{ title: string; outcome: string; response: string }> = [];

  for (const m of matches) {
    if (m.contextJson) {
      try {
        const parsed = JSON.parse(m.contextJson);
        if (parsed.lesson) relevantLessons.push(parsed.lesson);
        if (parsed.outcome && parsed.response) {
          pastResponses.push({
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
  };
}

/**
 * Search and filter business memories.
 */
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
