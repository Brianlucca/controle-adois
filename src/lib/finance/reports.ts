import * as XLSX from "xlsx";
import { DateRange, Transaction } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

export function exportTransactionsReport(
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

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio Financeiro");

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
  ];

  XLSX.writeFile(workbook, `financas_${dateRange.from}_${dateRange.to}.xlsx`);
}

export function calculateReportsData(transactions: Transaction[]) {
  const incomeTransactions = transactions.filter(
    (transaction) => transaction.type === "income"
  );
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense"
  );

  const totalIncome = sumAmounts(incomeTransactions);
  const totalExpense = sumAmounts(expenseTransactions);

  const grossInvested = sumAmounts(
    expenseTransactions.filter(
      (transaction) => transaction.category === "Investimento"
    )
  );
  const redeemedInvested = sumAmounts(
    incomeTransactions.filter(
      (transaction) => transaction.category === "Investimento"
    )
  );

  const netInvested = grossInvested - redeemedInvested;
  const realExpense = totalExpense - grossInvested;
  const balance = totalIncome - totalExpense;
  const adjustedIncome = totalIncome - redeemedInvested;
  const savingsRate =
    adjustedIncome > 0
      ? ((adjustedIncome - realExpense) / adjustedIncome) * 100
      : 0;

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

  const dailyData = transactions
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

  const pendingBills = expenseTransactions
    .filter((transaction) => transaction.status === "pending")
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

function sumAmounts(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, transaction) => acc + Number(transaction.amount),
    0
  );
}
