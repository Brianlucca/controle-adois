import { describe, expect, it } from "vitest";
import { getFinancialCycleRange, inferFinancialCycleStartDay } from "./financial-cycle";
import { Transaction } from "@/lib/types";

const income = (date: string): Transaction => ({ id: date, description: "Salário", amount: 3000, type: "income", category: "Salário", status: "paid", dueDate: date, userId: "u", userName: "U", createdAt: date });

describe("personal financial cycle", () => {
  it("infers payday from repeated income dates", () => {
    expect(inferFinancialCycleStartDay([income("2026-06-13"), income("2026-07-13"), income("2026-08-13")])).toBe(13);
  });
  it("builds a cycle from the 13th through the 12th", () => {
    expect(getFinancialCycleRange(new Date("2026-08-20T12:00:00"), 13, 12)).toEqual({ from: "2026-08-13", to: "2026-09-12" });
  });
  it("uses the previous cycle before payday", () => {
    expect(getFinancialCycleRange(new Date("2026-08-05T12:00:00"), 13, 12)).toEqual({ from: "2026-07-13", to: "2026-08-12" });
  });
  it("supports a cycle ending on the same numbered day next month", () => {
    expect(getFinancialCycleRange(new Date("2026-08-20T12:00:00"), 13, 13)).toEqual({ from: "2026-08-13", to: "2026-09-13" });
  });
});
