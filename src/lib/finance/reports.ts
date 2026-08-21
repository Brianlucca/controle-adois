import ExcelJS from "exceljs";
import { DateRange, Transaction } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getLocalDateKey } from "@/lib/finance/date";
import { calculatePeriodFinancialMetrics } from "@/lib/finance/financial-metrics";

export interface CategoryTotal {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface DailyReportPoint {
  date: string;
  displayDate: string;
  Receitas: number;
  Despesas: number;
  Saldo: number;
  Acumulado?: number;
}

export async function exportTransactionsReport(
  transactions: Transaction[],
  dateRange: DateRange
) {
  const dataToExport = transactions.map((transaction) => ({
    Data: formatDate(transaction.dueDate),
    Descricao: transaction.description,
    Categoria: transaction.category,
    Tipo: transaction.type === "income" ? "Entrada" : "Saida",
    Valor: Number(transaction.amount),
    Status: transaction.status === "paid" ? "Pago" : "Pendente",
    Observacao: transaction.observation || "",
  }));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Relatorio Financeiro");
  const headers = Object.keys(dataToExport[0] || {
    Data: "", Descricao: "", Categoria: "", Tipo: "", Valor: "", Status: "", Observacao: "",
  });
  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: [12, 30, 15, 10, 12, 10, 30][index],
  }));
  dataToExport.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `financas_${dateRange.from}_${dateRange.to}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function calculateReportsData(transactions: Transaction[], todayKey = getLocalDateKey(new Date())) {
  const metrics = calculatePeriodFinancialMetrics(transactions, todayKey);
  const {
    incomeTransactions, expenseTransactions, totalIncome, totalExpense,
    grossInvested, redeemedInvested, netInvested, realExpense,
    adjustedIncome, savingsRate,
  } = metrics;
  const balance = metrics.periodBalance;

  const expensesByCategory = expenseTransactions
    .filter((transaction) => transaction.category !== "Investimento")
    .reduce((acc, transaction) => {
      const existing = acc.find((item) => item.name === transaction.category);
      if (existing) {
        existing.value += Number(transaction.amount);
      } else {
        acc.push({
          name: transaction.category,
          value: Number(transaction.amount),
        });
      }
      return acc;
    }, [] as CategoryTotal[])
    .sort((a, b) => b.value - a.value);

  const fullMark = Math.max(0, ...expensesByCategory.map((item) => item.value));
  const radarData = expensesByCategory.slice(0, 6).map((item) => ({
    subject: item.name,
    A: item.value,
    fullMark,
  }));

  const dailyData = metrics.confirmed
    .reduce((acc, transaction) => {
      const dateKey = transaction.dueDate;
      let entry = acc.find((point) => point.date === dateKey);
      if (!entry) {
        entry = {
          date: dateKey,
          displayDate: formatDate(dateKey).slice(0, 5),
          Receitas: 0,
          Despesas: 0,
          Saldo: 0,
        };
        acc.push(entry);
      }

      if (transaction.category !== "Investimento") {
        if (transaction.type === "income") {
          entry.Receitas += Number(transaction.amount);
        } else {
          entry.Despesas += Number(transaction.amount);
        }
      }

      return acc;
    }, [] as DailyReportPoint[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let accumulated = 0;
  const cumulativeData = dailyData.map((day) => {
    accumulated += day.Receitas - day.Despesas;
    return { ...day, Acumulado: accumulated };
  });

  const topExpenses = expenseTransactions
    .filter((transaction) => transaction.category !== "Investimento")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  const pendingBills = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.status === "pending"
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  return {
    incomeTransactions,
    expenseTransactions,
    totalIncome,
    totalExpense,
    grossInvested,
    redeemedInvested,
    netInvested,
    realExpense,
    balance,
    adjustedIncome,
    savingsRate,
    expensesByCategory,
    radarData,
    dailyData,
    cumulativeData,
    topExpenses,
    pendingBills,
  };
}
