import { isDueUntil } from "@/lib/finance/date";
import { Transaction } from "@/lib/types";

export function isCurrentCashTransaction(transaction: Transaction, todayKey: string) {
  if (transaction.status !== "paid") return false;

  // A bill paid early reduces cash immediately. Future income remains only in
  // the projection until its expected date, even if it was marked as received.
  if (transaction.type === "expense" && transaction.paidAt) return true;
  return isDueUntil(transaction.dueDate, todayKey);
}

export function calculatePeriodFinancialMetrics(transactions: Transaction[], todayKey: string) {
  const confirmed = transactions.filter((item) => isCurrentCashTransaction(item, todayKey));
  const incomeTransactions = confirmed.filter((item) => item.type === "income");
  const expenseTransactions = confirmed.filter((item) => item.type === "expense");
  const pendingIncomeTransactions = transactions.filter((item) => item.type === "income" && item.status === "pending");
  const pendingExpenseTransactions = transactions.filter((item) => item.type === "expense" && item.status === "pending");
  const investmentContributions = expenseTransactions.filter((item) => item.category === "Investimento");
  const investmentRedemptions = incomeTransactions.filter((item) => item.category === "Investimento");
  const totalIncome = sumAmounts(incomeTransactions);
  const totalExpense = sumAmounts(expenseTransactions);
  const grossInvested = sumAmounts(investmentContributions);
  const redeemedInvested = sumAmounts(investmentRedemptions);
  const adjustedIncome = totalIncome - redeemedInvested;
  const realExpense = totalExpense - grossInvested;

  return {
    confirmed,
    incomeTransactions,
    expenseTransactions,
    pendingIncomeTransactions,
    pendingExpenseTransactions,
    totalIncome,
    totalExpense,
    pendingIncome: sumAmounts(pendingIncomeTransactions),
    pendingExpense: sumAmounts(pendingExpenseTransactions),
    grossInvested,
    redeemedInvested,
    netInvested: grossInvested - redeemedInvested,
    adjustedIncome,
    realExpense,
    periodBalance: totalIncome - totalExpense,
    savingsRate: adjustedIncome > 0 ? ((adjustedIncome - realExpense) / adjustedIncome) * 100 : 0,
  };
}

export function sumAmounts(transactions: Transaction[]) {
  return transactions.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}
