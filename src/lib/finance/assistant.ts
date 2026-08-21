import { Transaction } from "@/lib/types";
import { calculatePeriodFinancialMetrics, isCurrentCashTransaction } from "@/lib/finance/financial-metrics";

export interface ForecastPoint {
  month: string;
  balance: number;
  income: number;
  expense: number;
}

export function calculateFinancialAssistant(
  transactions: Transaction[],
  todayKey: string,
  months = 12
) {
  const currentBalance = calculatePeriodFinancialMetrics(transactions, todayKey).periodBalance;

  const historyStart = shiftDateKey(todayKey, -90);
  const recentPaid = transactions.filter(
    (item) =>
      item.status === "paid" &&
      item.dueDate >= historyStart &&
      item.dueDate <= todayKey &&
      item.category !== "Investimento"
  );
  const averageMonthlyIncome = sumType(recentPaid, "income") / 3;
  const averageMonthlyExpense = sumType(recentPaid, "expense") / 3;
  const averageMonthlySurplus = averageMonthlyIncome - averageMonthlyExpense;
  const estimatedBalanceIn12Months = currentBalance + averageMonthlySurplus * 12;
  const emergencyReserveTarget = averageMonthlyExpense * 6;
  const savingsRate = averageMonthlyIncome > 0
    ? (averageMonthlySurplus / averageMonthlyIncome) * 100
    : 0;

  let runningBalance = currentBalance;
  let previousEnd = todayKey;
  const forecast: ForecastPoint[] = [];
  for (let offset = 0; offset < months; offset += 1) {
    const monthEnd = getMonthEnd(todayKey, offset);
    const scheduled = transactions.filter((item) => {
      if (item.dueDate <= todayKey || item.dueDate > monthEnd) return false;
      if (offset > 0 && item.dueDate <= previousEnd) return false;
      return item.status === "pending" || !isCurrentCashTransaction(item, todayKey);
    });
    if (offset === 0) {
      scheduled.push(
        ...transactions.filter(
          (item) => item.status === "pending" && item.dueDate <= todayKey
        )
      );
    }
    const income = sumType(scheduled, "income");
    const expense = sumType(scheduled, "expense");
    runningBalance += income - expense;
    forecast.push({
      month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(new Date(`${monthEnd}T12:00:00`))
        .replace(".", ""),
      balance: runningBalance,
      income,
      expense,
    });
    previousEnd = monthEnd;
  }

  return {
    currentBalance,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlySurplus,
    estimatedBalanceIn12Months,
    emergencyReserveTarget,
    savingsRate,
    forecast,
    insight: buildInsight(averageMonthlySurplus, emergencyReserveTarget, currentBalance),
  };
}

function buildInsight(monthlySurplus: number, reserveTarget: number, balance: number) {
  if (monthlySurplus < 0) {
    return "Sua média recente está negativa. Antes de investir, reduza despesas recorrentes ou aumente a renda mensal.";
  }
  if (balance < reserveTarget) {
    return "Sua prioridade sugerida é formar uma reserva de emergência com liquidez e baixo risco antes de buscar mais retorno.";
  }
  return "Sua reserva estimada está saudável. Você pode avaliar diversificação conforme prazo, objetivo e tolerância a risco.";
}

function sumType(items: Transaction[], type: "income" | "expense") {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonthEnd(todayKey: string, offset: number) {
  const [year, month] = todayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month + offset, 0)).toISOString().slice(0, 10);
}
