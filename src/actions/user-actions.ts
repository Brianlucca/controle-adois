"use server";

import { db } from "@/lib/firebase-admin"; 
import { revalidatePath } from "next/cache";

export async function deleteFullAccountData(uid: string) {
  if (!uid) return { success: false, error: "UID inválido" };

  try {
    const batch = db.batch();

    const ownedWorkspacesSnapshot = await db
      .collection("workspaces")
      .where("ownerId", "==", uid)
      .get();

    ownedWorkspacesSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    const userRef = db.collection("users").doc(uid);
    batch.delete(userRef);

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}