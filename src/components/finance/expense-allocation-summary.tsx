import { CircleUserRound, ReceiptText, UsersRound, WalletCards } from "lucide-react";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import type { FinancialAccountOption } from "@/lib/finance/account-types";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function ExpenseAllocationSummary({
  transaction,
  participants,
  account,
}: {
  transaction: Transaction;
  participants: WorkspaceParticipant[];
  account?: FinancialAccountOption;
}) {
  if (transaction.type !== "expense") return null;

  const isJointFunding = account
    ? account.ownership === "joint"
    : transaction.fundingSource === "joint";

  if (!transaction.scope || (!isJointFunding && !transaction.paidByUserId)) {
    return (
      <div className="rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-4">
        <div className="flex items-start gap-3">
          <CircleUserRound size={18} className="mt-0.5 shrink-0 text-[#8a8c94]" />
          <div>
            <p className="text-sm font-bold text-[#292a30]">Divisão não informada</p>
            <p className="mt-1 text-xs leading-relaxed text-[#777983]">
              Edite este registro para informar quem pagou e se a despesa é individual ou compartilhada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isShared = transaction.scope === "shared";
  const ownerId = transaction.beneficiaryUserIds?.[0];

  return (
    <section className="rounded-xl border border-[#dcd8ee] bg-[#f8f7ff] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#ebe9ff] text-[#635bff]">
            {isShared ? <UsersRound size={17} /> : <CircleUserRound size={17} />}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#777983]">
              Meu, seu e nosso
            </p>
            <p className="text-sm font-bold text-[#292a30]">
              {isShared
                ? "Despesa compartilhada"
                : `Despesa de ${participantLabel(ownerId, participants)}`}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#d6d2ed] bg-white px-2.5 py-1 text-[10px] font-bold text-[#635bff]">
          {transaction.splitMethod === "custom" ? "Personalizada" : "Divisão igual"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <AllocationFact
          icon={<WalletCards size={14} />}
          label={isJointFunding ? "Origem do dinheiro" : "Quem pagou"}
          value={
            isJointFunding
              ? `Dinheiro do casal${account?.name ? ` · ${account.name}` : ""}`
              : participantLabel(transaction.paidByUserId, participants)
          }
        />
        <AllocationFact
          icon={<ReceiptText size={14} />}
          label="Responsável"
          value={participantLabel(transaction.responsibleUserId, participants)}
        />
      </div>

      {isShared && transaction.shares && transaction.shares.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[#e2dff0] pt-3">
          {transaction.shares.map((share) => (
            <div
              key={share.userId}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate text-[#666872]">
                Parte de {participantLabel(share.userId, participants)}
              </span>
              <strong className="shrink-0 text-[#292a30]">
                {formatCurrency(share.amountCents / 100)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AllocationFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#e2dff0] bg-white p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#858790]">
        {icon} {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-[#292a30]">{value}</p>
    </div>
  );
}

function participantLabel(
  userId: string | null | undefined,
  participants: WorkspaceParticipant[],
) {
  const participant = participants.find((item) => item.userId === userId);
  if (!participant) return "participante anterior";
  return participant.isCurrentUser
    ? `${participant.displayName} (você)`
    : participant.displayName;
}
