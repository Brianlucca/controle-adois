import { formatDate } from "@/lib/utils";
import {
  DateRange,
  Transaction,
  TransactionSortMode,
  TransactionStatusFilter,
} from "@/lib/types";
import { getDateTime } from "@/lib/finance/date";
import { calculatePeriodFinancialMetrics, isCurrentCashTransaction } from "@/lib/finance/financial-metrics";

export { isCurrentCashTransaction } from "@/lib/finance/financial-metrics";

export interface InvestmentOption extends Transaction {
  investedAmount: number;
  redeemedAmount: number;
  remainingAmount: number;
}

export interface TransactionFilterState {
  filterTerm: string;
  selectedCategory: string;
  statusFilter: TransactionStatusFilter | string;
  dateRange: DateRange;
  sortMode: TransactionSortMode;
  todayKey: string;
}

export function getPriorityRank(transaction: Transaction, todayKey: string) {
  if (transaction.status === "pending") {
    if (transaction.dueDate < todayKey) return 0;
    return 1;
  }

  return 2;
}

export function getTransactionRowStateClass(
  transaction: Transaction,
  todayKey: string
) {
  if (transaction.status !== "pending") {
    return "hover:bg-white/[0.03]";
  }

  if (isOverduePendingExpense(transaction, todayKey)) {
    return "bg-red-500/[0.12] hover:bg-red-500/[0.17] border-l-4 border-red-500";
  }

  return "bg-amber-500/[0.06] hover:bg-amber-500/[0.1] border-l-2 border-amber-500/70";
}

export function isOverduePendingExpense(
  transaction: Pick<Transaction, "type" | "status" | "dueDate">,
  todayKey: string
) {
  return transaction.type === "expense" &&
    transaction.status === "pending" &&
    Boolean(transaction.dueDate) &&
    transaction.dueDate < todayKey;
}

export function filterAndSortTransactions(
  transactions: Transaction[],
  filters: TransactionFilterState
) {
  const normalizedTerm = filters.filterTerm.trim().toLowerCase();

  return transactions
    .filter((transaction) => {
      const matchesTerm = transaction.description
        .toLowerCase()
        .includes(normalizedTerm);
      const matchesCategory =
        filters.selectedCategory === "Todas" ||
        transaction.category === filters.selectedCategory;

      let matchesStatus = true;
      if (filters.statusFilter === "pending") {
        matchesStatus = transaction.status === "pending";
      }
      if (filters.statusFilter === "paid") {
        matchesStatus =
          transaction.status === "paid" && transaction.type === "expense";
      }
      if (filters.statusFilter === "received") {
        matchesStatus = transaction.type === "income";
      }

      const matchesDate =
        transaction.dueDate >= filters.dateRange.from &&
        transaction.dueDate <= filters.dateRange.to;

      return matchesTerm && matchesCategory && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const dateA = getDateTime(a.dueDate);
      const dateB = getDateTime(b.dueDate);

      if (filters.sortMode === "asc") return dateA - dateB;
      if (filters.sortMode === "desc") return dateB - dateA;

      const rankA = getPriorityRank(a, filters.todayKey);
      const rankB = getPriorityRank(b, filters.todayKey);

      if (rankA !== rankB) return rankA - rankB;
      if (rankA === 0 || rankA === 1) return dateA - dateB;

      return dateB - dateA;
    });
}

export function calculateFinanceOverview(
  transactions: Transaction[],
  todayKey: string
) {
  const metrics = calculatePeriodFinancialMetrics(transactions, todayKey);
  const income = metrics.totalIncome;
  const expense = metrics.totalExpense;
  const pendingExpense = metrics.pendingExpense;
  const pendingIncome = metrics.pendingIncome;
  let grossInvestments = 0;
  let redeemedInvestments = 0;

  const currentInvestmentTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;

    if (isCurrentCashTransaction(transaction, todayKey)) {
      if (
        transaction.status === "paid" &&
        transaction.category === "Investimento"
      ) {
        currentInvestmentTransactions.push(transaction);
        if (transaction.type === "expense") grossInvestments += amount;
        if (transaction.type === "income") redeemedInvestments += amount;
      }
    }
  }

  const investmentRedemptions = currentInvestmentTransactions.filter(
    (transaction) => transaction.type === "income"
  );
  const investmentOptions = currentInvestmentTransactions
    .filter((transaction) => transaction.type === "expense")
    .map((investment) => {
      const investedAmount = Number(investment.amount) || 0;
      const redeemedAmount = investmentRedemptions
        .filter((redemption) => {
          const observation = String(redemption.observation || "");
          const legacyId = observation.match(/ID do investimento: ([^.]+)/)?.[1];
          const linkedInvestmentId =
            redemption.linkedInvestmentId || legacyId;

          if (linkedInvestmentId) return linkedInvestmentId === investment.id;

          const matchesLegacyRescue =
            redemption.description === `Resgate: ${investment.description}` &&
            observation.includes(
              `Resgate referente ao investimento de ${formatDate(
                investment.dueDate
              )}`
            );

          return matchesLegacyRescue;
        })
        .reduce((acc, redemption) => acc + Number(redemption.amount), 0);

      return {
        ...investment,
        investedAmount,
        redeemedAmount,
        remainingAmount: Math.max(investedAmount - redeemedAmount, 0),
      };
    })
    .filter((investment) => investment.remainingAmount > 0)
    .sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );

  const balance = income - expense;
  const netInvestments = grossInvestments - redeemedInvestments;

  return {
    income,
    expense,
    pendingExpense,
    pendingIncome,
    balance,
    grossInvestments,
    redeemedInvestments,
    netInvestments,
    totalAssets: balance + netInvestments,
    currentInvestmentTransactions,
    investmentOptions,
  };
}
