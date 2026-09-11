"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { DateRangeFilter } from "@/components/date-range-filter";
import { usePreferences } from "@/contexts/preferences-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useFinance } from "@/hooks/use-finance";
import { useFinancialNotifications } from "@/hooks/use-financial-notifications";
import { calculateFinancialAssistant } from "@/lib/finance/assistant";
import { calculateDashboardData } from "@/lib/finance/dashboard";
import { getLocalDateKey } from "@/lib/finance/date";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const {
    transactions,
    snapshotTransactions,
    loading,
    dateRange,
    setDateRange,
    cycleRange,
    cycleStartDay,
    cycleEndDay,
    resetToFinancialCycle,
    saveFinancialCycle,
  } = useFinance();
  const { hideValues, toggleHideValues, notifications } = usePreferences();
  const { activeWorkspace } = useWorkspace();
  const todayKey = getLocalDateKey(new Date());
  const data = useMemo(
    () =>
      calculateDashboardData(
        transactions,
        activeWorkspace?.budgetLimit || 3000,
        todayKey,
        snapshotTransactions,
        dateRange.to,
      ),
    [
      activeWorkspace?.budgetLimit,
      dateRange.to,
      snapshotTransactions,
      todayKey,
      transactions,
    ],
  );
  const insights = useMemo(
    () => calculateFinancialAssistant(snapshotTransactions, todayKey),
    [snapshotTransactions, todayKey],
  );

  useFinancialNotifications({
    transactions: snapshotTransactions,
    enabled: notifications,
    projectedBalance: data.projectedBalance,
  });
  const displayValue = (value: number) =>
    hideValues ? "••••••" : formatCurrency(Number.isNaN(value) ? 0 : value);

  if (loading)
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#635bff]" />
          <p className="mt-3 text-sm text-[#858892]">Organizando seus dados…</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 pb-20">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Visão geral</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="app-title">Olá, vamos organizar o mês?</h1>
            <button
              aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
              onClick={toggleHideValues}
              className="rounded-full p-2 text-[#92949c] transition hover:bg-white hover:text-[#292b31]"
            >
              {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-2 text-sm text-[#777a83]">
            O essencial do espaço {activeWorkspace?.name || "de vocês"}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
          <Link
            href="/dashboard/transactions?new=1"
            className="flex h-11 items-center justify-center rounded-xl bg-[#635bff] px-5 text-sm font-bold text-white transition hover:bg-[#544ce0]"
          >
            <Plus size={17} className="mr-2" /> Nova transação
          </Link>
        </div>
      </section>

      <section className="balance-panel">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-[#7771dd]">
            <Wallet size={16} /> Saldo disponível hoje
          </div>
          <p
            className={`mt-4 text-4xl font-black tracking-[-.05em] sm:text-5xl ${data.balance < 0 ? "text-[#d65649]" : "text-[#1c1d22]"}`}
          >
            {displayValue(data.balance)}
          </p>
          <div className="mt-5 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-[#e8e7ed]">
              <div
                className="h-full rounded-full bg-[#635bff] transition-all"
                style={{ width: `${Math.min(data.budgetPercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#8b8d95]">
              {Math.round(data.budgetPercent)}% do limite mensal utilizado
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e7e5ee] bg-white/75 p-5">
          <p className="text-xs font-semibold text-[#81838c]">Saldo previsto</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">
            {displayValue(data.projectedBalance)}
          </p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-[#92949b]">
            Considera {displayValue(data.pendingIncome)} a receber e{" "}
            {displayValue(data.pendingExpense)} a pagar.
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={ArrowUpRight}
          label="Receitas no período"
          value={displayValue(data.income)}
          tone="green"
        />
        <Metric
          icon={ArrowDownRight}
          label="Despesas no período"
          value={displayValue(data.expense)}
          tone="red"
        />
        <Metric
          icon={Sparkles}
          label="Média livre por mês"
          value={displayValue(insights.averageMonthlySurplus)}
          tone="purple"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <div className="app-card overflow-hidden">
          <div className="app-card-header">
            <div>
              <h2>Movimentações recentes</h2>
              <p>O que aconteceu por último neste espaço.</p>
            </div>
            <Link href="/dashboard/transactions" className="app-link">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-[#efedf0] px-4">
            {data.recentTransactions.length ? (
              data.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 py-4"
                >
                  <BrandIcon
                    description={transaction.description}
                    category={transaction.category}
                    type={transaction.type}
                    className="h-10 w-10 rounded-xl border border-[#eceaec] bg-[#f8f7f9]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {transaction.description}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#92949b]">
                      {formatDate(transaction.dueDate)} · {transaction.category}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${transaction.type === "income" ? "text-[#168267]" : "text-[#44464e]"}`}
                  >
                    {transaction.type === "expense" ? "−" : "+"}{" "}
                    {displayValue(Number(transaction.amount))}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="Nenhuma movimentação neste período." />
            )}
          </div>
        </div>
        <div className="app-card overflow-hidden">
          <div className="app-card-header">
            <div>
              <h2>Próximos compromissos</h2>
              <p>Contas que merecem atenção.</p>
            </div>
          </div>
          <div className="divide-y divide-[#efedf0] px-4">
            {data.upcomingBills.length ? (
              data.upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1e9] text-[#d76e43]">
                    <CalendarDays size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {bill.description}
                    </p>
                    <p className="mt-0.5 text-xs text-[#92949b]">
                      Vence em {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <b className="text-sm">{displayValue(Number(bill.amount))}</b>
                </div>
              ))
            ) : (
              <EmptyState text="Tudo tranquilo por aqui." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: string;
  tone: "green" | "red" | "purple";
}) {
  return (
    <div className="app-card flex items-center gap-4 p-5">
      <span className={`metric-icon metric-icon-${tone}`}>
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xs font-semibold text-[#81838c]">{label}</p>
        <p className="mt-1 text-xl font-extrabold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-[#9698a0]">{text}</div>;
}
