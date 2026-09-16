import { describe, expect, it } from "vitest";
import { CategoryInputSchema } from "@/lib/finance/category-schema";
import {
  buildFinancialCategoryCatalog,
  findFinancialCategory,
  uniqueCategoryNames,
} from "./category-catalog";

describe("financial category catalog", () => {
  it("provides an expanded set of ready-to-use categories", () => {
    const catalog = buildFinancialCategoryCatalog([]);

    expect(catalog.length).toBeGreaterThanOrEqual(25);
    expect(catalog.map((category) => category.name)).toEqual(
      expect.arrayContaining([
        "Mercado",
        "Pets",
        "Viagens",
        "Farmácia",
        "Internet e telefone",
      ]),
    );
  });

  it("applies a workspace rename while preserving the default name as an alias", () => {
    const catalog = buildFinancialCategoryCatalog([
      {
        id: "builtin-alimentacao",
        kind: "override",
        baseCategoryId: "builtin-alimentacao",
        name: "Comida do mês",
        aliases: ["Alimentação"],
      },
    ]);
    const category = catalog.find(
      (item) => item.id === "builtin-alimentacao",
    );

    expect(category?.name).toBe("Comida do mês");
    expect(category?.aliases).toEqual(["Comida do mês", "Alimentação"]);
    expect(findFinancialCategory(catalog, null, "Alimentação")?.id).toBe(
      "builtin-alimentacao",
    );
  });

  it("includes custom categories and resolves their previous names", () => {
    const catalog = buildFinancialCategoryCatalog([
      {
        id: "custom-home-renovation",
        kind: "custom",
        name: "Reforma da casa",
        aliases: ["Obra"],
      },
    ]);

    expect(
      findFinancialCategory(catalog, "custom-home-renovation")?.name,
    ).toBe("Reforma da casa");
    expect(findFinancialCategory(catalog, null, "Obra")?.id).toBe(
      "custom-home-renovation",
    );
  });

  it("deduplicates equivalent names with accents and spacing", () => {
    expect(
      uniqueCategoryNames(["  Saúde ", "Saude", "Saúde", "Casa   nova"]),
    ).toEqual(["Saúde", "Casa nova"]);
  });
});

describe("category input", () => {
  it("normalizes whitespace and enforces a bounded name", () => {
    expect(CategoryInputSchema.parse({ name: "  Reforma   da casa " })).toEqual({
      name: "Reforma da casa",
    });
    expect(CategoryInputSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(
      CategoryInputSchema.safeParse({ name: "x".repeat(41) }).success,
    ).toBe(false);
  });
});
