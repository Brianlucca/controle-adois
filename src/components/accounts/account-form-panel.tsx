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
  AccountOwnerOption,
  FinancialAccountType,
} from "@/lib/finance/account-types";
import { getLocalDateKey } from "@/lib/finance/date";

interface AccountFormPanelProps {
  ownershipOptions: AccountOwnerOption[];
  viewerUserId: string;
  initialValues?: AccountFormValues;
  onCancel: () => void;
  onSubmit: (
    values: AccountFormValues,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function AccountFormPanel({
  onCancel,
  onSubmit,
  ownershipOptions,
  viewerUserId,
  initialValues,
}: AccountFormPanelProps) {
  const initialOwnerUserId = getInitialOwnerUserId(
    initialValues,
    ownershipOptions,
    viewerUserId,
  );
  const [name, setName] = useState(initialValues?.name || "");
  const [institutionName, setInstitutionName] = useState(
    initialValues?.institutionName || "",
  );
  const [type, setType] = useState<FinancialAccountType>(
    initialValues?.type || "checking",
  );
  const [ownerUserId, setOwnerUserId] = useState<string | null>(
    initialOwnerUserId,
  );
  const [openingBalance, setOpeningBalance] = useState(
    initialValues ? Math.abs(initialValues.openingBalance).toFixed(2) : "",
  );
  const [openingBalanceSign, setOpeningBalanceSign] = useState<
    "positive" | "negative"
  >(initialValues && initialValues.openingBalance < 0 ? "negative" : "positive");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    () => initialValues?.openingBalanceDate || getLocalDateKey(new Date()),
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
      ownership: ownerUserId
        ? ownerUserId === viewerUserId
          ? "mine"
          : "partner"
        : "joint",
      ownerUserId,
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
            <Landmark size={17} className="text-[#635bff]" />{" "}
            {initialValues ? "Editar conta" : "Nova conta"}
          </h2>
          <p>
            {initialValues
              ? "Atualize os dados sem perder o histórico da conta."
              : "Cadastre onde o dinheiro do casal está."}
          </p>
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
            value={ownerUserId || "joint"}
            onChange={(event) => {
              const value = event.target.value;
              setOwnerUserId(value === "joint" ? null : value);
            }}
            className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
          >
            <option value="joint">{ACCOUNT_OWNERSHIP_LABELS.joint}</option>
            {ownershipOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
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
          <p className="text-xs leading-5 text-[#858790]">
            Informe o saldo desta conta, não o patrimônio total do Controle A Dois.
          </p>
        </Field>
        <Field label="Data de início">
          <Input
            required
            type="date"
            disabled={Boolean(initialValues)}
            value={openingBalanceDate}
            onChange={(event) => setOpeningBalanceDate(event.target.value)}
          />
          {initialValues && (
            <p className="text-xs leading-5 text-[#858790]">
              A data inicial fica bloqueada para preservar o histórico.
            </p>
          )}
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
          {initialValues ? "Salvar alterações" : "Salvar conta"}
        </Button>
      </div>
    </form>
  );
}

function getInitialOwnerUserId(
  initialValues: AccountFormValues | undefined,
  ownershipOptions: AccountOwnerOption[],
  viewerUserId: string,
) {
  if (!initialValues) return null;
  if (initialValues.ownerUserId) return initialValues.ownerUserId;
  if (initialValues.ownership === "mine") return viewerUserId;
  if (initialValues.ownership === "partner") {
    return (
      ownershipOptions.find((option) => option.id !== viewerUserId)?.id || null
    );
  }
  return null;
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
