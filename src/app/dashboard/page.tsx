"use client";

import { useEffect, useState } from "react";
import { useFinance } from "@/hooks/use-finance";
import { usePreferences } from "@/contexts/preferences-context";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Target,
  Loader2,
  DollarSign,
  Eye,
  EyeOff,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getWorkspaceDetails } from "@/actions/workspace-actions";
import { auth } from "@/lib/firebase-client";
import { DateRangeFilter } from "@/components/date-range-filter";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

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

  const pendingExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "pending")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const balance = income - expense;
  const budgetPercent =
    budgetLimit > 0 ? Math.min((expense / budgetLimit) * 100, 100) : 0;

  let budgetColor = "bg-emerald-500";
  if (budgetPercent > 70) budgetColor = "bg-yellow-500";
  if (budgetPercent > 90) budgetColor = "bg-red-500";

  const categoryMap = transactions
    .filter((t) => t.type === "expense" && t.status === "paid")
    .reduce((acc, curr) => {
      const cat = curr.category || "Outros";
      const val = Number(curr.amount) || 0;
      acc[cat] = (acc[cat] || 0) + val;
      return acc;
    }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

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

    if (curr.type === "income" && curr.status === "paid") {
      acc[label].Entrada += val;
    } else if (curr.type === "expense" && curr.status === "paid") {
      acc[label].Saída += val;
    }
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(chartMap).sort(
    (a, b) => a.dateSort - b.dateSort
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0F1218] border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-[#13161C] p-3 rounded-2xl border border-white/5">
        <div className="px-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Painel Financeiro
          </h2>
          <p className="text-2xl font-bold text-white mt-0.5">Visão Geral</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleHideValues}
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-white/10 bg-[#1A1D24] text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          <div className="rounded-lg px-2 h-10 flex items-center">
            <DateRangeFilter
              from={dateRange.from}
              to={dateRange.to}
              onChange={setDateRange}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 bg-[#13161C]/50 rounded-3xl border border-white/5 border-dashed">
          <Loader2 className="animate-spin text-indigo-500 h-10 w-10" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">
            Processando dados...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-[#13161C] border border-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign size={64} />
              </div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">
                Saldo Líquido
              </p>
              <h3
                className={`text-3xl font-bold ${
                  balance >= 0 ? "text-white" : "text-red-400"
                }`}
              >
                {displayValue(balance)}
              </h3>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-emerald-500/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400">Receitas</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(income)}
              </h3>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-red-500/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                  <ArrowDownRight size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400">Despesas</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {displayValue(expense)}
              </h3>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 hover:border-amber-500/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:scale-110 transition-transform">
                  <AlertTriangle size={24} />
                </div>
              </div>
              <p className="text-sm text-slate-400">A Pagar (Pendente)</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {displayValue(pendingExpense)}
              </h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Target size={18} className="text-indigo-400" /> Meta de
                  Gastos
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Limite:{" "}
                  <span className="text-white font-mono">
                    {displayValue(budgetLimit)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xl font-bold ${
                    budgetPercent > 100 ? "text-red-400" : "text-white"
                  }`}
                >
                  {Math.round(budgetPercent)}%
                </span>
                <p className="text-xs text-slate-500 uppercase">Consumido</p>
              </div>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${budgetColor} transition-all duration-1000 ease-out`}
                style={{ width: `${budgetPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#1A1D24] border border-white/5 flex flex-col min-h-[420px]">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ArrowUpCircle size={18} className="text-emerald-500" /> Fluxo
                de Caixa
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
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
                        opacity={0.4}
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
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: "20px" }}
                      />
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
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <div className="bg-white/5 p-4 rounded-full mb-3">
                      <ArrowUpRight size={24} className="opacity-50" />
                    </div>
                    <p className="text-sm">Sem dados neste período.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 flex flex-col min-h-[420px]">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ArrowDownCircle size={18} className="text-red-500" /> Despesas
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          paddingTop: "20px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <div className="bg-white/5 p-4 rounded-full mb-3">
                      <ArrowDownRight size={24} className="opacity-50" />
                    </div>
                    <p className="text-sm">Sem despesas registradas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
