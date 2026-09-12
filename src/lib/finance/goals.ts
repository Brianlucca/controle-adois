export interface GoalContributionInput {
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalContributionPlan {
  status: "active" | "completed" | "overdue";
  remainingAmount: number;
  monthsRemaining: number;
  monthlyAmount: number;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function calculateGoalContributionPlan(
  goal: GoalContributionInput,
  todayKey: string,
): GoalContributionPlan {
  if (!DATE_KEY_PATTERN.test(goal.targetDate) || !DATE_KEY_PATTERN.test(todayKey)) {
    throw new RangeError("As datas devem estar no formato AAAA-MM-DD.");
  }
  if (
    !Number.isFinite(goal.targetAmount) ||
    !Number.isFinite(goal.currentAmount) ||
    goal.targetAmount < 0 ||
    goal.currentAmount < 0
  ) {
    throw new RangeError("Os valores do objetivo devem ser números positivos.");
  }

  const targetCents = Math.round(goal.targetAmount * 100);
  const currentCents = Math.round(goal.currentAmount * 100);
  const remainingCents = Math.max(0, targetCents - currentCents);

  if (remainingCents === 0) {
    return {
      status: "completed",
      remainingAmount: 0,
      monthsRemaining: 0,
      monthlyAmount: 0,
    };
  }

  if (goal.targetDate < todayKey) {
    return {
      status: "overdue",
      remainingAmount: remainingCents / 100,
      monthsRemaining: 0,
      monthlyAmount: 0,
    };
  }

  const [targetYear, targetMonth] = goal.targetDate.split("-").map(Number);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const monthsRemaining =
    (targetYear - todayYear) * 12 + targetMonth - todayMonth + 1;

  return {
    status: "active",
    remainingAmount: remainingCents / 100,
    monthsRemaining,
    monthlyAmount: Math.ceil(remainingCents / monthsRemaining) / 100,
  };
}
