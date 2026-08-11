import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./services/businessDataService", () => ({
  getBusinessTransactions: vi.fn(),
  getBusinessExpenses: vi.fn(),
  getBusinessCustomers: vi.fn(),
  getBusinessDataStats: vi.fn(),
  getLastExpenseDate: vi.fn(),
  getLastTransactionDate: vi.fn(),
  getLastTransactionUpdateDate: vi.fn(),
  getLastExpenseUpdateDate: vi.fn(),
  getLastCustomerUpdateDate: vi.fn(),
}));

vi.mock("./db", () => ({
  getMarketSignals: vi.fn().mockResolvedValue([]),
  createRecommendation: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  getRecommendations: vi.fn().mockResolvedValue([]),
  updateRecommendationStatus: vi.fn().mockResolvedValue(true),
}));

import { generateStrategyRecommendations } from "./services/strategyCopilotService";
import * as dataService from "./services/businessDataService";

const mockedTransactions = vi.mocked(dataService.getBusinessTransactions);
const mockedExpenses = vi.mocked(dataService.getBusinessExpenses);
const mockedCustomers = vi.mocked(dataService.getBusinessCustomers);
const mockedStats = vi.mocked(dataService.getBusinessDataStats);
const mockedLastTxn = vi.mocked(dataService.getLastTransactionDate);
const mockedLastExp = vi.mocked(dataService.getLastExpenseDate);
const mockedLastTxnUpdate = vi.mocked(dataService.getLastTransactionUpdateDate);
const mockedLastExpUpdate = vi.mocked(dataService.getLastExpenseUpdateDate);
const mockedLastCustUpdate = vi.mocked(dataService.getLastCustomerUpdateDate);

const start = new Date("2026-01-01T00:00:00.000Z");
const end = new Date("2026-01-31T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Strategy Copilot Service (Day 11)", () => {
  it("generates insufficient_data briefing when business has no records", async () => {
    mockedTransactions.mockResolvedValue([]);
    mockedExpenses.mockResolvedValue([]);
    mockedCustomers.mockResolvedValue([]);
    mockedStats.mockResolvedValue({ totalTransactions: 0, totalExpenses: 0, totalCustomers: 0 });
    mockedLastTxn.mockResolvedValue(null);
    mockedLastExp.mockResolvedValue(null);
    mockedLastTxnUpdate.mockResolvedValue(null);
    mockedLastExpUpdate.mockResolvedValue(null);
    mockedLastCustUpdate.mockResolvedValue(null);

    const briefing = await generateStrategyRecommendations(1, start, end);

    expect(briefing.status).toBe("insufficient_data");
    expect(briefing.recommendations).toHaveLength(0);
  });

  it("generates grounded recommendations and evidence tracing when data exists", async () => {
    mockedTransactions.mockResolvedValue([
      { id: 1, businessId: 1, transactionId: "T1", date: new Date("2026-01-15"), amount: "100000", type: "sale", category: "Revenue", description: "Sale", createdAt: new Date() },
    ]);
    mockedExpenses.mockResolvedValue([
      { id: 1, businessId: 1, expenseId: "E1", date: new Date("2026-01-15"), amount: "80000", category: "Payroll", description: "Payroll", createdAt: new Date() },
    ]);
    mockedCustomers.mockResolvedValue([
      { id: 1, businessId: 1, customerId: "C1", name: "Cust 1", email: "c1@test.com", status: "active", createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockedStats.mockResolvedValue({ totalTransactions: 1, totalExpenses: 1, totalCustomers: 1 });
    mockedLastTxn.mockResolvedValue(new Date("2026-01-15"));
    mockedLastExp.mockResolvedValue(new Date("2026-01-15"));
    mockedLastTxnUpdate.mockResolvedValue(new Date("2026-01-15"));
    mockedLastExpUpdate.mockResolvedValue(new Date("2026-01-15"));
    mockedLastCustUpdate.mockResolvedValue(new Date("2026-01-15"));

    const briefing = await generateStrategyRecommendations(1, start, end);

    expect(briefing.status).toBe("ready");
    expect(briefing.recommendations.length).toBeGreaterThan(0);
    
    const rec = briefing.recommendations[0];
    expect(rec.title).toBeDefined();
    expect(rec.priority).toBeDefined();
    expect(rec.reason).toBeDefined();
    expect(rec.evidence.length).toBeGreaterThan(0);
    expect(rec.suggestedNextStep).toBeDefined();
    expect(rec.status).toBe("OPEN");
  });
});
