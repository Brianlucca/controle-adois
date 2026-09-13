"use client";

import { FormEvent, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_OWNERSHIP_LABELS,
  ACCOUNT_TYPE_LABELS,
  AccountFormValues,
  AccountOwnership,
  FinancialAccountType,
} from "@/lib/finance/account-types";
import { getLocalDateKey } from "@/lib/finance/date";

interface AccountFormPanelProps {
  onCancel: () => void;
  onSubmit: (
    values: AccountFormValues,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function AccountFormPanel({ onCancel, onSubmit }: AccountFormPanelProps) {
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [type, setType] = useState<FinancialAccountType>("checking");
  const [ownership, setOwnership] = useState<AccountOwnership>("joint");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingBalanceSign, setOpeningBalanceSign] = useState<
    "positive" | "negative"
  >("positive");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() =>
    getLocalDateKey(new Date()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSubmit({
      name,
      institutionName,
      type,
      ownership,
      openingBalance:
        Number(openingBalance || 0) *
        (openingBalanceSign === "negative" ? -1 : 1),
      openingBalanceDate,
    });
    setSaving(false);
    if (!result.success) setError(result.error || "Não foi possível salvar.");
  }

  return (
    <form onSubmit={handleSubmit} className="app-card overflow-hidden">
      <div className="app-card-header">
        <div>
          <h2 className="flex items-center gap-2">
            <Landmark size={17} className="text-[#635bff]" /> Nova conta
          </h2>
          <p>Cadastre onde o dinheiro do casal está.</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome da conta">
          <Input
            required
            maxLength={60}
            placeholder="Ex.: Conta principal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Banco ou instituição">
          <Input
            maxLength={80}
            placeholder="Ex.: Nubank"
            value={institutionName}
            onChange={(event) => setInstitutionName(event.target.value)}
          />
        </Field>
        <Field label="Tipo">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as FinancialAccountType)}
            className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
          >
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="De quem é?">
          <select
            value={ownership}
            onChange={(event) => setOwnership(event.target.value as AccountOwnership)}
            className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
          >
            {Object.entries(ACCOUNT_OWNERSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Saldo inicial">
          <div className="grid grid-cols-[7.5rem_1fr] gap-2">
            <select
              aria-label="Sinal do saldo inicial"
              value={openingBalanceSign}
              onChange={(event) =>
                setOpeningBalanceSign(
                  event.target.value as "positive" | "negative",
                )
              }
              className="h-11 rounded-xl border border-[#dedce1] bg-white px-3 text-sm outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
            >
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
            </select>
            <CurrencyInput
              aria-label="Saldo inicial"
              placeholder="0,00"
              value={openingBalance}
              onValueChange={setOpeningBalance}
              className="font-mono font-bold"
            />
          </div>
        </Field>
        <Field label="Data de início">
          <Input
            required
            type="date"
            value={openingBalanceDate}
            onChange={(event) => setOpeningBalanceDate(event.target.value)}
          />
        </Field>
      </div>
      {error && (
        <p className="mx-5 mb-4 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm text-[#b84e45]">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-[#efedf0] bg-[#faf9fb] p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#635bff] text-white hover:bg-[#544ce0]"
        >
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Salvar conta
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#858790]">
        {label}
      </span>
      {children}
    </label>
  );
}
