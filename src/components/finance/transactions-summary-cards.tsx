import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  TrendingUp,
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
      <div className="relative overflow-hidden rounded-2xl border border-[#e3e1e4] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(34,30,52,.45)] md:col-span-2 xl:col-span-1">
        <button
          type="button"
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          onClick={onToggleHideValues}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl border border-[#e3e1e4] bg-[#faf9fb] text-[#62646c] transition hover:border-[#cbc8d0] hover:bg-white"
        >
          {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#747780]">
            Patrimônio real
          </p>
          <span className="rounded-md bg-[#f2f1f4] px-2 py-1 text-[9px] font-semibold text-[#757780]">
            Hoje
          </span>
        </div>
        <h3
          className={`mt-3 text-3xl font-black tracking-[-.04em] ${totalAssets >= 0 ? "text-[#202127]" : "text-[#c9564b]"}`}
        >
          {displayValue(totalAssets)}
        </h3>
        <div className="mt-5 border-t border-[#ebe9ec] pt-4">
          <div className="grid grid-cols-2 gap-5">
            <Value label="Disponível" value={displayValue(balance)} />
            <Value
              label="Investido"
              value={displayValue(netInvestments)}
              accent
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f5f4f7] px-3 py-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8b8d95]">
                Previsão do ciclo
              </p>
              <p className="mt-0.5 text-[10px] text-[#a0a2a9]">
                Após entradas e contas previstas
              </p>
            </div>
            <b
              className={`shrink-0 text-sm ${projectedBalance >= 0 ? "text-[#635bff]" : "text-[#c9564b]"}`}
            >
              {displayValue(projectedBalance)}
            </b>
          </div>
        </div>
      </div>
      <Summary
        icon={ArrowUp}
        label="Receitas"
        value={displayValue(income)}
        description="Recebidas no período"
        tone="green"
      />
      <Summary
        icon={ArrowDown}
        label="Despesas"
        value={displayValue(expense)}
        description="Pagas no período"
        tone="red"
      />
      <Summary
        icon={AlertTriangle}
        label="Pendente"
        value={displayValue(pendingExpense)}
        description="Contas a pagar"
        tone="amber"
      />
    </div>
  );
}

function Value({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#93959c]">
        {accent && <TrendingUp size={11} />} {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-bold ${accent ? "text-[#635bff]" : "text-[#292a30]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: typeof ArrowUp;
  label: string;
  value: string;
  description: string;
  tone: "green" | "red" | "amber";
}) {
  const colors = {
    green: "bg-[#e9f8f2] text-[#168267]",
    red: "bg-[#fff0ed] text-[#d15b4f]",
    amber: "bg-[#fff6e7] text-[#c88628]",
  };
  return (
    <div className="flex min-h-[190px] flex-col rounded-2xl border border-[#e5e3e4] bg-white p-5 transition hover:-translate-y-px hover:border-[#cfccd3]">
      <div className="flex items-start justify-between">
        <span className={`rounded-xl p-2.5 ${colors[tone]}`}>
          <Icon size={19} />
        </span>
        <span
          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${colors[tone]}`}
        >
          {label}
        </span>
      </div>
      <div className="mt-auto pt-7">
        <h3 className="text-2xl font-black tracking-[-.03em] text-[#202127]">
          {value}
        </h3>
        <p className="mt-1 text-sm text-[#8a8d95]">{description}</p>
      </div>
    </div>
  );
}
