import { describe, expect, it } from "vitest";
import { Transaction } from "@/lib/types";
import { mergeTransactionRange, trimFinanceCache } from "./finance-cache";

const item = (id: string, dueDate: string, status: "paid" | "pending" = "pending"): Transaction => ({
  id, dueDate, status, description: id, amount: 10, type: "expense", category: "Outros", userId: "u", userName: "U", createdAt: `${dueDate}T12:00:00Z`,
});

describe("finance cache", () => {
  it("replaces only the synchronized range and preserves other periods", () => {
    const result = mergeTransactionRange(
      [item("old", "2026-06-10"), item("deleted-remotely", "2026-08-10"), item("changed", "2026-08-12")],
      [item("changed", "2026-08-12", "paid"), item("new", "2026-08-15")],
      { from: "2026-08-01", to: "2026-08-31" }
    );
    expect(result.map((entry) => entry.id).sort()).toEqual(["changed", "new", "old"]);
    expect(result.find((entry) => entry.id === "changed")?.status).toBe("paid");
  });

  it("preserves the full history required to calculate the real balance", () => {
    const items = Array.from({ length: 1502 }, (_, index) => item(String(index), `2026-${String(Math.floor(index / 28) % 12 + 1).padStart(2, "0")}-${String(index % 28 + 1).padStart(2, "0")}`));
    expect(trimFinanceCache(items)).toHaveLength(1502);
  });
});
