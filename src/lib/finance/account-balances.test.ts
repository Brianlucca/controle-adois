import { describe, expect, it } from "vitest";
import {
  calculateAccountBalances,
  projectTransferBalances,
  summarizeAccountBalances,
} from "./account-balances";
import { AccountTransfer, FinancialAccount } from "./account-types";

const account = (
  id: string,
  openingBalance: number,
  ownership: FinancialAccount["ownership"] = "joint",
): Omit<FinancialAccount, "currentBalance"> => ({
  id,
  name: id,
  institutionName: "Banco",
  type: "checking",
  ownership,
  openingBalance,
  openingBalanceDate: "2026-09-01",
  createdAt: "2026-09-01T00:00:00.000Z",
});

const transfer = (overrides: Partial<AccountTransfer> = {}): AccountTransfer => ({
  id: "transfer-1",
  sourceAccountId: "a",
  destinationAccountId: "b",
  amount: 250,
  date: "2026-09-12",
  description: "Reserva",
  responsibleUserId: "user-1",
  responsibleName: "Pessoa",
  createdAt: "2026-09-12T00:00:00.000Z",
  ...overrides,
});

describe("account balances", () => {
  it("combines opening balance with paid account transactions", () => {
    const [result] = calculateAccountBalances(
      [account("a", 1_000)],
      [
        { accountId: "a", amount: 500, dueDate: "2026-09-05", type: "income", status: "paid" },
        { accountId: "a", amount: 125.55, dueDate: "2026-09-06", type: "expense", status: "paid" },
        { accountId: "a", amount: 900, dueDate: "2026-09-07", type: "expense", status: "pending" },
        { accountId: "a", amount: 50, dueDate: "2026-09-08", type: "expense", status: "paid", deletedAt: "2026-09-12" },
      ],
      [],
    );

    expect(result.currentBalance).toBe(1_374.45);
  });

  it("does not count transactions before the opening balance date", () => {
    const [result] = calculateAccountBalances(
      [account("a", 1_000)],
      [
        { accountId: "a", amount: 400, dueDate: "2026-08-31", type: "income", status: "paid" },
        { accountId: "a", amount: 100, dueDate: "2026-09-01", type: "expense", status: "paid" },
      ],
      [],
    );

    expect(result.currentBalance).toBe(900);
  });

  it("uses the payment date when it is available", () => {
    const [result] = calculateAccountBalances(
      [account("a", 1_000)],
      [
        {
          accountId: "a",
          amount: 250,
          dueDate: "2026-08-15",
          paidAt: "2026-09-10T14:30:00.000Z",
          type: "expense",
          status: "paid",
        },
      ],
      [],
    );

    expect(result.currentBalance).toBe(750);
  });

  it("moves money without changing the couple total", () => {
    const result = calculateAccountBalances(
      [account("a", 1_000, "mine"), account("b", 500, "joint")],
      [],
      [transfer()],
    );

    expect(result.map((item) => item.currentBalance)).toEqual([750, 750]);
    expect(summarizeAccountBalances(result).total).toBe(1_500);
  });

  it("ignores reversed transfers and unknown accounts", () => {
    const result = calculateAccountBalances(
      [account("a", 100)],
      [],
      [
        transfer({ destinationAccountId: "missing" }),
        transfer({ id: "reversed", amount: 80, reversedAt: "2026-09-13" }),
      ],
    );

    expect(result[0].currentBalance).toBe(100);
  });

  it("excludes archived accounts from the ownership summary", () => {
    const accounts: FinancialAccount[] = [
      { ...account("a", 100, "mine"), currentBalance: 100 },
      { ...account("b", 900, "joint"), currentBalance: 900, archivedAt: "2026-09-12" },
    ];

    expect(summarizeAccountBalances(accounts)).toEqual({
      total: 100,
      mine: 100,
      partner: 0,
      joint: 0,
    });
  });

  it("projects both transfer balances with cent precision", () => {
    expect(projectTransferBalances(100.1, 20.2, 30.05)).toEqual({
      sourceBalance: 70.05,
      destinationBalance: 50.25,
    });
  });
});
