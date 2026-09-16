"use client";

import { useState } from "react";
import { Loader2, Save, UsersRound, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import type { FinancialCategory } from "@/lib/finance/category-types";
import type {
  BudgetScope,
  FinancialBudget,
  FinancialBudgetInput,
} from "@/lib/finance/budget-types";

export function BudgetFormPanel({
  budget,
  categories,
  participants,
  currentUserId,
  onCancel,
  onSubmit,
}: {
  budget?: FinancialBudget | null;
  categories: FinancialCategory[];
  participants: WorkspaceParticipant[];
  currentUserId: string;
  onCancel: () => void;
  onSubmit: (
    values: FinancialBudgetInput,
    id?: string,
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const defaultCategory =
    categories.find((category) => category.id === "builtin-alimentacao") ||
    categories[0];
  const [categoryId, setCategoryId] = useState(
    budget?.categoryId || defaultCategory?.id || "",
  );
  const canCreateShared = participants.length >= 2;
  const [scope, setScope] = useState<BudgetScope>(
    budget?.scope || (canCreateShared ? "shared" : "individual"),
  );
  const [participantUserId, setParticipantUserId] = useState(
    budget?.participantUserId || currentUserId,
  );
  const [responsibleUserId, setResponsibleUserId] = useState(
    budget?.responsibleUserId || currentUserId,
  );
  const [limitAmount, setLimitAmount] = useState(
    budget ? (budget.limitCents / 100).toFixed(2) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(budget);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const amount = Number(limitAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um limite maior que zero.");
      return;
    }

    setSubmitting(true);
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      setSubmitting(false);
      setError("Escolha uma categoria válida.");
      return;
    }
    const result = await onSubmit(
      {
        categoryId: category.id,
        category: category.name,
        limitAmount: amount,
        scope,
        participantUserId: scope === "individual" ? participantUserId : null,
        responsibleUserId,
      },
      budget?.id,
    );
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Não foi possível salvar o orçamento.");
    }
  }

  return (
    <form onSubmit={submit} className="app-card overflow-hidden">
      <div className="app-card-header">
        <div>
          <h2>{editing ? "Editar limite" : "Novo limite do ciclo"}</h2>
          <p>
            O orçamento acompanha despesas; não cria, remove ou reserva dinheiro.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar formulário"
          onClick={onCancel}
          className="grid h-9 w-9 place-items-center rounded-xl text-[#797b84] transition hover:bg-[#f2f0f3]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_1fr]">
        <fieldset disabled={editing} className="space-y-2 disabled:opacity-70">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
            Para quem é o limite?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <ScopeButton
              active={scope === "shared"}
              disabled={!editing && !canCreateShared}
              icon={<UsersRound size={16} />}
              label="Do casal"
              onClick={() => setScope("shared")}
            />
            <ScopeButton
              active={scope === "individual"}
              icon={<UserRound size={16} />}
              label="Individual"
              onClick={() => setScope("individual")}
            />
          </div>
        </fieldset>

        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
            Categoria
          </span>
          <select
            disabled={editing}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#8c85ff] focus:ring-2 focus:ring-[#635bff]/10 disabled:bg-[#f5f4f6]"
          >
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
            Limite por ciclo
          </span>
          <CurrencyInput
            required
            value={limitAmount}
            onValueChange={setLimitAmount}
            placeholder="0,00"
            aria-label="Limite do orçamento"
            className="h-11 bg-white"
          />
        </label>

        {scope === "individual" && (
          <label className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
              Limite de quem?
            </span>
            <select
              disabled={editing}
              value={participantUserId}
              onChange={(event) => setParticipantUserId(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#8c85ff] focus:ring-2 focus:ring-[#635bff]/10 disabled:bg-[#f5f4f6]"
            >
              {participants.map((participant) => (
                <option key={participant.userId} value={participant.userId}>
                  {participant.displayName}{participant.isCurrentUser ? " (você)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
            Quem acompanha?
          </span>
          <select
            value={responsibleUserId}
            onChange={(event) => setResponsibleUserId(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#8c85ff] focus:ring-2 focus:ring-[#635bff]/10"
          >
            {participants.map((participant) => (
              <option key={participant.userId} value={participant.userId}>
                {participant.displayName}{participant.isCurrentUser ? " (você)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2 lg:col-start-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {editing && (
        <p className="border-t border-[#efedf0] bg-[#faf9fb] px-5 py-3 text-xs text-[#858790]">
          Para preservar o histórico, categoria e titular não mudam. Você pode ajustar o valor e quem acompanha.
        </p>
      )}
      {error && (
        <p role="alert" className="border-t border-[#f2d3cf] bg-[#fff8f6] px-5 py-3 text-sm text-[#b84e45]">
          {error}
        </p>
      )}
    </form>
  );
}

function ScopeButton({
  active,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-[#cfcaff] bg-[#efedff] text-[#5c54db]"
          : "border-[#dedce1] bg-white text-[#696c74] hover:bg-[#faf9fb]"
      }`}
    >
      {icon} {label}
    </button>
  );
}
