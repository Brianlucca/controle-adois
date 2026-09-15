"use client";

import { CalendarDays, Landmark, ReceiptText } from "lucide-react";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import type { FinancialAccountOption } from "@/lib/finance/account-types";
import type { SettlementExpense } from "@/lib/finance/expense-splits";
import { formatDate } from "@/lib/utils";

interface SettlementExpenseListProps {
  expenses: SettlementExpense[];
  participants: WorkspaceParticipant[];
  accounts: FinancialAccountOption[];
  selectedParticipantId: string;
  onParticipantChange: (participantId: string) => void;
  displayCents: (amountCents: number) => string;
}

export function SettlementExpenseList({
  expenses,
  participants,
  accounts,
  selectedParticipantId,
  onParticipantChange,
  displayCents,
}: SettlementExpenseListProps) {
  const participantIds = new Set(
    participants.map((participant) => participant.userId),
  );
  const activeParticipantId = participantIds.has(selectedParticipantId)
    ? selectedParticipantId
    : "all";
  const participantById = new Map(
    participants.map((participant) => [participant.userId, participant]),
  );
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const visibleExpenses = expenses.filter(
    (expense) =>
      activeParticipantId === "all" ||
      expense.paidByUserId === activeParticipantId ||
      expense.debts.some(
        (debt) =>
          debt.fromUserId === activeParticipantId ||
          debt.toUserId === activeParticipantId,
      ),
  );

  const participantName = (userId: string) => {
    const participant = participantById.get(userId);
    if (!participant) return "Participante anterior";
    return participant.isCurrentUser
      ? `${participant.displayName} (você)`
      : participant.displayName;
  };

  return (
    <section className="rounded-2xl border border-[#e3e1e4] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(31,29,43,.55)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eeecff] text-[#635bff]">
            <ReceiptText size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#292a30]">
              Despesas que geraram o acerto
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#777983]">
              Só entram gastos pagos com dinheiro pessoal quando outra pessoa
              ficou responsável por uma parte.
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-[#f0efff] px-3 py-1 text-[10px] font-bold text-[#635bff]">
          {visibleExpenses.length} de {expenses.length}
        </span>
      </div>

      <div className="mt-4 border-t border-[#eceaed] pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
          Filtrar por pessoa
        </p>
        <div
          className="mt-2 flex flex-wrap gap-2"
          aria-label="Filtrar despesas por pessoa"
        >
          <FilterButton
            active={activeParticipantId === "all"}
            label="Todas"
            onClick={() => onParticipantChange("all")}
          />
          {participants.map((participant) => (
            <FilterButton
              key={participant.userId}
              active={activeParticipantId === participant.userId}
              label={
                participant.isCurrentUser
                  ? `${participant.displayName} (você)`
                  : participant.displayName
              }
              onClick={() => onParticipantChange(participant.userId)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {visibleExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dcd9df] bg-[#faf9fb] px-5 py-8 text-center">
            <p className="text-sm font-bold text-[#3f4047]">
              Nenhuma despesa envolve esta pessoa
            </p>
            <p className="mt-1 text-xs text-[#858790]">
              Escolha outra pessoa ou veja todas as despesas que geraram o acerto.
            </p>
          </div>
        ) : (
          visibleExpenses.map((expense) => {
            const accountName = expense.accountId
              ? accountById.get(expense.accountId)?.name ||
                "Conta pessoal arquivada"
              : "Sem conta vinculada";
            return (
              <article
                key={expense.transactionId}
                className="rounded-xl border border-[#e8e6ea] bg-[#faf9fb] p-4"
              >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[#292a30]">
                    {expense.description}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#858790]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} /> {formatDate(expense.dueDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Landmark size={12} /> {accountName}
                    </span>
                  </div>
                </div>
                <strong className="shrink-0 font-mono text-sm text-[#292a30]">
                  {displayCents(expense.amountCents)}
                </strong>
              </div>

              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-[#666872] ring-1 ring-[#e8e6ea]">
                <strong className="text-[#34353b]">
                  {participantName(expense.paidByUserId)}
                </strong>{" "}
                pagou com dinheiro pessoal. Por isso, somente as partes abaixo
                precisam ser devolvidas.
              </p>

              <div className="mt-2 space-y-2">
                {expense.debts.map((debt) => (
                  <div
                    key={`${debt.fromUserId}:${debt.toUserId}:${debt.amountCents}`}
                    className="flex flex-col gap-2 rounded-lg border border-[#dedbea] bg-white px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="min-w-0 leading-relaxed text-[#666872]">
                      Nesta despesa, {" "}
                      <strong className="text-[#34353b]">
                        {participantName(debt.fromUserId)}
                      </strong>{" "}
                      ficou responsável por uma parte paga por {" "}
                      <strong className="text-[#34353b]">
                        {participantName(debt.toUserId)}
                      </strong>.
                    </p>
                    <strong className="shrink-0 font-mono text-[#292a30] sm:text-right">
                      {displayCents(debt.amountCents)}
                    </strong>
                  </div>
                ))}
              </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-[#bbb6ff] bg-[#ebe9ff] text-[#554dd3]"
          : "border-[#dedce5] bg-white text-[#777983] hover:border-[#c8c4d2]"
      }`}
    >
      {label}
    </button>
  );
}
