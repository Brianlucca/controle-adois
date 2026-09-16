import { z } from "zod";

export const CategoryIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Categoria inválida.");

export const CategoryWorkspaceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("/"), "Espaço inválido.");

export const CategoryNameSchema = z
  .string()
  .transform((value) => value.normalize("NFKC").trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "O nome deve ter pelo menos 2 caracteres.")
      .max(40, "O nome deve ter no máximo 40 caracteres."),
  );

export const CategoryInputSchema = z.object({
  name: CategoryNameSchema,
});

export const StoredCategorySchema = z.object({
  kind: z.enum(["custom", "override"]),
  baseCategoryId: CategoryIdSchema.nullable().optional(),
  name: CategoryNameSchema,
  aliases: z.array(CategoryNameSchema).max(32).default([]),
  createdBy: z.string().trim().min(1).max(128),
  updatedBy: z.string().trim().min(1).max(128).nullable().optional(),
});
