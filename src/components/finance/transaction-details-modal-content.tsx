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
import { TransactionStatusBadge } from "@/components/finance/transaction-status-badge";
import { Button } from "@/components/ui/button";
import { Transaction, TransactionStatus } from "@/lib/types";
import { createGoogleCalendarLink, formatDate } from "@/lib/utils";

interface TransactionDetailsModalContentProps {
  transaction: Transaction;
  copiedField: string | null;
  canRedeemInvestment: boolean;
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
  copiedField,
  canRedeemInvestment,
  displayValue,
  onCopy,
  onStartEdit,
  onDelete,
  onDeleteRecurrence,
  onStatusChange,
  onRedeemInvestment,
}: TransactionDetailsModalContentProps) {
  return (
    <div className="space-y-4 pb-2">
      <div
        className={`overflow-hidden rounded-lg border p-4 ${
          transaction.type === "income"
            ? "border-emerald-500/20 bg-emerald-500/[0.08]"
            : "border-red-500/20 bg-red-500/[0.07]"
        }`}
      >
        <div className="flex items-start gap-3">
          <BrandIcon
            description={transaction.description}
            category={transaction.category}
            type={transaction.type}
            className="h-12 w-12 shrink-0 rounded-lg bg-black/20 ring-1 ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">
              {transaction.description}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {transaction.category} -{" "}
              {transaction.type === "income" ? "Entrada" : "Saida"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <TransactionStatusBadge transaction={transaction} />
          </div>
          <p
            className={`font-mono text-3xl font-bold tracking-tight sm:text-right ${
              transaction.type === "income" ? "text-emerald-300" : "text-white"
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
          label="Responsavel"
          value={transaction.userName?.split(" ")[0] || "Eu"}
        />
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Status
          </p>
          <p
            className={`font-bold ${
              transaction.status === "pending"
                ? "text-amber-400"
                : transaction.type === "income"
                ? "text-emerald-400"
                : "text-red-400"
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

      {transaction.observation && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <FileText size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Observacoes
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {transaction.observation}
          </p>
        </div>
      )}

      {transaction.isRecurrent && (
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <Repeat2 size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Transacao recorrente
                </p>
                <p className="text-xs text-indigo-200">
                  {transaction.recurrenceIndex && transaction.recurrenceTotal
                    ? `${transaction.recurrenceIndex} de ${transaction.recurrenceTotal}`
                    : "Serie mensal ativa"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="h-10 border border-red-500/20 bg-red-500/10 px-3 text-red-300 hover:bg-red-500/20"
              onClick={() => onDeleteRecurrence(transaction.id)}
            >
              <Trash2 size={14} className="mr-2" />
              Excluir recorrencia
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
          className="h-11 w-full rounded-lg border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => {
            const link = createGoogleCalendarLink(
              transaction.description,
              transaction.dueDate,
              transaction.amount,
              transaction.observation
            );
            window.open(link, "_blank");
          }}
        >
          <CalendarPlus size={16} className="mr-2" /> Adicionar ao Google Agenda
        </Button>
      )}

      <div
        className={`sticky bottom-0 -mx-4 -mb-4 grid gap-2 border-t border-white/10 bg-[#10141D]/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 ${
          transaction.type === "expense" ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <Button
          className="h-12 rounded-lg border border-white/10 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 sm:text-sm"
          onClick={onStartEdit}
        >
          <Pencil size={16} className="mr-1.5" /> Editar
        </Button>

        {transaction.type === "expense" && (
          <Button
            className="h-12 rounded-lg bg-white text-xs font-bold text-slate-950 shadow-md hover:bg-slate-200 sm:text-sm"
            onClick={() =>
              onStatusChange(
                transaction.id,
                transaction.status === "paid" ? "pending" : "paid"
              )
            }
          >
            {transaction.status === "paid" ? "Pendente" : "Pagar"}
          </Button>
        )}

        <Button
          variant="destructive"
          className="h-12 rounded-lg border border-red-500/20 bg-red-500/10 px-0 text-red-400 hover:bg-red-500/20"
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
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="truncate font-bold text-white">{value}</p>
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
          ? "border-indigo-500/20 bg-indigo-500/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span
        className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          isIndigo
            ? "bg-indigo-500/20 text-indigo-200"
            : "bg-white/10 text-slate-300"
        }`}
      >
        {label}
      </span>
      <p className="truncate font-mono text-xs text-slate-300">{value}</p>
      <Button
        size="sm"
        variant="ghost"
        className={`h-9 px-2 transition-all ${
          isIndigo
            ? "text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
        onClick={() => onCopy(value, field)}
      >
        {copiedField === field ? (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
            <Check size={14} /> Copiado
          </span>
        ) : (
          <Copy size={15} />
        )}
      </Button>
    </div>
  );
}
