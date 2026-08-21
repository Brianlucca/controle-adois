import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import { isWorkspaceMember } from "@/lib/workspace/membership";

const ACTIVE_WORKSPACE_COOKIE = "active_workspace";

export async function setActiveWorkspaceCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, id, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function clearActiveWorkspaceCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
}

export async function persistActiveWorkspace(userId: string, workspaceId: string) {
  await setActiveWorkspaceCookie(workspaceId);
  await adminDb.collection("users").doc(userId).set({ workspaceId }, { merge: true });
}

export async function clearPersistedActiveWorkspace(userId: string) {
  await clearActiveWorkspaceCookie();
  await adminDb
    .collection("users")
    .doc(userId)
    .set({ workspaceId: FieldValue.delete() }, { merge: true });
}

export async function getFallbackWorkspaceId(
  userId: string,
  excludeWorkspaceId?: string
) {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const savedWorkspaceId = userDoc.data()?.workspaceId;

  if (savedWorkspaceId && savedWorkspaceId !== excludeWorkspaceId) {
    const savedDoc = await adminDb.collection("workspaces").doc(savedWorkspaceId).get();
    if (savedDoc.exists && isWorkspaceMember(savedDoc.data(), userId)) {
      return savedWorkspaceId;
    }
  }

  const personalSnapshot = await adminDb
    .collection("workspaces")
    .where("ownerId", "==", userId)
    .where("type", "==", "personal")
    .get();

  const personal = personalSnapshot.docs.find(
    (doc) => doc.id !== excludeWorkspaceId
  );
  if (personal) return personal.id;

  const memberSnapshot = await adminDb
    .collection("workspaces")
    .where("memberIds", "array-contains", userId)
    .limit(5)
    .get();
  const available = memberSnapshot.docs.find((doc) => doc.id !== excludeWorkspaceId);

  return available?.id || null;
}

export async function getActiveWorkspaceId(userId?: string) {
  const cookieStore = await cookies();
  const cookieWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (!userId) return null;

  if (cookieWorkspaceId) {
    const cookieDoc = await adminDb
      .collection("workspaces")
      .doc(cookieWorkspaceId)
      .get();

    if (cookieDoc.exists && isWorkspaceMember(cookieDoc.data(), userId)) {
      return cookieWorkspaceId;
    }

    cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
  }

  const fallbackId = await getFallbackWorkspaceId(userId, cookieWorkspaceId);
  if (fallbackId) await persistActiveWorkspace(userId, fallbackId);

  return fallbackId;
}

export async function getValidatedActiveWorkspaceId(userId: string) {
  try {
    return await getActiveWorkspaceId(userId);
  } catch {
    return null;
  }
}
