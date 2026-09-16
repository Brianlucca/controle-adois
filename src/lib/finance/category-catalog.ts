import {
  BUILT_IN_EXPENSE_CATEGORIES,
  getBuiltInExpenseCategory,
  normalizeCategoryKey,
  normalizeCategoryName,
} from "@/lib/finance/categories";
import type { FinancialCategory } from "@/lib/finance/category-types";

export interface StoredCategoryRecord {
  id: string;
  kind: "custom" | "override";
  baseCategoryId?: string | null;
  name: string;
  aliases: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function buildFinancialCategoryCatalog(
  records: StoredCategoryRecord[],
): FinancialCategory[] {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const builtIns = BUILT_IN_EXPENSE_CATEGORIES.map((base) => {
    const override = recordById.get(base.id);
    const validOverride =
      override?.kind === "override" && override.baseCategoryId === base.id
        ? override
        : null;
    return {
      id: base.id,
      name: validOverride?.name || base.name,
      aliases: uniqueCategoryNames([
        validOverride?.name || base.name,
        base.name,
        ...(validOverride?.aliases || []),
      ]),
      isBuiltIn: true,
      defaultName: base.name,
      createdAt: validOverride?.createdAt || null,
      updatedAt: validOverride?.updatedAt || null,
    } satisfies FinancialCategory;
  });

  const custom = records
    .filter(
      (record) =>
        record.kind === "custom" && !getBuiltInExpenseCategory(record.id),
    )
    .map(
      (record) =>
        ({
          id: record.id,
          name: record.name,
          aliases: uniqueCategoryNames([record.name, ...record.aliases]),
          isBuiltIn: false,
          defaultName: null,
          createdAt: record.createdAt || null,
          updatedAt: record.updatedAt || null,
        }) satisfies FinancialCategory,
    )
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return [...builtIns, ...custom];
}

export function findFinancialCategory(
  catalog: FinancialCategory[],
  categoryId: string | null | undefined,
  legacyName?: string,
) {
  if (categoryId) {
    const byId = catalog.find((category) => category.id === categoryId);
    if (byId) return byId;
  }
  if (!legacyName) return undefined;
  const key = normalizeCategoryKey(legacyName);
  return catalog.find((category) =>
    category.aliases.some((alias) => normalizeCategoryKey(alias) === key),
  );
}

export function uniqueCategoryNames(names: string[]) {
  const seen = new Set<string>();
  return names.flatMap((name) => {
    const normalized = normalizeCategoryName(name);
    const key = normalizeCategoryKey(normalized);
    if (!normalized || seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
}
