import "server-only";

import {
  BalanceTransaction,
  calculateAccountBalances,
  calculateTransactionBalanceChanges,
} from "@/lib/finance/account-balances";
import {
  AccountTransfer,
  FinancialAccount,
} from "@/lib/finance/account-types";

export interface AccountBalanceState {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  openingBalanceDate: string;
  currentBalanceCents: number;
  archived: boolean;
  materialized: boolean;
}

export async function runAccountBalanceTransaction<T>(
  workspaceRef: FirebaseFirestore.DocumentReference,
  operation: (transaction: FirebaseFirestore.Transaction) => Promise<T>,
) {
  try {
    return await workspaceRef.firestore.runTransaction(operation);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "account_balance_not_materialized"
    ) {
      throw error;
    }

    await ensureAccountBalancesMaterialized(workspaceRef);
    return workspaceRef.firestore.runTransaction(operation);
  }
}

export async function ensureAccountBalancesMaterialized(
  workspaceRef: FirebaseFirestore.DocumentReference,
) {
  await getMaterializedAccountDocuments(workspaceRef);
}

export async function getMaterializedAccountDocuments(
  workspaceRef: FirebaseFirestore.DocumentReference,
) {
  const accountCollection = workspaceRef.collection("accounts");
  const accountSnapshot = await accountCollection.get();
  const missingBalance = accountSnapshot.docs.filter(
    (document) => !Object.hasOwn(document.data(), "currentBalanceCents"),
  );
  if (!missingBalance.length) return accountSnapshot.docs;

  const [transactionSnapshots, transferSnapshot] = await Promise.all([
    Promise.all(
      missingBalance.map((account) =>
        workspaceRef
          .collection("transactions")
          .where("accountId", "==", account.id)
          .get(),
      ),
    ),
    workspaceRef.collection("transfers").get(),
  ]);

  const accounts = accountSnapshot.docs.map(toFinancialAccount);
  const transactions = transactionSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((document) => toBalanceTransaction(document.data())),
  );
  const transfers = transferSnapshot.docs.map(toAccountTransfer);
  const balances = new Map(
    calculateAccountBalances(accounts, transactions, transfers).map(
      (account) => [account.id, Math.round(account.currentBalance * 100)],
    ),
  );

  for (let index = 0; index < missingBalance.length; index += 400) {
    const legacyAccounts = missingBalance.slice(index, index + 400);
    await accountCollection.firestore.runTransaction(async (transaction) => {
      const currentDocuments = await Promise.all(
        legacyAccounts.map((account) => transaction.get(account.ref)),
      );
      for (const account of currentDocuments) {
        if (
          !account.exists ||
          Object.hasOwn(account.data() || {}, "currentBalanceCents")
        ) {
          continue;
        }
        transaction.update(account.ref, {
          currentBalanceCents: balances.get(account.id) || 0,
          balanceMaterializedAt: new Date(),
        });
      }
    });
  }

  return (await accountCollection.get()).docs;
}

export async function readAccountBalanceStates(
  transaction: FirebaseFirestore.Transaction,
  workspaceRef: FirebaseFirestore.DocumentReference,
  accountIds: Iterable<string | null | undefined>,
) {
  const ids = [...new Set(accountIds)].filter(
    (id): id is string => typeof id === "string" && Boolean(id),
  );
  if (!ids.length) return new Map<string, AccountBalanceState>();

  const refs = ids.map((id) => workspaceRef.collection("accounts").doc(id));
  const snapshots = await Promise.all(
    refs.map((reference) => transaction.get(reference)),
  );

  return new Map(
    snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => {
        const data = snapshot.data() || {};
        const openingBalanceCents = toSafeCents(data.openingBalanceCents);
        const materialized = Object.hasOwn(data, "currentBalanceCents");
        return [
          snapshot.id,
          {
            id: snapshot.id,
            ref: snapshot.ref,
            openingBalanceDate:
              typeof data.openingBalanceDate === "string"
                ? data.openingBalanceDate
                : "",
            currentBalanceCents: materialized
              ? toSafeCents(data.currentBalanceCents)
              : openingBalanceCents,
            archived: Boolean(data.archivedAt),
            materialized,
          },
        ] as const;
      }),
  );
}

export function calculateStoredTransactionBalanceChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  accounts: ReadonlyMap<string, AccountBalanceState>,
) {
  const openingDates = new Map(
    [...accounts].map(([id, account]) => [id, account.openingBalanceDate]),
  );
  return calculateTransactionBalanceChanges(
    before ? toBalanceTransaction(before) : null,
    after ? toBalanceTransaction(after) : null,
    openingDates,
  );
}

export function writeAccountBalanceChanges(
  transaction: FirebaseFirestore.Transaction,
  accounts: ReadonlyMap<string, AccountBalanceState>,
  changes: ReadonlyMap<string, number>,
) {
  for (const [accountId, deltaCents] of changes) {
    if (!deltaCents) continue;
    const account = accounts.get(accountId);
    if (!account) throw new Error("account_not_found");
    if (!account.materialized) {
      throw new Error("account_balance_not_materialized");
    }
    const nextBalanceCents = account.currentBalanceCents + deltaCents;
    if (!Number.isSafeInteger(nextBalanceCents)) {
      throw new Error("account_balance_overflow");
    }
    transaction.update(account.ref, {
      currentBalanceCents: nextBalanceCents,
      balanceUpdatedAt: new Date(),
    });
  }
}

export function assertActiveAccount(
  accounts: ReadonlyMap<string, AccountBalanceState>,
  accountId?: string | null,
) {
  if (!accountId) return;
  const account = accounts.get(accountId);
  if (!account) throw new Error("account_not_found");
  if (account.archived) throw new Error("account_archived");
}

function toBalanceTransaction(
  data: Record<string, unknown>,
): BalanceTransaction {
  return {
    accountId: typeof data.accountId === "string" ? data.accountId : null,
    amount: Number(data.amount) || 0,
    dueDate: typeof data.dueDate === "string" ? data.dueDate : "",
    paidAt: toIsoString(data.paidAt),
    type: data.type === "income" ? "income" : "expense",
    status: data.status === "paid" ? "paid" : "pending",
    deletedAt: toIsoString(data.deletedAt),
  };
}

function toFinancialAccount(
  document: FirebaseFirestore.QueryDocumentSnapshot,
): Omit<FinancialAccount, "currentBalance"> {
  const data = document.data();
  const type = ["checking", "savings", "cash", "investment"].includes(
    String(data.type),
  )
    ? (data.type as FinancialAccount["type"])
    : "checking";
  const ownership = ["mine", "partner", "joint"].includes(
    String(data.ownership),
  )
    ? (data.ownership as FinancialAccount["ownership"])
    : "joint";
  return {
    id: document.id,
    name: typeof data.name === "string" ? data.name : "Conta",
    institutionName:
      typeof data.institutionName === "string" ? data.institutionName : "",
    type,
    ownership,
    openingBalance: toSafeCents(data.openingBalanceCents) / 100,
    openingBalanceDate:
      typeof data.openingBalanceDate === "string"
        ? data.openingBalanceDate
        : "",
    createdAt: toIsoString(data.createdAt) || "",
    archivedAt: toIsoString(data.archivedAt),
  };
}

function toAccountTransfer(
  document: FirebaseFirestore.QueryDocumentSnapshot,
): AccountTransfer {
  const data = document.data();
  return {
    id: document.id,
    sourceAccountId:
      typeof data.sourceAccountId === "string" ? data.sourceAccountId : "",
    destinationAccountId:
      typeof data.destinationAccountId === "string"
        ? data.destinationAccountId
        : "",
    amount: toSafeCents(data.amountCents) / 100,
    date: typeof data.date === "string" ? data.date : "",
    description:
      typeof data.description === "string" ? data.description : "Transferência",
    responsibleUserId:
      typeof data.responsibleUserId === "string"
        ? data.responsibleUserId
        : "",
    responsibleName:
      typeof data.responsibleName === "string"
        ? data.responsibleName
        : "Participante",
    createdAt: toIsoString(data.createdAt) || "",
    reversedAt: toIsoString(data.reversedAt),
  };
}

function toSafeCents(value: unknown) {
  const cents = Number(value) || 0;
  if (!Number.isSafeInteger(cents)) throw new Error("invalid_account_balance");
  return cents;
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return typeof value === "string" && value ? value : null;
}
