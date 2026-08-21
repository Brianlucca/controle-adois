"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/hooks/use-finance";
import { useFinancialNotifications } from "@/hooks/use-financial-notifications";
import { usePreferences } from "@/contexts/preferences-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLocalDateKey } from "@/lib/finance/date";
import { calculateDashboardData } from "@/lib/finance/dashboard";
import { calculateFinancialAssistant } from "@/lib/finance/assistant";
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
  const { transactions, snapshotTransactions, loading, dateRange, setDateRange, cycleRange, cycleStartDay, cycleEndDay, resetToFinancialCycle, saveFinancialCycle } = useFinance();
  const { hideValues, toggleHideValues, notifications } = usePreferences();
  const [budgetLimit, setBudgetLimit] = useState(3000);
  const todayKey = getLocalDateKey(new Date());

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

  const dashboardData = useMemo(
    () =>
      calculateDashboardData(
        transactions,
        budgetLimit,
        todayKey,
        snapshotTransactions,
        dateRange.to
      ),
    [transactions, snapshotTransactions, budgetLimit, todayKey, dateRange.to]
  );
  const {
    income,
    expense,
    balance,
    pendingIncome,
    pendingExpense,
    projectedBalance,
    budgetPercent,
    budgetColor,
    chartData,
    recentTransactions,
    upcomingBills,
  } = dashboardData;

  useFinancialNotifications({
    transactions: snapshotTransactions,
    enabled: notifications,
    projectedBalance,
  });

  const assistantData = useMemo(
    () => calculateFinancialAssistant(snapshotTransactions, todayKey),
    [snapshotTransactions, todayKey]
  );

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
    <div className="space-y-5 animate-in fade-in duration-700 pb-24 lg:pb-12">
      <div className="relative z-30 flex flex-col items-start justify-between gap-4 overflow-visible rounded-2xl border border-white/10 bg-gradient-to-r from-[#151a28] via-[#121722] to-indigo-950/40 p-5 shadow-2xl shadow-black/20 md:flex-row md:items-end md:p-6">
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
            cycleRange={cycleRange}
            onUseCycle={resetToFinancialCycle}
            cycleStartDay={cycleStartDay}
            cycleEndDay={cycleEndDay}
            onSaveCycle={saveFinancialCycle}
          />
          <Link href="/dashboard/transactions">
            <Button className="h-11 w-full rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-700">
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-indigo-400/30">
              <div className="absolute right-0 top-0 p-6 opacity-5">
                <Wallet size={64} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Saldo disponível hoje
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

            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.12] to-cyan-950/[0.08] p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/30">
              <div className="absolute right-0 top-0 p-6 opacity-5">
                <Calculator size={64} />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Calculator size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Saldo previsto
              </p>
              <h3
                className={`text-2xl font-bold mt-1 ${
                  projectedBalance >= 0 ? "text-white" : "text-red-400"
                }`}
              >
                {displayValue(projectedBalance)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                Atual + {displayValue(pendingIncome)} a receber − {displayValue(pendingExpense)} a pagar
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-950/[0.08] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <ArrowUpRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Receitas Até Hoje
              </p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(income)}
              </h3>
            </div>

            <div className="rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-500/[0.12] to-red-950/[0.08] p-5 transition-all hover:-translate-y-0.5 hover:border-red-500/30">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <ArrowDownRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Despesas Até Hoje
              </p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(expense)}
              </h3>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">Média livre por mês</p><p className={`mt-1 text-xl font-bold ${assistantData.averageMonthlySurplus >= 0 ? "text-emerald-300" : "text-red-300"}`}>{displayValue(assistantData.averageMonthlySurplus)}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">Estimativa em 12 meses</p><p className={`mt-1 text-xl font-bold ${assistantData.estimatedBalanceIn12Months >= 0 ? "text-white" : "text-red-300"}`}>{displayValue(assistantData.estimatedBalanceIn12Months)}</p><p className="mt-1 text-[10px] text-slate-600">Baseada na média dos últimos 90 dias</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">Reserva sugerida</p><p className="mt-1 text-xl font-bold text-violet-200">{displayValue(assistantData.emergencyReserveTarget)}</p><p className="mt-1 text-[10px] text-slate-600">Seis meses da despesa média</p></div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex min-h-[360px] flex-col rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/5 p-4 sm:p-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-indigo-400" /> Fluxo Diário
                </h3>
              </div>
              <div className="h-[320px] w-full flex-1 p-3 sm:p-4">
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
                        name="Saída"
                        dataKey="Saida"
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
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
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
                        className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
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

              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
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
                        className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
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
