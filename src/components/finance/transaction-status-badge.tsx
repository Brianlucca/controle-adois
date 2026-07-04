import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { Transaction } from "@/lib/types";

interface TransactionStatusBadgeProps {
  transaction: Pick<Transaction, "status" | "type">;
}

export function TransactionStatusBadge({
  transaction,
}: TransactionStatusBadgeProps) {
  if (transaction.status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
        <CalendarIcon size={12} className="mr-1.5" /> PENDENTE
      </span>
    );
  }

  if (transaction.type === "expense") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
        <CheckCircle2 size={12} className="mr-1.5" /> PAGO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
      <CheckCircle2 size={12} className="mr-1.5" /> RECEBIDO
    </span>
  );
}
