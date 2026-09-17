import { describe, expect, it } from "vitest";
import {
  getRecurringOccurrenceStatus,
  getRecurrenceEditRange,
  getRemainingRecurrenceMonths,
  getRecurrenceDisplayKey,
  getStatusAfterDateChange,
  isFutureCompletedTransaction,
} from "./transaction-records";

describe("transaction status rules", () => {
  it("changes a future transaction to pending", () => {
    expect(
      getStatusAfterDateChange("paid", "2026-10-01", "2026-09-13"),
    ).toBe("pending");
  });

  it("preserves the selected status for today or a past date", () => {
    expect(
      getStatusAfterDateChange("paid", "2026-09-13", "2026-09-13"),
    ).toBe("paid");
    expect(
      getStatusAfterDateChange("pending", "2026-09-01", "2026-09-13"),
    ).toBe("pending");
  });

  it("keeps only the first recurring occurrence completed", () => {
    expect(getRecurringOccurrenceStatus("paid", 0)).toBe("paid");
    expect(getRecurringOccurrenceStatus("paid", 1)).toBe("pending");
    expect(getRecurringOccurrenceStatus("paid", 11)).toBe("pending");
  });

  it("treats the edited duration as starting at the selected occurrence", () => {
    expect(getRecurrenceEditRange(10, 3)).toEqual({
      startIndex: 10,
      endIndex: 12,
    });
  });

  it("shows the remaining duration from the selected occurrence", () => {
    expect(getRemainingRecurrenceMonths(10, 12, 12)).toBe(3);
    expect(getRemainingRecurrenceMonths(undefined, undefined, 6)).toBe(6);
  });

  it("identifies duplicate recurrence representatives from legacy groups", () => {
    const base = {
      description: " Plano Odontológico ",
      amount: 52.45,
      category: "Saúde",
      accountId: "joint-account",
      dueDate: "2026-10-10",
    };
    expect(getRecurrenceDisplayKey(base)).toBe(
      getRecurrenceDisplayKey({
        ...base,
        description: "plano odontológico",
        dueDate: "2027-01-10",
      }),
    );
  });

  it("identifies an invalid completed status only before the due date", () => {
    expect(
      isFutureCompletedTransaction("paid", "2026-10-05", "2026-09-14"),
    ).toBe(true);
    expect(
      isFutureCompletedTransaction("pending", "2026-10-05", "2026-09-14"),
    ).toBe(false);
    expect(
      isFutureCompletedTransaction("paid", "2026-09-14", "2026-09-14"),
    ).toBe(false);
  });
});
