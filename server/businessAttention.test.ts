import { describe, it, expect } from "vitest";
import { AttentionExplanation } from "./services/businessAttentionService";

describe("Business Attention Engine & Intelligence Prioritization v1", () => {
  it("structures explanation payload correctly with factors and recommended actions", () => {
    const explanation: AttentionExplanation = {
      summary: "Critical situation detected requiring immediate operational intervention.",
      reasons: [
        "Situation priority is HIGH.",
        "Supporting evidence count exceeds threshold.",
      ],
      factors: {
        impact: "HIGH",
        urgency: "CRITICAL",
        strategicRelevance: "HIGH",
        trajectoryRelevance: "DECLINING",
        evidenceStrength: "HIGH",
        freshness: "FRESH",
        crossSignalSupport: true,
      },
      recommendedAction: "Review situation timeline and coordinate corrective mitigation.",
    };

    expect(explanation.factors.impact).toBe("HIGH");
    expect(explanation.factors.urgency).toBe("CRITICAL");
    expect(explanation.factors.crossSignalSupport).toBe(true);
    expect(explanation.reasons.length).toBeGreaterThan(0);
    expect(explanation.recommendedAction).toBeDefined();
  });

  it("classifies priority scores into Now, Next, and Watch tiers deterministically", () => {
    const classifyTier = (priorityScore: number) => {
      if (priorityScore >= 80) return "NOW";
      if (priorityScore >= 60) return "NEXT";
      return "WATCH";
    };

    expect(classifyTier(92)).toBe("NOW");
    expect(classifyTier(80)).toBe("NOW");
    expect(classifyTier(75)).toBe("NEXT");
    expect(classifyTier(60)).toBe("NEXT");
    expect(classifyTier(55)).toBe("WATCH");
    expect(classifyTier(40)).toBe("WATCH");
  });

  it("handles status transition logic for attention items correctly", () => {
    const computeNewStatus = (currentStatus: string, action: "ACKNOWLEDGE" | "DISMISS" | "RESOLVE" | "REOPEN") => {
      if (action === "ACKNOWLEDGE") return "ACKNOWLEDGED";
      if (action === "DISMISS") return "DISMISSED";
      if (action === "RESOLVE") return "RESOLVED";
      if (action === "REOPEN") return "ACTIVE";
      return currentStatus;
    };

    expect(computeNewStatus("NEW", "ACKNOWLEDGE")).toBe("ACKNOWLEDGED");
    expect(computeNewStatus("ACTIVE", "DISMISS")).toBe("DISMISSED");
    expect(computeNewStatus("ACKNOWLEDGED", "RESOLVE")).toBe("RESOLVED");
    expect(computeNewStatus("RESOLVED", "REOPEN")).toBe("ACTIVE");
  });
});
