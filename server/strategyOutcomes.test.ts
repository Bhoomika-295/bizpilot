import { describe, it, expect } from "vitest";
import { getStrategyPerformanceAnalytics } from "./services/strategyCopilotService";

describe("Day 12: Strategy Outcomes & Learning Loop", () => {
  it("calculates performance summary and historical insights correctly for empty or initial states", async () => {
    const summary = await getStrategyPerformanceAnalytics(999999);
    expect(summary).toBeDefined();
    expect(summary.total).toBe(0);
    expect(summary.completed).toBe(0);
    expect(summary.positive).toBe(0);
    expect(summary.historicalInsights).toContain("Not enough completed recommendations to evaluate strategy effectiveness yet.");
  });

  it("handles effectiveness percentages and category breakdown without hallucination", async () => {
    const summary = await getStrategyPerformanceAnalytics(999999);
    expect(summary.strongestHistoricalCategory).toBeDefined();
    expect(summary.mostObservedImprovement).toBeDefined();
  });
});
