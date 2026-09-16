import { describe, expect, it } from "vitest";
import { FinancialBudgetSchema } from "@/lib/finance/budget-schema";
import type { FinancialBudget } from "@/lib/finance/budget-types";
import type { Transaction } from "@/lib/types";
import {
  calculateBudgetOverview,
  calculateBudgetUsage,
  getBudgetAlertThreshold,
  getBudgetHealth,
  getCycleProgressPercentage,
  getRemainingCycleDays,
} from "./budgets";

const cycleRange = { from: "2026-09-01", to: "2026-09-30" };

function budget(overrides: Partial<FinancialBudget> = {}): FinancialBudget {
  return {
    id: "a".repeat(32),
    categoryId: "builtin-alimentacao",
    category: "Alimentação",
    categoryAliases: ["Alimentação"],
    limitCents: 100_000,
    scope: "shared",
    participantUserId: null,
    responsibleUserId: "brian",
    createdAt: "2026-09-01T10:00:00.000Z",
    createdBy: "brian",
    updatedAt: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function expense(
  id: string,
  amount: number,
  status: "paid" | "pending",
  overrides: Partial<Transaction> = {},
): Transaction {
  const amountCents = Math.round(amount * 100);
  return {
    id,
    description: id,
    amount,
    type: "expense",
    category: "Alimentação",
    status,
    dueDate: "2026-09-10",
    userId: "brian",
    userName: "Brian",
    scope: "shared",
    fundingSource: "joint",
    paidByUserId: null,
    responsibleUserId: "brian",
    beneficiaryUserIds: ["brian", "larissa"],
    splitMethod: "equal",
    shares: [
      { userId: "brian", amountCents: Math.ceil(amountCents / 2) },
      { userId: "larissa", amountCents: Math.floor(amountCents / 2) },
    ],
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("shared budgets", () => {
  it("separates paid and pending expenses without changing financial balances", () => {
    const usage = calculateBudgetUsage({
      budget: budget(),
      transactions: [expense("market", 400, "paid"), expense("dinner", 150, "pending")],
      cycleRange,
      todayKey: "2026-09-15",
    });

    expect(usage.spentCents).toBe(40_000);
    expect(usage.pendingCents).toBe(15_000);
    expect(usage.projectedCents).toBe(55_000);
    expect(usage.remainingCents).toBe(60_000);
    expect(usage.participantUsage).toEqual([
      { userId: "brian", spentCents: 20_000, pendingCents: 7_500 },
      { userId: "larissa", spentCents: 20_000, pendingCents: 7_500 },
    ]);
  });

  it("ignores individual, deleted, out-of-cycle, other-category and malformed expenses", () => {
    const usage = calculateBudgetUsage({
      budget: budget(),
      transactions: [
        expense("individual", 100, "paid", {
          scope: "individual",
          beneficiaryUserIds: ["brian"],
          shares: [{ userId: "brian", amountCents: 10_000 }],
        }),
        expense("deleted", 100, "paid", { deletedAt: "2026-09-11T10:00:00Z" }),
        expense("old", 100, "paid", { dueDate: "2026-08-31" }),
        expense("health", 100, "paid", { category: "Saúde" }),
        expense("malformed", 100, "paid", {
          shares: [{ userId: "brian", amountCents: 9_999 }],
        }),
      ],
      cycleRange,
      todayKey: "2026-09-15",
    });

    expect(usage.spentCents).toBe(0);
    expect(usage.pendingCents).toBe(0);
  });

  it("keeps renamed categories connected through their previous names", () => {
    const usage = calculateBudgetUsage({
      budget: budget({
        category: "Comida do mês",
        categoryAliases: ["Comida do mês", "Alimentação"],
      }),
      transactions: [expense("old-name", 120, "paid")],
      cycleRange,
      todayKey: "2026-09-15",
    });

    expect(usage.spentCents).toBe(12_000);
  });
});

describe("individual budgets", () => {
  it("counts only the participant share, regardless of who paid", () => {
    const usage = calculateBudgetUsage({
      budget: budget({
        scope: "individual",
        participantUserId: "larissa",
        limitCents: 50_000,
      }),
      transactions: [
        expense("shared-market", 300, "paid"),
        expense("market", 300, "paid", {
          scope: "individual",
          fundingSource: "participant",
          paidByUserId: "brian",
          responsibleUserId: "larissa",
          beneficiaryUserIds: ["larissa"],
          shares: [{ userId: "larissa", amountCents: 30_000 }],
        }),
      ],
      cycleRange,
      todayKey: "2026-09-15",
    });

    expect(usage.spentCents).toBe(30_000);
    expect(usage.usedPercentage).toBe(60);
    expect(usage.participantUsage).toEqual([
      { userId: "larissa", spentCents: 30_000, pendingCents: 0 },
    ]);
  });
});

describe("budget alerts and overview", () => {
  it("uses progressive thresholds", () => {
    expect(getBudgetAlertThreshold(49.99)).toBe(0);
    expect(getBudgetAlertThreshold(50)).toBe(50);
    expect(getBudgetAlertThreshold(75)).toBe(75);
    expect(getBudgetAlertThreshold(90)).toBe(90);
    expect(getBudgetAlertThreshold(100)).toBe(100);
  });

  it("warns about an unhealthy pace and pending commitments", () => {
    expect(
      getBudgetHealth({
        usedPercentage: 60,
        projectedPercentage: 70,
        cycleProgressPercentage: 25,
      }),
    ).toBe("attention");
    expect(
      getBudgetHealth({
        usedPercentage: 70,
        projectedPercentage: 105,
        cycleProgressPercentage: 70,
      }),
    ).toBe("critical");
    expect(
      getBudgetHealth({
        usedPercentage: 101,
        projectedPercentage: 101,
        cycleProgressPercentage: 100,
      }),
    ).toBe("exceeded");
  });

  it("calculates inclusive cycle progress and aggregates cards", () => {
    expect(getCycleProgressPercentage(cycleRange, "2026-09-15")).toBe(50);
    expect(getCycleProgressPercentage(cycleRange, "2026-08-20")).toBe(0);
    expect(getCycleProgressPercentage(cycleRange, "2026-10-01")).toBe(100);
    expect(getRemainingCycleDays(cycleRange, "2026-09-15")).toBe(15);
    expect(getRemainingCycleDays(cycleRange, "2026-09-30")).toBe(0);

    const usage = calculateBudgetUsage({
      budget: budget(),
      transactions: [expense("market", 400, "paid")],
      cycleRange,
      todayKey: "2026-09-15",
    });
    expect(calculateBudgetOverview([usage, usage])).toEqual({
      limitCents: 200_000,
      spentCents: 80_000,
      pendingCents: 0,
      remainingCents: 120_000,
      atRiskCount: 0,
    });
  });
});

describe("budget input validation", () => {
  it("requires a participant only for individual limits", () => {
    expect(
      FinancialBudgetSchema.safeParse({
        categoryId: "builtin-moradia",
        category: "Moradia",
        limitAmount: 500,
        scope: "individual",
        responsibleUserId: "brian",
      }).success,
    ).toBe(false);
    expect(
      FinancialBudgetSchema.safeParse({
        categoryId: "builtin-moradia",
        category: "Moradia",
        limitAmount: 500,
        scope: "shared",
        participantUserId: null,
        responsibleUserId: "brian",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed category references and excessive values", () => {
    expect(
      FinancialBudgetSchema.safeParse({
        categoryId: "",
        category: "Categoria inventada",
        limitAmount: 500,
        scope: "shared",
        responsibleUserId: "brian",
      }).success,
    ).toBe(false);
    expect(
      FinancialBudgetSchema.safeParse({
        categoryId: "builtin-moradia",
        category: "Moradia",
        limitAmount: 1_000_000_001,
        scope: "shared",
        responsibleUserId: "brian",
      }).success,
    ).toBe(false);
  });
});
