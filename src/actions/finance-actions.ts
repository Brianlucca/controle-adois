"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { addMonthsToDateKey, getBahiaDateKey } from "@/lib/finance/date";
import {
  buildBaseTransaction,
  buildEditableTransactionFields,
  getRecurringOccurrenceStatus,
  getRecurrenceEditRange,
  getRecurrenceDisplayKey,
  getStatusAfterDateChange,
  isFutureCompletedTransaction,
} from "@/lib/finance/transaction-records";
import {
  ImportTransactionsSchema,
  StatusSchema,
  TransactionSchema,
  type TransactionInput,
} from "@/lib/finance/transaction-schema";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspace,
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
  type AccountBalanceState,
} from "@/lib/server/account-balance-store";
import type { Transaction } from "@/lib/types";
import {
  moneyToCents,
  resolveExpenseAllocation,
  resolveExpenseFunding,
} from "@/lib/finance/expense-splits";
import { getWorkspaceMemberId } from "@/lib/workspace/membership";

export async function getTransactions(uid: string, startDate: string, endDate: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await handleAuthFailure();
    return { transactions: [], repairedAccountBalances: false };
  }

  const activeWorkspace = await getValidatedActiveWorkspace(user.uid);
  const workspaceId = activeWorkspace?.id;
  if (!workspaceId) return { transactions: [], repairedAccountBalances: false };

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const snapshot = await workspaceRef
      .collection("transactions")
      .where("dueDate", ">=", startDate)
      .where("dueDate", "<=", endDate)
      .get();
    const documents = snapshot.docs.filter(
      (document) => !document.data().deletedAt,
    );
    const todayKey = getBahiaDateKey(new Date());

    const repairedCount = await repairFutureCompletedTransactions(
      workspaceRef,
      documents,
      user,
      todayKey,
    );

    return {
      transactions: documents.map((document) =>
        toClientTransaction(document, todayKey),
      ),
      repairedAccountBalances: repairedCount > 0,
    };
  } catch (error) {
    console.error("get_transactions_failed", error);
    throw new Error("Não foi possível carregar as transações.");
  }
}

export async function getTransactionsThrough(endDate: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await handleAuthFailure();
    return { transactions: [], repairedAccountBalances: false };
  }

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { transactions: [], repairedAccountBalances: false };

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const snapshot = await workspaceRef
      .collection("transactions")
      .where("dueDate", "<=", endDate)
      .get();
    const documents = snapshot.docs.filter(
      (document) => !document.data().deletedAt,
    );
    const todayKey = getBahiaDateKey(new Date());

    const repairedCount = await repairFutureCompletedTransactions(
      workspaceRef,
      documents,
      user,
      todayKey,
    );

    return {
      transactions: documents.map((document) =>
        toClientTransaction(document, todayKey),
      ),
      repairedAccountBalances: repairedCount > 0,
    };
  } catch (error) {
    console.error("get_transactions_through_failed", error);
    throw new Error("Não foi possível carregar as transações.");
  }
}

