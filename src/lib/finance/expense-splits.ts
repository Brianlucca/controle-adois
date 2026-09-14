import type {
  ExpenseFundingSource,
  ExpenseScope,
  ExpenseShare,
  ExpenseSplitMethod,
  Transaction,
} from "@/lib/types";
import type { AccountOwnership } from "@/lib/finance/account-types";

export interface ExpenseAllocationRequest {
  scope?: ExpenseScope | null;
  fundingSource?: ExpenseFundingSource | null;
  paidByUserId?: string | null;
  responsibleUserId?: string | null;
  beneficiaryUserIds?: string[] | null;
  splitMethod?: ExpenseSplitMethod | null;
  shares?: ExpenseShare[] | null;
}

export interface ExpenseAllocation {
  scope: ExpenseScope;
  fundingSource: ExpenseFundingSource;
  paidByUserId: string | null;
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
  coveredByJointCents: number;
  balanceCents: number;
}

export type SettlementParty =
  | { kind: "participant"; id: string }
  | { kind: "jointAccount"; id: string };

export interface SettlementTransfer {
  from: SettlementParty;
  to: SettlementParty;
  amountCents: number;
}

export interface CycleSettlement {
  totalSharedCents: number;
  jointPaidSharedCents: number;
  amountToSettleCents: number;
  eligibleTransactionCount: number;
  sharedTransactionCount: number;
  ignoredTransactionCount: number;
  participants: ParticipantSettlement[];
  transfers: SettlementTransfer[];
}

export interface ExpenseFundingAccount {
  id: string;
  ownership: AccountOwnership;
  ownerUserId?: string | null;
}

export type ExpenseFundingResult =
  | {
      success: true;
      funding: {
        fundingSource: ExpenseFundingSource;
        paidByUserId: string | null;
      };
    }
  | { success: false; error: string };

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
  const fundingSource = request.fundingSource || "participant";
  const paidByUserId =
    fundingSource === "joint" ? null : request.paidByUserId || actorUserId;
  const responsibleUserId =
    request.responsibleUserId || paidByUserId || actorUserId;
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
    ...(paidByUserId ? [paidByUserId] : []),
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
        fundingSource,
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
      fundingSource,
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

export function resolveExpenseFunding({
  account,
  actorUserId,
  participantIds,
  requestedFundingSource,
  requestedPaidByUserId,
}: {
  account?: ExpenseFundingAccount | null;
  actorUserId: string;
  participantIds: string[];
  requestedFundingSource?: ExpenseFundingSource | null;
  requestedPaidByUserId?: string | null;
}): ExpenseFundingResult {
  const allowedIds = new Set(
    uniqueNonEmptyStrings([...participantIds, actorUserId]),
  );

  if (account?.ownership === "joint") {
    return {
      success: true,
      funding: { fundingSource: "joint", paidByUserId: null },
    };
  }

  if (!account && requestedFundingSource === "joint") {
    return {
      success: false,
      error: "Selecione uma conta conjunta para usar o dinheiro do casal.",
    };
  }

  const paidByUserId =
    account?.ownerUserId || requestedPaidByUserId || actorUserId;
  if (!allowedIds.has(paidByUserId)) {
    return {
      success: false,
      error: "A conta pessoal pertence a alguém que não participa deste espaço.",
    };
  }

  return {
    success: true,
    funding: { fundingSource: "participant", paidByUserId },
  };
}

