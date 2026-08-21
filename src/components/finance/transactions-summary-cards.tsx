import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TransactionsSummaryCardsProps {
  income: number;
  expense: number;
  pendingExpense: number;
  projectedBalance: number;
  balance: number;
  netInvestments: number;
  totalAssets: number;
  hideValues: boolean;
  onToggleHideValues: () => void;
}

export function TransactionsSummaryCards({
  income,
  expense,
  pendingExpense,
  projectedBalance,
  balance,
  netInvestments,
  totalAssets,
  hideValues,
  onToggleHideValues,
}: TransactionsSummaryCardsProps) {
  const displayValue = (value: number) =>
    hideValues ? "••••••" : formatCurrency(value);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.8fr_1fr_1fr_1fr]">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#121722] p-5 shadow-xl shadow-black/15 md:col-span-2 xl:col-span-1">
        <button
          type="button"
          onClick={onToggleHideValues}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-slate-300 transition-colors hover:text-white"
        >
          {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
          <Wallet size={80} />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Patrimônio real
          </p>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
            Hoje
          </span>
        </div>

        <h3
          className={`text-3xl font-bold ${
            totalAssets >= 0 ? "text-white" : "text-red-400"
          }`}
        >
          {displayValue(totalAssets)}
        </h3>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-6">
          <div className="min-w-0 overflow-hidden">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Disponível</span>
            <span className="mt-1 block truncate text-sm font-bold text-slate-200">
              {displayValue(balance)}
            </span>
          </div>
          <div className="min-w-0 overflow-hidden">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <TrendingUp size={10} className="text-indigo-400" /> Investido
            </span>
            <span className="mt-1 block truncate text-sm font-bold text-indigo-300">
              {displayValue(netInvestments)}
            </span>
          </div>
          </div>
          <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Previsão do ciclo</span>
              <span className="mt-0.5 block text-[10px] text-slate-600">Após entradas e contas previstas</span>
            </div>
            <span className={`shrink-0 text-sm font-bold ${projectedBalance >= 0 ? "text-cyan-300" : "text-red-400"}`}>
              {displayValue(projectedBalance)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] p-4 transition-colors hover:border-emerald-500/30">
        <div className="flex justify-between items-start mb-4">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
            <ArrowUpCircle size={24} />
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">
            Receitas
          </span>
        </div>
        <h3 className="text-2xl font-bold text-white">
          {displayValue(income)}
        </h3>
        <p className="text-sm text-slate-500 mt-1">Entradas ate hoje</p>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-red-500/15 bg-red-500/[0.07] p-4 transition-colors hover:border-red-500/30">
        <div className="flex justify-between items-start mb-4">
          <div className="rounded-lg bg-red-500/10 p-2 text-red-300">
            <ArrowDownCircle size={24} />
          </div>
          <span className="rounded bg-red-500/10 px-2 py-1 text-xs font-bold text-red-300">
            Despesas
          </span>
        </div>
        <h3 className="text-2xl font-bold text-white">
          {displayValue(expense)}
        </h3>
        <p className="text-sm text-slate-500 mt-1">Saidas ate hoje</p>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-amber-500/15 bg-amber-500/[0.07] p-4 transition-colors hover:border-amber-500/30">
        <div className="flex justify-between items-start mb-4">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-300">
            <AlertTriangle size={24} />
          </div>
          <span className="rounded bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-300">
            Pendente
          </span>
        </div>
        <h3 className="text-2xl font-bold text-white">
          {displayValue(pendingExpense)}
        </h3>
        <p className="text-sm text-slate-500 mt-1">Contas a pagar</p>
      </div>
    </div>
  );
}
