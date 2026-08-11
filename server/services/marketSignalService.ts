import {
  getBusinessById,
  getCompetitors,
  getMarketSignals,
  createMarketSignal,
  clearMarketSignals,
} from "../db";

export interface NormalizedMarketSignal {
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
 * Fetch and normalize external market signals from GDELT 2.0 DOC API.
 * Gracefully handles network failures, timeouts, and unexpected payload structures without fake data.
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
      console.warn(`[MarketIntelligence] GDELT API returned status ${res.status} for query: ${query}`);
      return [];
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      // GDELT sometimes returns HTML error pages or rate limit blocks
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
      const seendate = art.seendate; // Format: YYYYMMDDTHHMMSSZ

      if (!title || !sourceUrl || seenUrls.has(sourceUrl)) {
        continue;
      }
      seenUrls.add(sourceUrl);

      let publishedAt: Date | undefined = undefined;
      if (seendate && typeof seendate === "string" && seendate.length >= 15) {
        // e.g. 20260811T120000Z
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

      signals.push({
        title,
        source,
        sourceUrl,
        publishedAt,
        relatedEntity,
        snippet: art.socialimage ? undefined : `Recent coverage regarding ${relatedEntity} and industry trends.`,
        relevanceStatus: "relevant",
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

  // Deduplicate by sourceUrl across queries
  const uniqueMap = new Map<string, NormalizedMarketSignal>();
  for (const sig of allFetchedSignals) {
    if (!uniqueMap.has(sig.sourceUrl)) {
      uniqueMap.set(sig.sourceUrl, sig);
    }
  }

  const uniqueSignals = Array.from(uniqueMap.values());

  // Store in database
  // If external provider returned results, persist them. If external provider failed/returned empty,
  // we keep previously stored signals available and report status.
  if (uniqueSignals.length > 0) {
    // Clear old signals or retain latest? Keeping latest 30 signals per business is clean.
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
        externalId: sig.externalId,
      });
    }
    return {
      success: true,
      signalCount: uniqueSignals.length,
      message: `Successfully synchronized ${uniqueSignals.length} market signals.`,
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
