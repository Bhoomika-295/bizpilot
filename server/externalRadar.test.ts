import { describe, it, expect } from "vitest";
import {
  generateNormalizationKey,
  generateFingerprint,
  evaluateRelevance,
  classifyEventType,
} from "./services/externalRadarService";

describe("Day 28 External World Intelligence & Early-Warning Radar", () => {
  it("generates deterministic normalization keys", () => {
    const d = new Date("2026-08-12T00:00:00.000Z");
    const key1 = generateNormalizationKey("Competitor X raises prices", "TechCrunch", "PRICING_CHANGE", d);
    const key2 = generateNormalizationKey("Competitor X raises prices", "TechCrunch", "PRICING_CHANGE", d);
    const key3 = generateNormalizationKey("Different Event Title", "Reuters", "REGULATORY_CHANGE", d);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toContain("pricing_change");
  });

  it("generates repeatable fingerprints", () => {
    const fp1 = generateFingerprint(1, "Acme Corp Expansion", "https://example.com/news/1");
    const fp2 = generateFingerprint(1, "Acme Corp Expansion", "https://example.com/news/1");
    const fp3 = generateFingerprint(2, "Acme Corp Expansion", "https://example.com/news/1");

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
    expect(fp1.startsWith("ext_")).toBe(true);
  });

  it("classifies event types correctly", () => {
    expect(classifyEventType("Competitor increases pricing by 15%", "SaaS pricing update")).toBe("PRICING_CHANGE");
    expect(classifyEventType("New enterprise analytics feature released", "Product launch")).toBe("PRODUCT_CHANGE");
    expect(classifyEventType("New data privacy compliance law enacted", "Regulatory update")).toBe("REGULATORY_CHANGE");
    expect(classifyEventType("Series B funding round closed", "Venture capital")).toBe("FUNDING_EVENT");
  });

  it("evaluates business relevance deterministically", () => {
    const competitors = [{ name: "CompetitorCorp" }];
    const strategies = [{ objective: "Capture Enterprise Market" }];

    const relHigh = evaluateRelevance(
      "CompetitorCorp cuts pricing on core enterprise plan",
      "Rival competitor competitorcorp adjusts enterprise tier rates.",
      "SaaS",
      competitors,
      strategies
    );
    expect(relHigh.relevanceLevel).toBe("HIGH_RELEVANCE");
    expect(relHigh.impactType).toBe("THREAT");
    expect(relHigh.strategyImpact).toBe("HIGH");

    const relLow = evaluateRelevance(
      "Global shipping container index stable",
      "Logistics report shows flat ocean freight rates across major routes.",
      "SaaS",
      competitors,
      strategies
    );
    expect(relLow.relevanceLevel).toBe("LOW_RELEVANCE");
  });
});
