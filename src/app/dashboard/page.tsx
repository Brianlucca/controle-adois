"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/hooks/use-finance";
import { usePreferences } from "@/contexts/preferences-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BrandIcon } from "@/components/brand-icon";
import { DateRangeFilter } from "@/components/date-range-filter";
import { getWorkspaceDetails } from "@/actions/workspace-actions";
import { auth } from "@/lib/firebase-client";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  Calendar,
  History,
  Calculator,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { transactions, loading, dateRange, setDateRange } = useFinance();
  const { hideValues, toggleHideValues } = usePreferences();
  const [budgetLimit, setBudgetLimit] = useState(3000);

  useEffect(() => {
    if (auth.currentUser) {
      getWorkspaceDetails(auth.currentUser.uid).then((data) => {
        if (data && data.budgetLimit) setBudgetLimit(data.budgetLimit);
      });
    }
  }, []);

  const displayValue = (val: number) => {
    if (isNaN(val)) return hideValues ? "••••••" : formatCurrency(0);
    return hideValues ? "••••••" : formatCurrency(val);
  };

  const income = transactions
    .filter((t) => t.type === "income" && t.status === "paid")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const expense = transactions
    .filter((t) => t.type === "expense" && t.status === "paid")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const balance = income - expense;
  const isInvestment = (category?: string) => category === "Investimento";
  const liquidIncome = transactions
    .filter((t) => t.type === "income" && !isInvestment(t.category))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const liquidExpense = transactions
    .filter((t) => t.type === "expense" && !isInvestment(t.category))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingExpense = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.status === "pending" &&
        !isInvestment(t.category)
    )
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const liquidBalance = liquidIncome - liquidExpense;

  const budgetPercent =
    budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;
  let budgetColor = "bg-emerald-500";
  if (budgetPercent > 70) budgetColor = "bg-amber-500";
  if (budgetPercent > 90) budgetColor = "bg-red-500";

  const chartMap = transactions.reduce((acc, curr) => {
    if (!curr.dueDate) return acc;
    const [year, month, day] = curr.dueDate.split("-");
    const label = `${day}/${month}`;

    if (!acc[label]) {
      acc[label] = {
        name: label,
        Entrada: 0,
        Saída: 0,
        dateSort: new Date(curr.dueDate).getTime(),
      };
    }
    const val = Number(curr.amount) || 0;
    if (curr.type === "income" && curr.status === "paid")
      acc[label].Entrada += val;
    else if (curr.type === "expense" && curr.status === "paid")
      acc[label].Saída += val;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(chartMap).sort(
    (a, b) => a.dateSort - b.dateSort
  );

  const recentTransactions = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.dueDate).getTime() -
        new Date(a.createdAt || a.dueDate).getTime()
    )
    .slice(0, 5);

  const upcomingBills = transactions
    .filter((t) => t.type === "expense" && t.status === "pending")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 4);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1D24] border border-white/10 p-3 rounded-xl shadow-xl z-50">
          <p className="text-slate-400 text-xs mb-2 font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300">{entry.name}:</span>
              <span className="font-bold text-white">
                {displayValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-[#13161C] p-4 rounded-2xl border border-white/5 shadow-md">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Painel de Controle
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
            <button
              onClick={toggleHideValues}
              className="text-slate-500 hover:text-white transition-colors"
            >
              {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onChange={setDateRange}
          />
          <Link href="/dashboard/transactions">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-900/20">
              <Plus size={18} className="mr-2" /> Nova Transação
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-500 h-10 w-10" />
          <p className="text-slate-500 text-sm">Atualizando dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A1D24] to-[#13161C] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
              <div className="absolute right-0 top-0 p-6 opacity-5">
                <Wallet size={64} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Saldo Atual
              </p>
              <h3
                className={`text-3xl font-bold ${
                  balance >= 0 ? "text-white" : "text-red-400"
                }`}
              >
                {displayValue(balance)}
              </h3>
              <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${budgetColor} transition-all duration-1000`}
                  style={{ width: `${budgetPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 text-right">
                {Math.round(budgetPercent)}% da meta de gastos consumida
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-cyan-500/30 transition-all relative overflow-hidden">
              <div className="absolute right-0 top-0 p-6 opacity-5">
                <Calculator size={64} />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Calculator size={24} />
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-slate-300 font-bold uppercase tracking-wider">
                  Sem investimentos
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Saldo Líquido
              </p>
              <h3
                className={`text-2xl font-bold mt-1 ${
                  liquidBalance >= 0 ? "text-white" : "text-red-400"
                }`}
              >
                {displayValue(liquidBalance)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                {displayValue(pendingExpense)} em contas pendentes
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <ArrowUpRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Receitas Confirmadas
              </p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(income)}
              </h3>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-red-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <ArrowDownRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Despesas Pagas
              </p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(expense)}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col rounded-2xl bg-[#1A1D24] border border-white/5 shadow-lg min-h-[400px]">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-indigo-400" /> Fluxo Diário
                </h3>
              </div>
              <div className="flex-1 w-full h-full p-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorEntrada"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorSaida"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#334155"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => (hideValues ? "" : `${val}`)}
                        tick={{ fill: "#64748b" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="Entrada"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorEntrada)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Saída"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSaida)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Sem dados suficientes para o gráfico.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-[#1A1D24] border border-white/5 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">
                    Últimas Movimentações
                  </h3>
                  <Link
                    href="/dashboard/transactions"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    VER TUDO <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="p-2">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <BrandIcon
                          description={t.description}
                          category={t.category}
                          type={t.type}
                          className="w-9 h-9 rounded-lg bg-[#0B0E14] border border-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {t.description}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {formatDate(t.dueDate)} • {t.category}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-mono font-bold ${
                            t.type === "income"
                              ? "text-emerald-400"
                              : "text-slate-300"
                          }`}
                        >
                          {t.type === "expense" ? "-" : "+"}{" "}
                          {displayValue(Number(t.amount))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhuma movimentação recente.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#1A1D24] border border-white/5 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Calendar size={14} className="text-amber-500" /> Próximos
                    Boletos
                  </h3>
                </div>
                <div className="p-2">
                  {upcomingBills.length > 0 ? (
                    upcomingBills.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group"
                      >
                        <div className="flex flex-col items-center justify-center w-9 h-9 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                          <span className="text-xs font-bold">
                            {t.dueDate.split("-")[2]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {t.description}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Vence em breve
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {displayValue(Number(t.amount))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhuma conta pendente para este período.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
