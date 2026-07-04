"use client";

import { useMemo } from "react";
import { useFinance } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import {
  calculateReportsData,
  exportTransactionsReport,
} from "@/lib/finance/reports";
import {
  Download,
  Calendar,
  ExternalLink,
  TrendingUp,
  Wallet,
  Target,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  PiggyBank,
  Sparkles,
  Layers,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  info: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  slate: "#64748b",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.purple,
  COLORS.pink,
  COLORS.danger,
  COLORS.warning,
  COLORS.success,
  COLORS.info,
  COLORS.slate,
];

export default function ReportsPage() {
  const { transactions, dateRange, setDateRange, loading } = useFinance();

  const handleExportExcel = () => {
    exportTransactionsReport(transactions, dateRange);
  };

  const reportData = useMemo(
    () => calculateReportsData(transactions),
    [transactions]
  );
  const {
    totalIncome,
    netInvested,
    realExpense,
    balance,
    savingsRate,
    expensesByCategory,
    radarData,
    cumulativeData,
    topExpenses,
    pendingBills,
  } = reportData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1D24]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl z-50">
          <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-300 font-medium">
                {entry.name}:
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return null;

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-700 lg:pb-16">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 xl:flex-row xl:items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Inteligência Financeira
          </h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Analise métricas avançadas, entenda padrões de consumo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onChange={setDateRange}
          />
          <Button
            onClick={handleExportExcel}
            className="h-11 rounded-lg border border-indigo-500/20 bg-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-500"
          >
            <Download className="mr-2" size={16} /> Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-white/10 bg-[#121722] transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              Saldo Líquido
              <Wallet
                size={16}
                className="text-emerald-500 group-hover:scale-110 transition-transform"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                balance >= 0 ? "text-white" : "text-red-400"
              }`}
            >
              {formatCurrency(balance)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {savingsRate.toFixed(0)}% de margem
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-indigo-500/15 bg-indigo-500/[0.06] transition-all hover:border-indigo-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              Investimentos Líquidos
              <PiggyBank
                size={16}
                className="text-indigo-500 group-hover:scale-110 transition-transform"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(netInvested)}
            </div>
            <p className="text-xs text-slate-500 mt-2">Aportes - Resgates</p>
          </CardContent>
        </Card>

        <Card className="group border-emerald-500/15 bg-emerald-500/[0.07] transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              Entradas
              <ArrowUpRight
                size={16}
                className="text-emerald-500 group-hover:scale-110 transition-transform"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Receitas totais (inclui resgates)
            </p>
          </CardContent>
        </Card>

        <Card className="group border-red-500/15 bg-red-500/[0.07] transition-all hover:border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
              Consumo Real
              <ArrowDownRight
                size={16}
                className="text-red-500 group-hover:scale-110 transition-transform"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {formatCurrency(realExpense)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                Exclui investimentos
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex min-h-[380px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  Evolução Patrimonial
                </h3>
                <p className="text-xs text-slate-500">
                  Comparativo de entradas, saídas e acúmulo (sem investimentos).
                </p>
              </div>
            </div>
          </div>
          <div className="h-[360px] w-full flex-1 p-3 sm:p-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cumulativeData}
                margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.1}
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <RechartsTooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                />

                <Line
                  yAxisId="left"
                  type="monotone"
                  name="Acumulado"
                  dataKey="Acumulado"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: "#c7d2fe",
                    strokeWidth: 2,
                    fill: COLORS.primary,
                  }}
                />
                <Bar
                  yAxisId="right"
                  name="Receitas"
                  dataKey="Receitas"
                  fill={COLORS.success}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.8}
                />
                <Bar
                  yAxisId="right"
                  name="Despesas"
                  dataKey="Despesas"
                  fill={COLORS.danger}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" /> Padrão de
                Consumo
              </h3>
            </div>
            <div className="flex-1 w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={radarData}
                >
                  <PolarGrid stroke="#334155" opacity={0.3} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, "auto"]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Gastos"
                    dataKey="A"
                    stroke={COLORS.warning}
                    fill={COLORS.warning}
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" /> Distribuição
              </h3>
            </div>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "10px",
                      color: "#cbd5e1",
                      right: 10,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  Contas Pendentes
                </h3>
                <p className="text-xs text-slate-500">Próximos vencimentos</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
              {pendingBills.length} a pagar
            </span>
          </div>

          <div className="flex-1 p-0 bg-[#13161C] overflow-hidden flex flex-col">
            {pendingBills.length > 0 ? (
              <div className="custom-scrollbar max-h-[300px] space-y-3 overflow-y-auto p-3 sm:p-5">
                {pendingBills.map((t) => {
                  const dateParts = {
                    day: t.dueDate.split("-")[2],
                    month: new Date(t.dueDate)
                      .toLocaleString("pt-BR", { month: "short" })
                      .toUpperCase(),
                  };
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 rounded-lg border border-white/10 bg-[#121722] p-3 transition-all hover:border-amber-500/30 hover:bg-[#1f2229]"
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-lg border border-white/5 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-colors shrink-0">
                        <span className="text-base font-bold leading-none">
                          {dateParts.day}
                        </span>
                        <span className="text-[9px] font-bold opacity-60 uppercase mt-0.5">
                          {dateParts.month}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {t.description}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-white/5 px-1.5 rounded">
                            {t.category}
                          </span>
                          <span className="text-[10px] text-slate-300 font-mono font-bold">
                            R$ {t.amount}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-slate-500 hover:text-white hover:bg-indigo-600 rounded-lg transition-all shrink-0"
                        onClick={() => {
                          const title = encodeURIComponent(
                            `Pagar: ${t.description}`
                          );
                          window.open(
                            `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`,
                            "_blank"
                          );
                        }}
                      >
                        <ExternalLink size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-500">
                <div className="bg-emerald-500/10 p-4 rounded-full mb-4 text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Tudo pago! Nenhuma pendência.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  Maiores Ofensores
                </h3>
                <p className="text-xs text-slate-500">
                  Onde você gastou mais (sem investimentos).
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-0 bg-[#13161C] overflow-hidden flex flex-col">
            {topExpenses.length > 0 ? (
              <div className="custom-scrollbar max-h-[300px] space-y-3 overflow-y-auto p-3 sm:p-5">
                {topExpenses.map((t, idx) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between rounded-lg border border-white/10 bg-[#121722] p-3 transition-colors hover:bg-[#1f2229]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                          idx === 0
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-white/5 text-slate-400 border-white/5"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white truncate max-w-[150px] group-hover:text-red-400 transition-colors">
                          {t.description}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          {t.category}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white text-sm bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">
                Sem dados suficientes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
