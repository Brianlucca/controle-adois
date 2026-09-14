export const FINANCIAL_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "investment",
] as const;

export const ACCOUNT_OWNERSHIPS = ["mine", "partner", "joint"] as const;

export type FinancialAccountType = (typeof FINANCIAL_ACCOUNT_TYPES)[number];
export type AccountOwnership = (typeof ACCOUNT_OWNERSHIPS)[number];

export interface AccountOwnerOption {
  id: string;
  label: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  institutionName: string;
  type: FinancialAccountType;
  ownership: AccountOwnership;
  ownerUserId?: string | null;
  openingBalance: number;
  openingBalanceDate: string;
  currentBalance: number;
  createdAt: string;
  archivedAt?: string | null;
}

export type FinancialAccountOption = Pick<
  FinancialAccount,
  "id" | "name" | "institutionName" | "ownership" | "ownerUserId"
>;

export interface AccountTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description: string;
  responsibleUserId: string;
  responsibleName: string;
  createdAt: string;
  reversedAt?: string | null;
}

export interface AccountFormValues {
  name: string;
  institutionName: string;
  type: FinancialAccountType;
  ownership: AccountOwnership;
  ownerUserId?: string | null;
  openingBalance: number;
  openingBalanceDate: string;
}

export interface TransferFormValues {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  checking: "Conta-corrente",
  savings: "Poupança",
  cash: "Dinheiro em espécie",
  investment: "Investimento",
};

export const ACCOUNT_OWNERSHIP_LABELS: Record<AccountOwnership, string> = {
  mine: "Minha",
  partner: "Do parceiro",
  joint: "Nossa",
};
