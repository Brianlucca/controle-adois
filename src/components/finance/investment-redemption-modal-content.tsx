import { FormEvent } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvestmentOption } from "@/lib/finance/transaction-calculations";
import { formatDate } from "@/lib/utils";

interface InvestmentRedemptionModalContentProps {
  investmentOptions: InvestmentOption[];
  selectedInvestment?: InvestmentOption;
  redeemAmount: string;
  netInvestments: number;
  isRedeeming: boolean;
  displayValue: (value: number) => string;
  onRedeemAmountChange: (value: string) => void;
  onSelectInvestment: (investment: InvestmentOption) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}

export function InvestmentRedemptionModalContent({
  investmentOptions,
  selectedInvestment,
  redeemAmount,
  netInvestments,
  isRedeeming,
  displayValue,
  onRedeemAmountChange,
  onSelectInvestment,
  onCancel,
  onSubmit,
}: InvestmentRedemptionModalContentProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {investmentOptions.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp size={22} />
          </div>
          <p className="text-sm font-bold text-white">
            Nenhum investimento com saldo encontrado.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cadastre uma saida paga na categoria Investimento para fazer um
            resgate, ou confira se os aportes ja foram resgatados.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              Valor do resgate
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={redeemAmount}
              onChange={(event) => onRedeemAmountChange(event.target.value)}
              className="mt-2 h-12 border-emerald-500/20 bg-black/20 text-lg font-bold text-white focus:border-emerald-500/50"
              autoFocus
            />
            {selectedInvestment &&
              Number(redeemAmount) >
                Number(selectedInvestment.remainingAmount) && (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                  O valor acima do saldo disponivel sera confirmado como
                  rendimento e lancado automaticamente em Rendimento de
                  Investimento.
                </p>
              )}
            {selectedInvestment && (
              <p className="mt-3 text-xs text-emerald-100">
                Resgatando do investimento de{" "}
                {formatDate(selectedInvestment.dueDate)}. Restante:{" "}
                <span className="font-bold">
                  {displayValue(selectedInvestment.remainingAmount)}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Escolha o investimento
              </p>
              <span className="text-xs font-bold text-indigo-300">
                {displayValue(netInvestments)} investidos
              </span>
            </div>

            <div className="space-y-2">
              {investmentOptions.map((investment) => {
                const isSelected = selectedInvestment?.id === investment.id;

                return (
                  <button
                    key={investment.id}
                    type="button"
                    onClick={() => onSelectInvestment(investment)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                    }`}
                  >
                    <BrandIcon
                      description={investment.description}
                      category={investment.category}
                      type={investment.type}
                      className="h-10 w-10 rounded-lg bg-[#0B0E14] border border-white/5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {investment.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(investment.dueDate)} - Original{" "}
                        {displayValue(investment.investedAmount)}
                        {investment.redeemedAmount > 0
                          ? ` - Ja resgatado ${displayValue(
                              investment.redeemedAmount
                            )}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-bold font-mono text-emerald-300">
                        {displayValue(investment.remainingAmount)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        restante
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isRedeeming || !redeemAmount}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20"
            >
              {isRedeeming ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <TrendingUp size={18} className="mr-2" />
              )}
              Confirmar Resgate
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
