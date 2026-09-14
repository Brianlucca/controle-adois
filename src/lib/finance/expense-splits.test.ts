import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/types";
import {
  calculateCycleSettlement,
  resolveExpenseAllocation,
  splitCentsEqually,
} from "./expense-splits";

describe("expense splits", () => {
  it("distributes cent remainders without losing money", () => {
    expect(splitCentsEqually(1_000, ["ana", "bia", "caio"])).toEqual([
      { userId: "ana", amountCents: 334 },
      { userId: "bia", amountCents: 333 },
      { userId: "caio", amountCents: 333 },
    ]);
  });

  it("builds a secure default individual allocation", () => {
    expect(
      resolveExpenseAllocation({
        amountCents: 19_029,
        actorUserId: "ana",
        participantIds: ["ana", "bia"],
        request: {},
      }),
    ).toEqual({
      success: true,
      allocation: {
        scope: "individual",
        paidByUserId: "ana",
        responsibleUserId: "ana",
        beneficiaryUserIds: ["ana"],
        splitMethod: "equal",
        shares: [{ userId: "ana", amountCents: 19_029 }],
      },
    });
  });

  it("rejects outsiders and custom shares that do not close the total", () => {
    const outsider = resolveExpenseAllocation({
      amountCents: 10_000,
      actorUserId: "ana",
      participantIds: ["ana", "bia"],
      request: {
        scope: "shared",
        beneficiaryUserIds: ["ana", "outsider"],
      },
    });
    const invalidTotal = resolveExpenseAllocation({
      amountCents: 10_000,
      actorUserId: "ana",
      participantIds: ["ana", "bia"],
      request: {
        scope: "shared",
        beneficiaryUserIds: ["ana", "bia"],
        splitMethod: "custom",
        shares: [
          { userId: "ana", amountCents: 4_000 },
          { userId: "bia", amountCents: 5_000 },
        ],
      },
    });

    expect(outsider).toMatchObject({ success: false });
    expect(invalidTotal).toEqual({
      success: false,
      error: "A soma das partes precisa ser exatamente igual ao valor da despesa.",
    });
  });

  it("calculates who paid, who owed and the smallest settlement", () => {
    const transactions = [
      transaction({
        id: "market",
        amount: 120,
        paidByUserId: "ana",
        shares: [
          { userId: "ana", amountCents: 6_000 },
          { userId: "bia", amountCents: 6_000 },
        ],
      }),
      transaction({
        id: "rent",
        amount: 90,
        paidByUserId: "bia",
        shares: [
          { userId: "ana", amountCents: 3_000 },
          { userId: "bia", amountCents: 3_000 },
          { userId: "caio", amountCents: 3_000 },
        ],
      }),
    ];

    const settlement = calculateCycleSettlement(transactions, [
      "ana",
      "bia",
      "caio",
    ]);

    expect(settlement.totalSharedCents).toBe(21_000);
    expect(settlement.amountToSettleCents).toBe(3_000);
    expect(settlement.eligibleTransactionCount).toBe(2);
    expect(settlement.participants).toEqual([
      { userId: "ana", paidCents: 12_000, owedCents: 9_000, balanceCents: 3_000 },
      { userId: "bia", paidCents: 9_000, owedCents: 9_000, balanceCents: 0 },
      { userId: "caio", paidCents: 0, owedCents: 3_000, balanceCents: -3_000 },
    ]);
    expect(settlement.transfers).toEqual([
      { fromUserId: "caio", toUserId: "ana", amountCents: 3_000 },
    ]);
  });

  it("ignores pending, individual and malformed shared expenses", () => {
    const pending = transaction({ id: "pending", status: "pending" });
    const individual = transaction({ id: "mine", scope: "individual" });
    const malformed = transaction({ id: "broken", shares: [] });
    const duplicateParticipant = transaction({
      id: "duplicate",
      shares: [
        { userId: "ana", amountCents: 5_000 },
        { userId: "ana", amountCents: 5_000 },
      ],
    });

    const settlement = calculateCycleSettlement(
      [pending, individual, malformed, duplicateParticipant],
      ["ana", "bia"],
    );

    expect(settlement.totalSharedCents).toBe(0);
    expect(settlement.eligibleTransactionCount).toBe(0);
    expect(settlement.ignoredTransactionCount).toBe(2);
    expect(settlement.transfers).toEqual([]);
  });
});

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "transaction",
    description: "Despesa compartilhada",
    amount: 100,
    type: "expense",
    category: "Outros",
    status: "paid",
    dueDate: "2026-09-13",
    userId: "ana",
    userName: "Ana",
    createdAt: "2026-09-13T12:00:00.000Z",
    scope: "shared",
    paidByUserId: "ana",
    responsibleUserId: "ana",
    beneficiaryUserIds: ["ana", "bia"],
    splitMethod: "equal",
    shares: [
      { userId: "ana", amountCents: 5_000 },
      { userId: "bia", amountCents: 5_000 },
    ],
    ...overrides,
  };
}
