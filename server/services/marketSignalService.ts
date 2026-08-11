import {
  getBusinessById,
  getCompetitors,
  getMarketSignals,
  createMarketSignal,
  clearMarketSignals,
} from "../db";

export type RelevanceLevel = "HIGH" | "MEDIUM" | "LOW";
export type ImpactArea =
  | "Revenue"
  | "Customers"
  | "Expenses"
  | "Competition"
  | "Operations"
  | "Product/Service"
  | "General Market";

export interface EnrichedMarketSignalMetadata {
  relevanceLevel: RelevanceLevel;
  impactArea: ImpactArea;
  importanceScore: number;
  explanation: string;
}

export interface NormalizedMarketSignal extends EnrichedMarketSignalMetadata {
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt?: Date;
  relatedEntity: string;
  snippet?: string;
  relevanceStatus: string;
  externalId?: string;
}

/**
 * Deterministic Relevance Engine
 * Evaluates whether a signal mentions a competitor, matches the industry, or has general relevance.
 */
export function classifyRelevance(
  signalText: string,
  businessIndustry?: string | null,
  competitorNames: string[] = []
): { relevanceLevel: RelevanceLevel; matchedCompetitor?: string } {
  const lowerText = signalText.toLowerCase();

  // Check exact or partial competitor match
  for (const comp of competitorNames) {
    if (comp && comp.trim().length > 1) {
      const compLower = comp.trim().toLowerCase();
      if (lowerText.includes(compLower)) {
        return { relevanceLevel: "HIGH", matchedCompetitor: comp };
      }
    }
  }

  // Check industry match
  if (businessIndustry && businessIndustry.trim().length > 1) {
    const indLower = businessIndustry.trim().toLowerCase();
    const keywords = indLower.split(/[\s,]+/);
    const matchCount = keywords.filter((kw) => kw.length > 2 && lowerText.includes(kw)).length;
    if (matchCount >= 1 || lowerText.includes(indLower)) {
      return { relevanceLevel: "MEDIUM" };
    }
  }

  // Default / fallback
  return { relevanceLevel: "LOW" };
}

/**
 * Impact Area Classifier
 * Classifies the signal into logical business impact categories based on keywords.
 */
export function classifyImpactArea(signalText: string, matchedCompetitor?: string): ImpactArea {
  const lower = signalText.toLowerCase();

  if (matchedCompetitor || lower.includes("competitor") || lower.includes("rival") || lower.includes("market share") || lower.includes("pricing") || lower.includes("acquisition")) {
    return "Competition";
  }
  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("profit") || lower.includes("growth") || lower.includes("earnings")) {
    return "Revenue";
  }
  if (lower.includes("customer") || lower.includes("client") || lower.includes("consumer")  || lower.includes("buyer") || lower.includes("satisfaction")) {
    return "Customers";
  }
  if (lower.includes("cost") || lower.includes("expense") || lower.includes("inflation") || lower.includes("supply chain") || lower.includes("price hike")) {
    return "Expenses";
  }
  if (lower.includes("product") || lower.includes("launch") || lower.includes("service") || lower.includes("feature") || lower.includes("technology")) {
    return "Product/Service";
  }
  if (lower.includes("operation") || lower.includes("hiring") || lower.includes("staff") || lower.includes("regulatory") || lower.includes("compliance")) {
    return "Operations";
  }

  return "General Market";
}

/**
 * Importance Scorer
 * Computes an importance score (1-5) and transparent explanation based on relevance, recency, and evidence.
 */
export function calculateImportanceAndExplanation(
  relevanceLevel: RelevanceLevel,
  impactArea: ImpactArea,
  publishedAt?: Date,
  matchedCompetitor?: string
): { importanceScore: number; explanation: string } {
  let baseScore = 1;
  if (relevanceLevel === "HIGH") baseScore = 4;
  else if (relevanceLevel === "MEDIUM") baseScore = 3;
  else baseScore = 2;

  // Recency bonus
  if (publishedAt) {
    const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours <= 24) {
      baseScore = Math.min(5, baseScore + 1);
    }
  }

  let explanation = "";
  if (relevanceLevel === "HIGH" && matchedCompetitor) {
    explanation = `This signal directly mentions tracked competitor "${matchedCompetitor}", making it highly relevant to your competitive positioning.`;
  } else if (relevanceLevel === "MEDIUM") {
    explanation = `This signal aligns closely with your industry category, indicating trends that may affect ${impactArea.toLowerCase()}.`;
  } else {
    explanation = `This is a general market signal worth monitoring for broader macroeconomic shifts.`;
  }

  return { importanceScore: baseScore, explanation };
}

export async function enrichSignalIntelligence(
  title: string,
  snippet: string | undefined,
  businessIndustry?: string | null,
  competitorNames: string[] = [],
  publishedAt?: Date
): Promise<EnrichedMarketSignalMetadata> {
  const fullText = `${title} ${snippet || ""}`;
  const { relevanceLevel, matchedCompetitor } = classifyRelevance(fullText, businessIndustry, competitorNames);
  const impactArea = classifyImpactArea(fullText, matchedCompetitor);
  const { importanceScore, explanation } = calculateImportanceAndExplanation(relevanceLevel, impactArea, publishedAt, matchedCompetitor);

  return {
    relevanceLevel,
    impactArea,
    importanceScore,
    explanation,
  };
}

