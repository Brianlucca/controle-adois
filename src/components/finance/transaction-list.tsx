import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowUpWideNarrow,
  Loader2,
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { TransactionStatusBadge } from "@/components/finance/transaction-status-badge";
import { Button } from "@/components/ui/button";
import { getTransactionRowStateClass, isOverduePendingExpense } from "@/lib/finance/transaction-calculations";
import { Transaction, TransactionSortMode } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  sortMode: TransactionSortMode;
  todayKey: string;
  displayValue: (value: number) => string;
  onOpenDetails: (transaction: Transaction) => void;
  onSortToggle: () => void;
  onPageChange: (page: number) => void;
}

export function TransactionList({
  transactions,
  loading,
  totalCount,
  currentPage,
  totalPages,
  itemsPerPage,
  sortMode,
  todayKey,
  displayValue,
  onOpenDetails,
  onSortToggle,
  onPageChange,
}: TransactionListProps) {
  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#27282e]">Lançamentos</h2>
          <p className="text-xs text-[#8a8c94]">
            {totalCount} registros encontrados
          </p>
        </div>
        <button
          type="button"
          onClick={onSortToggle}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dedce1] bg-white px-3 text-xs font-bold text-[#4b4d54] transition-colors hover:border-[#c7c3d9] hover:bg-[#f8f7fa]"
        >
          {sortMode === "priority" ? (
            <AlertTriangle size={14} className="text-[#b37a15]" />
          ) : sortMode === "desc" ? (
            <ArrowDownWideNarrow size={14} className="text-[#635bff]" />
          ) : (
            <ArrowUpWideNarrow size={14} className="text-[#635bff]" />
          )}
          {sortMode === "priority"
            ? "Prioridade"
            : sortMode === "desc"
            ? "Recentes"
            : "Antigas"}
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-[#e3e1e4] bg-white shadow-[0_16px_35px_-30px_rgba(31,29,43,0.5)]">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#635bff]" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#71747d]">
            Nenhuma transação encontrada neste período.
          </div>
        ) : (
          <div className="divide-y divide-[#efedf0]">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_160px] gap-4 border-b border-[#efedf0] bg-[#faf9fb] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#8a8c94] lg:grid">
              <span>Descrição</span>
              <span>Status</span>
              <span>Data</span>
              <span className="text-right">Valor</span>
            </div>

            {transactions.map((transaction) => {
              const isOverdue = isOverduePendingExpense(transaction, todayKey);
              return (
              <button
                key={transaction.id}
                type="button"
                onClick={() => onOpenDetails(transaction)}
                className={`group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3 text-left transition-colors lg:grid-cols-[minmax(0,1fr)_140px_140px_160px] lg:gap-4 lg:px-5 lg:py-3 ${getTransactionRowStateClass(
                  transaction,
                  todayKey
                )}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BrandIcon
                    description={transaction.description}
                    category={transaction.category}
                    type={transaction.type}
                    className="h-11 w-11 shrink-0 rounded-lg bg-[#f7f6f8] ring-1 ring-[#e3e1e4] lg:h-10 lg:w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#292a30] transition-colors group-hover:text-[#635bff]">
                      {transaction.description}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[#8a8c94]">
                      <span className="truncate">{transaction.category}</span>
                      <span className="h-1 w-1 rounded-full bg-[#c6c4ca]" />
                      <span className="lg:hidden">
                        {formatDate(transaction.dueDate)}
                      </span>
                      <span className="hidden lg:inline">
                        {transaction.type === "income" ? "Entrada" : "Saída"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <TransactionStatusBadge transaction={transaction} todayKey={todayKey} />
                </div>
                <div className={`hidden font-mono text-xs font-semibold lg:block ${isOverdue ? "text-[#c94f44]" : "text-[#71747d]"}`}>
                  {formatDate(transaction.dueDate)}
                </div>
                <div className="col-span-2 mt-1 flex items-center justify-between gap-3 lg:col-span-1 lg:mt-0 lg:block lg:text-right">
                  <div className="lg:hidden">
                    <TransactionStatusBadge transaction={transaction} todayKey={todayKey} />
                  </div>
                  <p
                    className={`font-mono text-sm font-bold ${
                      isOverdue
                        ? "text-[#c94f44]"
                        : transaction.type === "income"
                        ? "text-[#168267]"
                        : "text-[#292a30]"
                    }`}
                  >
                    {transaction.type === "expense" ? "- " : "+ "}
                    {displayValue(transaction.amount)}
                  </p>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>

      {!loading && totalCount > itemsPerPage && (
        <div className="mt-3 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-[#e3e1e4] bg-white p-3 sm:flex-row sm:items-center">
          <div className="order-2 text-center text-xs font-medium text-[#71747d] sm:order-1 sm:text-left">
            Página {currentPage} de {totalPages} - {transactions.length} itens
          </div>
          <div className="order-1 flex gap-2 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex-1 rounded-lg border-[#dedce1] bg-white text-[#4b4d54] hover:bg-[#f8f7fa] disabled:opacity-30"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ArrowLeft size={14} className="mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex-1 rounded-lg border-[#dedce1] bg-white text-[#4b4d54] hover:bg-[#f8f7fa] disabled:opacity-30"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
