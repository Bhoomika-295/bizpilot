import { describe, it, expect } from "vitest";
import { evaluateAndSyncForesight } from "./services/foresightService";
import { getForesightSignalsForBusiness, getForesightWatchlistForBusiness } from "./db";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Strategic Foresight & Risk Radar Engine", () => {
  it("evaluates and syncs foresight signals and watchlist for a business", async () => {
    const businessId = 999; // test tenant ID
    const result = await evaluateAndSyncForesight(businessId);

    expect(result).toBeDefined();
    expect(result.signalsCreated).toBeGreaterThan(0);
    expect(result.watchlistCount).toBeGreaterThan(0);

    const signals = await getForesightSignalsForBusiness(businessId);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].title).toBeDefined();
    expect(signals[0].horizon).toBeDefined();

    const watchlist = await getForesightWatchlistForBusiness(businessId);
    expect(watchlist.length).toBeGreaterThan(0);
    expect(watchlist[0].targetType).toBeDefined();
  });
});
