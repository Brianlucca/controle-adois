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
  linkedInvestmentId?: string;
  isRecurrent?: boolean;
  recurrenceMonths?: number;
  recurrenceGroupId?: string;
  recurrenceIndex?: number;
  recurrenceTotal?: number;
  createdAt: string;
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
  isRecurrent: boolean;
  recurrenceMonths: number;
}

export interface TransactionPayload
  extends Omit<TransactionFormData, "amount"> {
  amount: number;
}
