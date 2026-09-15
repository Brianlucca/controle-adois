"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  ReceiptText,
  Scale,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { usePreferences } from "@/contexts/preferences-context";
import {
  useWorkspace,
  type WorkspaceParticipant,
} from "@/contexts/workspace-context";
import { useFinance } from "@/hooks/use-finance";
import { getFinancialAccountOptions } from "@/actions/account-actions";
import { SettlementExpenseList } from "@/components/finance/settlement-expense-list";
import { calculateCycleSettlement } from "@/lib/finance/expense-splits";
import type { FinancialAccountOption } from "@/lib/finance/account-types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SettlementPage() {
  const {
    snapshotTransactions,
    cycleRange,
    ensureRangeLoaded,
    loading,
    user,
  } = useFinance();
  const { activeWorkspace } = useWorkspace();
  const { hideValues, toggleHideValues } = usePreferences();
  const [accounts, setAccounts] = useState<FinancialAccountOption[] | null>(null);
  const [accountsWorkspaceId, setAccountsWorkspaceId] = useState<string | null>(null);
  const [participantFilter, setParticipantFilter] = useState("all");

  const participants = useMemo<WorkspaceParticipant[]>(() => {
    if (activeWorkspace?.participants.length) return activeWorkspace.participants;
    if (!user) return [];
    return [
      {
        userId: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Você",
        email: user.email || "",
        isCurrentUser: true,
      },
    ];
  }, [activeWorkspace?.participants, user]);

  useEffect(() => {
    void ensureRangeLoaded(cycleRange);
  }, [cycleRange, ensureRangeLoaded]);

  useEffect(() => {
    let active = true;
    void getFinancialAccountOptions(true).then((options) => {
      if (active) {
        setAccounts(options);
        setAccountsWorkspaceId(activeWorkspace?.id || null);
      }
    });
    return () => {
      active = false;
    };
  }, [activeWorkspace?.id]);

  const cycleTransactions = useMemo(
    () =>
      snapshotTransactions.filter(
        (transaction) =>
          transaction.dueDate >= cycleRange.from &&
          transaction.dueDate <= cycleRange.to,
      ),
    [cycleRange.from, cycleRange.to, snapshotTransactions],
  );
  const settlement = useMemo(
    () =>
      calculateCycleSettlement(
        cycleTransactions,
        participants.map((participant) => participant.userId),
        accountsWorkspaceId === (activeWorkspace?.id || null) ? accounts || [] : [],
      ),
    [accounts, accountsWorkspaceId, activeWorkspace?.id, cycleTransactions, participants],
  );
  const accountsReady = accountsWorkspaceId === (activeWorkspace?.id || null) && accounts !== null;

  const displayCents = (amountCents: number) =>
    hideValues ? "••••••" : formatCurrency(amountCents / 100);
  const participantById = new Map(
    participants.map((participant) => [participant.userId, participant]),
  );
  const participantName = (userId: string) => {
    const participant = participantById.get(userId);
    if (!participant) return "Participante anterior";
    return participant.isCurrentUser
      ? `${participant.displayName} (você)`
      : participant.displayName;
  };
  const partyName = (party: { kind: "participant"; id: string }) =>
    participantName(party.id);

  return (
    <div className="animate-in fade-in pb-10 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Meu, seu e nosso</p>
          <h1 className="app-title mt-1">Acerto do ciclo</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#747780]">
            Veja somente os gastos pagos com dinheiro pessoal que precisam ser
            compensados. O que saiu de conta conjunta fica fora do acerto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#e1dfe4] bg-white px-4 py-2.5 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#9698a0]">
              Ciclo analisado
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#34353b]">
              {formatDate(cycleRange.from)} — {formatDate(cycleRange.to)}
            </p>
          </div>
          <button
            type="button"
            aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
            onClick={toggleHideValues}
            className="grid h-12 w-12 place-items-center rounded-xl border border-[#e1dfe4] bg-white text-[#676a72] transition hover:bg-[#f6f5f8]"
          >
            {hideValues ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <SummaryCard
          icon={<ReceiptText size={18} />}
          label="Pago com dinheiro do casal"
          value={displayCents(settlement.jointFundedCents)}
          detail={`${settlement.jointFundedTransactionCount} gasto${settlement.jointFundedTransactionCount === 1 ? "" : "s"} · não gera acerto`}
        />
        <SummaryCard
          icon={<Scale size={18} />}
          label="Valor para equilibrar"
          value={displayCents(settlement.amountToSettleCents)}
          detail={
            settlement.transfers.length > 0
              ? `${settlement.transfers.length} acerto${settlement.transfers.length === 1 ? "" : "s"} sugerido${settlement.transfers.length === 1 ? "" : "s"}`
              : "Ninguém precisa transferir"
          }
        />
        <SummaryCard
          icon={<WalletCards size={18} />}
          label="Despesas que geraram acerto"
          value={String(settlement.eligibleTransactionCount)}
          detail="Somente valores pagos com dinheiro pessoal"
        />
      </section>

      {(loading || !accountsReady) && settlement.eligibleTransactionCount === 0 ? (
        <div className="mt-5 h-64 animate-pulse rounded-2xl border border-[#e3e1e4] bg-white" />
      ) : settlement.eligibleTransactionCount === 0 ? (
        <EmptySettlement
          participantCount={participants.length}
          jointFundedTransactionCount={settlement.jointFundedTransactionCount}
        />
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <SettlementExpenseList
            expenses={settlement.settlementExpenses}
            participants={participants}
            accounts={accountsReady ? accounts || [] : []}
            selectedParticipantId={participantFilter}
            onParticipantChange={setParticipantFilter}
            displayCents={displayCents}
          />

          <section className="rounded-2xl border border-[#dedbea] bg-[#f8f7ff] p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#635bff] text-white">
                <Scale size={19} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#292a30]">Transferência final</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#777983]">
                  Compensamos as despesas da lista para chegar ao menor número de
                  transferências.
                </p>
              </div>
            </div>

            {settlement.transfers.length > 0 ? (
              <div className="mt-5 space-y-3">
                {settlement.transfers.map((transfer) => (
                  <div
                    key={`${transfer.from.kind}:${transfer.from.id}:${transfer.to.kind}:${transfer.to.id}`}
                    className="rounded-xl border border-[#ddd9ef] bg-white p-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#666872]">
                      <span className="min-w-0 flex-1 truncate">
                        {partyName(transfer.from)}
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-[#635bff]" />
                      <span className="min-w-0 flex-1 truncate text-right">
                        {partyName(transfer.to)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-[#858790]">
                      {partyName(transfer.from)} transfere para {partyName(transfer.to)}
                    </p>
                    <p className="mt-3 text-right text-xl font-black text-[#292a30]">
                      {displayCents(transfer.amountCents)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[#cfe9df] bg-[#f3faf7] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#168267]">
                  <CheckCircle2 size={18} /> Tudo equilibrado
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#65746e]">
                  As partes pagas já correspondem ao que cada pessoa deveria assumir.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 border-t border-[#e1ddef] pt-4 text-[11px] leading-relaxed text-[#777983]">
              <Info size={14} className="mt-0.5 shrink-0" />
              Registre o acerto como transferência entre contas. Ele não cria
              receita nem outra despesa.
            </div>
          </section>
        </div>
      )}

      {settlement.ignoredTransactionCount > 0 && (
        <p className="mt-4 rounded-xl border border-[#eadfca] bg-[#fffaf0] px-4 py-3 text-xs text-[#806d4b]">
          {settlement.ignoredTransactionCount} lançamento{settlement.ignoredTransactionCount === 1 ? " foi ignorado" : "s foram ignorados"} por ter divisão ou origem do dinheiro inconsistente. Edite para corrigir.
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e3e1e4] bg-white p-5 shadow-[0_16px_40px_-36px_rgba(31,29,43,.5)]">
      <div className="flex items-center gap-2 text-[#635bff]">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">
          {label}
        </p>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-[#292a30]">{value}</p>
      <p className="mt-1 text-xs text-[#8a8c94]">{detail}</p>
    </article>
  );
}

function EmptySettlement({
  participantCount,
  jointFundedTransactionCount,
}: {
  participantCount: number;
  jointFundedTransactionCount: number;
}) {
  return (
    <section className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#dcd9df] bg-white p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeecff] text-[#635bff]">
          {participantCount < 2 ? <UsersRound size={24} /> : <WalletCards size={24} />}
        </span>
        <h2 className="mt-4 text-lg font-bold text-[#292a30]">
          {participantCount < 2
            ? "O acerto começa com outra pessoa"
            : jointFundedTransactionCount > 0
              ? "Tudo certo com o dinheiro do casal"
              : "Nenhuma despesa para acertar"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#777983]">
          {participantCount < 2
            ? "Convide quem divide as finanças com você. Depois, cada despesa poderá ser individual ou compartilhada."
            : jointFundedTransactionCount > 0
              ? `${jointFundedTransactionCount} gasto${jointFundedTransactionCount === 1 ? " foi pago" : "s foram pagos"} pela conta conjunta. Como esse dinheiro já é dos dois, ninguém precisa devolver nada.`
              : "Quando uma conta pessoal pagar uma parte de outra pessoa, a despesa aparecerá aqui com a explicação do acerto."}
        </p>
      </div>
    </section>
  );
}
