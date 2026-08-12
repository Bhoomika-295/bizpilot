import { describe, expect, it } from "vitest";
import { getHistoricalContextViewState } from "./historicalContext";

describe("historical context presenter", () => {
  it("prioritizes loading while evidence is being fetched", () => {
    expect(getHistoricalContextViewState({ isLoading: true, isError: false, similarCount: 3 })).toBe("loading");
  });

  it("renders an explicit error state when the memory request fails", () => {
    expect(getHistoricalContextViewState({ isLoading: false, isError: true, similarCount: 3 })).toBe("error");
  });

  it("renders an explicit empty state when no comparable memories exist", () => {
    expect(getHistoricalContextViewState({ isLoading: false, isError: false, similarCount: 0 })).toBe("empty");
    expect(getHistoricalContextViewState({ isLoading: false, isError: false })).toBe("empty");
  });

  it("renders evidence when at least one comparable memory exists", () => {
    expect(getHistoricalContextViewState({ isLoading: false, isError: false, similarCount: 2 })).toBe("evidence");
  });
});
