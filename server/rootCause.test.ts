import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getBusinessSituations: vi.fn(),
  getCompetitorActivities: vi.fn(),
  getMarketSignals: vi.fn(),
  getBusinessMemoriesForBusiness: vi.fn(),
  getPatternIntelligenceForBusiness: vi.fn(),
  getRecentOutcomes: vi.fn(),
  getAllMonitoringEvents: vi.fn(),
  upsertBusinessRelationship: vi.fn(),
  getRootCauseInvestigations: vi.fn(),
  getRootCauseInvestigationById: vi.fn(),
  upsertRootCauseInvestigation: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { fetchRootCauseInvestigationDetail, generateRootCauseInvestigation } from "./services/rootCauseService";

describe("Root Cause & Causal Business Intelligence v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getBusinessSituations.mockResolvedValue([
      {
        id: 11,
        title: "Support backlog increased",
        summary: "Support response time increased before the retention review.",
        createdAt: new Date("2026-07-01T00:00:00Z"),
      },
    ]);
    dbMocks.getCompetitorActivities.mockResolvedValue([
      {
        id: 12,
        competitorName: "Northstar",
        actionDescription: "Competitor introduced a lower-priced package.",
        detectedAt: new Date("2026-07-03T00:00:00Z"),
      },
    ]);
    dbMocks.getMarketSignals.mockResolvedValue([
      {
        id: 13,
        title: "Demand softened",
        snippet: "Category demand softened during the review window.",
        publishedAt: new Date("2026-07-02T00:00:00Z"),
      },
    ]);
    dbMocks.getBusinessMemoriesForBusiness.mockResolvedValue([
      {
        id: 14,
        title: "Retention pressure after service delays",
        summary: "A prior service-delay period coincided with retention pressure.",
        memoryType: "LESSON",
        createdAt: new Date("2026-05-01T00:00:00Z"),
      },
    ]);
    dbMocks.getPatternIntelligenceForBusiness.mockResolvedValue([
      {
        id: 15,
        title: "Retention pressure after service delays",
        description: "The same terms recur in three recorded periods.",
        patternType: "RECURRENCE",
        occurrences: 3,
        lastDetected: new Date("2026-07-04T00:00:00Z"),
      },
    ]);
    dbMocks.getRecentOutcomes.mockResolvedValue([
      {
        id: 16,
        metric: "retention",
        notes: "Actual outcome recorded for the period.",
        createdAt: new Date("2026-07-05T00:00:00Z"),
      },
    ]);
    dbMocks.getAllMonitoringEvents.mockResolvedValue([
      {
        id: 17,
        title: "Retention change detected",
        summary: "The monitoring cycle detected a change.",
        whatChanged: "Retention moved below the recent baseline.",
        detectedAt: new Date("2026-06-30T00:00:00Z"),
      },
    ]);
    dbMocks.upsertBusinessRelationship.mockResolvedValue({ id: 100, created: true });
    dbMocks.upsertRootCauseInvestigation.mockResolvedValue({ id: 99 });
  });

  it("builds an evidence-backed diagnostic with historical context and temporal language", async () => {
    const result = await generateRootCauseInvestigation(
      7,
      "Customer retention declined",
      "Customer retention declined after service delays",
      "SITUATION",
      11,
    );

    expect(result.businessId).toBe(7);
    expect(result.contributors.length).toBeGreaterThanOrEqual(5);
    expect(result.contributors.some((item) => item.sourceType === "BUSINESS_MEMORY")).toBe(true);
    expect(result.contributors.some((item) => item.sourceType === "PATTERN")).toBe(true);
    expect(result.timelineEvents.map((item) => item.timestamp)).toEqual(
      [...result.timelineEvents].map((item) => item.timestamp).sort((a, b) => a - b),
    );
    expect(result.timelineEvents.some((item) => item.temporalRelationship.includes("Preceded"))).toBe(true);
    expect(result.counterEvidence.length).toBeGreaterThan(0);
    expect(result.unknownFactors.length).toBeGreaterThan(0);
    expect(JSON.stringify(result).toUpperCase()).not.toContain("CAUSES");
    expect(result.whyTree.children.length).toBe(result.contributors.length);
    expect(dbMocks.upsertRootCauseInvestigation).toHaveBeenCalledWith(expect.objectContaining({ businessId: 7, sourceId: 11 }));
  });

  it("returns UNKNOWN confidence and explicit gaps when no verified contributors exist", async () => {
    dbMocks.getBusinessSituations.mockResolvedValue([]);
    dbMocks.getCompetitorActivities.mockResolvedValue([]);
    dbMocks.getMarketSignals.mockResolvedValue([]);
    dbMocks.getBusinessMemoriesForBusiness.mockResolvedValue([]);
    dbMocks.getPatternIntelligenceForBusiness.mockResolvedValue([]);
    dbMocks.getRecentOutcomes.mockResolvedValue([]);
    dbMocks.getAllMonitoringEvents.mockResolvedValue([]);

    const result = await generateRootCauseInvestigation(8, "Unexplained margin pressure", "No verified contributor is currently recorded.");

    expect(result.evidenceStrength).toBe("UNKNOWN");
    expect(result.overallConfidence).toBe("UNKNOWN");
    expect(result.contributors).toHaveLength(0);
    expect(result.unknownFactors.some((item) => item.includes("UNKNOWN"))).toBe(true);
    expect(result.counterEvidence.some((item) => item.includes("can be assessed"))).toBe(true);
  });

  it("does not return a generated substitute for a missing or cross-tenant investigation", async () => {
    dbMocks.getRootCauseInvestigationById.mockResolvedValue(undefined);

    await expect(fetchRootCauseInvestigationDetail(7, 12345)).resolves.toBeNull();
  });
});
