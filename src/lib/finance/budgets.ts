import type { FinancialBudget, BudgetUsage } from "@/lib/finance/budget-types";
import type { DateRange, ExpenseShare, Transaction } from "@/lib/types";
import { moneyToCents } from "@/lib/finance/expense-splits";
import { normalizeCategoryKey } from "@/lib/finance/categories";

export function calculateBudgetUsage({
  budget,
  transactions,
  cycleRange,
  todayKey,
}: {
  budget: FinancialBudget;
  transactions: Transaction[];
  cycleRange: DateRange;
  todayKey: string;
}): BudgetUsage {
  const participants = new Map<string, { spentCents: number; pendingCents: number }>();
  let spentCents = 0;
  let pendingCents = 0;

  transactions.forEach((transaction) => {
    const allocation = getBudgetAllocation(transaction, budget, cycleRange);
    if (!allocation) return;

    const target = transaction.status === "paid" ? "spentCents" : "pendingCents";
    if (target === "spentCents") spentCents += allocation.amountCents;
    else pendingCents += allocation.amountCents;

    allocation.shares.forEach((share) => {
      const current = participants.get(share.userId) || {
        spentCents: 0,
        pendingCents: 0,
      };
      current[target] += share.amountCents;
      participants.set(share.userId, current);
    });
  });

  const projectedCents = spentCents + pendingCents;
  const usedPercentage = percentage(spentCents, budget.limitCents);
  const projectedPercentage = percentage(projectedCents, budget.limitCents);
  const cycleProgressPercentage = getCycleProgressPercentage(cycleRange, todayKey);
  const remainingCycleDays = getRemainingCycleDays(cycleRange, todayKey);
  const threshold = getBudgetAlertThreshold(usedPercentage);

  return {
    budget,
    spentCents,
    pendingCents,
    projectedCents,
    remainingCents: budget.limitCents - spentCents,
    projectedRemainingCents: budget.limitCents - projectedCents,
    usedPercentage,
    projectedPercentage,
    cycleProgressPercentage,
    remainingCycleDays,
    suggestedDailyCents:
      remainingCycleDays > 0
        ? Math.max(
            0,
            Math.floor((budget.limitCents - spentCents) / remainingCycleDays),
          )
        : 0,
    threshold,
    health: getBudgetHealth({
      usedPercentage,
      projectedPercentage,
      cycleProgressPercentage,
    }),
    participantUsage: [...participants.entries()]
      .map(([userId, usage]) => ({ userId, ...usage }))
      .sort((left, right) =>
        right.spentCents + right.pendingCents -
        (left.spentCents + left.pendingCents),
      ),
  };
}

export function calculateBudgetOverview(usages: BudgetUsage[]) {
  return usages.reduce(
    (summary, usage) => ({
      limitCents: summary.limitCents + usage.budget.limitCents,
      spentCents: summary.spentCents + usage.spentCents,
      pendingCents: summary.pendingCents + usage.pendingCents,
      remainingCents: summary.remainingCents + usage.remainingCents,
      atRiskCount:
        summary.atRiskCount + (usage.health === "healthy" ? 0 : 1),
    }),
    {
      limitCents: 0,
      spentCents: 0,
      pendingCents: 0,
      remainingCents: 0,
      atRiskCount: 0,
    },
  );
}

export function getBudgetAlertThreshold(
  usedPercentage: number,
): 0 | 50 | 75 | 90 | 100 {
  if (usedPercentage >= 100) return 100;
  if (usedPercentage >= 90) return 90;
  if (usedPercentage >= 75) return 75;
  if (usedPercentage >= 50) return 50;
  return 0;
}

export function getBudgetHealth({
  usedPercentage,
  projectedPercentage,
  cycleProgressPercentage,
}: {
  usedPercentage: number;
  projectedPercentage: number;
  cycleProgressPercentage: number;
}) {
  if (usedPercentage >= 100) return "exceeded" as const;
  if (usedPercentage >= 90 || projectedPercentage > 100) return "critical" as const;

  const paceTolerance = Math.max(15, cycleProgressPercentage * 0.2);
  if (
    usedPercentage >= 75 ||
    usedPercentage > cycleProgressPercentage + paceTolerance
  ) {
    return "attention" as const;
  }

  return "healthy" as const;
}

export function getCycleProgressPercentage(range: DateRange, todayKey: string) {
  const from = dateKeyToUtc(range.from);
  const to = dateKeyToUtc(range.to);
  const today = dateKeyToUtc(todayKey);
  if (from === null || to === null || today === null || to < from) return 0;

  const dayMs = 86_400_000;
  const totalDays = Math.floor((to - from) / dayMs) + 1;
  if (today < from) return 0;
  if (today > to) return 100;
  const elapsedDays = Math.floor((today - from) / dayMs) + 1;
  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
}

export function getRemainingCycleDays(range: DateRange, todayKey: string) {
  const from = dateKeyToUtc(range.from);
  const to = dateKeyToUtc(range.to);
  const today = dateKeyToUtc(todayKey);
  if (from === null || to === null || today === null || to < from || today >= to) {
    return 0;
  }
  const effectiveToday = Math.max(today, from - 86_400_000);
  return Math.max(0, Math.floor((to - effectiveToday) / 86_400_000));
}

function getBudgetAllocation(
  transaction: Transaction,
  budget: FinancialBudget,
  range: DateRange,
) {
  if (
    transaction.type !== "expense" ||
    transaction.deletedAt ||
    !budget.categoryAliases.some(
      (category) =>
        normalizeCategoryKey(category) === normalizeCategoryKey(transaction.category),
    ) ||
    transaction.dueDate < range.from ||
    transaction.dueDate > range.to
  ) {
    return null;
  }

  const amountCents = moneyToCents(transaction.amount);
  if (amountCents <= 0) return null;
  const shares = getValidShares(transaction.shares, amountCents);
  if (!shares) return null;

  if (budget.scope === "shared") {
    if (transaction.scope !== "shared") return null;
    return { amountCents, shares };
  }

  if (!budget.participantUserId) return null;
  if (transaction.scope !== "individual") return null;
  const participantShare = shares.find(
    (share) => share.userId === budget.participantUserId,
  );
  if (!participantShare) return null;
  return { amountCents: participantShare.amountCents, shares: [participantShare] };
}

function getValidShares(
  shares: ExpenseShare[] | undefined,
  amountCents: number,
) {
  if (!shares?.length) return null;
  const userIds = new Set(shares.map((share) => share.userId));
  const totalCents = shares.reduce((total, share) => total + share.amountCents, 0);
  if (
    userIds.size !== shares.length ||
    totalCents !== amountCents ||
    shares.some(
      (share) =>
        !share.userId ||
        !Number.isSafeInteger(share.amountCents) ||
        share.amountCents <= 0,
    )
  ) {
    return null;
  }
  return shares;
}

function percentage(valueCents: number, limitCents: number) {
  if (limitCents <= 0) return 0;
  return (valueCents / limitCents) * 100;
}

function dateKeyToUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return timestamp;
}