export async function addTransaction(rawData: unknown) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const activeWorkspace = await getValidatedActiveWorkspace(user.uid);
  const workspaceData = activeWorkspace?.data || {};
  const workspaceId = activeWorkspace?.id;
  if (!workspaceId) return { success: false, error: "Nenhum workspace selecionado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  try {
    const participantIds = getWorkspaceParticipantIds(workspaceData, user.uid);
    const normalized = normalizeTransactionAllocation(
      validation.data,
      user.uid,
      participantIds,
    );
    if (!normalized.success) return normalized;
    const todayKey = getBahiaDateKey(new Date());
    const data = normalizeTransactionDateStatus(normalized.data, todayKey);

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
        const fundedData = resolveTransactionFunding(
          data,
          accounts,
          user.uid,
          participantIds,
        );
        const balanceChanges = new Map<string, number>();
        const created: Transaction[] = [];

        Array.from({ length: recurrenceCount }).forEach((_, index) => {
          const transactionRef = collection.doc();
          const occurrenceDueDate =
            index === 0
              ? data.dueDate
              : addMonthsToDateKey(data.dueDate, index);
          const occurrenceStatus = getRecurringOccurrenceStatus(
            getStatusAfterDateChange(
              data.status,
              occurrenceDueDate,
              todayKey,
            ),
            index,
          );
          const record = {
            ...buildBaseTransaction(
              { ...fundedData, status: occurrenceStatus },
              user,
            ),
            dueDate: occurrenceDueDate,
            recurrenceGroupId,
            recurrenceIndex: index + 1,
            recurrenceTotal: recurrenceCount,
            recurrenceActive: true,
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

export async function importTransactions(rawItems: unknown) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const activeWorkspace = await getValidatedActiveWorkspace(user.uid);
  const workspaceId = activeWorkspace?.id;
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  const validation = ImportTransactionsSchema.safeParse(rawItems);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const participantIds = getWorkspaceParticipantIds(
      activeWorkspace?.data || {},
      user.uid,
    );
    const todayKey = getBahiaDateKey(new Date());
    const normalizedItems: TransactionInput[] = [];
    for (const item of validation.data) {
      const normalized = normalizeTransactionAllocation(
        item,
        user.uid,
        participantIds,
      );
      if (!normalized.success) return normalized;
      normalizedItems.push(
        normalizeTransactionDateStatus(normalized.data, todayKey),
      );
    }

    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const collection = workspaceRef.collection("transactions");

    for (let index = 0; index < normalizedItems.length; index += 150) {
      const items = normalizedItems.slice(index, index + 150);
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
          const fundedItem = resolveTransactionFunding(
            item,
            accounts,
            user.uid,
            participantIds,
          );
          const transactionRef = collection.doc();
          const record = {
            ...buildBaseTransaction(fundedItem, user),
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

  const activeWorkspace = await getValidatedActiveWorkspace(user.uid);
  const workspaceId = activeWorkspace?.id;
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
      const transactionData = transactionDoc.data();
      if (transactionData.deletedAt) return;

      if (transactionData.status === "pending") {
        const deletedAt = new Date();
        const after = {
          ...transactionData,
          recurrenceActive: false,
          deletedAt,
          deletedBy: user.uid,
        };
        batch.update(transactionDoc.ref, {
          recurrenceActive: false,
          deletedAt,
          deletedBy: user.uid,
        });
        batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "deleted", user, transactionId: transactionDoc.id, before: transactionData, after }));
        deletedCount += 1;
        return;
      }

      const after = { ...transactionData, recurrenceActive: false };
      batch.update(transactionDoc.ref, { recurrenceActive: false });
      batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "updated", user, transactionId: transactionDoc.id, before: transactionData, after }));
    });
    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: deletedCount };
  } catch {
    return { success: false, error: "Erro ao excluir recorrência." };
  }
}

