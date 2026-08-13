import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrganizationalLearningSnapshot,
  validateBusinessMemoryLesson,
} from "./services/organizationalLearningService";

let memories: any[] = [];
let patterns: any[] = [];
let updatedQuality: any[] = [];

vi.mock("./db", () => ({
  getBusinessMemoryById: vi.fn(async (businessId: number, memoryId: number) => memories.find((memory) => memory.businessId === businessId && memory.id === memoryId) ?? null),
  getBusinessMemoriesForBusiness: vi.fn(async (businessId: number, limit: number) => memories.filter((memory) => memory.businessId === businessId).slice(0, limit)),
  getPatternIntelligenceForBusiness: vi.fn(async (businessId: number) => patterns.filter((pattern) => pattern.businessId === businessId)),
  updateBusinessMemoryQuality: vi.fn(async (businessId: number, memoryId: number, quality: any) => {
    const memory = memories.find((row) => row.businessId === businessId && row.id === memoryId);
    if (!memory) return null;
    Object.assign(memory, quality, { updatedAt: new Date() });
    updatedQuality.push({ businessId, memoryId, quality });
    return memory;
  }),
  getDecisionCandidates: vi.fn(async () => []),
  getActionPlansForBusiness: vi.fn(async () => []),
  getRecentOutcomes: vi.fn(async () => []),
  getStrategiesForBusiness: vi.fn(async () => []),
  getScenarios: vi.fn(async () => []),
  getForesightSignalsForBusiness: vi.fn(async () => []),
  getRootCauseInvestigations: vi.fn(async () => []),
}));

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    businessId: 101,
    memoryType: "LESSON",
    title: "Retention outreach lesson",
    summary: "Direct outreach improved retention after a verified decline.",
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceType: "OUTCOME",
    sourceId: 45,
    timePeriod: "Q2 2026",
    sourceOfTruth: "Outcome Record",
    evidenceConfidence: "HIGH",
    validationStatus: "SUPPORTED",
    status: "ACTIVE",
    importance: "HIGH",
    contextJson: JSON.stringify({ condition: "retention decline", linkedEntities: [{ type: "OUTCOME", id: 45, label: "Outcome #45" }] }),
    conditionMetadataJson: JSON.stringify({ segment: "SMB", channel: "direct outreach" }),
    contradictionDetailsJson: null,
    relevanceExplanation: "Supported by observed outcome evidence.",
    ...overrides,
  };
}

describe("Organizational Learning v2", () => {
  beforeEach(() => {
    memories = [];
    patterns = [];
    updatedQuality = [];
    vi.clearAllMocks();
  });

  it("returns only tenant-scoped typed lessons with explainable relevance and pattern counts", async () => {
    memories.push(
      lesson(),
      lesson({ id: 2, title: "Conflicting pricing lesson", validationStatus: "CONTRADICTED", evidenceConfidence: "LOW", contradictionDetailsJson: JSON.stringify({ previousLesson: { id: 2 }, newEvidence: "Margin fell", conflict: "Observed result differs", currentStatus: "CONTRADICTED" }) }),
      lesson({ id: 3, businessId: 202, title: "Other tenant lesson" }),
    );
    patterns.push({ businessId: 101, id: 9, occurrences: 2, patternState: "REPEATED" });

    const snapshot = await getOrganizationalLearningSnapshot(101);

    expect(snapshot.timeline).toHaveLength(2);
    expect(snapshot.timeline.every((item) => item.sourceType === "OUTCOME" && item.sourceId !== null && item.timePeriod)).toBe(true);
    expect(snapshot.metrics.lessonCount).toBe(2);
    expect(snapshot.metrics.validatedLessonCount).toBe(1);
    expect(snapshot.metrics.contradictionCount).toBe(1);
    expect(snapshot.metrics.repeatedPatternCount).toBe(1);
    expect(snapshot.timeline[0].relevance.factors.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.contradictions[0].contradictionDetailsJson).toContain("Observed result differs");
    expect(snapshot.timeline.some((item) => item.title === "Other tenant lesson")).toBe(false);
  });

  it("preserves the old lesson while recording an explicit contradiction state", async () => {
    memories.push(lesson({ contradictionDetailsJson: JSON.stringify({ priorReview: "kept" }) }));

    const updated = await validateBusinessMemoryLesson(
      101,
      1,
      "CONTRADICTED",
      "The next quarter showed retention falling despite the same intervention.",
      "The observed outcome conflicts with the prior lesson under a different segment mix.",
    );

    expect(updated?.title).toBe("Retention outreach lesson");
    expect(updated?.summary).toContain("Direct outreach improved retention");
    expect(updated?.validationStatus).toBe("CONTRADICTED");
    expect(updated?.evidenceConfidence).toBe("LOW");
    expect(updated?.contradictionDetailsJson).toContain("priorReview");
    expect(updated?.contradictionDetailsJson).toContain("previousLesson");
    expect(updated?.contradictionDetailsJson).toContain("same intervention");
    expect(updatedQuality[0]).toMatchObject({ businessId: 101, memoryId: 1, quality: { validationStatus: "CONTRADICTED", status: "ACTIVE" } });
  });

  it("does not permit a cross-tenant lesson validation update", async () => {
    memories.push(lesson());

    const updated = await validateBusinessMemoryLesson(202, 1, "SUPPORTED");

    expect(updated).toBeNull();
    expect(updatedQuality).toHaveLength(0);
  });
});
