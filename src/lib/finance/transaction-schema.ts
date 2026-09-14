import { z } from "zod";

const ParticipantIdSchema = z.string().trim().min(1).max(128);
const ExpenseShareSchema = z.object({
  userId: ParticipantIdSchema,
  amountCents: z.coerce.number().int().positive(),
});

export const TransactionSchema = z.object({
  description: z.string().min(2, "A descricao deve ter pelo menos 2 caracteres").max(200),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  category: z.string().min(1, "A categoria e obrigatoria"),
  type: z.enum(["income", "expense"]),
  status: z.enum(["paid", "pending"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (Use YYYY-MM-DD)"),
  pixCode: z.string().optional().nullable(),
  barCode: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  accountId: z
    .string()
    .trim()
    .max(128)
    .refine((value) => !value.includes("/"), "Conta inválida")
    .optional()
    .nullable()
    .transform((value) => value || null),
  linkedInvestmentId: z.string().optional().nullable(),
  isRecurrent: z.boolean().optional().default(false),
  recurrenceMonths: z.coerce.number().int().min(1).max(60).optional().default(12),
  scope: z.enum(["individual", "shared"]).optional().nullable(),
  fundingSource: z.enum(["participant", "joint"]).optional().nullable(),
  paidByUserId: ParticipantIdSchema.optional().nullable(),
  responsibleUserId: ParticipantIdSchema.optional().nullable(),
  beneficiaryUserIds: z.array(ParticipantIdSchema).max(20).optional().default([]),
  splitMethod: z.enum(["equal", "custom"]).optional().nullable(),
  shares: z.array(ExpenseShareSchema).max(20).optional().default([]),
});

export const StatusSchema = z.enum(["paid", "pending"]);
export const ImportTransactionsSchema = z.array(TransactionSchema).min(1).max(5000);

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type TransactionStatusInput = z.infer<typeof StatusSchema>;
