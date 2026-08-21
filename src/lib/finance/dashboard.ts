import { calculatePeriodFinancialMetrics } from "@/lib/finance/financial-metrics";
import { Transaction } from "@/lib/types";
import { calculateFinancialPosition } from "@/lib/finance/financial-position";

export interface DashboardChartPoint {
  name: string;
  Entrada: number;
  Saida: number;
  dateSort: number;
}

export function calculateDashboardData(
  periodTransactions: Transaction[],
  budgetLimit: number,
  todayKey: string,
  snapshotTransactions: Transaction[] = periodTransactions,
  projectionEndKey: string = todayKey
) {
  const periodMetrics = calculatePeriodFinancialMetrics(periodTransactions, todayKey);
  const income = periodMetrics.totalIncome;
  const expense = periodMetrics.totalExpense;

  const position = calculateFinancialPosition(
    snapshotTransactions,
    todayKey,
    projectionEndKey
  );
  const balance = position.availableBalance;
  const pendingIncome = position.scheduledIncome;
  const pendingExpense = position.scheduledExpense;
  const projectedBalance = position.projectedBalance;

  const budgetPercent =
    budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;
  let budgetColor = "bg-emerald-500";
  if (budgetPercent > 70) budgetColor = "bg-amber-500";
  if (budgetPercent > 90) budgetColor = "bg-red-500";

  const chartMap = periodTransactions.reduce((acc, transaction) => {
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

  const recentTransactions = [...snapshotTransactions]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.dueDate).getTime() -
        new Date(a.createdAt || a.dueDate).getTime()
    )
    .slice(0, 5);

  const upcomingBills = snapshotTransactions
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
    pendingIncome,
    pendingExpense,
    projectedBalance,
    budgetPercent,
    budgetColor,
    chartData,
    recentTransactions,
    upcomingBills,
  };
}
