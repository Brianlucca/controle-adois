import { describe, expect, it } from "vitest";
import { calculateFinancialPosition } from "./financial-position";
import { calculateDashboardData } from "./dashboard";
import { Transaction } from "@/lib/types";

const item = (id: string, amount: number, type: "income" | "expense", status: "paid" | "pending", dueDate: string): Transaction => ({
  id, description: id, amount, type, status, dueDate, category: "Geral",
  userId: "u", userName: "U", createdAt: `${dueDate}T12:00:00Z`,
});

describe("single financial position source", () => {
  it("returns the same projection consumed by dashboard and transactions", () => {
    const transactions = [
      item("saldo", 1_242.36, "income", "paid", "2026-08-01"),
      item("receber", 3_000, "income", "paid", "2026-08-25"),
      item("contas", 3_276.95, "expense", "pending", "2026-08-28"),
    ];
    const position = calculateFinancialPosition(transactions, "2026-08-20", "2026-09-04");
    const dashboard = calculateDashboardData(transactions, 5_000, "2026-08-20", transactions, "2026-09-04");

    expect(position.projectedBalance).toBeCloseTo(965.41);
    expect(dashboard.projectedBalance).toBe(position.projectedBalance);
    expect(dashboard.pendingIncome).toBe(position.scheduledIncome);
    expect(dashboard.pendingExpense).toBe(position.scheduledExpense);
  });
});
