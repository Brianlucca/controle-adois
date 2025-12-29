"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";

const TransactionSchema = z.object({
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres").max(100),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  category: z.string().min(1, "A categoria é obrigatória"),
  type: z.enum(["income", "expense"]),
  status: z.enum(["paid", "pending"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (Use YYYY-MM-DD)"),
  pixCode: z.string().optional().nullable(),
  barCode: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  isRecurrent: z.boolean().optional().default(false),
});

const StatusSchema = z.enum(["paid", "pending"]);

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

async function handleAuthFailure() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return { success: false, error: "unauthenticated" };
}

export async function getTransactions(uid: string, startDate: string, endDate: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const cookieStore = await cookies();
    cookieStore.delete("__session");
    return [];
  }

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

export async function addTransaction(rawData: any) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Nenhum workspace selecionado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  const data = validation.data;

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
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro interno ao salvar." };
  }
}

export async function deleteTransaction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  
  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).delete();
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao excluir." };
  }
}

export async function updateTransactionStatus(id: string, status: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  
  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false };

  const validation = StatusSchema.safeParse(status);
  if (!validation.success) return { success: false, error: "Status inválido" };
  const validStatus = validation.data;

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).update({
      status: validStatus,
      paidAt: validStatus === 'paid' ? new Date() : null
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function editTransaction(id: string, rawData: any) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();
  
  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  const data = validation.data;

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).update({
      description: data.description,
      amount: data.amount,
      category: data.category,
      type: data.type,
      status: data.status,
      dueDate: data.dueDate,
      pixCode: data.pixCode || null,
      barCode: data.barCode || null,
      observation: data.observation || null,
      isRecurrent: data.isRecurrent || false,
      paidAt: data.status === 'paid' ? new Date() : null
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao atualizar." };
  }
}