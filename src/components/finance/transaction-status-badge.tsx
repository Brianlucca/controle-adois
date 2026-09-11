import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { isOverduePendingExpense } from "@/lib/finance/transaction-calculations";
import { Transaction } from "@/lib/types";

interface TransactionStatusBadgeProps {
  transaction: Pick<Transaction, "status" | "type" | "dueDate">;
  todayKey: string;
}

export function TransactionStatusBadge({
  transaction,
  todayKey,
}: TransactionStatusBadgeProps) {
  if (isOverduePendingExpense(transaction, todayKey)) {
    return (
      <span className="inline-flex items-center rounded-md bg-[#fff0ee] px-2.5 py-1 text-[10px] font-bold text-[#c94f44] ring-1 ring-[#ffc5bf]">
        <CalendarIcon size={12} className="mr-1.5" /> VENCIDA
      </span>
    );
  }

  if (transaction.status === "pending") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#fff8e8] px-2.5 py-1 text-[10px] font-bold text-[#9a6710] ring-1 ring-[#f1d9a5]">
        <CalendarIcon size={12} className="mr-1.5" /> PENDENTE
      </span>
    );
  }

  if (transaction.type === "expense") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#fff1ef] px-2.5 py-1 text-[10px] font-bold text-[#b9564d] ring-1 ring-[#ffd1cc]">
        <CheckCircle2 size={12} className="mr-1.5" /> PAGO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-[#edf9f5] px-2.5 py-1 text-[10px] font-bold text-[#168267] ring-1 ring-[#bfe8d9]">
      <CheckCircle2 size={12} className="mr-1.5" /> RECEBIDO
    </span>
  );
}
