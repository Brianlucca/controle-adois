import { z } from "zod";
import {
  ACCOUNT_OWNERSHIPS,
  FINANCIAL_ACCOUNT_TYPES,
} from "@/lib/finance/account-types";

const DateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine(isValidDateKey, "Informe uma data válida.");

export const AccountIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("/"), "Identificador inválido.");

export const FinancialAccountSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da conta.").max(60),
  institutionName: z.string().trim().max(80).default(""),
  type: z.enum(FINANCIAL_ACCOUNT_TYPES),
  ownership: z.enum(ACCOUNT_OWNERSHIPS),
  ownerUserId: AccountIdSchema.nullable().optional(),
  openingBalance: z.coerce
    .number()
    .finite()
    .min(-1_000_000_000)
    .max(1_000_000_000),
  openingBalanceDate: DateKeySchema,
});

export const AccountTransferSchema = z
  .object({
    sourceAccountId: AccountIdSchema,
    destinationAccountId: AccountIdSchema,
    amount: z.coerce
      .number()
      .finite()
      .positive("O valor deve ser maior que zero.")
      .max(1_000_000_000),
    date: DateKeySchema,
    description: z.string().trim().max(120).default(""),
  })
  .refine((value) => value.sourceAccountId !== value.destinationAccountId, {
    message: "Escolha contas diferentes para a transferência.",
    path: ["destinationAccountId"],
  });

function isValidDateKey(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
