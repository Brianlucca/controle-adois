import { describe, expect, it } from "vitest";
import { calculateGoalContributionPlan } from "./goals";

describe("calculateGoalContributionPlan", () => {
  it("distributes the remaining value through the target month", () => {
    expect(
      calculateGoalContributionPlan(
        { targetAmount: 1_000, currentAmount: 100, targetDate: "2026-11-30" },
        "2026-09-11",
      ),
    ).toEqual({
      status: "active",
      remainingAmount: 900,
      monthsRemaining: 3,
      monthlyAmount: 300,
    });
  });

  it("rounds contributions up to cents so the target can be reached", () => {
    const plan = calculateGoalContributionPlan(
      { targetAmount: 100, currentAmount: 0, targetDate: "2026-11-01" },
      "2026-09-11",
    );

    expect(plan.monthlyAmount).toBe(33.34);
  });

  it("uses one contribution when the deadline is in the current month", () => {
    const plan = calculateGoalContributionPlan(
      { targetAmount: 500, currentAmount: 125, targetDate: "2026-09-30" },
      "2026-09-11",
    );

    expect(plan.monthsRemaining).toBe(1);
    expect(plan.monthlyAmount).toBe(375);
  });

  it("identifies completed and overdue goals", () => {
    expect(
      calculateGoalContributionPlan(
        { targetAmount: 500, currentAmount: 500, targetDate: "2026-01-01" },
        "2026-09-11",
      ).status,
    ).toBe("completed");

    expect(
      calculateGoalContributionPlan(
        { targetAmount: 500, currentAmount: 100, targetDate: "2026-09-10" },
        "2026-09-11",
      ),
    ).toMatchObject({ status: "overdue", remainingAmount: 400 });
  });
});
