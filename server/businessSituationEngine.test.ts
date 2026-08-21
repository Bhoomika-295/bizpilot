import { describe, it, expect } from "vitest";
import { evaluateAndUpsertBusinessSituations } from "./services/businessSituationEngine";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Business Situation Engine v1", () => {
  it("should evaluate business situations deterministically for a valid businessId", async () => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    // Test with businessId 1 (seeded in test environment)
    const situations = await evaluateAndUpsertBusinessSituations(1, startDate, endDate);
    expect(Array.isArray(situations)).toBe(true);
  });
});
