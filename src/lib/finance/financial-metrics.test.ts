import { describe, expect, it } from "vitest";
import { Transaction } from "@/lib/types";
import { calculatePeriodFinancialMetrics } from "./financial-metrics";
import { calculateReportsData } from "./reports";
import { calculateDashboardData } from "./dashboard";

const item = (id: string, amount: number, type: "income" | "expense", status: "paid" | "pending", dueDate: string): Transaction => ({
  id, description: id, amount, type, status, dueDate, category: "Outros", userId: "u", userName: "U", createdAt: dueDate,
});

describe("shared financial metrics", () => {
  it("keeps dashboard and reports on the same confirmed period totals", () => {
    const transactions = [
      item("income", 2_000, "income", "paid", "2026-08-10"),
      item("expense", 400, "expense", "paid", "2026-08-11"),
      item("pending", 900, "expense", "pending", "2026-08-12"),
      item("future-paid", 700, "income", "paid", "2026-08-25"),
    ];
    const metrics = calculatePeriodFinancialMetrics(transactions, "2026-08-20");
    const reports = calculateReportsData(transactions, "2026-08-20");
    const dashboard = calculateDashboardData(transactions, 3_000, "2026-08-20", transactions, "2026-09-04");
    expect(metrics.totalIncome).toBe(2_000);
    expect(metrics.totalExpense).toBe(400);
    expect(reports.totalIncome).toBe(metrics.totalIncome);
    expect(reports.totalExpense).toBe(metrics.totalExpense);
    expect(reports.cumulativeData.at(-1)?.Acumulado).toBe(1_600);
    expect(dashboard.income).toBe(metrics.totalIncome);
    expect(dashboard.expense).toBe(metrics.totalExpense);
  });
});
