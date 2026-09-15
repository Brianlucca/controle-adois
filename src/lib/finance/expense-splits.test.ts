import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/types";
import {
  calculateCycleSettlement,
  resolveExpenseAllocation,
  resolveExpenseFunding,
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
        fundingSource: "participant",
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
    expect(settlement.settlementExpenses).toHaveLength(2);
    expect(settlement.sharedTransactionCount).toBe(2);
    expect(settlement.participants).toEqual([
      {
        userId: "ana",
        paidCents: 12_000,
        owedCents: 9_000,
        coveredByJointCents: 0,
        balanceCents: 3_000,
      },
      {
        userId: "bia",
        paidCents: 9_000,
        owedCents: 9_000,
        coveredByJointCents: 0,
        balanceCents: 0,
      },
      {
        userId: "caio",
        paidCents: 0,
        owedCents: 3_000,
        coveredByJointCents: 0,
        balanceCents: -3_000,
      },
    ]);
    expect(settlement.transfers).toEqual([
      {
        from: { kind: "participant", id: "caio" },
        to: { kind: "participant", id: "ana" },
        amountCents: 3_000,
      },
    ]);
  });

  it("ignores pending and malformed allocations", () => {
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
    expect(settlement.ignoredTransactionCount).toBe(3);
    expect(settlement.transfers).toEqual([]);
  });

  it("suggests half back when one personal account pays a shared expense", () => {
    const settlement = calculateCycleSettlement(
      [transaction({ amount: 60, shares: [
        { userId: "brian", amountCents: 3_000 },
        { userId: "larissa", amountCents: 3_000 },
      ], paidByUserId: "brian" })],
      ["brian", "larissa"],
    );

    expect(settlement.amountToSettleCents).toBe(3_000);
    expect(settlement.settlementExpenses).toEqual([
      {
        transactionId: "transaction",
        description: "Despesa compartilhada",
        dueDate: "2026-09-13",
        accountId: null,
        amountCents: 6_000,
        paidByUserId: "brian",
        debts: [
          {
            fromUserId: "larissa",
            toUserId: "brian",
            amountCents: 3_000,
          },
        ],
      },
    ]);
    expect(settlement.transfers).toEqual([
      {
        from: { kind: "participant", id: "larissa" },
        to: { kind: "participant", id: "brian" },
        amountCents: 3_000,
      },
    ]);
  });

  it("does not reimburse anyone when a joint account pays a shared expense", () => {
    const settlement = calculateCycleSettlement(
      [transaction({
        accountId: "joint-account",
        amount: 60,
        fundingSource: "joint",
        paidByUserId: null,
        shares: [
          { userId: "brian", amountCents: 3_000 },
          { userId: "larissa", amountCents: 3_000 },
        ],
      })],
      ["brian", "larissa"],
      [{ id: "joint-account", ownership: "joint" }],
    );

    expect(settlement.totalSharedCents).toBe(6_000);
    expect(settlement.jointPaidSharedCents).toBe(6_000);
    expect(settlement.jointFundedCents).toBe(6_000);
    expect(settlement.jointFundedTransactionCount).toBe(1);
    expect(settlement.eligibleTransactionCount).toBe(0);
    expect(settlement.amountToSettleCents).toBe(0);
    expect(settlement.participants.map((participant) => participant.coveredByJointCents)).toEqual([
      3_000,
      3_000,
    ]);
  });

  it("does not infer personal funding before a linked account is available", () => {
    const settlement = calculateCycleSettlement(
      [transaction({
        accountId: "joint-account",
        amount: 60,
        fundingSource: "participant",
        paidByUserId: "brian",
        shares: [
          { userId: "brian", amountCents: 3_000 },
          { userId: "larissa", amountCents: 3_000 },
        ],
      })],
      ["brian", "larissa"],
    );

    expect(settlement.ignoredTransactionCount).toBe(1);
    expect(settlement.amountToSettleCents).toBe(0);
    expect(settlement.transfers).toEqual([]);
  });

  it("reimburses a participant who paid another person's individual expense", () => {
    const settlement = calculateCycleSettlement(
      [transaction({
        amount: 60,
        scope: "individual",
        paidByUserId: "brian",
        beneficiaryUserIds: ["larissa"],
        shares: [{ userId: "larissa", amountCents: 6_000 }],
      })],
      ["brian", "larissa"],
    );

    expect(settlement.transfers).toEqual([
      {
        from: { kind: "participant", id: "larissa" },
        to: { kind: "participant", id: "brian" },
        amountCents: 6_000,
      },
    ]);
  });

  it("never asks participants to replenish a joint account", () => {
    const settlement = calculateCycleSettlement(
      [transaction({
        accountId: "joint-account",
        amount: 60,
        scope: "individual",
        fundingSource: "joint",
        paidByUserId: null,
        beneficiaryUserIds: ["brian"],
        shares: [{ userId: "brian", amountCents: 6_000 }],
      })],
      ["brian", "larissa"],
      [{ id: "joint-account", ownership: "joint" }],
    );

    expect(settlement.jointFundedCents).toBe(6_000);
    expect(settlement.jointFundedTransactionCount).toBe(1);
    expect(settlement.eligibleTransactionCount).toBe(0);
    expect(settlement.settlementExpenses).toEqual([]);
    expect(settlement.transfers).toEqual([]);
  });

  it("derives the funding source from the linked account", () => {
    expect(resolveExpenseFunding({
      account: { id: "ours", ownership: "joint" },
      actorUserId: "brian",
      participantIds: ["brian", "larissa"],
      requestedPaidByUserId: "brian",
    })).toEqual({
      success: true,
      funding: { fundingSource: "joint", paidByUserId: null },
    });

    expect(resolveExpenseFunding({
      account: { id: "larissa-bank", ownership: "partner", ownerUserId: "larissa" },
      actorUserId: "brian",
      participantIds: ["brian", "larissa"],
      requestedPaidByUserId: "brian",
    })).toEqual({
      success: true,
      funding: { fundingSource: "participant", paidByUserId: "larissa" },
    });

    expect(resolveExpenseFunding({
      actorUserId: "brian",
      participantIds: ["brian", "larissa"],
      requestedFundingSource: "joint",
    })).toMatchObject({ success: false });
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
    fundingSource: "participant",
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
