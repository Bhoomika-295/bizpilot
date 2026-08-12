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
  currentRelevance: string;
  lessonsLearned: string | null;
  evidenceJson: string | null;
  status: string;
}

/**
 * Scan business history and memories to detect recurring patterns using minimum evidence rules.
 */
export async function detectAndUpsertPatterns(businessId: number): Promise<PatternPayload[]> {
  const memories = await getBusinessMemoriesForBusiness(businessId, 200);

  const grouped: Record<string, typeof memories> = {};
  for (const m of memories) {
    const key = m.title.trim().toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  for (const [key, items] of Object.entries(grouped)) {
    if (items.length >= 2) {
      const occurrences = items.length;
      const confidence = occurrences >= 3 ? "HIGH" : "MEDIUM";
      const first = items[items.length - 1];
      const last = items[0];

      let historicalOutcome = "MIXED";
      let lessonsLearned = "Recurring historical event observed across multiple periods.";

      const outcomes = items
        .map((i) => {
          if (i.contextJson) {
            try {
              return JSON.parse(i.contextJson).outcome;
            } catch (e) {
              return null;
            }
          }
          return null;
        })
        .filter(Boolean);

      if (outcomes.length > 0) {
        if (outcomes.every((o) => String(o).toLowerCase().includes("positive") || String(o).toLowerCase().includes("improve"))) {
          historicalOutcome = "POSITIVE";
          lessonsLearned = "Historically produced favorable outcomes when addressed.";
        } else if (outcomes.every((o) => String(o).toLowerCase().includes("negative") || String(o).toLowerCase().includes("declin"))) {
          historicalOutcome = "NEGATIVE";
          lessonsLearned = "Historically associated with negative or pressured outcomes.";
        }
      }

      await upsertPatternIntelligence({
        businessId,
        patternType: "RECURRING_SITUATION",
        title: last.title,
        description: `Observed ${occurrences} times. Last noted on ${new Date(last.createdAt).toLocaleDateString()}.`,
        occurrences,
        firstDetected: new Date(first.createdAt),
        lastDetected: new Date(last.createdAt),
        typicalResponse: "Standard review and strategic adjustment.",
        historicalOutcome,
        confidence,
        currentRelevance: "HIGH",
        lessonsLearned,
        evidenceJson: JSON.stringify({ sourceMemoryIds: items.map((i) => i.id) }),
        status: "CONFIRMED",
      });
    }
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
