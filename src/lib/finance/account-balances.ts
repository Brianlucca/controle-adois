import {
  AccountOwnership,
  AccountTransfer,
  FinancialAccount,
} from "@/lib/finance/account-types";

export interface BalanceTransaction {
  accountId?: string | null;
  amount: number;
  dueDate: string;
  paidAt?: string | null;
  type: "income" | "expense";
  status: "paid" | "pending";
  deletedAt?: string | null;
}

type AccountBalanceBase = Omit<FinancialAccount, "currentBalance">;

export function calculateAccountBalances(
  accounts: AccountBalanceBase[],
  transactions: BalanceTransaction[],
  transfers: AccountTransfer[],
): FinancialAccount[] {
  const balances = new Map(
    accounts.map((account) => [account.id, toCents(account.openingBalance)]),
  );
  const openingDates = new Map(
    accounts.map((account) => [account.id, account.openingBalanceDate]),
  );

  for (const transaction of transactions) {
    if (!transaction.accountId || !balances.has(transaction.accountId)) continue;

    const impactCents = getTransactionBalanceImpactCents(
      transaction,
      openingDates.get(transaction.accountId) || "",
    );
    if (!impactCents) continue;
    const current = balances.get(transaction.accountId) ?? 0;
    balances.set(transaction.accountId, current + impactCents);
  }

  for (const transfer of transfers) {
    if (transfer.reversedAt) continue;
    if (
      !balances.has(transfer.sourceAccountId) ||
      !balances.has(transfer.destinationAccountId)
    ) {
      continue;
    }
    if (
      transfer.date < (openingDates.get(transfer.sourceAccountId) || "") ||
      transfer.date < (openingDates.get(transfer.destinationAccountId) || "")
    ) {
      continue;
    }
    const amountCents = toCents(transfer.amount);

    balances.set(
      transfer.sourceAccountId,
      (balances.get(transfer.sourceAccountId) ?? 0) - amountCents,
    );
    balances.set(
      transfer.destinationAccountId,
      (balances.get(transfer.destinationAccountId) ?? 0) + amountCents,
    );
  }

  return accounts.map((account) => ({
    ...account,
    currentBalance: fromCents(balances.get(account.id) ?? 0),
  }));
}

export function getTransactionBalanceImpactCents(
  transaction: BalanceTransaction,
  openingBalanceDate: string,
) {
  const effectiveDate = transaction.paidAt?.slice(0, 10) || transaction.dueDate;
  if (
    !transaction.accountId ||
    transaction.status !== "paid" ||
    transaction.deletedAt ||
    effectiveDate < openingBalanceDate
  ) {
    return 0;
  }

  const amountCents = toCents(transaction.amount);
  return transaction.type === "income" ? amountCents : -amountCents;
}

export function calculateTransactionBalanceChanges(
  before: BalanceTransaction | null,
  after: BalanceTransaction | null,
  openingDates: ReadonlyMap<string, string>,
) {
  const changes = new Map<string, number>();

  applyTransactionImpact(changes, before, openingDates, -1);
  applyTransactionImpact(changes, after, openingDates, 1);

  return changes;
}

export function projectTransferBalances(
  sourceBalance: number,
  destinationBalance: number,
  amount: number,
) {
  const amountCents = toCents(Math.max(0, amount));
  return {
    sourceBalance: fromCents(toCents(sourceBalance) - amountCents),
    destinationBalance: fromCents(toCents(destinationBalance) + amountCents),
  };
}

export function calculateOpeningBalanceDeltaCents(
  previousOpeningBalanceCents: number,
  nextOpeningBalanceCents: number,
) {
  if (
    !Number.isSafeInteger(previousOpeningBalanceCents) ||
    !Number.isSafeInteger(nextOpeningBalanceCents)
  ) {
    throw new Error("invalid_opening_balance");
  }
  const delta = nextOpeningBalanceCents - previousOpeningBalanceCents;
  if (!Number.isSafeInteger(delta)) {
    throw new Error("account_balance_overflow");
  }
  return delta;
}

export function summarizeAccountBalances(
  accounts: FinancialAccount[],
  viewerUserId?: string,
) {
  const active = accounts.filter((account) => !account.archivedAt);
  const byOwnership: Record<AccountOwnership, number> = {
    mine: 0,
    partner: 0,
    joint: 0,
  };
  const byOwner = new Map<string, number>();
  const otherOwnerIds = new Set<string>();
  let hasLegacyPartner = false;
  let legacyMine = 0;
  let legacyPartner = 0;

  for (const account of active) {
    byOwnership[account.ownership] += account.currentBalance;
    if (account.ownerUserId) {
      byOwner.set(
        account.ownerUserId,
        (byOwner.get(account.ownerUserId) || 0) + account.currentBalance,
      );
      if (viewerUserId && account.ownerUserId !== viewerUserId) {
        otherOwnerIds.add(account.ownerUserId);
      }
    } else {
      if (account.ownership === "mine") legacyMine += account.currentBalance;
      if (account.ownership === "partner") {
        legacyPartner += account.currentBalance;
        hasLegacyPartner = true;
      }
    }
  }

  const mine = viewerUserId
    ? (byOwner.get(viewerUserId) || 0) + legacyMine
    : byOwnership.mine;
  const others = viewerUserId
    ? [...byOwner]
        .filter(([ownerUserId]) => ownerUserId !== viewerUserId)
        .reduce((sum, [, balance]) => sum + balance, 0) +
      legacyPartner
    : byOwnership.partner;

  return {
    total: roundMoney(active.reduce((sum, account) => sum + account.currentBalance, 0)),
    mine: roundMoney(mine),
    partner: roundMoney(byOwnership.partner),
    others: roundMoney(others),
    otherParticipantCount:
      otherOwnerIds.size + (hasLegacyPartner ? 1 : 0),
    joint: roundMoney(byOwnership.joint),
  };
}

function toCents(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value: number) {
  return value / 100;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function applyTransactionImpact(
  changes: Map<string, number>,
  transaction: BalanceTransaction | null,
  openingDates: ReadonlyMap<string, string>,
  direction: -1 | 1,
) {
  if (!transaction?.accountId) return;
  const impact = getTransactionBalanceImpactCents(
    transaction,
    openingDates.get(transaction.accountId) || "",
  );
  if (!impact) return;
  changes.set(
    transaction.accountId,
    (changes.get(transaction.accountId) || 0) + impact * direction,
  );
}
