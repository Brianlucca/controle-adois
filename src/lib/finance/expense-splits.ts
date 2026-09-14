import type {
  ExpenseScope,
  ExpenseShare,
  ExpenseSplitMethod,
  Transaction,
} from "@/lib/types";

export interface ExpenseAllocationRequest {
  scope?: ExpenseScope | null;
  paidByUserId?: string | null;
  responsibleUserId?: string | null;
  beneficiaryUserIds?: string[] | null;
  splitMethod?: ExpenseSplitMethod | null;
  shares?: ExpenseShare[] | null;
}

export interface ExpenseAllocation {
  scope: ExpenseScope;
  paidByUserId: string;
  responsibleUserId: string;
  beneficiaryUserIds: string[];
  splitMethod: ExpenseSplitMethod;
  shares: ExpenseShare[];
}

export type ExpenseAllocationResult =
  | { success: true; allocation: ExpenseAllocation }
  | { success: false; error: string };

export interface ParticipantSettlement {
  userId: string;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
}

export interface SettlementTransfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface CycleSettlement {
  totalSharedCents: number;
  amountToSettleCents: number;
  eligibleTransactionCount: number;
  ignoredTransactionCount: number;
  participants: ParticipantSettlement[];
  transfers: SettlementTransfer[];
}

export function moneyToCents(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100);
}

