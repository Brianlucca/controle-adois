"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { addMonthsToDateKey } from "@/lib/finance/date";
import {
  buildBaseTransaction,
  buildEditableTransactionFields,
} from "@/lib/finance/transaction-records";
import {
  ImportTransactionsSchema,
  StatusSchema,
  TransactionSchema,
} from "@/lib/finance/transaction-schema";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspaceId,
  handleAuthFailure,
} from "@/lib/server/action-context";
import { buildAuditRecord } from "@/lib/finance/audit-log";
import {
  assertActiveAccount,
  calculateStoredTransactionBalanceChanges,
  readAccountBalanceStates,
  runAccountBalanceTransaction,
  writeAccountBalanceChanges,
} from "@/lib/server/account-balance-store";
import type { Transaction } from "@/lib/types";

export async function getTransactions(uid: string, startDate: string, endDate: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await handleAuthFailure();
    return [];
  }

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return [];

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("transactions")
      .where("dueDate", ">=", startDate)
      .where("dueDate", "<=", endDate)
      .get();

    return snapshot.docs.filter((doc) => !doc.data().deletedAt).map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        dueDate: data.dueDate || "",
        paidAt: data.paidAt?.toDate?.().toISOString() || data.paidAt,
        importedAt: data.importedAt?.toDate?.().toISOString() || data.importedAt || null,
      };
    }) as any[];
  } catch (error) {
    console.error("get_transactions_failed", error);
    throw new Error("Não foi possível carregar as transações.");
  }
}

export async function getTransactionsThrough(endDate: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await handleAuthFailure();
    return [];
  }

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return [];

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("transactions")
      .where("dueDate", "<=", endDate)
      .get();

    return snapshot.docs.filter((doc) => !doc.data().deletedAt).map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        dueDate: data.dueDate || "",
        paidAt: data.paidAt?.toDate?.().toISOString() || data.paidAt,
        importedAt: data.importedAt?.toDate?.().toISOString() || data.importedAt || null,
      };
    }) as any[];
  } catch (error) {
    console.error("get_transactions_through_failed", error);
    throw new Error("Não foi possível carregar as transações.");
  }
}

export async function addTransaction(rawData: any) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Nenhum workspace selecionado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  const data = validation.data;

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const collection = workspaceRef.collection("transactions");
    const recurrenceCount = data.isRecurrent && data.type === "expense" ? data.recurrenceMonths : 1;
    const recurrenceGroupId = data.isRecurrent ? collection.doc().id : null;
    const createdTransactions = await runAccountBalanceTransaction(
      workspaceRef,
      async (transaction) => {
        const accounts = await readAccountBalanceStates(
          transaction,
          workspaceRef,
          [data.accountId],
        );
        assertActiveAccount(accounts, data.accountId);
        const balanceChanges = new Map<string, number>();
        const created: Transaction[] = [];

        Array.from({ length: recurrenceCount }).forEach((_, index) => {
          const transactionRef = collection.doc();
          const record = {
            ...buildBaseTransaction(data, user),
            dueDate:
              index === 0
                ? data.dueDate
                : addMonthsToDateKey(data.dueDate, index),
            recurrenceGroupId,
            recurrenceIndex: index + 1,
            recurrenceTotal: recurrenceCount,
          };
          mergeBalanceChanges(
            balanceChanges,
            calculateStoredTransactionBalanceChanges(null, record, accounts),
          );
          transaction.set(transactionRef, record);
          transaction.set(
            workspaceRef.collection("auditLogs").doc(),
            buildAuditRecord({
              action: "created",
              user,
              transactionId: transactionRef.id,
              after: record,
            }),
          );
          created.push({
            ...record,
            id: transactionRef.id,
            createdAt: record.createdAt.toISOString(),
            paidAt: record.paidAt?.toISOString() || undefined,
            pixCode: record.pixCode || undefined,
            barCode: record.barCode || undefined,
            observation: record.observation || undefined,
            linkedInvestmentId: record.linkedInvestmentId || undefined,
            recurrenceMonths: record.recurrenceMonths || undefined,
            recurrenceGroupId: record.recurrenceGroupId || undefined,
          });
        });

        writeAccountBalanceChanges(transaction, accounts, balanceChanges);
        return created;
      },
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: recurrenceCount, transactions: createdTransactions };
  } catch (error) {
    return {
      success: false,
      error: getAccountMutationError(error, "Erro interno ao salvar."),
    };
  }
}

