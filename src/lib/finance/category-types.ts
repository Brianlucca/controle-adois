export interface FinancialCategory {
  id: string;
  name: string;
  aliases: string[];
  isBuiltIn: boolean;
  defaultName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FinancialCategoryInput {
  name: string;
}
