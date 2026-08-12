import { describe, expect, it } from "vitest";
import {
  buildCommandCenterBriefSections,
  normalizeCommandCenterQuery,
  scoreCommandCenterMatch,
} from "./services/commandCenterService";

describe("Executive Command Center deterministic helpers", () => {
  it("normalizes natural-language search into bounded lowercase tokens", () => {
    expect(normalizeCommandCenterQuery("  Pricing   retention   margin ")).toEqual(["pricing", "retention", "margin"]);
    expect(normalizeCommandCenterQuery("one two three four five six seven eight nine ten eleven twelve thirteen")).toHaveLength(12);
  });

  it("returns no tokens for whitespace-only input", () => {
    expect(normalizeCommandCenterQuery("   ")).toEqual([]);
  });

  it("ranks title matches above summary-only matches", () => {
    const tokens = normalizeCommandCenterQuery("pricing");
    expect(scoreCommandCenterMatch(tokens, "Pricing decision", "A separate review item")).toBeGreaterThan(scoreCommandCenterMatch(tokens, "Decision review", "Pricing is mentioned in the evidence."));
  });

  it("does not fabricate a match when no query token appears in the evidence", () => {
    const tokens = normalizeCommandCenterQuery("retention");
    expect(scoreCommandCenterMatch(tokens, "Pricing review", "Margin and cash flow evidence")).toBe(0);
  });

  it("builds every required executive brief section without inventing records", () => {
    const snapshot = {
      headline: "Verified snapshot",
      health: { score: null, hasEnoughData: false },
      freshness: { state: "UNKNOWN", label: "Unknown", lastBriefAt: null },
      trend: { state: "UNKNOWN", summary: "No verified business changes are currently surfaced in the brief.", changeCount: 0 },
      urgency: { level: "LOW", summary: "No immediate urgency is supported by the current queue.", nowCount: 0, nextCount: 0 },
      priorities: { now: [], next: [], watch: [] },
      execution: { active: 0, dueToday: 0, overdue: 0, blocked: 0, completed: 0, riskLevel: "LOW", riskMessage: "Execution risk is not elevated." },
      strategy: { state: "UNKNOWN", objectivePerformance: "UNKNOWN", trajectoryAlignment: "UNKNOWN", summary: "No strategy health summary is available yet." },
      memory: { recentCount: 0, patternCount: 0, recurringPatternCount: 0, latestMemoryAt: null },
      signals: { activeForesightCount: 0, openSituationCount: 0, pendingDecisionCount: 0, activeScenarioCount: 0, recentOutcomeCount: 0 },
      brief: {},
    } as any;

    const sections = buildCommandCenterBriefSections(snapshot);
    expect(sections.map((section) => section.key)).toEqual([
      "summary",
      "changes",
      "matters",
      "future",
      "decisions",
      "actions",
      "learning",
    ]);
    expect(sections.every((section) => section.status === "EMPTY" || section.status === "READY")).toBe(true);
    expect(sections.find((section) => section.key === "future")?.summary).toContain("No active scenario or foresight path");
  });
});
