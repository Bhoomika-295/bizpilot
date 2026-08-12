import { describe, it, expect } from "vitest";

describe("Daily Business Intelligence Brief v1", () => {
  it("structures executive daily brief sections correctly", () => {
    const brief = {
      briefDate: "2026-08-12",
      executiveOpening: "Executive Briefing for 2026-08-12: Overall health score is 85/100.",
      health: { score: 85, explanation: "Strong performance across key metrics." },
      attention: { nowCount: 1, nextCount: 2, watchCount: 3 },
      externalRadar: { activeEventsCount: 5, topWarnings: [] },
      strategyStatus: { healthState: "STABLE", objectivePerformance: "ON_TRACK" },
      decisions: { pendingCount: 2 },
    };

    expect(brief.briefDate).toBe("2026-08-12");
    expect(brief.executiveOpening).toContain("85/100");
    expect(brief.health.score).toBe(85);
    expect(brief.attention.nowCount).toBe(1);
    expect(brief.strategyStatus.healthState).toBe("STABLE");
  });
});
