import { describe, it, expect } from "vitest";
import { evaluateAndRecordSituationSnapshots, getBusinessSituationTrends } from "./services/situationTrendService";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Situation Trend Intelligence Engine (Day 14)", () => {
  it("should evaluate and record situation snapshots deterministically for businessId 1", async () => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const trends = await evaluateAndRecordSituationSnapshots(1, startDate, endDate);
    expect(Array.isArray(trends)).toBe(true);
    if (trends.length > 0) {
      expect(trends[0].trendDirection).toBeDefined();
      expect(Array.isArray(trends[0].timeline)).toBe(true);
    }
  });

  it("should retrieve business situation trends without errors", async () => {
    const trends = await getBusinessSituationTrends(1);
    expect(Array.isArray(trends)).toBe(true);
  });
});
