import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateCompetitorIntelligence } from "./services/competitiveIntelligenceService";

vi.mock("./db", () => ({
  getCompetitors: vi.fn(async () => [
    {
      id: 101,
      businessId: 1,
      name: "Acme Corp",
      industry: "Software",
      website: "https://acme.example.com",
      location: "San Francisco",
      notes: "Primary competitor",
      status: "active",
      intelligenceStatus: "Connected",
    },
  ]),
  getMarketSignals: vi.fn(async () => [
    {
      id: 1,
      businessId: 1,
      title: "Acme Corp announces aggressive pricing discount",
      source: "TechCrunch",
      sourceUrl: "https://example.com/news",
      publishedAt: new Date(),
      discoveredAt: new Date(),
      relatedEntity: "Acme Corp",
      snippet: "Acme Corp slashes tier 1 pricing by 20%.",
      relevanceStatus: "relevant",
      relevanceLevel: "HIGH",
      impactArea: "pricing",
      importanceScore: 5,
      explanation: "Direct pricing pressure.",
    },
  ]),
  getCompetitorActivities: vi.fn(async () => [
    {
      id: 501,
      businessId: 1,
      competitorId: 101,
      activityType: "PRICING",
      title: "Acme Corp announces aggressive pricing discount",
      description: "Acme Corp slashes tier 1 pricing by 20%.",
      sourceReference: "https://example.com/news",
      relevanceLevel: "HIGH",
      impactAreasJson: JSON.stringify(["pricing", "demand"]),
      activityTrend: "INCREASING",
      strategicRelevance: "Recent pricing activity from Acme Corp coincides with shifting market demand.",
      detectedAt: new Date(),
    },
  ]),
  createCompetitorActivity: vi.fn(async () => 502),
  getBusinessMetrics: vi.fn(async () => ({})),
  getBusinessSituations: vi.fn(async () => []),
}));

describe("Competitive Strategy Intelligence Engine v2 (Day 19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates competitor intelligence and detects activity trends correctly", async () => {
    const summaries = await evaluateCompetitorIntelligence(1);

    expect(summaries).toBeDefined();
    expect(summaries.length).toBe(1);

    const acme = summaries[0];
    expect(acme.competitorName).toBe("Acme Corp");
    expect(acme.businessRelevance).toBe("HIGH");
    expect(acme.primaryActivity).toBe("PRICING");
    expect(acme.evidenceCount).toBe(1);
    expect(acme.timeline.length).toBe(1);
    expect(acme.whyItMatters).toContain("pricing activity");
  });
});
