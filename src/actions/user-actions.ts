"use server";

import { db } from "@/lib/firebase-admin"; 
import { getAuthenticatedUser } from "@/lib/server/action-context";
import { isSameIdentity } from "@/lib/security/authorization";

export async function getFinancialCyclePreferences() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return null;
    const snapshot = await db.collection("users").doc(user.uid).get();
    const cycle = snapshot.data()?.financialCycle;
    if (!cycle) return null;
    return { startDay: Number(cycle.startDay), endDay: Number(cycle.endDay) };
  } catch {
    return null;
  }
}

export async function updateFinancialCyclePreferences(startDay: number, endDay: number) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Sessão inválida." };
  const safeStart = Math.max(1, Math.min(28, Math.round(Number(startDay))));
  const safeEnd = Math.max(1, Math.min(31, Math.round(Number(endDay))));
  await db.collection("users").doc(user.uid).set({
    financialCycle: { startDay: safeStart, endDay: safeEnd, updatedAt: new Date() },
  }, { merge: true });
  return { success: true, startDay: safeStart, endDay: safeEnd };
}

export async function deleteFullAccountData(uid: string) {
  const user = await getAuthenticatedUser();
  if (!user || !isSameIdentity(user.uid, uid)) {
    return { success: false, error: "Sessão inválida" };
  }

  try {
    const ownedWorkspacesSnapshot = await db
      .collection("workspaces")
      .where("ownerId", "==", uid)
      .get();

    for (const workspaceDocument of ownedWorkspacesSnapshot.docs) {
      await db.recursiveDelete(workspaceDocument.ref);
    }
    await db.collection("users").doc(uid).delete();

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível excluir os dados.",
    };
  }
}
