import { describe, expect, it } from "vitest";
import { calculateFinancialAssistant } from "./assistant";
import { Transaction } from "@/lib/types";

const item = (id: string, amount: number, type: "income" | "expense", status: "paid" | "pending", dueDate: string): Transaction => ({
  id, amount, type, status, dueDate, description: id, category: "Geral",
  userId: "u", userName: "U", createdAt: `${dueDate}T12:00:00Z`,
});

describe("financial assistant", () => {
  it("projects scheduled cash without treating future income as current wealth", () => {
    const result = calculateFinancialAssistant([
      item("cash", 1_000, "income", "paid", "2026-08-01"),
      item("future-income", 4_500, "income", "pending", "2026-09-10"),
      item("future-bill", 300, "expense", "pending", "2026-09-15"),
    ], "2026-08-20", 2);

    expect(result.currentBalance).toBe(1_000);
    expect(result.forecast[1].balance).toBe(5_200);
  });
});
