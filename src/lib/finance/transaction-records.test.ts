import { describe, expect, it } from "vitest";
import {
  getRecurringOccurrenceStatus,
  getRecurrenceEditRange,
  getRemainingRecurrenceMonths,
  getRecurrenceDisplayKey,
} from "./transaction-records";

describe("transaction status rules", () => {
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

});
