import { describe, it, expect, vi } from "vitest";
import {
  fetchGdeltSignals,
  classifyRelevance,
  classifyImpactArea,
  calculateImportanceAndExplanation,
} from "./services/marketSignalService";

describe("Market Signal Intelligence Engine (Day 10)", () => {
  it("classifies HIGH relevance when exact competitor name matches", () => {
    const result = classifyRelevance("Acme Corp announces new pricing structure", "Software", ["Acme Corp", "Beta LLC"]);
    expect(result.relevanceLevel).toBe("HIGH");
    expect(result.matchedCompetitor).toBe("Acme Corp");
  });

  it("classifies MEDIUM relevance when industry keyword matches", () => {
    const result = classifyRelevance("New software security guidelines released", "Software", ["Acme Corp"]);
    expect(result.relevanceLevel).toBe("MEDIUM");
  });

  it("classifies LOW relevance for general text without matches", () => {
    const result = classifyRelevance("Global supply chain shipping update", "Software", ["Acme Corp"]);
    expect(result.relevanceLevel).toBe("LOW");
  });

  it("classifies impact area correctly based on keywords", () => {
    expect(classifyImpactArea("Competitor lowers product prices", "Competitor")).toBe("Competition");
    expect(classifyImpactArea("Monthly revenue reaches record high")).toBe("Revenue");
    expect(classifyImpactArea("Customer satisfaction survey results")).toBe("Customers");
    expect(classifyImpactArea("Inflation increases operating expenses")).toBe("Expenses");
  });

  it("calculates importance score and transparent explanation", () => {
    const { importanceScore, explanation } = calculateImportanceAndExplanation(
      "HIGH",
      "Competition",
      new Date(),
      "Acme Corp"
    );
    expect(importanceScore).toBeGreaterThanOrEqual(4);
    expect(explanation).toContain("Acme Corp");
  });

  it("handles network failures and timeouts gracefully returning empty array", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const signals = await fetchGdeltSignals("test", "Test Entity");
    expect(signals).toEqual([]);

    global.fetch = originalFetch;
  }, 10000);
});
