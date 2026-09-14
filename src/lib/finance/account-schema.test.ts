import { describe, expect, it } from "vitest";
import {
  AccountIdSchema,
  AccountTransferSchema,
  FinancialAccountSchema,
} from "./account-schema";

describe("financial account schema", () => {
  it("normalizes account text and coerces the balance", () => {
    const result = FinancialAccountSchema.parse({
      name: "  Conta do casal  ",
      institutionName: "  Banco Roxo  ",
      type: "checking",
      ownership: "joint",
      openingBalance: "1250.55",
      openingBalanceDate: "2026-09-12",
    });

    expect(result).toMatchObject({
      name: "Conta do casal",
      institutionName: "Banco Roxo",
      openingBalance: 1250.55,
    });
  });

  it("rejects impossible calendar dates", () => {
    const result = FinancialAccountSchema.safeParse({
      name: "Conta principal",
      institutionName: "Banco",
      type: "checking",
      ownership: "joint",
      openingBalance: 0,
      openingBalanceDate: "2026-02-30",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a workspace user as the account owner", () => {
    const result = FinancialAccountSchema.parse({
      name: "Conta dela",
      institutionName: "Banco",
      type: "checking",
      ownership: "partner",
      ownerUserId: "partner-user-id",
      openingBalance: 0,
      openingBalanceDate: "2026-09-12",
    });

    expect(result.ownerUserId).toBe("partner-user-id");
  });

  it("rejects an owner identifier containing a path separator", () => {
    const result = FinancialAccountSchema.safeParse({
      name: "Conta dela",
      institutionName: "Banco",
      type: "checking",
      ownership: "partner",
      ownerUserId: "users/partner-user-id",
      openingBalance: 0,
      openingBalanceDate: "2026-09-12",
    });

    expect(result.success).toBe(false);
  });
});

describe("account transfer schema", () => {
  const validTransfer = {
    sourceAccountId: "source-id",
    destinationAccountId: "destination-id",
    amount: 50,
    date: "2026-09-12",
    description: "Reserva do casal",
  };

  it("requires different source and destination accounts", () => {
    const result = AccountTransferSchema.safeParse({
      ...validTransfer,
      destinationAccountId: validTransfer.sourceAccountId,
    });

    expect(result.success).toBe(false);
  });

  it("requires a positive amount", () => {
    expect(
      AccountTransferSchema.safeParse({ ...validTransfer, amount: 0 }).success,
    ).toBe(false);
  });

  it("rejects document identifiers containing a path separator", () => {
    expect(AccountIdSchema.safeParse("account/child").success).toBe(false);
  });
});
