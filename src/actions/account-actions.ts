"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import {
  AccountIdSchema,
  AccountTransferSchema,
  FinancialAccountSchema,
} from "@/lib/finance/account-schema";
import { calculateOpeningBalanceDeltaCents } from "@/lib/finance/account-balances";
import {
  AccountOwnerOption,
  AccountTransfer,
  FinancialAccount,
} from "@/lib/finance/account-types";
import { buildEntityAuditRecord } from "@/lib/finance/audit-log";
import {
  assertActiveAccount,
  getMaterializedAccountDocuments,
  readAccountBalanceStates,
  runAccountBalanceTransaction,
  writeAccountBalanceChanges,
} from "@/lib/server/account-balance-store";
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
    const [accountDocuments, transferSnapshot, workspaceSnapshot] = await Promise.all([
      getMaterializedAccountDocuments(workspaceRef),
      workspaceRef.collection("transfers")
        .orderBy("createdAt", "desc")
        .limit(12)
        .get(),
      workspaceRef.get(),
    ]);

    const accounts = accountDocuments
      .map((document) => toAccount(document, context.user.uid))
      .sort((left, right) => {
      if (Boolean(left.archivedAt) !== Boolean(right.archivedAt)) {
        return left.archivedAt ? 1 : -1;
      }
      return left.name.localeCompare(right.name, "pt-BR");
      });
    const transfers = transferSnapshot.docs.map(toTransfer);

    return {
      success: true as const,
      accounts,
      transfers,
      viewerUserId: context.user.uid,
      ownershipOptions: getOwnershipOptions(
        workspaceSnapshot.data() || {},
        context.user.uid,
        context.user.name || context.user.email || "Você",
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

export async function getAccountBalanceOverview() {
  const context = await getAccountContext();
  if (!context) return { success: false as const, accounts: [] };

  try {
    const workspaceRef = adminDb
      .collection("workspaces")
      .doc(context.workspaceId);
    const documents = await getMaterializedAccountDocuments(workspaceRef);
    return {
      success: true as const,
      accounts: documents.map((document) =>
        toAccount(document, context.user.uid),
      ),
    };
  } catch (error) {
    console.error("get_account_balance_overview_failed", error);
    return { success: false as const, accounts: [] };
  }
}

export async function getFinancialAccountOptions(includeArchived = false) {
  const context = await getAccountContext();
  if (!context) return [];

  try {
    const workspaceRef = adminDb
      .collection("workspaces")
      .doc(context.workspaceId);
    const documents = await getMaterializedAccountDocuments(workspaceRef);

    return documents
      .map((document) => toAccount(document, context.user.uid))
      .filter((account) => includeArchived || !account.archivedAt)
      .map(({ id, name, institutionName, ownership, ownerUserId }) => ({
        id,
        name,
        institutionName,
        ownership,
        ownerUserId,
      }))
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
  const workspaceSnapshot = await workspaceRef.get();
  const ownerUserId = parsed.data.ownerUserId || null;
  if (
    ownerUserId &&
    ownerUserId !== context.user.uid &&
    !getWorkspaceMemberIds(workspaceSnapshot.data() || {}).includes(ownerUserId)
  ) {
    return { success: false, error: "Escolha uma pessoa do nosso espaço." };
  }
  const accountData = {
    name: parsed.data.name,
    institutionName: parsed.data.institutionName || null,
    type: parsed.data.type,
    ownership: ownerUserId
      ? ownerUserId === context.user.uid
        ? "mine"
        : "partner"
      : "joint",
    ownerUserId,
    openingBalanceCents: toCents(parsed.data.openingBalance),
    currentBalanceCents: toCents(parsed.data.openingBalance),
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

export async function updateFinancialAccount(
  rawAccountId: unknown,
  rawData: unknown,
) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();

  const id = AccountIdSchema.safeParse(rawAccountId);
  if (!id.success) return { success: false, error: "Conta inválida." };
  const parsed = FinancialAccountSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const accountRef = workspaceRef.collection("accounts").doc(id.data);
  const ownerUserId = parsed.data.ownerUserId || null;

  try {
    const workspaceSnapshot = await workspaceRef.get();
    if (
      ownerUserId &&
      ownerUserId !== context.user.uid &&
      !getWorkspaceMemberIds(workspaceSnapshot.data() || {}).includes(ownerUserId)
    ) {
      return { success: false, error: "Escolha uma pessoa do nosso espaço." };
    }

    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const current = await transaction.get(accountRef);
      if (!current.exists) throw new Error("account_not_found");
      const before = current.data() || {};
      if (before.archivedAt) throw new Error("account_archived");
      if (before.openingBalanceDate !== parsed.data.openingBalanceDate) {
        throw new Error("opening_date_locked");
      }
      if (!Object.hasOwn(before, "currentBalanceCents")) {
        throw new Error("account_balance_not_materialized");
      }

      const previousOpeningBalanceCents = toStoredCents(
        before.openingBalanceCents,
      );
      const nextOpeningBalanceCents = toCents(parsed.data.openingBalance);
      const currentBalanceCents = toStoredCents(before.currentBalanceCents);
      const balanceDeltaCents = calculateOpeningBalanceDeltaCents(
        previousOpeningBalanceCents,
        nextOpeningBalanceCents,
      );
      const nextCurrentBalanceCents = currentBalanceCents + balanceDeltaCents;
      if (!Number.isSafeInteger(nextCurrentBalanceCents)) {
        throw new Error("account_balance_overflow");
      }

      const changes = {
        name: parsed.data.name,
        institutionName: parsed.data.institutionName || null,
        type: parsed.data.type,
        ownership: ownerUserId
          ? ownerUserId === context.user.uid
            ? "mine"
            : "partner"
          : "joint",
        ownerUserId,
        openingBalanceCents: nextOpeningBalanceCents,
        currentBalanceCents: nextCurrentBalanceCents,
        updatedAt: new Date(),
        updatedBy: context.user.uid,
        balanceUpdatedAt: new Date(),
      };
      transaction.update(accountRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "updated",
          entityType: "account",
          entityId: accountRef.id,
          user: context.user,
          before,
          after: { ...before, ...changes },
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
      return { success: false, error: "Desarquive a conta antes de editá-la." };
    }
    if (message === "opening_date_locked") {
      return { success: false, error: "A data inicial não pode ser alterada." };
    }
    if (message === "account_balance_overflow") {
      return { success: false, error: "O saldo resultante ultrapassa o limite aceito." };
    }
    console.error("update_financial_account_failed", error);
    return { success: false, error: "Não foi possível atualizar a conta." };
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

export async function unarchiveFinancialAccount(rawAccountId: unknown) {
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
      if (!current.data()?.archivedAt) throw new Error("account_not_archived");

      const changes = {
        archivedAt: null,
        archivedBy: null,
        restoredAt: new Date(),
        restoredBy: context.user.uid,
      };
      transaction.update(accountRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "restored",
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
    if (message === "account_not_archived") {
      return { success: false, error: "Esta conta já está ativa." };
    }
    return { success: false, error: "Não foi possível desarquivar a conta." };
  }
}

export async function deleteFinancialAccount(rawAccountId: unknown) {
  const context = await getAccountContext();
  if (!context) return await handleAuthFailure();
  const id = AccountIdSchema.safeParse(rawAccountId);
  if (!id.success) return { success: false, error: "Conta inválida." };

  const workspaceRef = adminDb.collection("workspaces").doc(context.workspaceId);
  const accountRef = workspaceRef.collection("accounts").doc(id.data);
  try {
    await adminDb.runTransaction(async (transaction) => {
      const [current, linkedTransactions, sourceTransfers, destinationTransfers] =
        await Promise.all([
          transaction.get(accountRef),
          transaction.get(
            workspaceRef
              .collection("transactions")
              .where("accountId", "==", id.data)
              .limit(1),
          ),
          transaction.get(
            workspaceRef
              .collection("transfers")
              .where("sourceAccountId", "==", id.data)
              .limit(1),
          ),
          transaction.get(
            workspaceRef
              .collection("transfers")
              .where("destinationAccountId", "==", id.data)
              .limit(1),
          ),
        ]);
      if (!current.exists) throw new Error("account_not_found");
      if (
        !linkedTransactions.empty ||
        !sourceTransfers.empty ||
        !destinationTransfers.empty
      ) {
        throw new Error("account_has_history");
      }

      const before = current.data() || {};
      transaction.delete(accountRef);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "deleted",
          entityType: "account",
          entityId: accountRef.id,
          user: context.user,
          before,
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
    if (message === "account_has_history") {
      return {
        success: false,
        error: "Esta conta possui movimentações ou transferências. Arquive-a para preservar o histórico financeiro.",
      };
    }
    console.error("delete_financial_account_failed", error);
    return { success: false, error: "Não foi possível excluir a conta." };
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
    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [sourceRef.id, destinationRef.id],
      );
      assertActiveAccount(accounts, sourceRef.id);
      assertActiveAccount(accounts, destinationRef.id);
      const source = accounts.get(sourceRef.id)!;
      const destination = accounts.get(destinationRef.id)!;
      if (
        parsed.data.date < source.openingBalanceDate ||
        parsed.data.date < destination.openingBalanceDate
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

      const amountCents = toCents(parsed.data.amount);
      writeAccountBalanceChanges(
        transaction,
        accounts,
        new Map([
          [sourceRef.id, -amountCents],
          [destinationRef.id, amountCents],
        ]),
      );
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
    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const current = await transaction.get(transferRef);
      if (!current.exists) throw new Error("transfer_not_found");
      if (current.data()?.reversedAt) throw new Error("transfer_reversed");

      const sourceId = AccountIdSchema.safeParse(
        current.data()?.sourceAccountId,
      );
      const destinationId = AccountIdSchema.safeParse(
        current.data()?.destinationAccountId,
      );
      if (!sourceId.success || !destinationId.success) {
        throw new Error("account_not_found");
      }
      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [sourceId.data, destinationId.data],
      );
      if (!accounts.has(sourceId.data) || !accounts.has(destinationId.data)) {
        throw new Error("account_not_found");
      }

      const amountCents = Number(current.data()?.amountCents);
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        throw new Error("invalid_transfer_amount");
      }

      const changes = { reversedAt: new Date(), reversedBy: context.user.uid };
      writeAccountBalanceChanges(
        transaction,
        accounts,
        new Map([
          [sourceId.data, amountCents],
          [destinationId.data, -amountCents],
        ]),
      );
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
    if (message === "account_not_found") {
      return { success: false, error: "As contas da transferência não existem mais." };
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
  viewerUserId?: string,
): FinancialAccount {
  const data = document.data();
  const ownerUserId = typeof data.ownerUserId === "string" ? data.ownerUserId : null;
  return {
    id: document.id,
    name: typeof data.name === "string" ? data.name : "Conta",
    institutionName:
      typeof data.institutionName === "string" ? data.institutionName : "",
    type: isAccountType(data.type) ? data.type : "checking",
    ownership: ownerUserId && viewerUserId
      ? ownerUserId === viewerUserId ? "mine" : "partner"
      : isOwnership(data.ownership) ? data.ownership : "joint",
    ownerUserId,
    openingBalance: Number(data.openingBalanceCents || 0) / 100,
    currentBalance:
      Number(data.currentBalanceCents ?? data.openingBalanceCents) / 100 || 0,
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

function toStoredCents(value: unknown) {
  const cents = Number(value);
  if (!Number.isSafeInteger(cents)) throw new Error("invalid_account_balance");
  return cents;
}

function revalidateAccountPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/transactions");
}

function getWorkspaceMemberIds(workspace: Record<string, unknown>) {
  const memberIds = Array.isArray(workspace.memberIds)
    ? workspace.memberIds.filter((value): value is string => typeof value === "string")
    : [];
  const memberObjects = Array.isArray(workspace.members)
    ? workspace.members
        .map((member) => typeof member === "object" && member !== null && "uid" in member ? member.uid : null)
        .filter((value): value is string => typeof value === "string")
    : [];
  return Array.from(new Set(memberIds.concat(memberObjects)));
}

function getOwnershipOptions(
  workspace: Record<string, unknown>,
  currentUserId: string,
  currentUserLabel: string,
) {
  const members = Array.isArray(workspace.members) ? workspace.members : [];
  const memberLabels = new Map(
    members
    .map((member) => {
      if (typeof member === "string") return [member, member] as const;
      if (!member || typeof member !== "object") return null;
      const id = "uid" in member && typeof member.uid === "string" ? member.uid : null;
      if (!id) return null;
      const label =
        "name" in member && typeof member.name === "string" && member.name
          ? member.name
          : "displayName" in member &&
              typeof member.displayName === "string" &&
              member.displayName
            ? member.displayName
            : "email" in member && typeof member.email === "string"
              ? member.email
              : id;
      return [id, label] as const;
    })
    .filter((option): option is readonly [string, string] => Boolean(option)),
  );
  const memberIds = new Set([
    currentUserId,
    ...getWorkspaceMemberIds(workspace),
  ]);
  const options: AccountOwnerOption[] = [...memberIds].map((id) => ({
    id,
    label: id === currentUserId ? currentUserLabel : memberLabels.get(id) || "Participante",
  }));
  return [
    ...options.filter((option) => option.id === currentUserId),
    ...options.filter((option) => option.id !== currentUserId),
  ];
}
