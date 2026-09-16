import { z } from "zod";
const memberId = z.string().trim().min(1).max(128);
const nullableMemberId = memberId.nullable();
const categoryId = z.string().trim().min(1).max(128).refine(
  (value) => !value.includes("/"),
  "Categoria inválida.",
);
const categoryName = z.string().trim().min(2).max(40);

export const BudgetIdSchema = z.string().trim().regex(/^[a-f0-9]{32}$/);
export const BudgetWorkspaceIdSchema = z.string().trim().min(1).max(128);

export const FinancialBudgetSchema = z
  .object({
    categoryId,
    category: categoryName,
    limitAmount: z.coerce
      .number()
      .finite()
      .positive("Informe um limite maior que zero.")
      .max(1_000_000_000, "O limite informado é muito alto."),
    scope: z.enum(["shared", "individual"]),
    participantUserId: memberId.nullish(),
    responsibleUserId: memberId,
  })
  .superRefine((value, context) => {
    if (value.scope === "individual" && !value.participantUserId) {
      context.addIssue({
        code: "custom",
        path: ["participantUserId"],
        message: "Escolha quem terá este limite individual.",
      });
    }

    if (value.scope === "shared" && value.participantUserId) {
      context.addIssue({
        code: "custom",
        path: ["participantUserId"],
        message: "Um limite do casal não pode pertencer a uma única pessoa.",
      });
    }
  });

export const StoredFinancialBudgetSchema = z.object({
  categoryId: categoryId.optional(),
  category: categoryName,
  limitCents: z.number().int().positive().max(100_000_000_000),
  scope: z.enum(["shared", "individual"]),
  participantUserId: nullableMemberId,
  responsibleUserId: memberId,
  createdBy: memberId,
  updatedBy: nullableMemberId.optional().default(null),
  archivedBy: nullableMemberId.optional().default(null),
}).superRefine((value, context) => {
  if (value.scope === "individual" && !value.participantUserId) {
    context.addIssue({
      code: "custom",
      path: ["participantUserId"],
      message: "Orçamento individual sem participante.",
    });
  }
  if (value.scope === "shared" && value.participantUserId) {
    context.addIssue({
      code: "custom",
      path: ["participantUserId"],
      message: "Orçamento compartilhado com participante individual.",
    });
  }
});

export type FinancialBudgetInputData = z.infer<typeof FinancialBudgetSchema>;