export async function importTransactions(rawItems: any[]) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  const validation = ImportTransactionsSchema.safeParse(rawItems);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const collection = workspaceRef.collection("transactions");

    for (let index = 0; index < validation.data.length; index += 150) {
      const items = validation.data.slice(index, index + 150);
      await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
        const accountIds = items.map((item) => item.accountId);
        const accounts = await readAccountBalanceStates(
          transaction,
          workspaceRef,
          accountIds,
        );
        accountIds.forEach((accountId) =>
          assertActiveAccount(accounts, accountId),
        );
        const balanceChanges = new Map<string, number>();

        for (const item of items) {
          const transactionRef = collection.doc();
          const record = {
            ...buildBaseTransaction(item, user),
            importedAt: new Date(),
          };
          mergeBalanceChanges(
            balanceChanges,
            calculateStoredTransactionBalanceChanges(null, record, accounts),
          );
          transaction.set(transactionRef, record);
          transaction.set(
            workspaceRef.collection("auditLogs").doc(),
            buildAuditRecord({
              action: "imported",
              user,
              transactionId: transactionRef.id,
              after: record,
            }),
          );
        }

        writeAccountBalanceChanges(transaction, accounts, balanceChanges);
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: validation.data.length };
  } catch (error) {
    return {
      success: false,
      error: getAccountMutationError(error, "Erro ao importar transações."),
    };
  }
}

export async function deleteTransaction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const transactionRef = workspaceRef.collection("transactions").doc(id);
    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const current = await transaction.get(transactionRef);
      if (!current.exists) throw new Error("transaction_not_found");
      const before = current.data() || {};
      if (before.deletedAt) throw new Error("transaction_deleted");

      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [typeof before.accountId === "string" ? before.accountId : null],
      );
      const deletedAt = new Date();
      const after = { ...before, deletedAt, deletedBy: user.uid };
      const balanceChanges = calculateStoredTransactionBalanceChanges(
        before,
        after,
        accounts,
      );

      transaction.update(transactionRef, { deletedAt, deletedBy: user.uid });
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildAuditRecord({
          action: "deleted",
          user,
          transactionId: id,
          before,
          after,
        }),
      );
      writeAccountBalanceChanges(transaction, accounts, balanceChanges);
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getAccountMutationError(error, "Erro ao excluir."),
    };
  }
}

export async function deleteRecurrence(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  try {
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const doc = await collection.doc(id).get();
    if (!doc.exists) return { success: false, error: "Transação não encontrada." };

    const data = doc.data();
    if (data?.deletedAt) {
      return { success: false, error: "Esta transação já está na lixeira." };
    }
    const recurrenceGroupId = data?.recurrenceGroupId;

    if (!recurrenceGroupId) {
      const changes = {
        isRecurrent: false,
        recurrenceMonths: null,
        recurrenceGroupId: null,
        recurrenceIndex: null,
        recurrenceTotal: null,
      };
      const batch = adminDb.batch();
      batch.update(collection.doc(id), changes);
      batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "updated", user, transactionId: id, before: data || null, after: { ...data, ...changes } }));
      await batch.commit();
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      return { success: true, count: 1 };
    }

    const snapshot = await collection.where("recurrenceGroupId", "==", recurrenceGroupId).get();
    const batch = adminDb.batch();
    let deletedCount = 0;

    snapshot.docs.forEach((transactionDoc) => {
      if (
        transactionDoc.data().status === "pending" &&
        !transactionDoc.data().deletedAt
      ) {
        const deletedAt = new Date();
        batch.update(transactionDoc.ref, { deletedAt, deletedBy: user.uid });
        batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "deleted", user, transactionId: transactionDoc.id, before: transactionDoc.data(), after: { ...transactionDoc.data(), deletedAt, deletedBy: user.uid } }));
        deletedCount += 1;
      }
    });
    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: deletedCount };
  } catch (error) {
    return { success: false, error: "Erro ao excluir recorrência." };
  }
}

export async function updateTransactionStatus(id: string, status: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false };

  const validation = StatusSchema.safeParse(status);
  if (!validation.success) return { success: false, error: "Status inválido" };
  const validStatus = validation.data;

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const transactionRef = workspaceRef.collection("transactions").doc(id);
    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const current = await transaction.get(transactionRef);
      if (!current.exists) throw new Error("transaction_not_found");
      const before = current.data() || {};
      if (before.deletedAt) throw new Error("transaction_deleted_status");

      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [typeof before.accountId === "string" ? before.accountId : null],
      );
      if (validStatus === "paid") {
        assertActiveAccount(
          accounts,
          typeof before.accountId === "string" ? before.accountId : null,
        );
      }
      const changes = {
        status: validStatus,
        paidAt: validStatus === "paid" ? new Date() : null,
      };
      const after = { ...before, ...changes };
      const balanceChanges = calculateStoredTransactionBalanceChanges(
        before,
        after,
        accounts,
      );

      transaction.update(transactionRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildAuditRecord({
          action: "status_changed",
          user,
          transactionId: id,
          before,
          after,
        }),
      );
      writeAccountBalanceChanges(transaction, accounts, balanceChanges);
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? Number(error.code)
        : null;
    return {
      success: false,
      error:
        code === 8
          ? "Cota do banco temporariamente esgotada."
          : getAccountMutationError(
              error,
              "Não foi possível atualizar o status.",
            ),
    };
  }
}

