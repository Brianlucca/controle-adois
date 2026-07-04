import { isCurrentCashTransaction } from "@/lib/finance/transaction-calculations";
import { Transaction } from "@/lib/types";

export interface DashboardChartPoint {
  name: string;
  Entrada: number;
  Saida: number;
  dateSort: number;
}

export function calculateDashboardData(
  transactions: Transaction[],
  budgetLimit: number,
  todayKey: string
) {
  const income = transactions
    .filter(
      (transaction) =>
        transaction.type === "income" &&
        isCurrentCashTransaction(transaction, todayKey)
    )
    .reduce((acc, transaction) => acc + (Number(transaction.amount) || 0), 0);

  const expense = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        isCurrentCashTransaction(transaction, todayKey)
    )
    .reduce((acc, transaction) => acc + (Number(transaction.amount) || 0), 0);

  const balance = income - expense;
  const liquidIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === "income" && !isInvestment(transaction.category)
    )
    .reduce((acc, transaction) => acc + (Number(transaction.amount) || 0), 0);
  const liquidExpense = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && !isInvestment(transaction.category)
    )
    .reduce((acc, transaction) => acc + (Number(transaction.amount) || 0), 0);
  const pendingExpense = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.status === "pending" &&
        !isInvestment(transaction.category)
    )
    .reduce((acc, transaction) => acc + (Number(transaction.amount) || 0), 0);
  const liquidBalance = liquidIncome - liquidExpense;

  const budgetPercent =
    budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;
  let budgetColor = "bg-emerald-500";
  if (budgetPercent > 70) budgetColor = "bg-amber-500";
  if (budgetPercent > 90) budgetColor = "bg-red-500";

  const chartMap = transactions.reduce((acc, transaction) => {
    if (!transaction.dueDate) return acc;
    const [, month, day] = transaction.dueDate.split("-");
    const label = `${day}/${month}`;

    if (!acc[label]) {
      acc[label] = {
        name: label,
        Entrada: 0,
        Saida: 0,
        dateSort: new Date(transaction.dueDate).getTime(),
      };
    }

    const value = Number(transaction.amount) || 0;
    if (transaction.type === "income" && transaction.status === "paid") {
      acc[label].Entrada += value;
    } else if (
      transaction.type === "expense" &&
      transaction.status === "paid"
    ) {
      acc[label].Saida += value;
    }

    return acc;
  }, {} as Record<string, DashboardChartPoint>);

  const chartData = Object.values(chartMap).sort(
    (a, b) => a.dateSort - b.dateSort
  );

  const recentTransactions = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.dueDate).getTime() -
        new Date(a.createdAt || a.dueDate).getTime()
    )
    .slice(0, 5);

  const upcomingBills = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.status === "pending"
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 4);

  return {
    income,
    expense,
    balance,
    liquidIncome,
    liquidExpense,
    pendingExpense,
    liquidBalance,
    budgetPercent,
    budgetColor,
    chartData,
    recentTransactions,
    upcomingBills,
  };
}

function isInvestment(category?: string) {
  return category === "Investimento";
}
