"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import {
  AccountIdSchema,
  AccountTransferSchema,
  FinancialAccountSchema,
} from "@/lib/finance/account-schema";
import { calculateAccountBalances } from "@/lib/finance/account-balances";
import {
  AccountTransfer,
  FinancialAccount,
} from "@/lib/finance/account-types";
import { buildEntityAuditRecord } from "@/lib/finance/audit-log";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspaceId,
  handleAuthFailure,
} from "@/lib/server/action-context";

export async function getAccountsOverview() {
  const context = await getAccountContext();
  if (!context) return { success: false as const, error: "unauthenticated" };

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
    const [accountSnapshot, transactionSnapshot, transferSnapshot] =
      await Promise.all([
        workspaceRef.collection("accounts").get(),
        workspaceRef.collection("transactions").get(),
        workspaceRef.collection("transfers").get(),
      ]);

    const accounts = accountSnapshot.docs.map(toAccount);
    const transfers = transferSnapshot.docs.map(toTransfer);
    const transactions = transactionSnapshot.docs.map((document) => {
      const data = document.data();
      return {
        accountId:
          typeof data.accountId === "string" ? data.accountId : null,
        amount: Number(data.amount) || 0,
        dueDate: typeof data.dueDate === "string" ? data.dueDate : "",
        paidAt: toIsoString(data.paidAt),
        type: data.type === "income" ? ("income" as const) : ("expense" as const),
        status: data.status === "paid" ? ("paid" as const) : ("pending" as const),
        deletedAt: toIsoString(data.deletedAt),
      };
    });

    const accountsWithBalances = calculateAccountBalances(
      accounts,
      transactions,
      transfers,
    ).sort((left, right) => {
      if (Boolean(left.archivedAt) !== Boolean(right.archivedAt)) {
        return left.archivedAt ? 1 : -1;
      }
      return left.name.localeCompare(right.name, "pt-BR");
    });

    return {
      success: true as const,
      accounts: accountsWithBalances,
      transfers: transfers.sort((left, right) =>
        right.date.localeCompare(left.date),
      ),
    };
  } catch (error) {
    console.error("get_accounts_overview_failed", error);
    return {
      success: false as const,
      error: "Não foi possível carregar suas contas.",
    };
  }
}

export async function getFinancialAccountOptions() {
  const context = await getAccountContext();
  if (!context) return [];

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(context.workspaceId)
      .collection("accounts")
      .get();

    return snapshot.docs
      .map(toAccount)
      .filter((account) => !account.archivedAt)
      .map(({ id, name, institutionName }) => ({ id, name, institutionName }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  } catch {
    return [];
  }
}

export async function saveFinancialAccount(rawData: unknown) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();

  const parsed = FinancialAccountSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const accountCollection = workspaceRef.collection("accounts");
  const accountData = {
    name: parsed.data.name,
    institutionName: parsed.data.institutionName || null,
    type: parsed.data.type,
    ownership: parsed.data.ownership,
    openingBalanceCents: toCents(parsed.data.openingBalance),
    openingBalanceDate: parsed.data.openingBalanceDate,
    updatedAt: new Date(),
  };

  try {
    const accountRef = accountCollection.doc();
    const record = {
      ...accountData,
      createdAt: new Date(),
      createdBy: context.user.uid,
      archivedAt: null,
    };
    const batch = adminDb.batch();
    batch.set(accountRef, record);
    batch.set(
      workspaceRef.collection("auditLogs").doc(),
      buildEntityAuditRecord({
        action: "created",
        entityType: "account",
        entityId: accountRef.id,
        user: context.user,
        after: record,
      }),
    );
    await batch.commit();
    revalidateAccountPaths();
    return { success: true, id: accountRef.id };
  } catch (error) {
    console.error("save_financial_account_failed", error);
    return { success: false, error: "Não foi possível salvar a conta." };
  }
}

export async function archiveFinancialAccount(rawAccountId: unknown) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();
  const id = AccountIdSchema.safeParse(rawAccountId);
  if (!id.success) return { success: false, error: "Conta inválida." };

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const accountRef = workspaceRef.collection("accounts").doc(id.data);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(accountRef);
      if (!current.exists) throw new Error("account_not_found");
      if (current.data()?.archivedAt) throw new Error("account_archived");

      const changes = { archivedAt: new Date(), archivedBy: context.user.uid };
      transaction.update(accountRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "archived",
          entityType: "account",
          entityId: accountRef.id,
          user: context.user,
          before: current.data() || null,
          after: { ...current.data(), ...changes },
        }),
      );
    });
    revalidateAccountPaths();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "account_not_found") {
      return { success: false, error: "Conta não encontrada." };
    }
    if (message === "account_archived") {
      return { success: false, error: "Esta conta já está arquivada." };
    }
    return { success: false, error: "Não foi possível arquivar a conta." };
  }
}