export async function getRecurringTransactions() {
  const user = await getAuthenticatedUser();
  if (!user) {
    await handleAuthFailure();
    return { success: false as const, transactions: [] as Transaction[] };
  }

  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) {
    return { success: false as const, transactions: [] as Transaction[] };
  }

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("transactions")
      .where("isRecurrent", "==", true)
      .limit(500)
      .get();
    const todayKey = getBahiaDateKey(new Date());
    const activeDocuments = snapshot.docs.filter((document) => {
      const data = document.data();
      return !data.deletedAt && data.recurrenceActive !== false;
    });
    const representatives = new Map<string, (typeof activeDocuments)[number]>();
    for (const document of activeDocuments) {
      const data = document.data();
      const groupId =
        typeof data.recurrenceGroupId === "string"
          ? data.recurrenceGroupId
          : document.id;
      const current = representatives.get(groupId);
      const currentData = current?.data();
      const isPending = data.status === "pending";
      const currentIsPending = currentData?.status === "pending";
      if (
        !current ||
        (isPending && !currentIsPending) ||
        (isPending === currentIsPending &&
          (Number(data.recurrenceIndex) || 1) <
            (Number(currentData?.recurrenceIndex) || 1))
      ) {
        representatives.set(groupId, document);
      }
    }
    const recurrenceCandidates = [...representatives.values()].map((document) =>
      toClientTransaction(document, todayKey),
    );
    const uniqueRecurrences = new Map<string, Transaction>();
    for (const candidate of recurrenceCandidates) {
      const key = getRecurrenceDisplayKey(candidate);
      const current = uniqueRecurrences.get(key);
      if (!current || candidate.dueDate < current.dueDate) {
        uniqueRecurrences.set(key, candidate);
      }
    }
    return {
      success: true as const,
      transactions: [...uniqueRecurrences.values()],
    };
  } catch (error) {
    console.error("get_recurring_transactions_failed", error);
    return { success: false as const, transactions: [] as Transaction[] };
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
      const dueDate =
        typeof before.dueDate === "string" ? before.dueDate : "";
      if (
        isFutureCompletedTransaction(
          validStatus,
          dueDate,
          getBahiaDateKey(new Date()),
        )
      ) {
        throw new Error("future_transaction_cannot_be_completed");
      }

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

export async function editTransaction(id: string, rawData: unknown) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const activeWorkspace = await getValidatedActiveWorkspace(user.uid);
  const workspaceId = activeWorkspace?.id;
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  try {
    const participantIds = getWorkspaceParticipantIds(
      activeWorkspace?.data || {},
      user.uid,
    );
    const normalized = normalizeTransactionAllocation(
      validation.data,
      user.uid,
      participantIds,
    );
    if (!normalized.success) return normalized;
    const todayKey = getBahiaDateKey(new Date());
    const data = normalizeTransactionDateStatus(normalized.data, todayKey);

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

      const recurrenceSnapshot = currentData.recurrenceGroupId
        ? await transaction.get(
            collection.where(
              "recurrenceGroupId",
              "==",
              currentData.recurrenceGroupId,
            ),
          )
        : null;

      const currentAccountId =
        typeof currentData.accountId === "string"
          ? currentData.accountId
          : null;
      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [
          currentAccountId,
          data.accountId,
          ...(recurrenceSnapshot?.docs.map((document) => {
            const accountId = document.data().accountId;
            return typeof accountId === "string" ? accountId : null;
          }) || []),
        ],
      );
      assertActiveAccount(accounts, data.accountId);
      const fundedData = resolveTransactionFunding(
        data,
        accounts,
        user.uid,
        participantIds,
      );
      const balanceChanges = new Map<string, number>();
      const shouldCreateRecurrence =
        fundedData.isRecurrent &&
        fundedData.type === "expense" &&
        !currentData.recurrenceGroupId;

      if (shouldCreateRecurrence) {
        const recurrenceCount = fundedData.recurrenceMonths;
        const recurrenceGroupId = collection.doc().id;
        const firstChanges = {
          ...buildEditableTransactionFields(
            fundedData,
            typeof currentData.linkedInvestmentId === "string"
              ? currentData.linkedInvestmentId
              : null,
          ),
          isRecurrent: true,
          recurrenceMonths: recurrenceCount,
          recurrenceGroupId,
          recurrenceIndex: 1,
          recurrenceTotal: recurrenceCount,
          recurrenceActive: true,
          paidAt: fundedData.status === "paid" ? new Date() : null,
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
            const occurrenceDueDate = addMonthsToDateKey(
              data.dueDate,
              index + 1,
            );
            const occurrenceStatus = getRecurringOccurrenceStatus(
              getStatusAfterDateChange(
                data.status,
                occurrenceDueDate,
                todayKey,
              ),
              index + 1,
            );
            const record = {
              ...buildBaseTransaction(
                { ...fundedData, status: occurrenceStatus },
                user,
              ),
              dueDate: occurrenceDueDate,
              recurrenceGroupId,
              recurrenceIndex: index + 2,
              recurrenceTotal: recurrenceCount,
              recurrenceActive: true,
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
        fundedData,
        typeof currentData.linkedInvestmentId === "string"
          ? currentData.linkedInvestmentId
          : null,
      );
      if (recurrenceSnapshot) {
        const { startIndex: selectedIndex, endIndex: recurrenceTotal } =
          getRecurrenceEditRange(
            Number(currentData.recurrenceIndex) || 1,
            fundedData.recurrenceMonths,
          );
        const recurrenceDuration = fundedData.recurrenceMonths;
        const recurrenceGroupId = String(currentData.recurrenceGroupId);
        const paidOutsideRange = recurrenceSnapshot.docs.some((occurrence) => {
          const value = occurrence.data();
          return (
            !value.deletedAt &&
            value.status === "paid" &&
            Number(value.recurrenceIndex) > recurrenceTotal
          );
        });
        if (paidOutsideRange) throw new Error("recurrence_paid_outside_range");
        const activeByIndex = new Map<number, FirebaseFirestore.QueryDocumentSnapshot>();

        for (const occurrence of recurrenceSnapshot.docs) {
          const before = occurrence.data();
          if (before.deletedAt) continue;
          const occurrenceIndex = Number(before.recurrenceIndex) || selectedIndex;
          activeByIndex.set(occurrenceIndex, occurrence);

          if (before.status === "paid") continue;

          if (occurrenceIndex > recurrenceTotal) {
            if (before.status === "paid") continue;
            const deletedAt = new Date();
            const occurrenceAfter = {
              ...before,
              deletedAt,
              deletedBy: user.uid,
            };
            mergeBalanceChanges(
              balanceChanges,
              calculateStoredTransactionBalanceChanges(
                before,
                occurrenceAfter,
                accounts,
              ),
            );
            transaction.update(occurrence.ref, {
              deletedAt,
              deletedBy: user.uid,
            });
            transaction.set(
              workspaceRef.collection("auditLogs").doc(),
              buildAuditRecord({
                action: "deleted",
                user,
                transactionId: occurrence.id,
                before,
                after: occurrenceAfter,
              }),
            );
            continue;
          }

          const occurrenceChanges = {
            ...changes,
            dueDate:
              occurrenceIndex < selectedIndex
                ? before.dueDate
                : addMonthsToDateKey(
                    fundedData.dueDate,
                    occurrenceIndex - selectedIndex,
                  ),
            status: "pending",
            paidAt: null,
            isRecurrent: true,
            recurrenceMonths: recurrenceDuration,
            recurrenceGroupId,
            recurrenceIndex: occurrenceIndex,
            recurrenceTotal,
            recurrenceActive: true,
          };
          const occurrenceAfter = { ...before, ...occurrenceChanges };
          mergeBalanceChanges(
            balanceChanges,
            calculateStoredTransactionBalanceChanges(
              before,
              occurrenceAfter,
              accounts,
            ),
          );
          transaction.update(occurrence.ref, occurrenceChanges);
          transaction.set(
            workspaceRef.collection("auditLogs").doc(),
            buildAuditRecord({
              action: "updated",
              user,
              transactionId: occurrence.id,
              before,
              after: occurrenceAfter,
            }),
          );
        }

        for (let occurrenceIndex = selectedIndex; occurrenceIndex <= recurrenceTotal; occurrenceIndex += 1) {
          if (activeByIndex.has(occurrenceIndex)) continue;
          const transactionRef = collection.doc();
          const occurrenceDueDate = addMonthsToDateKey(
            fundedData.dueDate,
            occurrenceIndex - selectedIndex,
          );
          const occurrenceStatus = getRecurringOccurrenceStatus(
            getStatusAfterDateChange(fundedData.status, occurrenceDueDate, todayKey),
            occurrenceIndex - selectedIndex,
          );
          const record = {
            ...buildBaseTransaction(
              { ...fundedData, status: occurrenceStatus },
              user,
            ),
            dueDate: occurrenceDueDate,
            recurrenceMonths: recurrenceDuration,
            recurrenceGroupId,
            recurrenceIndex: occurrenceIndex,
            recurrenceTotal,
            recurrenceActive: true,
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
        }

        writeAccountBalanceChanges(transaction, accounts, balanceChanges);
        return recurrenceDuration;
      }

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

function normalizeTransactionDateStatus(
  data: TransactionInput,
  todayKey: string,
): TransactionInput {
  const status = getStatusAfterDateChange(
    data.status,
    data.dueDate,
    todayKey,
  );
  return status === data.status ? data : { ...data, status };
}

async function repairFutureCompletedTransactions(
  workspaceRef: FirebaseFirestore.DocumentReference,
  documents: FirebaseFirestore.QueryDocumentSnapshot[],
  user: { uid: string; name?: string; email?: string },
  todayKey: string,
) {
  const candidates = documents.filter((document) => {
    const data = document.data();
    return (
      !data.deletedAt &&
      typeof data.dueDate === "string" &&
      isFutureCompletedTransaction(
        data.status === "paid" ? "paid" : "pending",
        data.dueDate,
        todayKey,
      )
    );
  });

  // The documents came from the screen's existing query. Only candidates are
  // re-read transactionally, avoiding a second scan of the collection.
  let repairedCount = 0;
  for (let index = 0; index < candidates.length; index += 100) {
    const chunk = candidates.slice(index, index + 100);
    repairedCount += await runAccountBalanceTransaction(
      workspaceRef,
      async (transaction) => {
        const currentDocuments = await Promise.all(
          chunk.map((document) => transaction.get(document.ref)),
        );
        const repairableDocuments = currentDocuments.filter((document) => {
          const data = document.data() || {};
          return (
            document.exists &&
            !data.deletedAt &&
            typeof data.dueDate === "string" &&
            isFutureCompletedTransaction(
              data.status === "paid" ? "paid" : "pending",
              data.dueDate,
              todayKey,
            )
          );
        });
        if (!repairableDocuments.length) return 0;

        const accountIds = repairableDocuments.map((document) => {
          const accountId = document.data()?.accountId;
          return typeof accountId === "string" ? accountId : null;
        });
        const accounts = await readAccountBalanceStates(
          transaction,
          workspaceRef,
          accountIds,
        );
        const balanceChanges = new Map<string, number>();

        for (const document of repairableDocuments) {
          const before = document.data() || {};
          const after = { ...before, status: "pending", paidAt: null };
          const accountId =
            typeof before.accountId === "string" ? before.accountId : null;

          if (!accountId || accounts.has(accountId)) {
            mergeBalanceChanges(
              balanceChanges,
              calculateStoredTransactionBalanceChanges(before, after, accounts),
            );
          }
          transaction.update(document.ref, { status: "pending", paidAt: null });
          transaction.set(
            workspaceRef.collection("auditLogs").doc(),
            buildAuditRecord({
              action: "status_changed",
              user,
              transactionId: document.id,
              before,
              after,
            }),
          );
        }

        writeAccountBalanceChanges(transaction, accounts, balanceChanges);
        return repairableDocuments.length;
      },
    );
  }
  return repairedCount;
}

function getAccountMutationError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("expense_funding:")) {
    return message.slice("expense_funding:".length);
  }
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
  if (message === "future_transaction_cannot_be_completed") {
    return "Movimentações futuras permanecem pendentes até a data informada.";
  }
  if (message === "recurrence_paid_outside_range") {
    return "A duração não pode terminar antes de uma ocorrência já paga.";
  }
  return fallback;
}

function toClientTransaction(
  document: FirebaseFirestore.QueryDocumentSnapshot,
  todayKey: string,
): Transaction {
  const data = document.data();
  const amount = Number(data.amount);
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : "";
  const storedStatus = data.status === "paid" ? "paid" : "pending";
  const status = getStatusAfterDateChange(storedStatus, dueDate, todayKey);
  return {
    id: document.id,
    description:
      typeof data.description === "string" ? data.description : "Movimentação",
    amount: Number.isFinite(amount) ? amount : 0,
    type: data.type === "income" ? "income" : "expense",
    category: typeof data.category === "string" ? data.category : "Outros",
    status,
    dueDate,
    paidAt:
      status === "paid" ? toOptionalIsoString(data.paidAt) : undefined,
    userId: typeof data.userId === "string" ? data.userId : "",
    userName:
      typeof data.userName === "string" ? data.userName : "Participante",
    pixCode: optionalString(data.pixCode),
    barCode: optionalString(data.barCode),
    observation: optionalString(data.observation),
    accountId: optionalString(data.accountId),
    linkedInvestmentId: optionalString(data.linkedInvestmentId),
    isRecurrent: Boolean(data.isRecurrent),
    recurrenceMonths: optionalNumber(data.recurrenceMonths),
    recurrenceGroupId: optionalString(data.recurrenceGroupId),
    recurrenceIndex: optionalNumber(data.recurrenceIndex),
    recurrenceTotal: optionalNumber(data.recurrenceTotal),
    recurrenceActive:
      typeof data.recurrenceActive === "boolean"
        ? data.recurrenceActive
        : undefined,
    scope:
      data.scope === "individual" || data.scope === "shared"
        ? data.scope
        : undefined,
    fundingSource:
      data.fundingSource === "participant" || data.fundingSource === "joint"
        ? data.fundingSource
        : undefined,
    paidByUserId: optionalString(data.paidByUserId),
    responsibleUserId: optionalString(data.responsibleUserId),
    beneficiaryUserIds: optionalStringArray(data.beneficiaryUserIds),
    splitMethod:
      data.splitMethod === "equal" || data.splitMethod === "custom"
        ? data.splitMethod
        : undefined,
    shares: parseExpenseShares(data.shares),
    createdAt: toOptionalIsoString(data.createdAt) || new Date().toISOString(),
    deletedAt: toOptionalIsoString(data.deletedAt),
    deletedBy: optionalString(data.deletedBy),
  };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toOptionalIsoString(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return typeof value === "string" && value ? value : undefined;
}
function getWorkspaceParticipantIds(
  workspace: Record<string, unknown>,
  actorUserId: string,
) {
  const memberIds = Array.isArray(workspace.memberIds)
    ? workspace.memberIds.filter((value): value is string => typeof value === "string")
    : [];
  const legacyMemberIds = Array.isArray(workspace.members)
    ? workspace.members
        .map(getWorkspaceMemberId)
        .filter((value): value is string => typeof value === "string")
    : [];

  return [...new Set([
    actorUserId,
    ...(typeof workspace.ownerId === "string" ? [workspace.ownerId] : []),
    ...memberIds,
    ...legacyMemberIds,
  ])];
}

function normalizeTransactionAllocation(
  data: TransactionInput,
  actorUserId: string,
  participantIds: string[],
):
  | { success: true; data: TransactionInput }
  | { success: false; error: string } {
  if (data.type !== "expense") {
    return {
      success: true,
      data: {
        ...data,
        scope: null,
        fundingSource: null,
        paidByUserId: null,
        responsibleUserId: null,
        beneficiaryUserIds: [],
        splitMethod: null,
        shares: [],
      },
    };
  }

  const result = resolveExpenseAllocation({
    amountCents: moneyToCents(data.amount),
    actorUserId,
    participantIds,
    request: data,
  });
  if (!result.success) return result;

  return {
    success: true,
    data: {
      ...data,
      ...result.allocation,
    },
  };
}

function resolveTransactionFunding(
  data: TransactionInput,
  accounts: ReadonlyMap<string, AccountBalanceState>,
  actorUserId: string,
  participantIds: string[],
): TransactionInput {
  if (data.type !== "expense") return data;

  const result = resolveExpenseFunding({
    account: data.accountId ? accounts.get(data.accountId) : null,
    actorUserId,
    participantIds,
    requestedFundingSource: data.fundingSource,
    requestedPaidByUserId: data.paidByUserId,
  });
  if (!result.success) {
    throw new Error(`expense_funding:${result.error}`);
  }

  return { ...data, ...result.funding };
}

function optionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item),
  );
}

function parseExpenseShares(value: unknown): NonNullable<Transaction["shares"]> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const userId = "userId" in item ? item.userId : null;
    const amountCents = "amountCents" in item ? Number(item.amountCents) : 0;
    if (
      typeof userId !== "string" ||
      !userId ||
      !Number.isInteger(amountCents) ||
      amountCents <= 0
    ) {
      return [];
    }
    return [{ userId, amountCents }];
  });
}
