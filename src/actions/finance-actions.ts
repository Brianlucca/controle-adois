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
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const recurrenceCount = data.isRecurrent && data.type === "expense" ? data.recurrenceMonths : 1;
    const recurrenceGroupId = data.isRecurrent ? collection.doc().id : null;
    const batch = adminDb.batch();
    const createdTransactions: any[] = [];

    Array.from({ length: recurrenceCount }).forEach((_, index) => {
      const transactionRef = collection.doc();
      const record = {
        ...buildBaseTransaction(data, user),
        dueDate: index === 0 ? data.dueDate : addMonthsToDateKey(data.dueDate, index),
        recurrenceGroupId,
        recurrenceIndex: index + 1,
        recurrenceTotal: recurrenceCount,
      };
      batch.set(transactionRef, record);
      batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({
        action: "created", user, transactionId: transactionRef.id, after: record,
      }));
      createdTransactions.push({
        ...record,
        id: transactionRef.id,
        createdAt: record.createdAt.toISOString(),
        paidAt: record.paidAt?.toISOString() || undefined,
      });
    });

    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: recurrenceCount, transactions: createdTransactions };
  } catch (error) {
    return { success: false, error: "Erro interno ao salvar." };
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
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    let batch = adminDb.batch();
    let operationCount = 0;

    for (const item of validation.data) {
      const transactionRef = collection.doc();
      const record = {
        ...buildBaseTransaction(item, user),
        importedAt: new Date(),
      };
      batch.set(transactionRef, record);
      batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({
        action: "imported", user, transactionId: transactionRef.id, after: record,
      }));
      operationCount += 2;

      if (operationCount >= 440) {
        await batch.commit();
        batch = adminDb.batch();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: validation.data.length };
  } catch (error) {
    return { success: false, error: "Erro ao importar transações." };
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
    const current = await transactionRef.get();
    if (!current.exists) return { success: false, error: "Transação não encontrada." };
    if (current.data()?.deletedAt) {
      return { success: false, error: "Esta transação já está na lixeira." };
    }
    const batch = adminDb.batch();
    const deletedAt = new Date();
    batch.update(transactionRef, { deletedAt, deletedBy: user.uid });
    batch.set(workspaceRef.collection("auditLogs").doc(), buildAuditRecord({ action: "deleted", user, transactionId: id, before: current.data() || null, after: { ...current.data(), deletedAt, deletedBy: user.uid } }));
    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao excluir." };
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
    const current = await transactionRef.get();
    if (!current.exists) return { success: false, error: "Transação não encontrada." };
    if (current.data()?.deletedAt) {
      return { success: false, error: "Restaure a transação antes de alterar o status." };
    }
    const changes = {
      status: validStatus,
      paidAt: validStatus === "paid" ? new Date() : null,
    };
    const batch = adminDb.batch();
    batch.update(transactionRef, changes);
    batch.set(workspaceRef.collection("auditLogs").doc(), buildAuditRecord({ action: "status_changed", user, transactionId: id, before: current.data() || null, after: { ...current.data(), ...changes } }));
    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.code === 8 ? "Cota do banco temporariamente esgotada." : "Não foi possível atualizar o status." };
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
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const docRef = collection.doc(id);
    const currentDoc = await docRef.get();
    if (!currentDoc.exists) {
      return { success: false, error: "Transação não encontrada." };
    }
    const currentData = currentDoc.data();
    if (currentData?.deletedAt) {
      return { success: false, error: "Restaure a transação antes de editá-la." };
    }
    const shouldCreateRecurrence =
      data.isRecurrent &&
      data.type === "expense" &&
      !currentData?.recurrenceGroupId;

    if (shouldCreateRecurrence) {
      const recurrenceCount = data.recurrenceMonths;
      const recurrenceGroupId = collection.doc().id;
      const batch = adminDb.batch();

      const firstChanges = {
        ...buildEditableTransactionFields(
          data,
          currentData?.linkedInvestmentId
        ),
        isRecurrent: true,
        recurrenceMonths: recurrenceCount,
        recurrenceGroupId,
        recurrenceIndex: 1,
        recurrenceTotal: recurrenceCount,
        paidAt: data.status === "paid" ? new Date() : null,
      };
      batch.update(docRef, firstChanges);
      batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "updated", user, transactionId: id, before: currentData || null, after: { ...currentData, ...firstChanges } }));

      Array.from({ length: Math.max(0, recurrenceCount - 1) }).forEach((_, index) => {
        const transactionRef = collection.doc();
        const record = {
          ...buildBaseTransaction(data, user),
          dueDate: addMonthsToDateKey(data.dueDate, index + 1),
          recurrenceGroupId,
          recurrenceIndex: index + 2,
          recurrenceTotal: recurrenceCount,
        };
        batch.set(transactionRef, record);
        batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "created", user, transactionId: transactionRef.id, after: record }));
      });

      await batch.commit();

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/reports");
      return { success: true, count: recurrenceCount };
    }

    const changes = buildEditableTransactionFields(data, currentData?.linkedInvestmentId);
    const batch = adminDb.batch();
    batch.update(docRef, changes);
    batch.set(collection.parent!.collection("auditLogs").doc(), buildAuditRecord({ action: "updated", user, transactionId: id, before: currentData || null, after: { ...currentData, ...changes } }));
    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao atualizar." };
  }
}
