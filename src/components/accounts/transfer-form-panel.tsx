"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDown, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  FinancialAccount,
  TransferFormValues,
} from "@/lib/finance/account-types";
import { projectTransferBalances } from "@/lib/finance/account-balances";
import { getLocalDateKey } from "@/lib/finance/date";
import { formatCurrency } from "@/lib/utils";

interface TransferFormPanelProps {
  accounts: FinancialAccount[];
  hideValues: boolean;
  onCancel: () => void;
  onSubmit: (
    values: TransferFormValues,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function TransferFormPanel({
  accounts,
  hideValues,
  onCancel,
  onSubmit,
}: TransferFormPanelProps) {
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [destinationAccountId, setDestinationAccountId] = useState(
    accounts.find((account) => account.id !== accounts[0]?.id)?.id || "",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => getLocalDateKey(new Date()));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const source = useMemo(
    () => accounts.find((account) => account.id === sourceAccountId),
    [accounts, sourceAccountId],
  );
  const destination = useMemo(
    () => accounts.find((account) => account.id === destinationAccountId),
    [accounts, destinationAccountId],
  );
  const projectedBalances = projectTransferBalances(
    source?.currentBalance || 0,
    destination?.currentBalance || 0,
    Number(amount || 0),
  );
  const displayValue = (value: number) =>
    hideValues ? "••••••" : formatCurrency(value);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSubmit({
      sourceAccountId,
      destinationAccountId,
      amount: Number(amount),
      date,
      description,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Não foi possível transferir.");
    }
  }

  function swapAccounts() {
    setSourceAccountId(destinationAccountId);
    setDestinationAccountId(sourceAccountId);
  }

  return (
    <form onSubmit={handleSubmit} className="app-card overflow-hidden">
      <div className="app-card-header">
        <div>
          <h2 className="flex items-center gap-2">
            <ArrowRightLeft size={17} className="text-[#635bff]" /> Transferir
          </h2>
          <p>Mova dinheiro sem criar receita ou despesa.</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <AccountSelect
            label="Sai de"
            accounts={accounts}
            hideValues={hideValues}
            value={sourceAccountId}
            excludedId={destinationAccountId}
            onChange={setSourceAccountId}
          />
          <button
            type="button"
            aria-label="Inverter contas"
            onClick={swapAccounts}
            className="mb-0.5 grid h-10 w-10 place-items-center rounded-xl border border-[#dedce1] bg-white text-[#635bff] transition hover:bg-[#f0efff]"
          >
            <ArrowDown size={17} className="md:rotate-[-90deg]" />
          </button>
          <AccountSelect
            label="Vai para"
            accounts={accounts}
            hideValues={hideValues}
            value={destinationAccountId}
            excludedId={sourceAccountId}
            onChange={setDestinationAccountId}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#858790]">
              Valor
            </span>
            <CurrencyInput
              required
              aria-label="Valor da transferência"
              placeholder="0,00"
              value={amount}
              onValueChange={setAmount}
              className="font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#858790]">
              Data
            </span>
            <Input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#858790]">
              Descrição
            </span>
            <Input
              maxLength={120}
              placeholder="Ex.: Reserva do mês"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        {source && amount && (
          <div
            className={`rounded-xl px-4 py-3 text-xs ${
              projectedBalances.sourceBalance < 0
                ? "bg-[#fff3e7] text-[#a95e2f]"
                : "bg-[#f3f8f6] text-[#38705f]"
            }`}
          >
            {source.name} ficará com{" "}
            <strong>{displayValue(projectedBalances.sourceBalance)}</strong>
            {destination && <> · {destination.name} receberá o valor integral</>}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b84e45]">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-[#efedf0] bg-[#faf9fb] p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving || !sourceAccountId || !destinationAccountId || !amount}
          className="bg-[#635bff] text-white hover:bg-[#544ce0]"
        >
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Confirmar transferência
        </Button>
      </div>
    </form>
  );
}

function AccountSelect({
  label,
  accounts,
  hideValues,
  value,
  excludedId,
  onChange,
}: {
  label: string;
  accounts: FinancialAccount[];
  hideValues: boolean;
  value: string;
  excludedId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#858790]">
        {label}
      </span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
      >
        <option value="">Selecione uma conta</option>
        {accounts
          .filter((account) => account.id !== excludedId)
          .map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {hideValues ? "••••••" : formatCurrency(account.currentBalance)}
            </option>
          ))}
      </select>
    </label>
  );
}
