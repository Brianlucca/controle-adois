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
  const [accounts, setAccounts] = useState<FinancialAccountOption[]>([]);

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
      if (active) setAccounts(options);
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
        accounts,
      ),
    [accounts, cycleTransactions, participants],
  );

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
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const partyName = (party: { kind: "participant" | "jointAccount"; id: string }) =>
    party.kind === "participant"
      ? participantName(party.id)
      : `Conta conjunta · ${accountById.get(party.id)?.name || "arquivada"}`;

  return (
    <div className="animate-in fade-in pb-10 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Meu, seu e nosso</p>
          <h1 className="app-title mt-1">Acerto do ciclo</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#747780]">
            Veja quanto cada pessoa pagou, quanto deveria ter pago e o menor acerto necessário para equilibrar o período.
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
          label="Despesas compartilhadas pagas"
          value={displayCents(settlement.totalSharedCents)}
          detail={`${settlement.sharedTransactionCount} lançamento${settlement.sharedTransactionCount === 1 ? "" : "s"} · ${displayCents(settlement.jointPaidSharedCents)} pelo dinheiro do casal`}
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
          icon={<UsersRound size={18} />}
          label="Pessoas consideradas"
          value={String(settlement.participants.length)}
          detail="A divisão aceita mais de duas pessoas"
        />
      </section>

      {loading && settlement.eligibleTransactionCount === 0 ? (
        <div className="mt-5 h-64 animate-pulse rounded-2xl border border-[#e3e1e4] bg-white" />
      ) : settlement.eligibleTransactionCount === 0 ? (
        <EmptySettlement participantCount={participants.length} />
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-[#e3e1e4] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(31,29,43,.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#292a30]">Participação no ciclo</h2>
                <p className="mt-1 text-xs text-[#858790]">
                  Adiantou é o que saiu de conta pessoal. Parte é quanto coube à pessoa.
                </p>
              </div>
              <span className="rounded-full bg-[#f0efff] px-3 py-1 text-[10px] font-bold text-[#635bff]">
                {settlement.eligibleTransactionCount} válidas
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {settlement.participants.map((participant) => (
                <article
                  key={participant.userId}
                  className="rounded-xl border border-[#e8e6ea] bg-[#faf9fb] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ebe9ff] text-xs font-black text-[#5d55dd]">
                        {initials(participantName(participant.userId))}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#292a30]">
                          {participantName(participant.userId)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8a8c94]">
                          Adiantou {displayCents(participant.paidCents)} · Parte {displayCents(participant.owedCents)}
                          {participant.coveredByJointCents > 0
                            ? ` · Dinheiro do casal cobriu ${displayCents(participant.coveredByJointCents)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <BalanceLabel
                      balanceCents={participant.balanceCents}
                      displayCents={displayCents}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dedbea] bg-[#f8f7ff] p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#635bff] text-white">
                <Scale size={19} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#292a30]">Como equilibrar</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#777983]">
                  Sugestões calculadas sem criar receita ou despesa no patrimônio do casal.
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
              O acerto é somente uma transferência: não cria receita nem outra despesa. Gastos pendentes e registros sem divisão não entram no cálculo.
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

function BalanceLabel({
  balanceCents,
  displayCents,
}: {
  balanceCents: number;
  displayCents: (amountCents: number) => string;
}) {
  if (balanceCents === 0) {
    return (
      <span className="rounded-full bg-[#eff8f4] px-3 py-1.5 text-xs font-bold text-[#168267]">
        Equilibrado
      </span>
    );
  }

  const shouldReceive = balanceCents > 0;
  return (
    <div className="sm:text-right">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9698a0]">
        {shouldReceive ? "Tem a receber" : "Precisa acertar"}
      </p>
      <p className={`mt-0.5 text-sm font-black ${shouldReceive ? "text-[#168267]" : "text-[#c25950]"}`}>
        {displayCents(Math.abs(balanceCents))}
      </p>
    </div>
  );
}

function EmptySettlement({ participantCount }: { participantCount: number }) {
  return (
    <section className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#dcd9df] bg-white p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeecff] text-[#635bff]">
          {participantCount < 2 ? <UsersRound size={24} /> : <WalletCards size={24} />}
        </span>
        <h2 className="mt-4 text-lg font-bold text-[#292a30]">
          {participantCount < 2
            ? "O acerto começa com outra pessoa"
            : "Nenhuma despesa paga para acertar"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#777983]">
          {participantCount < 2
            ? "Convide quem divide as finanças com você. Depois, cada despesa poderá ser individual ou compartilhada."
            : "Despesas compartilhadas pagas por uma conta pessoal e gastos de outra pessoa aparecerão aqui automaticamente."}
        </p>
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .replace("(você)", "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}
