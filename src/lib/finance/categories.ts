export interface BuiltInExpenseCategory {
  id: string;
  name: string;
}

export const BUILT_IN_EXPENSE_CATEGORIES = [
  { id: "builtin-outros", name: "Outros" },
  { id: "builtin-alimentacao", name: "Alimentação" },
  { id: "builtin-mercado", name: "Mercado" },
  { id: "builtin-delivery", name: "Delivery" },
  { id: "builtin-moradia", name: "Moradia" },
  { id: "builtin-contas-servicos", name: "Contas e serviços" },
  { id: "builtin-internet-telefone", name: "Internet e telefone" },
  { id: "builtin-manutencao", name: "Manutenção" },
  { id: "builtin-transporte", name: "Transporte" },
  { id: "builtin-transporte-app", name: "Transporte por aplicativo" },
  { id: "builtin-lazer", name: "Lazer" },
  { id: "builtin-viagens", name: "Viagens" },
  { id: "builtin-saude", name: "Saúde" },
  { id: "builtin-farmacia", name: "Farmácia" },
  { id: "builtin-academia", name: "Academia" },
  { id: "builtin-educacao", name: "Educação" },
  { id: "builtin-filhos", name: "Filhos" },
  { id: "builtin-pets", name: "Pets" },
  { id: "builtin-beleza-cuidados", name: "Beleza e cuidados" },
  { id: "builtin-vestuario", name: "Vestuário" },
  { id: "builtin-presentes", name: "Presentes" },
  { id: "builtin-assinaturas", name: "Assinaturas" },
  { id: "builtin-seguros", name: "Seguros" },
  { id: "builtin-impostos", name: "Impostos" },
  { id: "builtin-dividas", name: "Dívidas" },
  { id: "builtin-cartao-credito", name: "Cartão de Crédito" },
  { id: "builtin-emprestimo", name: "Empréstimo" },
  { id: "builtin-compras", name: "Compras" },
  { id: "builtin-investimento", name: "Investimento" },
] as const satisfies readonly BuiltInExpenseCategory[];

export const INCOME_CATEGORIES = [
  "Salário",
  "Rendimento de Investimento",
  "Freelance",
  "Benefícios",
  "Reembolso",
  "Outras receitas",
] as const;

export const EXPENSE_BUDGET_CATEGORIES = BUILT_IN_EXPENSE_CATEGORIES.map(
  (category) => category.name,
);

export const TRANSACTION_CATEGORIES = [
  ...EXPENSE_BUDGET_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export function normalizeCategoryName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeCategoryKey(value: string) {
  return normalizeCategoryName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function getBuiltInExpenseCategory(id: string) {
  return BUILT_IN_EXPENSE_CATEGORIES.find((category) => category.id === id);
}

export function getBuiltInExpenseCategoryByName(name: string) {
  const key = normalizeCategoryKey(name);
  return BUILT_IN_EXPENSE_CATEGORIES.find(
    (category) => normalizeCategoryKey(category.name) === key,
  );
}
