import { describe, expect, it } from "vitest";
import {
  buildMetricTrajectory,
  compareForecastToActual,
  synthesizeBusinessTrajectory,
  type MetricObservation,
} from "./services/businessTrajectoryService";

describe("Business Trajectory & Early-Warning Forecasting v1 (Day 24)", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  function observations(values: number[], metricKey = "revenue", metricLabel = "Revenue"): MetricObservation[] {
    return values.map((value, index) => ({
      metricKey,
      metricLabel,
      observedAt: new Date(now.getTime() - (values.length - 1 - index) * 7 * 24 * 60 * 60 * 1000),
      value,
    }));
  }

  it("classifies sustained growth with a supported directional projection", () => {
    const trajectory = buildMetricTrajectory(observations([100, 112, 126, 142, 160, 180]), now, 7);
    expect(trajectory.direction).toBe("IMPROVING");
    expect(trajectory.status).toBe("HEALTHY_GROWTH");
    expect(trajectory.projectedValue).not.toBeNull();
    expect(trajectory.confidenceLevel).toBe("HIGH");
    expect(trajectory.earlyWarnings).toEqual([]);
  });

  it("identifies slowing growth as an early-warning condition without claiming causality", () => {
    const trajectory = buildMetricTrajectory(observations([100, 120, 138, 148, 153, 156]), now, 7);
    expect(trajectory.direction).toBe("IMPROVING");
    expect(trajectory.status).toBe("SLOWING_GROWTH");
    expect(trajectory.earlyWarnings.some((warning) => warning.includes("momentum is slowing"))).toBe(true);
    expect(trajectory.explanation).toContain("forecast is");
  });

  it("does not project when evidence is insufficient", () => {
    const trajectory = buildMetricTrajectory(observations([100, 92], "expenses", "Operating cost"), now, 7);
    expect(trajectory.direction).toBe("DECLINING");
    expect(trajectory.dataSufficiency).toBe("LOW");
    expect(trajectory.projectedValue).toBeNull();
    expect(trajectory.confidenceLevel).toBe("LOW");
  });

  it("marks volatile movement as uncertain instead of forcing a direction", () => {
    const trajectory = buildMetricTrajectory(observations([100, 150, 80, 160, 75, 155]), now, 7);
    expect(trajectory.direction).toBe("VOLATILE");
    expect(trajectory.status).toBe("VOLATILE");
    expect(trajectory.projectedValue).toBeNull();
    expect(trajectory.confidenceLevel).toBe("LOW");
    expect(trajectory.earlyWarnings.length).toBeGreaterThan(0);
  });

  it("synthesizes early warning context from trajectories and non-causal relationships", () => {
    const revenue = buildMetricTrajectory(observations([100, 96, 91, 85, 78, 70]), now, 7);
    const customers = buildMetricTrajectory(observations([50, 49, 47, 44, 40, 35], "activeCustomers", "Customer activity"), now, 7);
    const summary = synthesizeBusinessTrajectory(42, [revenue, customers], {
      crossSignalRelationships: [{
        relationshipType: "CONTRADICTING",
        strength: "HIGH",
        freshness: "CURRENT",
        explanation: "Revenue and customer activity are moving in conflicting directions across recent observations.",
      }],
      situations: [{ priority: "HIGH", status: "OPEN" }],
      decisions: [{ status: "OPEN" }],
    }, now, 7);

    expect(summary.state).toBe("DETERIORATING");
    expect(summary.earlyWarnings.length).toBeGreaterThan(0);
    expect(summary.interpretation).toContain("Review the evidence chain");
    expect(summary.contradictingSignals.length).toBeGreaterThan(0);
  });

  it("compares forecast outcomes using explicit direction and tolerance rules", () => {
    expect(compareForecastToActual(100, 110, 109).comparisonStatus).toBe("FORECAST_ACCURATE");
    expect(compareForecastToActual(100, 110, 125).comparisonStatus).toBe("FORECAST_DIRECTION_CORRECT");
    expect(compareForecastToActual(100, 110, 90).comparisonStatus).toBe("FORECAST_DIRECTION_WRONG");
    expect(compareForecastToActual(null, 110, 109).comparisonStatus).toBe("INSUFFICIENT_DATA");
  });
});
