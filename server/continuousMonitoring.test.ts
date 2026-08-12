import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canTransitionMonitoringAlert,
  detectMeaningfulMonitoringChanges,
  evaluateBusinessChanges,
  monitoringEventView,
} from "./services/continuousMonitoringService";

const dbMocks = vi.hoisted(() => ({
  getAllDecisionCandidates: vi.fn(),
  getAllMonitoringEvents: vi.fn(),
  getMonitoringEventById: vi.fn(),
  getMonitoringEventHistory: vi.fn(),
  getMonitoringEvents: vi.fn(),
  getMonitoringPreference: vi.fn(),
  getRecentOutcomes: vi.fn(),
  updateMonitoringEventLifecycle: vi.fn(),
  upsertMonitoringEvent: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./services/decisionIntelligenceService", () => ({
  loadDecisionContext: vi.fn(async () => ({
    situations: [],
    opportunities: [],
    competitors: [],
    healthScore: null,
    freshness: null,
  })),
}));

describe("Continuous Monitoring & Intelligence Alerts v1 (Day 22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getAllDecisionCandidates.mockResolvedValue([]);
    dbMocks.getAllMonitoringEvents.mockResolvedValue([]);
    dbMocks.getMonitoringEventById.mockResolvedValue(null);
    dbMocks.getMonitoringEventHistory.mockResolvedValue([]);
    dbMocks.getMonitoringEvents.mockResolvedValue([]);
    dbMocks.getMonitoringPreference.mockResolvedValue(null);
    dbMocks.getRecentOutcomes.mockResolvedValue([]);
    dbMocks.updateMonitoringEventLifecycle.mockResolvedValue(null);
    dbMocks.upsertMonitoringEvent.mockResolvedValue({ created: true, changed: true, escalated: false });
  });

  it("detects meaningful situation, opportunity, competitor, and outcome changes deterministically", () => {
    const drafts = detectMeaningfulMonitoringChanges({
      businessId: 11,
      context: {
        situations: [{ situationId: 1, title: "Retention pressure", trendDirection: "WORSENING", currentPriority: "HIGH", trendSummary: "Repeat customers are declining.", durationDays: 14, currentStatus: "ACTIVE", timeline: [{ supportingCount: 3 }] }],
        opportunities: [{ id: 2, title: "Expansion demand", status: "NEW", priority: "HIGH", potentialImpact: "HIGH", urgency: "HIGH", summary: "A new segment is showing demand.", evidenceStrength: "HIGH", supportingSituationsJson: "[1]" }],
        competitors: [{ competitorId: 3, competitorName: "Acme", trend: "INCREASING", businessRelevance: "HIGH", evidenceCount: 2, primaryActivity: "PRICING" }],
        healthScore: null,
        freshness: null,
      } as any,
      decisions: [],
      outcomes: [{ id: 4, predictedValue: 100, actualValue: 70, metric: "Revenue" }],
    });

    expect(drafts).toHaveLength(4);
    expect(drafts.map((draft) => draft.eventType)).toContain("SITUATION_CHANGED");
    expect(drafts.map((draft) => draft.eventType)).toContain("OPPORTUNITY_CHANGED");
    expect(drafts.map((draft) => draft.eventType)).toContain("COMPETITOR_CHANGED");
    expect(drafts.map((draft) => draft.eventType)).toContain("OUTCOME_CHANGED");
    expect(drafts[0].priorityScore).toBeGreaterThanOrEqual(drafts[1].priorityScore);
    expect(drafts[0].evidence.length).toBeGreaterThan(0);
    expect(drafts[0].whyMatters).not.toContain("guarantee");
  });

  it("deduplicates drafts by stable fingerprints and ignores non-meaningful changes", () => {
    const input = {
      businessId: 11,
      context: {
        situations: [
          { situationId: 1, title: "Retention pressure", trendDirection: "WORSENING", currentPriority: "HIGH", trendSummary: "Declining.", timeline: [] },
          { situationId: 1, title: "Retention pressure", trendDirection: "WORSENING", currentPriority: "HIGH", trendSummary: "Declining.", timeline: [] },
        ],
        opportunities: [{ id: 2, title: "Dormant", status: "MONITORING", priority: "HIGH", potentialImpact: "HIGH" }],
        competitors: [{ competitorId: 3, competitorName: "Acme", trend: "STABLE", businessRelevance: "HIGH", evidenceCount: 2, primaryActivity: "PRODUCT" }],
        healthScore: null,
        freshness: null,
      } as any,
      decisions: [],
      outcomes: [],
    };
    const drafts = detectMeaningfulMonitoringChanges(input);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].fingerprint).toBe(detectMeaningfulMonitoringChanges(input)[0].fingerprint);
  });

  it("enforces the explicit monitoring lifecycle transition matrix", () => {
    expect(canTransitionMonitoringAlert("NEW", "ACKNOWLEDGED")).toBe(true);
    expect(canTransitionMonitoringAlert("ACKNOWLEDGED", "RESOLVED")).toBe(true);
    expect(canTransitionMonitoringAlert("RESOLVED", "ACTIVE")).toBe(true);
    expect(canTransitionMonitoringAlert("RESOLVED", "DISMISSED")).toBe(false);
    expect(canTransitionMonitoringAlert("DISMISSED", "RESOLVED")).toBe(false);
  });

  it("evaluates and persists alerts within the requested business tenant", async () => {
    const { loadDecisionContext } = await import("./services/decisionIntelligenceService");
    vi.mocked(loadDecisionContext).mockResolvedValue({
      situations: [{ situationId: 9, title: "Cash pressure", trendDirection: "WORSENING", currentPriority: "HIGH", trendSummary: "Cash buffer is narrowing.", timeline: [] }],
      opportunities: [],
      competitors: [],
      healthScore: null,
      freshness: null,
    } as any);
    dbMocks.getMonitoringEvents.mockResolvedValue([]);
    dbMocks.getAllMonitoringEvents.mockResolvedValue([]);
    dbMocks.getMonitoringPreference.mockResolvedValue(null);
    dbMocks.getMonitoringEvents.mockResolvedValue([{ id: 701, businessId: 42, eventType: "SITUATION_CHANGED", title: "Cash pressure is worsening", status: "NEW", priority: "HIGH", priorityScore: 72, severity: "HIGH", fingerprint: "tenant-42", sourceType: "WORSENING_SITUATION", sourceId: 9, relatedSituationIdsJson: "[9]", relatedOpportunityIdsJson: "[]", relatedCompetitorIdsJson: "[]", relatedDecisionIdsJson: "[]", relatedOutcomeIdsJson: "[]", evidenceJson: "[]", detectedAt: new Date(), firstDetectedAt: new Date(), lastSeenAt: new Date(), resolvedAt: null, dismissedAt: null, createdAt: new Date(), updatedAt: new Date() }]);

    const result = await evaluateBusinessChanges(42);
    expect(dbMocks.getAllDecisionCandidates).toHaveBeenCalledWith(42);
    expect(dbMocks.upsertMonitoringEvent).toHaveBeenCalledWith(expect.objectContaining({ businessId: 42, relatedSituationIdsJson: "[9]" }));
    expect(result.generatedCount).toBe(1);
    expect(result.message).toContain("without automatic action");
  });

  it("deserializes tenant-scoped event evidence without changing the stored tenant id", () => {
    const view = monitoringEventView({
      id: 8,
      businessId: 99,
      eventType: "DATA_FRESHNESS_CHANGED",
      title: "Data is stale",
      summary: "Stale",
      whatChanged: "No update",
      whyMatters: "Confidence is reduced",
      severity: "MEDIUM",
      priority: "MEDIUM",
      priorityScore: 48,
      sourceType: "DATA_FRESHNESS",
      sourceId: null,
      relatedEntityType: "BUSINESS",
      relatedEntityId: null,
      relatedSituationIdsJson: "[]",
      relatedOpportunityIdsJson: "[]",
      relatedCompetitorIdsJson: "[]",
      relatedDecisionIdsJson: "[]",
      relatedOutcomeIdsJson: "[]",
      evidenceJson: JSON.stringify([{ type: "DATA_AGE", label: "Latest update", detail: "20 day(s) old" }]),
      status: "NEW",
      fingerprint: "fp-8",
      detectedAt: new Date("2026-01-01"),
      firstDetectedAt: new Date("2026-01-01"),
      lastSeenAt: new Date("2026-01-02"),
      resolvedAt: null,
      dismissedAt: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    });
    expect(view.businessId).toBe(99);
    expect(view.evidence[0].detail).toContain("20 day");
  });
});
