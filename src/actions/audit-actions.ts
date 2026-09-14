"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { buildAuditRecord } from "@/lib/finance/audit-log";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspaceId,
  handleAuthFailure,
} from "@/lib/server/action-context";
import {
  calculateStoredTransactionBalanceChanges,
  readAccountBalanceStates,
  runAccountBalanceTransaction,
  writeAccountBalanceChanges,
} from "@/lib/server/account-balance-store";

export async function getAuditLogs(limit = 100) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) {
    return { success: false, error: "Workspace não encontrado.", logs: [] };
  }

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("auditLogs")
      .orderBy("createdAt", "desc")
      .limit(Math.min(limit, 200))
      .get();
    return {
      success: true,
      logs: snapshot.docs.map((document) => {
        const data = document.data();
        return {
          ...data,
          id: document.id,
          createdAt: data.createdAt?.toDate?.().toISOString() || "",
        };
      }),
    };
  } catch {
    return {
      success: false,
      error: "Não foi possível carregar o histórico.",
      logs: [],
    };
  }
}

export async function restoreTransaction(transactionId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) {
    return { success: false, error: "Workspace não encontrado." };
  }

  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const transactionRef = workspaceRef
      .collection("transactions")
      .doc(transactionId);

    await runAccountBalanceTransaction(workspaceRef, async (transaction) => {
      const current = await transaction.get(transactionRef);
      if (!current.exists || !current.data()?.deletedAt) {
        throw new Error("transaction_not_deleted");
      }

      const before = current.data() || {};
      const after = { ...before, deletedAt: null, deletedBy: null };
      const accounts = await readAccountBalanceStates(
        transaction,
        workspaceRef,
        [typeof before.accountId === "string" ? before.accountId : null],
      );
      const balanceChanges = calculateStoredTransactionBalanceChanges(
        before,
        after,
        accounts,
      );

      transaction.update(transactionRef, { deletedAt: null, deletedBy: null });
      transaction.set(
        workspaceRef.collection("auditLogs").doc(),
        buildAuditRecord({
          action: "restored",
          user,
          transactionId,
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
    if (error instanceof Error && error.message === "transaction_not_deleted") {
      return {
        success: false,
        error: "Esta transação não está na lixeira.",
      };
    }
    return {
      success: false,
      error: "Não foi possível restaurar a transação.",
    };
  }
}
