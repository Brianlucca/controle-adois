import {
  CalendarPlus,
  Check,
  Copy,
  FileText,
  Pencil,
  PieChart,
  Repeat2,
  Trash2,
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { ExpenseAllocationSummary } from "@/components/finance/expense-allocation-summary";
import { TransactionStatusBadge } from "@/components/finance/transaction-status-badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import { Transaction, TransactionStatus } from "@/lib/types";
import { getLocalDateKey } from "@/lib/finance/date";
import { isOverduePendingExpense } from "@/lib/finance/transaction-calculations";
import { createGoogleCalendarLink, formatDate } from "@/lib/utils";

interface TransactionDetailsModalContentProps {
  transaction: Transaction;
  participants: WorkspaceParticipant[];
  copiedField: string | null;
  canRedeemInvestment: boolean;
  accountName?: string;
  displayValue: (value: number) => string;
  onCopy: (text: string, field: string) => void;
  onStartEdit: () => void;
  onDelete: (id: string) => void;
  onDeleteRecurrence: (id: string) => void;
  onStatusChange: (id: string, status: TransactionStatus) => void;
  onRedeemInvestment: (transaction: Transaction) => void;
}

export function TransactionDetailsModalContent({
  transaction,
  participants,
  copiedField,
  canRedeemInvestment,
  accountName,
  displayValue,
  onCopy,
  onStartEdit,
  onDelete,
  onDeleteRecurrence,
  onStatusChange,
  onRedeemInvestment,
}: TransactionDetailsModalContentProps) {
  const todayKey = getLocalDateKey(new Date());
  const isOverdue = isOverduePendingExpense(transaction, todayKey);
  const isScheduledForFuture = transaction.dueDate > todayKey;
  return (
    <div className="space-y-4 pb-2 text-[#292a30]">
      <div
        className={`overflow-hidden rounded-lg border p-4 ${
          transaction.type === "income"
            ? "border-[#cce9de] bg-[#f2faf7]"
            : "border-[#f0d3cf] bg-[#fff5f3]"
        }`}
      >
        <div className="flex items-start gap-3">
          <BrandIcon
            description={transaction.description}
            category={transaction.category}
            type={transaction.type}
            className="h-12 w-12 shrink-0 rounded-xl bg-white ring-1 ring-[#e8e5e9]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[#292a30]">
              {transaction.description}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {transaction.category} -{" "}
              {transaction.type === "income" ? "Entrada" : "Saída"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-[#eadfe0] pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <TransactionStatusBadge
              transaction={transaction}
              todayKey={todayKey}
            />
          </div>
          <p
            className={`font-mono text-3xl font-bold tracking-tight sm:text-right ${
              transaction.type === "income"
                ? "text-[#168267]"
                : "text-[#292a30]"
            }`}
          >
            {transaction.type === "expense" ? "- " : "+ "}
            {displayValue(transaction.amount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <InfoBox label="Categoria" value={transaction.category} />
        <InfoBox label="Data" value={formatDate(transaction.dueDate)} />
        <InfoBox
          label="Registrado por"
          value={transaction.userName?.split(" ")[0] || "Eu"}
        />
        <div className="min-w-0 rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Status
          </p>
          <p
            className={`font-bold ${
              isOverdue
                ? "text-[#c5554b]"
                : transaction.status === "pending"
                  ? "text-[#a96924]"
                  : transaction.type === "income"
                    ? "text-[#168267]"
                    : "text-[#c5554b]"
            }`}
          >
            {transaction.status === "pending"
              ? "Pendente"
              : transaction.type === "income"
                ? "Recebido"
                : "Pago"}
          </p>
        </div>
      </div>
      {accountName && (
        <div className="grid grid-cols-1">
          <InfoBox label="Conta movimentada" value={accountName} />
        </div>
      )}
      <ExpenseAllocationSummary
        transaction={transaction}
        participants={participants}
      />
      <CopyableCode
        label="ID da transação"
        value={transaction.id}
        field="transactionId"
        copiedField={copiedField}
        color="slate"
        onCopy={onCopy}
      />

      {transaction.observation && (
        <div className="rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <FileText size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Observações
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#55575f]">
            {transaction.observation}
          </p>
        </div>
      )}

      {transaction.isRecurrent && (
        <div className="rounded-lg border border-[#d7d2ff] bg-[#f3f1ff] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <Repeat2 size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#292a30]">
                  Transação recorrente
                </p>
                <p className="text-xs text-[#716bb8]">
                  {transaction.recurrenceIndex && transaction.recurrenceTotal
                    ? `${transaction.recurrenceIndex} de ${transaction.recurrenceTotal}`
                    : "Série mensal ativa"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="h-10 border border-[#f0d3cf] bg-[#fff0ef] px-3 text-[#b84e45] hover:bg-[#ffe7e4]"
              onClick={() => onDeleteRecurrence(transaction.id)}
            >
              <Trash2 size={14} className="mr-2" />
              Excluir recorrência
            </Button>
          </div>
        </div>
      )}

      {(transaction.pixCode || transaction.barCode) && (
        <div className="space-y-2">
          {transaction.pixCode && (
            <CopyableCode
              label="Pix"
              value={transaction.pixCode}
              field="pix"
              copiedField={copiedField}
              color="indigo"
              onCopy={onCopy}
            />
          )}
          {transaction.barCode && (
            <CopyableCode
              label="Boleto"
              value={transaction.barCode}
              field="barCode"
              copiedField={copiedField}
              color="slate"
              onCopy={onCopy}
            />
          )}
        </div>
      )}

      {canRedeemInvestment && (
        <Button
          className="h-11 w-full rounded-lg border border-emerald-500/40 bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700"
          onClick={() => onRedeemInvestment(transaction)}
        >
          <PieChart size={18} className="mr-2" /> Resgatar Valor
        </Button>
      )}

      {transaction.type === "expense" && transaction.status === "pending" && (
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl border-[#dedce1] bg-white text-[#55575f] hover:bg-[#f7f6f8]"
          onClick={() => {
            const link = createGoogleCalendarLink(
              transaction.description,
              transaction.dueDate,
              transaction.amount,
              transaction.observation,
            );
            window.open(link, "_blank");
          }}
        >
          <CalendarPlus size={16} className="mr-2" /> Adicionar ao Google Agenda
        </Button>
      )}

      <div className="grid grid-cols-3 gap-2 border-t border-[#e6e3e7] pt-4">
        <Button
          className="h-12 rounded-xl border border-[#dedce1] bg-white text-xs font-bold text-[#34363c] hover:bg-[#f5f4f6] sm:text-sm"
          onClick={onStartEdit}
        >
          <Pencil size={16} className="mr-1.5" /> Editar
        </Button>

        <Button
          disabled={isScheduledForFuture}
          title={
            isScheduledForFuture
              ? "Na data informada, confirme para atualizar o saldo da conta."
              : undefined
          }
          className={`h-12 rounded-xl text-xs font-bold text-white sm:text-sm ${
            transaction.type === "income"
              ? "bg-[#168267] shadow-[0_8px_20px_-12px_#168267] hover:bg-[#126e58]"
              : "bg-[#635bff] shadow-[0_8px_20px_-12px_#635bff] hover:bg-[#544ce0]"
          }`}
          onClick={() =>
            onStatusChange(
              transaction.id,
              transaction.status === "paid" ? "pending" : "paid",
            )
          }
        >
          {transaction.status === "paid"
            ? "Pendente"
            : isScheduledForFuture
              ? "Agendada"
              : transaction.type === "income"
                ? "Receber"
                : "Pagar"}
        </Button>

        <Button
          variant="destructive"
          className="h-12 rounded-lg border border-[#f0d3cf] bg-[#fff0ef] px-0 text-[#b84e45] hover:bg-[#ffe7e4]"
          onClick={() => onDelete(transaction.id)}
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="truncate font-bold text-[#292a30]">{value}</p>
    </div>
  );
}

function CopyableCode({
  label,
  value,
  field,
  copiedField,
  color,
  onCopy,
}: {
  label: string;
  value: string;
  field: string;
  copiedField: string | null;
  color: "indigo" | "slate";
  onCopy: (text: string, field: string) => void;
}) {
  const isIndigo = color === "indigo";

  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 ${
        isIndigo
          ? "border-[#d7d2ff] bg-[#f3f1ff]"
          : "border-[#e3e1e4] bg-[#faf9fb]"
      }`}
    >
      <span
        className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          isIndigo
            ? "bg-[#e5e1ff] text-[#5d55dd]"
            : "bg-[#eeecf0] text-[#656870]"
        }`}
      >
        {label}
      </span>
      <p className="truncate font-mono text-xs text-[#55575f]">{value}</p>
      <Button
        size="sm"
        variant="ghost"
        className={`h-9 px-2 transition-all ${
          isIndigo
            ? "text-[#5d55dd] hover:bg-[#e5e1ff] hover:text-[#4840c5]"
            : "text-[#55575f] hover:bg-[#eeecf0] hover:text-[#292a30]"
        }`}
        onClick={() => onCopy(value, field)}
      >
        {copiedField === field ? (
          <span className="flex items-center gap-1 text-xs font-bold text-[#168267]">
            <Check size={14} /> Copiado
          </span>
        ) : (
          <Copy size={15} />
        )}
      </Button>
    </div>
  );
}
