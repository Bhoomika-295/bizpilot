import { describe, it, expect } from "vitest";
import { executeGlobalSearch } from "./services/globalSearchService";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Unified Global Search V1 Service", () => {
  it("returns empty results for empty or short queries", async () => {
    const res = await executeGlobalSearch(1, "a");
    expect(res.totalResults).toBe(0);
    expect(res.results).toEqual([]);
  });

  it("enforces businessId scoping and executes search across entities", async () => {
    const res = await executeGlobalSearch(1, "Test");
    expect(res).toBeDefined();
    expect(res.businessId).toBe(1);
    expect(Array.isArray(res.results)).toBe(true);
  });
});
