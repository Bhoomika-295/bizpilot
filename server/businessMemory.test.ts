import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordMemoryFromSignificantEvent,
  getBusinessMemoryTimeline,
  getHistoricalContextForQuery,
} from "./services/businessMemoryService";
import { detectAndUpsertPatterns, getBusinessPatterns } from "./services/patternIntelligenceService";

let mockMemories: any[] = [];
let mockPatterns: any[] = [];

vi.mock("./db", () => {
  return {
    getDb: vi.fn().mockResolvedValue({}),
    getBusinessMemoriesForBusiness: vi.fn().mockImplementation(async (businessId, limit) => {
      return mockMemories.filter((m) => m.businessId === businessId).slice(0, limit);
    }),
    createBusinessMemory: vi.fn().mockImplementation(async (data) => {
      const existing = mockMemories.find(
        (m) =>
          m.businessId === data.businessId &&
          m.sourceType === data.sourceType &&
          m.sourceId === data.sourceId &&
          m.memoryType === data.memoryType
      );
      if (existing) {
        const ageHours = (Date.now() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) return existing;
      }
      const newMem = {
        id: mockMemories.length + 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMemories.push(newMem);
      return newMem;
    }),
    getPatternIntelligenceForBusiness: vi.fn().mockImplementation(async (businessId) => {
      return mockPatterns.filter((p) => p.businessId === businessId);
    }),
    upsertPatternIntelligence: vi.fn().mockImplementation(async (data) => {
      const existing = mockPatterns.find(
        (p) => p.businessId === data.businessId && p.patternType === data.patternType && p.title === data.title
      );
      if (existing) {
        existing.occurrences += 1;
        existing.lastDetected = new Date();
        return existing;
      }
      const newPattern = {
        id: mockPatterns.length + 1,
        ...data,
        occurrences: data.occurrences || 1,
        firstDetected: new Date(),
        lastDetected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPatterns.push(newPattern);
      return newPattern;
    }),
  };
});

describe("Business Memory & Pattern Intelligence v1", () => {
  const bizA = 101;
  const bizB = 202;

  beforeEach(() => {
    mockMemories = [];
    mockPatterns = [];
    vi.clearAllMocks();
  });

  it("creates and retrieves business memory timeline", async () => {
    await recordMemoryFromSignificantEvent(
      bizA,
      "SITUATION",
      "Customer retention pressure",
      "Customer retention declined by 4% in segment A.",
      "SITUATION",
      12,
      "HIGH",
      { lesson: "Retention campaigns work best with direct outreach." }
    );

    const timeline = await getBusinessMemoryTimeline(bizA);
    expect(timeline.length).toBe(1);
    expect(timeline[0].title).toBe("Customer retention pressure");
    expect(timeline[0].importance).toBe("HIGH");
  });

  it("enforces tenant isolation between business A and business B", async () => {
    await recordMemoryFromSignificantEvent(
      bizA,
      "DECISION",
      "Biz A Decision",
      "Decision description",
      "DECISION",
      1
    );

    const timelineA = await getBusinessMemoryTimeline(bizA);
    const timelineB = await getBusinessMemoryTimeline(bizB);

    expect(timelineA.length).toBe(1);
    expect(timelineB.length).toBe(0);
  });

  it("retrieves historical context for similar past situations", async () => {
    await recordMemoryFromSignificantEvent(
      bizA,
      "SITUATION",
      "Margin compression",
      "Discounts reduced gross margin.",
      "SITUATION",
      15,
      "MEDIUM",
      { outcome: "Negative", response: "Discounting campaign", lesson: "Short-term boost but margin compression" }
    );

    const context = await getHistoricalContextForQuery(bizA, "SITUATION", "Margin");
    expect(context.similarCount).toBeGreaterThan(0);
    expect(context.relevantLessons.length).toBeGreaterThan(0);
    expect(context.relevantLessons[0]).toContain("margin compression");
  });

  it("detects recurring patterns using minimum evidence rules", async () => {
    await recordMemoryFromSignificantEvent(bizA, "SITUATION", "Seasonal Dip", "Dip in sales", "SITUATION", 101);
    await recordMemoryFromSignificantEvent(bizA, "SITUATION", "Seasonal Dip", "Dip in sales again", "SITUATION", 102);

    const patterns = await detectAndUpsertPatterns(bizA);
    expect(patterns.length).toBe(1);
    expect(patterns[0].title).toBe("Seasonal Dip");
    expect(patterns[0].occurrences).toBe(2);
  });
});