export function calculateCycleSettlement(
  transactions: Transaction[],
  participantIds: string[],
  accounts: ExpenseFundingAccount[] = [],
): CycleSettlement {
  const balances = new Map<string, ParticipantSettlement>();
  uniqueNonEmptyStrings(participantIds).forEach((userId) => {
    balances.set(userId, emptyParticipantSettlement(userId));
  });

  let totalSharedCents = 0;
  let jointPaidSharedCents = 0;
  let eligibleTransactionCount = 0;
  let sharedTransactionCount = 0;
  let ignoredTransactionCount = 0;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const partyBalances = new Map<string, { party: SettlementParty; balanceCents: number }>();
  balances.forEach((participant) => {
    const party: SettlementParty = { kind: "participant", id: participant.userId };
    partyBalances.set(partyKey(party), { party, balanceCents: 0 });
  });

  transactions.forEach((transaction) => {
    if (
      transaction.type !== "expense" ||
      transaction.status !== "paid" ||
      transaction.deletedAt ||
      !transaction.scope
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
      amountCents <= 0 ||
      (transaction.scope === "shared" ? shares.length < 2 : shares.length !== 1) ||
      uniqueShareUserIds.size !== shares.length ||
      hasInvalidShare ||
      sharesTotal !== amountCents
    ) {
      ignoredTransactionCount += 1;
      return;
    }

    const account = transaction.accountId
      ? accountById.get(transaction.accountId)
      : undefined;
    if (transaction.accountId && !account) {
      ignoredTransactionCount += 1;
      return;
    }
    const fundingSource = account
      ? account.ownership === "joint"
        ? "joint"
        : "participant"
      : transaction.fundingSource || "participant";
    const paidByUserId =
      fundingSource === "participant"
        ? transaction.paidByUserId || account?.ownerUserId || null
        : null;

    if (fundingSource === "participant" && !paidByUserId) {
      ignoredTransactionCount += 1;
      return;
    }

    if (
      fundingSource === "joint" &&
      transaction.scope === "individual" &&
      !transaction.accountId
    ) {
      ignoredTransactionCount += 1;
      return;
    }

    if (
      transaction.scope === "individual" &&
      fundingSource === "participant" &&
      paidByUserId === shares[0].userId
    ) {
      return;
    }

    shares.forEach((share) => {
      const participant = getOrCreateParticipant(balances, share.userId);
      participant.owedCents += share.amountCents;
      if (fundingSource === "joint" && transaction.scope === "shared") {
        participant.coveredByJointCents += share.amountCents;
      }
    });

    if (fundingSource === "participant" && paidByUserId) {
      const payer = getOrCreateParticipant(balances, paidByUserId);
      payer.paidCents += amountCents;
      addPartyBalance(
        partyBalances,
        { kind: "participant", id: paidByUserId },
        amountCents,
      );
      shares.forEach((share) => {
        addPartyBalance(
          partyBalances,
          { kind: "participant", id: share.userId },
          -share.amountCents,
        );
      });
    } else if (transaction.scope === "individual" && transaction.accountId) {
      const beneficiary = shares[0];
      addPartyBalance(
        partyBalances,
        { kind: "participant", id: beneficiary.userId },
        -beneficiary.amountCents,
      );
      addPartyBalance(
        partyBalances,
        { kind: "jointAccount", id: transaction.accountId },
        amountCents,
      );
    }

    if (transaction.scope === "shared") {
      totalSharedCents += amountCents;
      sharedTransactionCount += 1;
      if (fundingSource === "joint") jointPaidSharedCents += amountCents;
    }
    eligibleTransactionCount += 1;
  });

  const participants = [...balances.values()];
  participants.forEach((participant) => {
    participant.balanceCents =
      partyBalances.get(
        partyKey({ kind: "participant", id: participant.userId }),
      )?.balanceCents || 0;
  });
  const transfers = suggestSettlementTransfers([...partyBalances.values()]);

  return {
    totalSharedCents,
    jointPaidSharedCents,
    amountToSettleCents: transfers.reduce(
      (total, transfer) => total + transfer.amountCents,
      0,
    ),
    eligibleTransactionCount,
    sharedTransactionCount,
    ignoredTransactionCount,
    participants,
    transfers,
  };
}

function suggestSettlementTransfers(
  balances: Array<{ party: SettlementParty; balanceCents: number }>,
): SettlementTransfer[] {
  const debtors = balances
    .filter((entry) => entry.balanceCents < 0)
    .map((entry) => ({
      party: entry.party,
      remainingCents: Math.abs(entry.balanceCents),
    }))
    .sort((a, b) => b.remainingCents - a.remainingCents);
  const creditors = balances
    .filter((entry) => entry.balanceCents > 0)
    .map((entry) => ({
      party: entry.party,
      remainingCents: entry.balanceCents,
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
        from: debtor.party,
        to: creditor.party,
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
  return {
    userId,
    paidCents: 0,
    owedCents: 0,
    coveredByJointCents: 0,
    balanceCents: 0,
  };
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

function partyKey(party: SettlementParty) {
  return `${party.kind}:${party.id}`;
}

function addPartyBalance(
  balances: Map<string, { party: SettlementParty; balanceCents: number }>,
  party: SettlementParty,
  deltaCents: number,
) {
  const key = partyKey(party);
  const current = balances.get(key);
  if (current) {
    current.balanceCents += deltaCents;
    return;
  }
  balances.set(key, { party, balanceCents: deltaCents });
}
