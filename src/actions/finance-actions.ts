"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";

const TransactionSchema = z.object({
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres").max(200),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  category: z.string().min(1, "A categoria é obrigatória"),
  type: z.enum(["income", "expense"]),
  status: z.enum(["paid", "pending"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida (Use YYYY-MM-DD)"),
  pixCode: z.string().optional().nullable(),
  barCode: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  linkedInvestmentId: z.string().optional().nullable(),
  isRecurrent: z.boolean().optional().default(false),
  recurrenceMonths: z.coerce.number().int().min(1).max(60).optional().default(12),
});

const StatusSchema = z.enum(["paid", "pending"]);
const ImportTransactionsSchema = z.array(TransactionSchema).min(1).max(5000);

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) return null;

    try {
      return await getAuth().verifySessionCookie(sessionCookie, true);
    } catch {
      return await getAuth().verifyIdToken(sessionCookie, true);
    }
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

function addMonths(dateStr: string, months: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().split("T")[0];
}

function getBaseTransaction(data: z.infer<typeof TransactionSchema>, user: any) {
  return {
    ...data,
    userId: user.uid,
    userName: user.name || user.email || "Usuário",
    createdAt: new Date(),
    pixCode: data.pixCode || null,
    barCode: data.barCode || null,
    observation: data.observation || null,
    linkedInvestmentId: data.linkedInvestmentId || null,
    isRecurrent: data.isRecurrent || false,
    recurrenceMonths: data.isRecurrent ? data.recurrenceMonths : null,
  };
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

    return snapshot.docs.map((doc) => {
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
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const recurrenceCount = data.isRecurrent && data.type === "expense" ? data.recurrenceMonths : 1;
    const recurrenceGroupId = data.isRecurrent ? collection.doc().id : null;
    const batch = adminDb.batch();

    Array.from({ length: recurrenceCount }).forEach((_, index) => {
      batch.set(collection.doc(), {
        ...getBaseTransaction(data, user),
        dueDate: index === 0 ? data.dueDate : addMonths(data.dueDate, index),
        recurrenceGroupId,
        recurrenceIndex: index + 1,
        recurrenceTotal: recurrenceCount,
      });
    });

    await batch.commit();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    return { success: true, count: recurrenceCount };
  } catch (error) {
    return { success: false, error: "Erro interno ao salvar." };
  }
}

export async function importTransactions(rawItems: any[]) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getActiveWorkspaceId(user.uid);
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
      batch.set(collection.doc(), {
        ...getBaseTransaction(item, user),
        importedAt: new Date(),
      });
      operationCount += 1;

      if (operationCount === 450) {
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

export async function deleteRecurrence(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return await handleAuthFailure();

  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false, error: "Workspace não encontrado." };

  try {
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const doc = await collection.doc(id).get();
    if (!doc.exists) return { success: false, error: "Transação não encontrada." };

    const data = doc.data();
    const recurrenceGroupId = data?.recurrenceGroupId;

    if (!recurrenceGroupId) {
      await collection.doc(id).update({
        isRecurrent: false,
        recurrenceMonths: null,
        recurrenceGroupId: null,
        recurrenceIndex: null,
        recurrenceTotal: null,
      });
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      return { success: true, count: 1 };
    }

    const snapshot = await collection.where("recurrenceGroupId", "==", recurrenceGroupId).get();
    const batch = adminDb.batch();
    let deletedCount = 0;

    snapshot.docs.forEach((transactionDoc) => {
      if (transactionDoc.data().status === "pending") {
        batch.delete(transactionDoc.ref);
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

  const workspaceId = await getActiveWorkspaceId(user.uid);
  if (!workspaceId) return { success: false };

  const validation = StatusSchema.safeParse(status);
  if (!validation.success) return { success: false, error: "Status invalido" };
  const validStatus = validation.data;

  try {
    await adminDb.collection("workspaces").doc(workspaceId).collection("transactions").doc(id).update({
      status: validStatus,
      paidAt: validStatus === "paid" ? new Date() : null,
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
  if (!workspaceId) return { success: false, error: "Workspace nao encontrado." };

  const validation = TransactionSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }
  const data = validation.data;

  try {
    const collection = adminDb.collection("workspaces").doc(workspaceId).collection("transactions");
    const docRef = collection.doc(id);
    const currentDoc = await docRef.get();
    const currentData = currentDoc.data();
    const shouldCreateRecurrence =
      data.isRecurrent &&
      data.type === "expense" &&
      !currentData?.recurrenceGroupId;

    if (shouldCreateRecurrence) {
      const recurrenceCount = data.recurrenceMonths;
      const recurrenceGroupId = collection.doc().id;
      const batch = adminDb.batch();

      batch.update(docRef, {
        description: data.description,
        amount: data.amount,
        category: data.category,
        type: data.type,
        status: data.status,
        dueDate: data.dueDate,
        pixCode: data.pixCode || null,
        barCode: data.barCode || null,
        observation: data.observation || null,
        linkedInvestmentId: data.linkedInvestmentId || currentData?.linkedInvestmentId || null,
        isRecurrent: true,
        recurrenceMonths: recurrenceCount,
        recurrenceGroupId,
        recurrenceIndex: 1,
        recurrenceTotal: recurrenceCount,
        paidAt: data.status === "paid" ? new Date() : null,
      });

      Array.from({ length: Math.max(0, recurrenceCount - 1) }).forEach((_, index) => {
        batch.set(collection.doc(), {
          ...getBaseTransaction(data, user),
          dueDate: addMonths(data.dueDate, index + 1),
          recurrenceGroupId,
          recurrenceIndex: index + 2,
          recurrenceTotal: recurrenceCount,
        });
      });

      await batch.commit();

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/reports");
      return { success: true, count: recurrenceCount };
    }

    await docRef.update({
      description: data.description,
      amount: data.amount,
      category: data.category,
      type: data.type,
      status: data.status,
      dueDate: data.dueDate,
      pixCode: data.pixCode || null,
      barCode: data.barCode || null,
      observation: data.observation || null,
      linkedInvestmentId: data.linkedInvestmentId || currentData?.linkedInvestmentId || null,
      isRecurrent: data.isRecurrent || false,
      recurrenceMonths: data.isRecurrent ? data.recurrenceMonths : null,
      paidAt: data.status === "paid" ? new Date() : null,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao atualizar." };
  }
}
