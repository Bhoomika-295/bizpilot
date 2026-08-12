import { describe, it, expect } from "vitest";
import { simulateAndCreateScenario } from "./services/scenarioPlanningService";

describe("Scenario Planning & Simulation Service", () => {
  it("simulates scenario impact correctly and calculates projected metrics", async () => {
    const result = await simulateAndCreateScenario({
      businessId: 1,
      title: "10% Price Increase Test",
      description: "Testing pricing sensitivity",
      scenarioType: "UPSIDE",
      timeHorizon: "90 DAYS",
      assumptions: [
        {
          metric: "Price",
          baselineValue: "1000",
          scenarioValue: "1100",
          percentageChange: "+10",
          unit: "INR",
          source: "USER_ASSUMPTION",
          confidence: "MEDIUM",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.title).toBe("10% Price Increase Test");
    expect(result.estimatedMetrics["Revenue"]).toBeDefined();
    expect(result.estimatedMetrics["Revenue"].scenario).toContain("L");
  });
});