/**
 * Fetch and normalize external market signals from GDELT 2.0 DOC API.
 */
export async function fetchGdeltSignals(query: string, relatedEntity: string): Promise<NormalizedMarketSignal[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=5&format=json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BizPilot-AI-MarketIntelligence/1.0",
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return [];
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return [];
    }

    const data = await res.json() as any;
    const articles = data?.articles || [];

    const signals: NormalizedMarketSignal[] = [];
    const seenUrls = new Set<string>();

    for (const art of articles) {
      const title = art.title?.trim();
      const sourceUrl = art.url?.trim();
      const source = art.source?.trim() || new URL(sourceUrl || "https://gdeltproject.org").hostname;
      const seendate = art.seendate;

      if (!title || !sourceUrl || seenUrls.has(sourceUrl)) {
        continue;
      }
      seenUrls.add(sourceUrl);

      let publishedAt: Date | undefined = undefined;
      if (seendate && typeof seendate === "string" && seendate.length >= 15) {
        const year = parseInt(seendate.substring(0, 4), 10);
        const month = parseInt(seendate.substring(4, 6), 10) - 1;
        const day = parseInt(seendate.substring(6, 8), 10);
        const hour = parseInt(seendate.substring(9, 11), 10);
        const minute = parseInt(seendate.substring(11, 13), 10);
        const second = parseInt(seendate.substring(13, 15), 10);
        const parsed = new Date(Date.UTC(year, month, day, hour, minute, second));
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed;
        }
      }

      const snippet = art.socialimage ? undefined : `Recent coverage regarding ${relatedEntity} and industry developments.`;

      signals.push({
        title,
        source,
        sourceUrl,
        publishedAt,
        relatedEntity,
        snippet,
        relevanceStatus: "relevant",
        relevanceLevel: "LOW", // Will be enriched during sync
        impactArea: "General Market",
        importanceScore: 1,
        explanation: "Pending classification",
        externalId: sourceUrl,
      });
    }

    return signals;
  } catch (error) {
    console.warn(`[MarketIntelligence] Failed to fetch external signals for query "${query}":`, error);
    return [];
  }
}

/**
 * Synchronize market signals for a tenant business based on industry and active competitors.
 */
export async function refreshMarketSignalsForBusiness(businessId: number): Promise<{
  success: boolean;
  signalCount: number;
  message?: string;
}> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error("Business not found.");
  }

  const competitors = await getCompetitors(businessId);
  const competitorNames = competitors.map((c) => c.name);

  const queriesToRun: { query: string; entity: string }[] = [];

  if (business.industry) {
    queriesToRun.push({
      query: business.industry,
      entity: `Industry: ${business.industry}`,
    });
  }

  for (const comp of competitors.slice(0, 3)) {
    queriesToRun.push({
      query: comp.name,
      entity: `Competitor: ${comp.name}`,
    });
  }

  if (queriesToRun.length === 0) {
    queriesToRun.push({
      query: business.name || "business intelligence",
      entity: `Business: ${business.name || "General"}`,
    });
  }

  const allFetchedSignals: NormalizedMarketSignal[] = [];
  for (const q of queriesToRun) {
    const signals = await fetchGdeltSignals(q.query, q.entity);
    allFetchedSignals.push(...signals);
  }

  const uniqueMap = new Map<string, NormalizedMarketSignal>();
  for (const sig of allFetchedSignals) {
    if (!uniqueMap.has(sig.sourceUrl)) {
      // Enrich with intelligence metadata
      const intelligence = await enrichSignalIntelligence(
        sig.title,
        sig.snippet,
        business.industry,
        competitorNames,
        sig.publishedAt
      );
      uniqueMap.set(sig.sourceUrl, {
        ...sig,
        ...intelligence,
      });
    }
  }

  const uniqueSignals = Array.from(uniqueMap.values());

  if (uniqueSignals.length > 0) {
    await clearMarketSignals(businessId);
    for (const sig of uniqueSignals) {
      await createMarketSignal(businessId, {
        title: sig.title,
        source: sig.source,
        sourceUrl: sig.sourceUrl,
        publishedAt: sig.publishedAt,
        relatedEntity: sig.relatedEntity,
        snippet: sig.snippet,
        relevanceStatus: sig.relevanceStatus,
        relevanceLevel: sig.relevanceLevel,
        impactArea: sig.impactArea,
        importanceScore: sig.importanceScore,
        explanation: sig.explanation,
        externalId: sig.externalId,
      });
    }
    return {
      success: true,
      signalCount: uniqueSignals.length,
      message: `Successfully synchronized ${uniqueSignals.length} market signals with relevance intelligence.`,
    };
  }

  const existing = await getMarketSignals(businessId);
  if (existing.length > 0) {
    return {
      success: true,
      signalCount: existing.length,
      message: "External source temporarily unavailable; displaying previously stored signals.",
    };
  }

  return {
    success: false,
    signalCount: 0,
    message: "Market signals temporarily unavailable.",
  };
}