export async function editTransaction(id: string, rawData: any) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  const data = validation.data;

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const collection = workspaceRef.collection("transactions");
    const docRef = collection.doc(id);
    const updatedCount = await runAccountBalanceTransaction(
      workspaceRef,
      async (transaction) => {
      const currentDoc = await transaction.get(docRef);
      if (!currentDoc.exists) throw new Error("transaction_not_found");
      const currentData = currentDoc.data() || {};
      if (currentData.deletedAt) throw new Error("transaction_deleted_edit");

      const currentAccountId =
        typeof currentData.accountId === "string"
          ? currentData.accountId
          : null;
      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [currentAccountId, data.accountId],
      );
      assertActiveAccount(accounts, data.accountId);
      const balanceChanges = new Map<string, number>();
      const shouldCreateRecurrence =
        data.isRecurrent &&
        data.type === "expense" &&
        !currentData.recurrenceGroupId;

      if (shouldCreateRecurrence) {
        const recurrenceCount = data.recurrenceMonths;
        const recurrenceGroupId = collection.doc().id;
        const firstChanges = {
          ...buildEditableTransactionFields(
            data,
            typeof currentData.linkedInvestmentId === "string"
              ? currentData.linkedInvestmentId
              : null,
          ),
          isRecurrent: true,
          recurrenceMonths: recurrenceCount,
          recurrenceGroupId,
          recurrenceIndex: 1,
          recurrenceTotal: recurrenceCount,
          paidAt: data.status === "paid" ? new Date() : null,
        };
        const firstAfter = { ...currentData, ...firstChanges };
        mergeBalanceChanges(
          balanceChanges,
          calculateStoredTransactionBalanceChanges(
            currentData,
            firstAfter,
            accounts,
          ),
        );
        transaction.update(docRef, firstChanges);
        transaction.set(
          workspaceRef.collection("auditLogs").doc(),
          buildAuditRecord({
            action: "updated",
            user,
            transactionId: id,
            before: currentData,
            after: firstAfter,
          }),
        );

        Array.from({ length: Math.max(0, recurrenceCount - 1) }).forEach(
          (_, index) => {
            const transactionRef = collection.doc();
            const record = {
              ...buildBaseTransaction(data, user),
              dueDate: addMonthsToDateKey(data.dueDate, index + 1),
              recurrenceGroupId,
              recurrenceIndex: index + 2,
              recurrenceTotal: recurrenceCount,
            };
            mergeBalanceChanges(
              balanceChanges,
              calculateStoredTransactionBalanceChanges(null, record, accounts),
            );
            transaction.set(transactionRef, record);
            transaction.set(
              workspaceRef.collection("auditLogs").doc(),
              buildAuditRecord({
                action: "created",
                user,
                transactionId: transactionRef.id,
                after: record,
              }),
            );
          },
        );

        writeAccountBalanceChanges(transaction, accounts, balanceChanges);
        return recurrenceCount;
      }

      const changes = buildEditableTransactionFields(
        data,
        typeof currentData.linkedInvestmentId === "string"
          ? currentData.linkedInvestmentId
          : null,
      );
      const after = { ...currentData, ...changes };
      mergeBalanceChanges(
        balanceChanges,
        calculateStoredTransactionBalanceChanges(
          currentData,
          after,
          accounts,
        ),
      );
      transaction.update(docRef, changes);
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildAuditRecord({
          action: "updated",
          user,
          transactionId: id,
          before: currentData,
          after,
        }),
      );
      writeAccountBalanceChanges(transaction, accounts, balanceChanges);
      return 1;
      },
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: updatedCount };
  } catch (error) {
    return {
      success: false,
      error: getAccountMutationError(error, "Erro ao atualizar."),
    };
  }
}

function mergeBalanceChanges(
  target: Map<string, number>,
  source: ReadonlyMap<string, number>,
) {
  for (const [accountId, deltaCents] of source) {
    target.set(accountId, (target.get(accountId) || 0) + deltaCents);
  }
}

function getAccountMutationError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message === "account_not_found") {
    return "A conta vinculada não existe.";
  }
  if (message === "account_archived") {
    return "A conta selecionada está arquivada.";
  }
  if (message === "account_balance_overflow") {
    return "O saldo resultante ultrapassa o limite aceito.";
  }
  if (message === "transaction_not_found") {
    return "Transação não encontrada.";
  }
  if (message === "transaction_deleted") {
    return "Esta transação já está na lixeira.";
  }
  if (message === "transaction_deleted_status") {
    return "Restaure a transação antes de alterar o status.";
  }
  if (message === "transaction_deleted_edit") {
    return "Restaure a transação antes de editá-la.";
  }
  return fallback;
}