export function splitCentsEqually(
  totalCents: number,
  participantIds: string[],
): ExpenseShare[] {
  const uniqueIds = uniqueNonEmptyStrings(participantIds);
  if (!Number.isInteger(totalCents) || totalCents <= 0 || uniqueIds.length === 0) {
    return [];
  }

  const baseShare = Math.floor(totalCents / uniqueIds.length);
  const remainder = totalCents % uniqueIds.length;

  return uniqueIds.map((userId, index) => ({
    userId,
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function resolveExpenseAllocation({
  amountCents,
  actorUserId,
  participantIds,
  request,
}: {
  amountCents: number;
  actorUserId: string;
  participantIds: string[];
  request: ExpenseAllocationRequest;
}): ExpenseAllocationResult {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { success: false, error: "O valor da despesa é inválido." };
  }

  const allowedIds = uniqueNonEmptyStrings([...participantIds, actorUserId]);
  const allowedSet = new Set(allowedIds);
  const scope = request.scope || "individual";
  const paidByUserId = request.paidByUserId || actorUserId;
  const responsibleUserId = request.responsibleUserId || paidByUserId;
  const requestedBeneficiaries = uniqueNonEmptyStrings(
    request.beneficiaryUserIds || [],
  );
  const beneficiaryUserIds =
    requestedBeneficiaries.length > 0
      ? requestedBeneficiaries
      : scope === "shared"
        ? allowedIds
        : [actorUserId];

  const referencedIds = [
    paidByUserId,
    responsibleUserId,
    ...beneficiaryUserIds,
    ...(request.shares || []).map((share) => share.userId),
  ];
  if (referencedIds.some((userId) => !allowedSet.has(userId))) {
    return {
      success: false,
      error: "A divisão contém uma pessoa que não participa deste espaço.",
    };
  }

  if (scope === "individual" && beneficiaryUserIds.length !== 1) {
    return {
      success: false,
      error: "Uma despesa individual deve pertencer a uma única pessoa.",
    };
  }

  if (scope === "shared" && beneficiaryUserIds.length < 2) {
    return {
      success: false,
      error: "Selecione pelo menos duas pessoas para uma despesa compartilhada.",
    };
  }

  const splitMethod: ExpenseSplitMethod =
    scope === "individual" ? "equal" : request.splitMethod || "equal";

  if (splitMethod === "equal") {
    return {
      success: true,
      allocation: {
        scope,
        paidByUserId,
        responsibleUserId,
        beneficiaryUserIds,
        splitMethod,
        shares: splitCentsEqually(amountCents, beneficiaryUserIds),
      },
    };
  }

  const shares = request.shares || [];
  const shareUserIds = shares.map((share) => share.userId);
  const uniqueShareIds = uniqueNonEmptyStrings(shareUserIds);
  if (
    shares.length !== beneficiaryUserIds.length ||
    uniqueShareIds.length !== shares.length ||
    beneficiaryUserIds.some((userId) => !uniqueShareIds.includes(userId))
  ) {
    return {
      success: false,
      error: "Informe uma parte personalizada para cada pessoa selecionada.",
    };
  }

  if (
    shares.some(
      (share) =>
        !Number.isInteger(share.amountCents) || share.amountCents <= 0,
    )
  ) {
    return {
      success: false,
      error: "Cada parte personalizada deve ser maior que zero.",
    };
  }

  const sharesTotal = shares.reduce(
    (total, share) => total + share.amountCents,
    0,
  );
  if (sharesTotal !== amountCents) {
    return {
      success: false,
      error: "A soma das partes precisa ser exatamente igual ao valor da despesa.",
    };
  }

  return {
    success: true,
    allocation: {
      scope,
      paidByUserId,
      responsibleUserId,
      beneficiaryUserIds,
      splitMethod,
      shares: beneficiaryUserIds.map((userId) => ({
        userId,
        amountCents:
          shares.find((share) => share.userId === userId)?.amountCents || 0,
      })),
    },
  };
}

export function calculateCycleSettlement(
  transactions: Transaction[],
  participantIds: string[],
): CycleSettlement {
  const balances = new Map<string, ParticipantSettlement>();
  uniqueNonEmptyStrings(participantIds).forEach((userId) => {
    balances.set(userId, emptyParticipantSettlement(userId));
  });

  let totalSharedCents = 0;
  let eligibleTransactionCount = 0;
  let ignoredTransactionCount = 0;

  transactions.forEach((transaction) => {
    if (
      transaction.type !== "expense" ||
      transaction.status !== "paid" ||
      transaction.deletedAt ||
      transaction.scope !== "shared"
    ) {
      return;
    }

    const amountCents = moneyToCents(transaction.amount);
    const shares = transaction.shares || [];
    const uniqueShareUserIds = new Set(shares.map((share) => share.userId));
    const sharesTotal = shares.reduce(
      (total, share) => total + share.amountCents,
      0,
    );
    const hasInvalidShare = shares.some(
      (share) =>
        !share.userId ||
        !Number.isInteger(share.amountCents) ||
        share.amountCents <= 0,
    );

    if (
      !transaction.paidByUserId ||
      amountCents <= 0 ||
      shares.length < 2 ||
      uniqueShareUserIds.size !== shares.length ||
      hasInvalidShare ||
      sharesTotal !== amountCents
    ) {
      ignoredTransactionCount += 1;
      return;
    }

    const payer = getOrCreateParticipant(balances, transaction.paidByUserId);
    payer.paidCents += amountCents;
    payer.balanceCents += amountCents;

    shares.forEach((share) => {
      const participant = getOrCreateParticipant(balances, share.userId);
      participant.owedCents += share.amountCents;
      participant.balanceCents -= share.amountCents;
    });

    totalSharedCents += amountCents;
    eligibleTransactionCount += 1;
  });

  const participants = [...balances.values()];
  const transfers = suggestSettlementTransfers(participants);

  return {
    totalSharedCents,
    amountToSettleCents: transfers.reduce(
      (total, transfer) => total + transfer.amountCents,
      0,
    ),
    eligibleTransactionCount,
    ignoredTransactionCount,
    participants,
    transfers,
  };
}

function suggestSettlementTransfers(
  participants: ParticipantSettlement[],
): SettlementTransfer[] {
  const debtors = participants
    .filter((participant) => participant.balanceCents < 0)
    .map((participant) => ({
      userId: participant.userId,
      remainingCents: Math.abs(participant.balanceCents),
    }))
    .sort((a, b) => b.remainingCents - a.remainingCents);
  const creditors = participants
    .filter((participant) => participant.balanceCents > 0)
    .map((participant) => ({
      userId: participant.userId,
      remainingCents: participant.balanceCents,
    }))
    .sort((a, b) => b.remainingCents - a.remainingCents);

  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(
      debtor.remainingCents,
      creditor.remainingCents,
    );

    if (amountCents > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents,
      });
    }

    debtor.remainingCents -= amountCents;
    creditor.remainingCents -= amountCents;
    if (debtor.remainingCents === 0) debtorIndex += 1;
    if (creditor.remainingCents === 0) creditorIndex += 1;
  }

  return transfers;
}

function uniqueNonEmptyStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function emptyParticipantSettlement(userId: string): ParticipantSettlement {
  return { userId, paidCents: 0, owedCents: 0, balanceCents: 0 };
}

function getOrCreateParticipant(
  balances: Map<string, ParticipantSettlement>,
  userId: string,
) {
  const current = balances.get(userId);
  if (current) return current;

  const created = emptyParticipantSettlement(userId);
  balances.set(userId, created);
  return created;
}
