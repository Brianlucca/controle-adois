import { describe, expect, it } from "vitest";
import { calculateDashboardData } from "./dashboard";
import { calculateFinanceOverview, isCurrentCashTransaction } from "./transaction-calculations";
import { Transaction } from "@/lib/types";

function transaction(
  id: string,
  amount: number,
  type: "income" | "expense",
  status: "paid" | "pending",
  dueDate: string,
  extra: Partial<Transaction> = {}
): Transaction {
  return {
    id,
    amount,
    type,
    status,
    dueDate,
    description: id,
    category: "Casa",
    userId: "user",
    userName: "User",
    createdAt: `${dueDate}T12:00:00.000Z`,
    ...extra,
  };
}

describe("financial position", () => {
  it("carries historical cash and separates current from projected balance", () => {
    const snapshot = [
      transaction("opening-income", 1_000, "income", "paid", "2026-07-10"),
      transaction("paid-bill", 200, "expense", "paid", "2026-08-05"),
      transaction("receivable", 300, "income", "pending", "2026-08-25"),
      transaction("payable", 450, "expense", "pending", "2026-08-28"),
    ];

    const result = calculateDashboardData(
      snapshot.slice(1),
      2_000,
      "2026-08-20",
      snapshot,
      "2026-08-31"
    );

    expect(result.balance).toBe(800);
    expect(result.pendingIncome).toBe(300);
    expect(result.pendingExpense).toBe(450);
    expect(result.projectedBalance).toBe(650);
  });

  it("counts a future bill immediately when it is marked as paid", () => {
    const income = transaction("income", 500, "income", "paid", "2026-08-25", {
      paidAt: "2026-08-20T12:00:00.000Z",
    });
    const expense = transaction("expense", 377, "expense", "paid", "2026-08-25", {
      paidAt: "2026-08-20T12:00:00.000Z",
    });

    expect(isCurrentCashTransaction(income, "2026-08-20")).toBe(false);
    expect(isCurrentCashTransaction(expense, "2026-08-20")).toBe(true);

    const result = calculateDashboardData(
      [transaction("cash", 1_000, "income", "paid", "2026-08-01"), expense],
      2_000,
      "2026-08-20",
      [transaction("cash", 1_000, "income", "paid", "2026-08-01"), expense],
      "2026-08-31"
    );

    expect(result.balance).toBe(623);
    expect(result.pendingExpense).toBe(0);
    expect(calculateFinanceOverview(
      [transaction("cash", 1_000, "income", "paid", "2026-08-01"), expense],
      "2026-08-20"
    ).totalAssets).toBe(623);
  });

  it("includes overdue pending bills in the projection", () => {
    const snapshot = [
      transaction("cash", 500, "income", "paid", "2026-08-01"),
      transaction("overdue", 125, "expense", "pending", "2026-08-10"),
    ];

    const result = calculateDashboardData(
      snapshot,
      1_000,
      "2026-08-20",
      snapshot,
      "2026-08-31"
    );

    expect(result.projectedBalance).toBe(375);
  });

  it("does not count future receivables as current assets", () => {
    const overview = calculateFinanceOverview([
      transaction("cash", 1_000, "income", "paid", "2026-08-01"),
      transaction("future", 4_500, "income", "pending", "2026-09-10"),
    ], "2026-08-20");

    expect(overview.totalAssets).toBe(1_000);
  });

  it("keeps future income out of current assets until its expected date", () => {
    const snapshot = [
      transaction("cash", 1_200, "income", "paid", "2026-08-01"),
      transaction("future-income", 2_000, "income", "paid", "2026-08-25", {
        paidAt: "2026-08-20T12:00:00.000Z",
      }),
      transaction("bills", 2_500, "expense", "pending", "2026-08-28"),
    ];
    const result = calculateDashboardData(snapshot, 4_000, "2026-08-20", snapshot, "2026-08-31");
    expect(result.balance).toBe(1_200);
    expect(result.pendingIncome).toBe(2_000);
    expect(result.projectedBalance).toBe(700);
    expect(calculateFinanceOverview(snapshot, "2026-08-20").totalAssets).toBe(1_200);
  });
});
