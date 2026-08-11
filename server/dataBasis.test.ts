import { describe, expect, it } from "vitest";
import { inferDataBasisFromSources } from "./services/businessDataService";

describe("business data basis", () => {
  it("keeps an explicitly marked demo business labeled as demo", () => {
    expect(inferDataBasisFromSources(true, ["manual"])).toBe("demo");
  });

  it("recognizes legacy seeded records when the business flag is missing", () => {
    expect(inferDataBasisFromSources(false, ["demo", "seed"])).toBe("demo");
    expect(inferDataBasisFromSources(undefined, ["sample"])).toBe("demo");
  });

  it("labels mixed or manual records as real business data", () => {
    expect(inferDataBasisFromSources(false, ["demo", "manual"])).toBe("real");
    expect(inferDataBasisFromSources(false, ["manual"])).toBe("real");
    expect(inferDataBasisFromSources(false, [])).toBe("real");
  });
});

