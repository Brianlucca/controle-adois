"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser, getValidatedActiveWorkspaceId } from "@/lib/server/action-context";

const GoalSchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetAmount: z.coerce.number().positive().max(1_000_000_000),
  currentAmount: z.coerce.number().min(0).max(1_000_000_000),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function context() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const workspaceId = await getValidatedActiveWorkspaceId(user.uid);
  return workspaceId ? { user, workspaceId } : null;
}

export async function getFinancialGoals() {
  try {
    const ctx = await context();
    if (!ctx) return [];
    const snapshot = await adminDb.collection("workspaces").doc(ctx.workspaceId)
      .collection("goals").orderBy("targetDate", "asc").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data, id: doc.id, createdAt: data.createdAt?.toDate?.().toISOString() || "" };
    });
  } catch {
    return [];
  }
}

export async function saveFinancialGoal(raw: unknown, id?: string) {
  const ctx = await context();
  if (!ctx) return { success: false, error: "Sessão inválida." };
  const parsed = GoalSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const collection = adminDb.collection("workspaces").doc(ctx.workspaceId).collection("goals");
  if (id) {
    await collection.doc(id).update({ ...parsed.data, updatedAt: new Date() });
    return { success: true, id };
  }
  const ref = await collection.add({ ...parsed.data, createdAt: new Date(), createdBy: ctx.user.uid });
  return { success: true, id: ref.id };
}

export async function deleteFinancialGoal(id: string) {
  const ctx = await context();
  if (!ctx || !id) return { success: false };
  await adminDb.collection("workspaces").doc(ctx.workspaceId).collection("goals").doc(id).delete();
  return { success: true };
}
