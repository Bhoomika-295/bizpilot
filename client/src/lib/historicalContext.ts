export type HistoricalContextViewState = "loading" | "error" | "empty" | "evidence";

export function getHistoricalContextViewState(input: {
  isLoading: boolean;
  isError: boolean;
  similarCount?: number;
}): HistoricalContextViewState {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (!input.similarCount) return "empty";
  return "evidence";
}