export async function createAccountTransfer(rawData: unknown) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();
  const parsed = AccountTransferSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const sourceRef = workspaceRef.collection("accounts").doc(parsed.data.sourceAccountId);
  const destinationRef = workspaceRef
    .collection("accounts")
    .doc(parsed.data.destinationAccountId);
  const transferRef = workspaceRef.collection("transfers").doc();

  try {
    await adminDb.runTransaction(async (transaction) => {
      const [source, destination] = await Promise.all([
        transaction.get(sourceRef),
        transaction.get(destinationRef),
      ]);
      if (!source.exists || !destination.exists) {
        throw new Error("account_not_found");
      }
      if (source.data()?.archivedAt || destination.data()?.archivedAt) {
        throw new Error("account_archived");
      }
      if (
        parsed.data.date < source.data()?.openingBalanceDate ||
        parsed.data.date < destination.data()?.openingBalanceDate
      ) {
        throw new Error("transfer_before_opening_balance");
      }

      const record = {
        sourceAccountId: sourceRef.id,
        destinationAccountId: destinationRef.id,
        amountCents: toCents(parsed.data.amount),
        date: parsed.data.date,
        description: parsed.data.description || "Transferência entre contas",
        responsibleUserId: context.user.uid,
        responsibleName:
          context.user.name || context.user.email || "Participante",
        createdAt: new Date(),
        createdBy: context.user.uid,
        reversedAt: null,
      };

      transaction.set(transferRef, record);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "created",
          entityType: "transfer",
          entityId: transferRef.id,
          user: context.user,
          after: record,
        }),
      );
    });
    revalidateAccountPaths();
    return { success: true, id: transferRef.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "account_not_found") {
      return { success: false, error: "Uma das contas não foi encontrada." };
    }
    if (message === "account_archived") {
      return { success: false, error: "Não transfira usando contas arquivadas." };
    }
    if (message === "transfer_before_opening_balance") {
      return {
        success: false,
        error: "A transferência não pode ser anterior ao saldo inicial das contas.",
      };
    }
    console.error("create_account_transfer_failed", error);
    return { success: false, error: "Não foi possível registrar a transferência." };
  }
}

export async function reverseAccountTransfer(rawTransferId: unknown) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();
  const id = AccountIdSchema.safeParse(rawTransferId);
  if (!id.success) return { success: false, error: "Transferência inválida." };

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const transferRef = workspaceRef.collection("transfers").doc(id.data);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(transferRef);
      if (!current.exists) throw new Error("transfer_not_found");
      if (current.data()?.reversedAt) throw new Error("transfer_reversed");

      const changes = { reversedAt: new Date(), reversedBy: context.user.uid };
      transaction.update(transferRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "reversed",
          entityType: "transfer",
          entityId: transferRef.id,
          user: context.user,
          before: current.data() || null,
          after: { ...current.data(), ...changes },
        }),
      );
    });
    revalidateAccountPaths();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "transfer_not_found") {
      return { success: false, error: "Transferência não encontrada." };
    }
    if (message === "transfer_reversed") {
      return { success: false, error: "Esta transferência já foi estornada." };
    }
    return { success: false, error: "Não foi possível estornar a transferência." };
  }
}

async function getAccountContext() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  return workspaceId ? { user, workspaceId } : null;
}

function toAccount(
  document: FirebaseFirestore.QueryDocumentSnapshot,
): Omit<FinancialAccount, "currentBalance"> {
  const data = document.data();
  return {
    id: document.id,
    name: typeof data.name === "string" ? data.name : "Conta",
    institutionName:
      typeof data.institutionName === "string" ? data.institutionName : "",
    type: isAccountType(data.type) ? data.type : "checking",
    ownership: isOwnership(data.ownership) ? data.ownership : "joint",
    openingBalance: Number(data.openingBalanceCents || 0) / 100,
    openingBalanceDate:
      typeof data.openingBalanceDate === "string"
        ? data.openingBalanceDate
        : "",
    createdAt: toIsoString(data.createdAt) || "",
    archivedAt: toIsoString(data.archivedAt),
  };
}

function toTransfer(
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
    amount: Number(data.amountCents || 0) / 100,
    date: typeof data.date === "string" ? data.date : "",
    description:
      typeof data.description === "string"
        ? data.description
        : "Transferência entre contas",
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

function isAccountType(value: unknown): value is FinancialAccount["type"] {
  return ["checking", "savings", "cash", "investment"].includes(
    String(value),
  );
}

function isOwnership(value: unknown): value is FinancialAccount["ownership"] {
  return ["mine", "partner", "joint"].includes(String(value));
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value ? value : null;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function revalidateAccountPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/transactions");
}
