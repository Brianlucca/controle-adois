import { describe, expect, it } from "vitest";
import { TransactionSchema } from "./transaction-schema";

const baseTransaction = {
  description: "Mercado",
  amount: 60,
  category: "Alimentação",
  type: "expense" as const,
  status: "paid" as const,
  dueDate: "2026-09-14",
};

describe("transaction schema", () => {
  it("normalizes an empty payer for expenses funded by a joint account", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      fundingSource: "joint",
      paidByUserId: "",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.paidByUserId).toBeNull();
  });

  it("keeps a valid participant identifier", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      fundingSource: "participant",
      paidByUserId: "larissa-user-id",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.paidByUserId).toBe("larissa-user-id");
  });
});
