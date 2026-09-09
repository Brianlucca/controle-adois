import { describe, expect, it } from "vitest";
import { Transaction } from "@/lib/types";
import {
  calculateFinanceOverview,
  filterAndSortTransactions,
} from "./transaction-calculations";

function transaction(
  id: string,
  amount: number,
  type: "income" | "expense",
  status: "paid" | "pending",
  category = "Outros"
): Transaction {
  return {
    id,
    amount,
    type,
    status,
    category,
    description: id,
    dueDate: "2026-09-05",
    userId: "user",
    userName: "User",
    createdAt: "2026-09-05T12:00:00.000Z",
  };
}

const baseFilters = {
  filterTerm: "",
  selectedCategory: "Todas",
  statusFilter: "all" as const,
  dateRange: { from: "2026-09-01", to: "2026-09-30" },
  sortMode: "priority" as const,
  todayKey: "2026-09-09",
};

describe("transaction filters and summary", () => {
  const transactions = [
    transaction("salary", 3_000, "income", "paid", "Salário"),
    transaction("receivable", 800, "income", "pending", "Freelance"),
    transaction("rent", 1_200, "expense", "paid", "Moradia"),
    transaction("market", 300, "expense", "pending", "Alimentação"),
  ];

  it("shows only confirmed income in the received filter", () => {
    const filtered = filterAndSortTransactions(transactions, {
      ...baseFilters,
      statusFilter: "received",
    });

    expect(filtered.map((item) => item.id)).toEqual(["salary"]);
  });

  it("calculates entry and exit cards from the filtered result", () => {
    const filtered = filterAndSortTransactions(transactions, {
      ...baseFilters,
      selectedCategory: "Moradia",
    });
    const overview = calculateFinanceOverview(filtered, baseFilters.todayKey);

    expect(overview.income).toBe(0);
    expect(overview.expense).toBe(1_200);
    expect(overview.pendingExpense).toBe(0);
  });

  it("updates pending totals when the status filter changes", () => {
    const filtered = filterAndSortTransactions(transactions, {
      ...baseFilters,
      statusFilter: "pending",
    });
    const overview = calculateFinanceOverview(filtered, baseFilters.todayKey);

    expect(overview.income).toBe(0);
    expect(overview.expense).toBe(0);
    expect(overview.pendingIncome).toBe(800);
    expect(overview.pendingExpense).toBe(300);
  });
});
