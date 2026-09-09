"use server";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser, getValidatedActiveWorkspaceId, handleAuthFailure } from "@/lib/server/action-context";
import { buildAuditRecord } from "@/lib/finance/audit-log";

export async function getAuditLogs(limit = 100) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado.", logs: [] };
  try {
    const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("auditLogs")
      .orderBy("createdAt", "desc").limit(Math.min(limit, 200)).get();
    return { success: true, logs: snapshot.docs.map((doc) => { const data = doc.data(); return { ...data, id: doc.id, createdAt: data.createdAt?.toDate?.().toISOString() || "" }; }) };
  } catch { return { success: false, error: "Não foi possível carregar o histórico.", logs: [] }; }
}

export async function restoreTransaction(transactionId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };
  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const transactionRef = workspaceRef.collection("transactions").doc(transactionId);
    const current = await transactionRef.get();
    if (!current.exists || !current.data()?.deletedAt) return { success: false, error: "Esta transação não está na lixeira." };
    const before = current.data() || {};
    const after = { ...before, deletedAt: null, deletedBy: null };
    const batch = adminDb.batch();
    batch.update(transactionRef, { deletedAt: null, deletedBy: null });
    batch.set(workspaceRef.collection("auditLogs").doc(), buildAuditRecord({ action: "restored", user, transactionId, before, after }));
    await batch.commit();
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch { return { success: false, error: "Não foi possível restaurar a transação." }; }
}
