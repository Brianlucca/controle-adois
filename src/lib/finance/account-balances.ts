import {
  AccountOwnership,
  AccountTransfer,
  FinancialAccount,
} from "@/lib/finance/account-types";

interface BalanceTransaction {
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
    const effectiveDate = transaction.paidAt?.slice(0, 10) || transaction.dueDate;
    if (
      !transaction.accountId ||
      transaction.status !== "paid" ||
      transaction.deletedAt ||
      !balances.has(transaction.accountId) ||
      effectiveDate < (openingDates.get(transaction.accountId) || "")
    ) {
      continue;
    }

    const direction = transaction.type === "income" ? 1 : -1;
    const current = balances.get(transaction.accountId) ?? 0;
    balances.set(
      transaction.accountId,
      current + direction * toCents(transaction.amount),
    );
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

export function summarizeAccountBalances(accounts: FinancialAccount[]) {
  const active = accounts.filter((account) => !account.archivedAt);
  const byOwnership: Record<AccountOwnership, number> = {
    mine: 0,
    partner: 0,
    joint: 0,
  };

  for (const account of active) {
    byOwnership[account.ownership] += account.currentBalance;
  }

  return {
    total: roundMoney(active.reduce((sum, account) => sum + account.currentBalance, 0)),
    mine: roundMoney(byOwnership.mine),
    partner: roundMoney(byOwnership.partner),
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
