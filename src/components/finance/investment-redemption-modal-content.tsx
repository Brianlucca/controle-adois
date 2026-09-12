import { FormEvent } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaf7f2] text-[#168267]">
            <TrendingUp size={22} />
          </div>
          <p className="text-sm font-bold text-[#292a30]">
            Nenhum investimento com saldo encontrado.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cadastre uma saída paga na categoria Investimento para fazer um
            resgate, ou confira se os aportes já foram resgatados.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[#cce9de] bg-[#f2faf7] p-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#168267]">
              Valor do resgate
            </label>
            <CurrencyInput
              placeholder="0,00"
              value={redeemAmount}
              onValueChange={onRedeemAmountChange}
              className="mt-2 h-12 border-[#cce9de] bg-white text-lg font-bold text-[#292a30] focus:border-[#54ae91]"
              autoFocus
            />
            {selectedInvestment &&
              Number(redeemAmount) >
                Number(selectedInvestment.remainingAmount) && (
                <p className="mt-3 rounded-lg border border-[#f1dec4] bg-[#fff8ee] p-3 text-xs text-[#946022]">
                  O valor acima do saldo disponível será confirmado como
                  rendimento e lançado automaticamente em Rendimento de
                  Investimento.
                </p>
              )}
            {selectedInvestment && (
              <p className="mt-3 text-xs text-[#38705f]">
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
              <span className="text-xs font-bold text-[#5d55dd]">
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
                        ? "border-[#9dd6c4] bg-[#f2faf7]"
                        : "border-[#e3e1e4] bg-white hover:border-[#cbc8d0] hover:bg-[#faf9fb]"
                    }`}
                  >
                    <BrandIcon
                      description={investment.description}
                      category={investment.category}
                      type={investment.type}
                      className="h-10 w-10 rounded-lg border border-[#e3e1e4] bg-[#faf9fb]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#292a30]">
                        {investment.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(investment.dueDate)} - Original{" "}
                        {displayValue(investment.investedAmount)}
                        {investment.redeemedAmount > 0
                          ? ` - Já resgatado ${displayValue(
                              investment.redeemedAmount,
                            )}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-bold text-[#168267]">
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
              className="flex-1 border border-[#dedce1] bg-white font-bold text-[#45474f] hover:bg-[#f5f4f6]"
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
