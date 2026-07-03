import { Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currentUserId?: string;
}

export function TransactionList({
  transactions,
  onDelete,
  currentUserId,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-[#121722] py-10 text-center">
        <p className="text-sm text-slate-500">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
      <div className="divide-y divide-white/5 lg:hidden">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                t.type === "income"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              {t.type === "income" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {t.description}
              </p>
              <p className="truncate text-xs text-slate-500">
                {formatDate(t.dueDate)} - {t.category}
              </p>
              <span
                className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  t.userId === currentUserId
                    ? "bg-indigo-500/10 text-indigo-300"
                    : "bg-amber-500/10 text-amber-300"
                }`}
              >
                {t.userId === currentUserId ? "Você" : "Parceiro"}
              </span>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span
                className={`font-mono text-sm font-bold ${
                  t.type === "income" ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {t.type === "expense" ? "-" : "+"} {formatCurrency(t.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onDelete(t.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <table className="hidden w-full text-left text-sm lg:table">
        <thead className="border-b border-white/5 bg-white/[0.02] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Descrição</th>
            <th className="px-4 py-3">Quem</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {transactions.map((t) => (
            <tr key={t.id} className="transition-colors hover:bg-white/[0.03]">
              <td className="flex items-center gap-2 px-4 py-3 font-medium text-white">
                <div
                  className={`rounded-lg p-1.5 ${
                    t.type === "income"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {t.type === "income" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </div>
                {t.description}
              </td>
              <td className="px-4 py-3 text-slate-500">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    t.userId === currentUserId
                      ? "bg-indigo-500/10 text-indigo-300"
                      : "bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {t.userId === currentUserId ? "Você" : "Parceiro"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{t.category}</td>
              <td className="px-4 py-3 text-slate-500">
                {formatDate(t.dueDate)}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono font-bold ${
                  t.type === "income" ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {t.type === "expense" ? "-" : "+"} {formatCurrency(t.amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
