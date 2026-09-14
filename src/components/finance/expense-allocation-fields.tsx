import { ShieldCheck, UserRound, UsersRound, WalletCards } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import type { FinancialAccountOption } from "@/lib/finance/account-types";
import { moneyToCents, splitCentsEqually } from "@/lib/finance/expense-splits";
import type { TransactionFormData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ExpenseAllocationFieldsProps {
  formData: TransactionFormData;
  participants: WorkspaceParticipant[];
  accountOptions: FinancialAccountOption[];
  onChange: (patch: Partial<TransactionFormData>) => void;
}

export function ExpenseAllocationFields({
  formData,
  participants,
  accountOptions,
  onChange,
}: ExpenseAllocationFieldsProps) {
  const currentUser =
    participants.find((participant) => participant.isCurrentUser) || participants[0];
  const fallbackUserId = currentUser?.userId || "";
  const scope = formData.scope || "individual";
  const selectedIds =
    formData.beneficiaryUserIds?.length
      ? formData.beneficiaryUserIds
      : fallbackUserId
        ? [fallbackUserId]
        : [];
  const selectedAccount = accountOptions.find(
    (account) => account.id === formData.accountId,
  );
  const isJointFunding = selectedAccount
    ? selectedAccount.ownership === "joint"
    : formData.fundingSource === "joint";
  const accountOwnerUserId =
    selectedAccount?.ownerUserId ||
    (selectedAccount?.ownership === "mine" ? fallbackUserId : "");
  const paidByUserId = isJointFunding
    ? ""
    : accountOwnerUserId || formData.paidByUserId || fallbackUserId;
  const responsibleUserId = formData.responsibleUserId || paidByUserId;
  const splitMethod = formData.splitMethod || "equal";
  const amountCents = moneyToCents(Number(formData.amount));
  const equalShares = splitCentsEqually(amountCents, selectedIds);
  const customTotalCents = (formData.shares || []).reduce(
    (total, share) => total + moneyToCents(Number(share.amount)),
    0,
  );
  const customDifferenceCents = amountCents - customTotalCents;

  function selectScope(nextScope: "individual" | "shared") {
    if (nextScope === "shared" && participants.length < 2) return;

    const beneficiaryUserIds =
      nextScope === "shared"
        ? participants.map((participant) => participant.userId)
        : [fallbackUserId].filter(Boolean);
    onChange({
      scope: nextScope,
      fundingSource: isJointFunding ? "joint" : "participant",
      paidByUserId,
      responsibleUserId,
      beneficiaryUserIds,
      splitMethod: "equal",
      shares: [],
    });
  }

  function selectIndividualOwner(userId: string) {
    onChange({
      beneficiaryUserIds: [userId],
      splitMethod: "equal",
      shares: [],
    });
  }

  function toggleBeneficiary(userId: string) {
    const isSelected = selectedIds.includes(userId);
    if (isSelected && selectedIds.length <= 2) return;

    const beneficiaryUserIds = isSelected
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    onChange({
      beneficiaryUserIds,
      shares: (formData.shares || []).filter((share) =>
        beneficiaryUserIds.includes(share.userId),
      ),
    });
  }

  function selectSplitMethod(method: "equal" | "custom") {
    onChange({
      splitMethod: method,
      shares:
        method === "custom"
          ? equalShares.map((share) => ({
              userId: share.userId,
              amount: (share.amountCents / 100).toFixed(2),
            }))
          : [],
    });
  }

  function updateCustomShare(userId: string, amount: string) {
    const currentShares = formData.shares || [];
    onChange({
      shares: selectedIds.map((selectedUserId) => ({
        userId: selectedUserId,
        amount:
          selectedUserId === userId
            ? amount
            : currentShares.find((share) => share.userId === selectedUserId)
                ?.amount || "",
      })),
    });
  }

  if (participants.length === 0) return null;

  return (
    <section className="space-y-4 rounded-xl border border-[#dedbe8] bg-[#f8f7ff] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ebe9ff] text-[#635bff]">
          <UsersRound size={19} />
        </span>
        <div>
          <h4 className="text-sm font-bold text-[#292a30]">Meu, seu e nosso</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-[#777983]">
            A conta mostra de onde saiu o dinheiro; você informa de quem é a despesa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#dedce5] bg-white p-1.5">
        <ScopeButton
          active={scope === "individual"}
          icon={<UserRound size={16} />}
          label="Individual"
          onClick={() => selectScope("individual")}
        />
        <ScopeButton
          active={scope === "shared"}
          disabled={participants.length < 2}
          icon={<UsersRound size={16} />}
          label="Compartilhada"
          onClick={() => selectScope("shared")}
        />
      </div>

      {participants.length < 2 && (
        <p className="rounded-lg border border-[#e5e2ea] bg-white px-3 py-2 text-xs text-[#777983]">
          Convide outra pessoa para liberar a divisão compartilhada.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {isJointFunding ? (
          <FundingFact
            label="De onde saiu o dinheiro?"
            value="Dinheiro do casal"
            detail={selectedAccount?.name || "Conta conjunta"}
          />
        ) : accountOwnerUserId ? (
          <FundingFact
            label="Quem pagou?"
            value={participantLabel(accountOwnerUserId, participants)}
            detail={selectedAccount?.name || "Conta pessoal"}
          />
        ) : (
          <ParticipantSelect
            label="Quem pagou?"
            value={paidByUserId}
            participants={participants}
            onChange={(userId) =>
              onChange({ fundingSource: "participant", paidByUserId: userId })
            }
          />
        )}
        <ParticipantSelect
          label="Responsável pela conta"
          value={responsibleUserId}
          participants={participants}
          onChange={(userId) => onChange({ responsibleUserId: userId })}
        />
      </div>

      {scope === "individual" ? (
        <ParticipantSelect
          label="De quem é esta despesa?"
          value={selectedIds[0] || fallbackUserId}
          participants={participants}
          onChange={selectIndividualOwner}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#777983]">
              Quem participa da divisão?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {participants.map((participant) => {
                const active = selectedIds.includes(participant.userId);
                return (
                  <button
                    key={participant.userId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleBeneficiary(participant.userId)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "border-[#bbb6ff] bg-[#ebe9ff] text-[#554dd3]"
                        : "border-[#dedce5] bg-white text-[#777983] hover:border-[#c8c4d2]"
                    }`}
                  >
                    {participantName(participant)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SplitMethodButton
              active={splitMethod === "equal"}
              title="Dividir igualmente"
              description="Centavos distribuídos sem perder valor"
              onClick={() => selectSplitMethod("equal")}
            />
            <SplitMethodButton
              active={splitMethod === "custom"}
              title="Valores personalizados"
              description="Defina exatamente quanto cabe a cada um"
              onClick={() => selectSplitMethod("custom")}
            />
          </div>

          {splitMethod === "equal" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {equalShares.map((share) => (
                <div
                  key={share.userId}
                  className="flex items-center justify-between rounded-lg border border-[#e2dfe8] bg-white px-3 py-2.5 text-xs"
                >
                  <span className="font-semibold text-[#55575f]">
                    {participantLabel(share.userId, participants)}
                  </span>
                  <strong className="text-[#292a30]">
                    {formatCurrency(share.amountCents / 100)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-[#ddd9ef] bg-white p-3">
              {selectedIds.map((userId) => (
                <label
                  key={userId}
                  className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3"
                >
                  <span className="truncate text-xs font-semibold text-[#55575f]">
                    {participantLabel(userId, participants)}
                  </span>
                  <CurrencyInput
                    value={
                      formData.shares?.find((share) => share.userId === userId)
                        ?.amount || ""
                    }
                    onValueChange={(amount) => updateCustomShare(userId, amount)}
                    aria-label={`Parte de ${participantLabel(userId, participants)}`}
                    className="h-10 rounded-lg border-[#dedce5] bg-[#faf9fb] text-right font-mono font-bold text-[#292a30]"
                    required
                  />
                </label>
              ))}
              <div
                className={`flex items-center justify-between border-t pt-2 text-xs font-bold ${
                  customDifferenceCents === 0 && amountCents > 0
                    ? "text-[#168267]"
                    : "text-[#b55a50]"
                }`}
              >
                <span>
                  {customDifferenceCents === 0 && amountCents > 0
                    ? "Divisão fechada"
                    : customDifferenceCents > 0
                      ? "Ainda falta distribuir"
                      : "Valor acima da despesa"}
                </span>
                <span>{formatCurrency(Math.abs(customDifferenceCents) / 100)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-[#ddd9ef] bg-white px-3 py-2.5 text-xs leading-relaxed text-[#666872]">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#635bff]" />
        Conta conjunta não gera reembolso em despesa compartilhada. O acerto é
        uma transferência e nunca cria outra receita ou despesa.
      </div>
    </section>
  );
}

function FundingFact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase tracking-wider text-[#777983]">
        <WalletCards size={12} /> {label}
      </p>
      <div className="min-h-11 rounded-xl border border-[#dedce5] bg-white px-3 py-2">
        <p className="text-sm font-semibold text-[#292a30]">{value}</p>
        <p className="truncate text-[10px] text-[#858790]">{detail}</p>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  disabled,
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
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${
        active
          ? "bg-[#635bff] text-white shadow-sm"
          : "text-[#777983] hover:bg-[#f6f5f8] disabled:cursor-not-allowed disabled:opacity-40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ParticipantSelect({
  label,
  value,
  participants,
  onChange,
}: {
  label: string;
  value: string;
  participants: WorkspaceParticipant[];
  onChange: (userId: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase tracking-wider text-[#777983]">
        <WalletCards size={12} /> {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#dedce5] bg-white px-3 text-sm font-semibold text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
        required
      >
        {participants.map((participant) => (
          <option key={participant.userId} value={participant.userId}>
            {participantName(participant)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SplitMethodButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active
          ? "border-[#bdb8ff] bg-[#eeecff]"
          : "border-[#dedce5] bg-white hover:border-[#c8c4d2]"
      }`}
    >
      <span className="block text-xs font-bold text-[#292a30]">{title}</span>
      <span className="mt-1 block text-[10px] leading-relaxed text-[#777983]">
        {description}
      </span>
    </button>
  );
}

function participantName(participant: WorkspaceParticipant) {
  return participant.isCurrentUser
    ? `${participant.displayName} (você)`
    : participant.displayName;
}

function participantLabel(
  userId: string,
  participants: WorkspaceParticipant[],
) {
  const participant = participants.find((item) => item.userId === userId);
  return participant ? participantName(participant) : "Participante";
}
