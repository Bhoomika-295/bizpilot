import { describe, it, expect, vi } from "vitest";
import { fetchGdeltSignals } from "./services/marketSignalService";

describe("Market Signal Service & GDELT Adapter", () => {
  it("handles network failures and timeouts gracefully returning empty array", async () => {
    // Mock global fetch to simulate network timeout / error
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const signals = await fetchGdeltSignals("test", "Test Entity");
    expect(signals).toEqual([]);

    global.fetch = originalFetch;
  }, 10000);

  it("normalizes valid GDELT json payload correctly", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        articles: [
          {
            title: "Sample Industry News Article",
            url: "https://example.com/article-1",
            source: "Example News",
            seendate: "20260811T120000Z",
          },
        ],
      }),
    });

    const signals = await fetchGdeltSignals("business", "Industry: Business");
    expect(signals.length).toBe(1);
    expect(signals[0].title).toBe("Sample Industry News Article");
    expect(signals[0].sourceUrl).toBe("https://example.com/article-1");
    expect(signals[0].source).toBe("Example News");
    expect(signals[0].relatedEntity).toBe("Industry: Business");
    expect(signals[0].publishedAt).toBeInstanceOf(Date);

    global.fetch = originalFetch;
  }, 10000);
});
