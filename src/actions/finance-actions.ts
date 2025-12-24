"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) return null;

    const decodedClaims = await getAuth().verifyIdToken(sessionCookie, true); 
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

async function getActiveWorkspaceId(uid: string) {
  try {
    const cookieStore = await cookies();
    let workspaceId = cookieStore.get("active_workspace")?.value;

    if (!workspaceId) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      workspaceId = userDoc.data()?.workspaceId;
    }

    return workspaceId || null;
  } catch (error) {
    return null;
  }
}

export async function getTransactions(uid: string, startDate: string, endDate: string) {
  const workspaceId = await getActiveWorkspaceId(uid);
  if (!workspaceId) return [];

  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("transactions")
      .where("dueDate", ">=", startDate)
      .where("dueDate", "<=", endDate)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        dueDate: data.dueDate || "", 
        paidAt: data.paidAt?.toDate?.().toISOString() || data.paidAt
      };
    }) as any[];
  } catch (error) {
    return [];
  }
}

export async function addTransaction(data: any) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "unauthenticated" };

  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Nenhum workspace selecionado." };

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").add({
      ...data,
      userId: user.uid,
      userName: user.name || user.email || "Usuário",
      createdAt: new Date(),
      pixCode: data.pixCode || null,
      barCode: data.barCode || null,
      observation: data.observation || null,
      isRecurrent: data.isRecurrent || false
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro interno ao salvar." };
  }
}

export async function deleteTransaction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "unauthenticated" };
  
  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).delete();
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao excluir." };
  }
}

export async function updateTransactionStatus(id: string, status: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "unauthenticated" };
  
  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false };

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).update({
      status,
      paidAt: status === 'paid' ? new Date() : null
    });
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}