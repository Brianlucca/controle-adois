export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'paid' | 'pending';
  dueDate: string;
  paidAt?: string;
  userId: string;
  userName: string;
  pixCode?: string;
  barCode?: string;
  observation?: string;
  accountId?: string | null;
  linkedInvestmentId?: string;
  isRecurrent?: boolean;
  recurrenceMonths?: number;
  recurrenceGroupId?: string;
  recurrenceIndex?: number;
  recurrenceTotal?: number;
  scope?: ExpenseScope | null;
  paidByUserId?: string | null;
  responsibleUserId?: string | null;
  beneficiaryUserIds?: string[];
  splitMethod?: ExpenseSplitMethod | null;
  shares?: ExpenseShare[];
  createdAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  pending: number;
}

export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";
export type TransactionSortMode = "priority" | "desc" | "asc";
export type TransactionStatusFilter = "all" | "pending" | "paid" | "received";
export type ExpenseScope = "individual" | "shared";
export type ExpenseSplitMethod = "equal" | "custom";

export interface ExpenseShare {
  userId: string;
  amountCents: number;
}

export interface ExpenseShareFormData {
  userId: string;
  amount: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface TransactionFormData {
  description: string;
  amount: string;
  category: string;
  type: TransactionType;
  status: TransactionStatus;
  dueDate: string;
  pixCode: string;
  barCode: string;
  observation: string;
  accountId?: string;
  isRecurrent: boolean;
  recurrenceMonths: number;
  scope?: ExpenseScope;
  paidByUserId?: string;
  responsibleUserId?: string;
  beneficiaryUserIds?: string[];
  splitMethod?: ExpenseSplitMethod;
  shares?: ExpenseShareFormData[];
}

export interface TransactionPayload
  extends Omit<TransactionFormData, "amount" | "shares"> {
  amount: number;
  shares?: ExpenseShare[];
}
