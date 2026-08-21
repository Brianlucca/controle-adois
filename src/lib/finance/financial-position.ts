import { Transaction } from "@/lib/types";
import { isCurrentCashTransaction } from "@/lib/finance/financial-metrics";

export interface FinancialPosition {
  availableBalance: number;
  scheduledIncome: number;
  scheduledExpense: number;
  projectedBalance: number;
}

export function calculateFinancialPosition(
  transactions: Transaction[],
  todayKey: string,
  projectionEndKey: string
): FinancialPosition {
  let availableBalance = 0;
  let scheduledIncome = 0;
  let scheduledExpense = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;
    const isCurrent = isCurrentCashTransaction(transaction, todayKey);
    if (isCurrent) {
      availableBalance += transaction.type === "income" ? amount : -amount;
      continue;
    }

    if (!transaction.dueDate || transaction.dueDate > projectionEndKey) continue;
    if (transaction.category === "Investimento") continue;
    if (transaction.type === "income") scheduledIncome += amount;
    if (transaction.type === "expense") scheduledExpense += amount;
  }

  return {
    availableBalance,
    scheduledIncome,
    scheduledExpense,
    projectedBalance: availableBalance + scheduledIncome - scheduledExpense,
  };
}
