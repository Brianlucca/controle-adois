import { Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currentUserId?: string;
}

export function TransactionList({ transactions, onDelete, currentUserId }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-slate-300 rounded-xl bg-slate-50">
        <p className="text-slate-500">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-4 py-3">Descrição</th>
            <th className="px-4 py-3">Quem</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-medium flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.type === 'income' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}
                </div>
                {t.description}
              </td>
              <td className="px-4 py-3 text-slate-500">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${t.userId === currentUserId ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
                    {t.userId === currentUserId ? "Você" : "Parceiro"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{t.category}</td>
              <td className="px-4 py-3 text-slate-500">{formatDate(t.dueDate)}</td>
              <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'expense' ? "-" : "+"} {formatCurrency(t.amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
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