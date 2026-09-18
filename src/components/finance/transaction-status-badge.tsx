import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { isOverduePendingExpense } from "@/lib/finance/transaction-calculations";
import { Transaction } from "@/lib/types";

interface TransactionStatusBadgeProps {
  transaction: Pick<Transaction, "status" | "type" | "dueDate" | "paidAt">;
  todayKey: string;
  showPaidDate?: boolean;
}

const paidAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Bahia",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatPaidAtDate(paidAt?: string) {
  const paidDate = paidAt ? new Date(paidAt) : null;
  return paidDate && !Number.isNaN(paidDate.getTime())
    ? paidAtFormatter.format(paidDate)
    : null;
}

export function TransactionStatusBadge({
  transaction,
  todayKey,
  showPaidDate = true,
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
      <CompletedStatus
        label="PAGO"
        paidAt={showPaidDate ? transaction.paidAt : undefined}
        badgeClass="bg-[#fff1ef] text-[#b9564d] ring-[#ffd1cc]"
      />
    );
  }

  return (
    <CompletedStatus
      label="RECEBIDO"
      paidAt={showPaidDate ? transaction.paidAt : undefined}
      badgeClass="bg-[#edf9f5] text-[#168267] ring-[#bfe8d9]"
    />
  );
}

function CompletedStatus({
  label,
  paidAt,
  badgeClass,
}: {
  label: "PAGO" | "RECEBIDO";
  paidAt?: string;
  badgeClass: string;
}) {
  const paidDateLabel = formatPaidAtDate(paidAt);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold ring-1 ${badgeClass}`}
      >
        <CheckCircle2 size={12} className="mr-1.5" /> {label}
      </span>
      {paidDateLabel && (
        <span className="pl-0.5 text-[10px] font-medium text-[#858891]">
          em {paidDateLabel}
        </span>
      )}
    </span>
  );
}
