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
  createdAt: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  pending: number;
}
