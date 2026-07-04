"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";

async function setActiveWorkspaceCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_workspace", id, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

async function persistActiveWorkspace(userId: string, workspaceId: string) {
  await setActiveWorkspaceCookie(workspaceId);
  await adminDb.collection("users").doc(userId).set({ workspaceId }, { merge: true });
}

function memberId(member: any) {
  return typeof member === "string" ? member : member?.uid;
}

function isWorkspaceMember(data: any, userId: string) {
  return (data?.members || []).some((member: any) => memberId(member) === userId);
}

async function getFallbackWorkspaceId(userId: string, excludeWorkspaceId?: string) {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const savedWorkspaceId = userDoc.data()?.workspaceId;

  if (savedWorkspaceId && savedWorkspaceId !== excludeWorkspaceId) {
    const savedDoc = await adminDb.collection("workspaces").doc(savedWorkspaceId).get();
    if (savedDoc.exists && isWorkspaceMember(savedDoc.data(), userId)) return savedWorkspaceId;
  }

  const personalSnapshot = await adminDb
    .collection("workspaces")
    .where("ownerId", "==", userId)
    .where("type", "==", "personal")
    .get();

  const personal = personalSnapshot.docs.find((doc) => doc.id !== excludeWorkspaceId);
  if (personal) return personal.id;

  const allWorkspaces = await adminDb.collection("workspaces").get();
  const available = allWorkspaces.docs.find((doc) => {
    if (doc.id === excludeWorkspaceId) return false;
    return isWorkspaceMember(doc.data(), userId);
  });

  return available?.id || null;
}

export async function getActiveWorkspaceId(userId?: string) {
  const cookieStore = await cookies();
  const cookieWorkspaceId = cookieStore.get("active_workspace")?.value;

  if (!userId) return null;

  if (cookieWorkspaceId) {
    const cookieDoc = await adminDb.collection("workspaces").doc(cookieWorkspaceId).get();
    if (cookieDoc.exists && isWorkspaceMember(cookieDoc.data(), userId)) return cookieWorkspaceId;

    cookieStore.delete("active_workspace");
  }

  const fallbackId = await getFallbackWorkspaceId(userId, cookieWorkspaceId);
  if (fallbackId) await persistActiveWorkspace(userId, fallbackId);
  return fallbackId;
}

export async function ensurePersonalWorkspace(userId: string, email: string) {
  try {
    const savedWorkspaceId = await getFallbackWorkspaceId(userId);
    if (savedWorkspaceId) {
      await persistActiveWorkspace(userId, savedWorkspaceId);
      return { workspaceId: savedWorkspaceId };
    }

    const workspaceRef = adminDb.collection("workspaces").doc();
    const newMember = { uid: userId, email, role: "admin", canEdit: true };

    await workspaceRef.set({
      ownerId: userId,
      type: "personal",
      name: "Meu Espaço Pessoal",
      members: [newMember],
      budgetLimit: 3000,
      createdAt: new Date(),
    });

    await persistActiveWorkspace(userId, workspaceRef.id);
    return { workspaceId: workspaceRef.id };
  } catch (error) {
    return { error: "Erro interno" };
  }
}

export async function createSharedWorkspace(userId: string, email: string, name: string) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newMember = { uid: userId, email, role: "admin", canEdit: true };

    await workspaceRef.set({
      ownerId: userId,
      type: "shared",
      name,
      inviteCode,
      members: [newMember],
      budgetLimit: 5000,
      createdAt: new Date(),
    });

    await persistActiveWorkspace(userId, workspaceRef.id);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao criar grupo." };
  }
}

export async function joinWorkspace(userId: string, email: string, inviteCode: string) {
  try {
    const querySnapshot = await adminDb
      .collection("workspaces")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();

    if (querySnapshot.empty) return { success: false, error: "Código de convite inválido." };

    const workspaceDoc = querySnapshot.docs[0];
    const workspaceId = workspaceDoc.id;
    const workspaceData = workspaceDoc.data();

    if (isWorkspaceMember(workspaceData, userId)) {
      return { success: false, error: "Você já está neste grupo." };
    }

    const newMember = { uid: userId, email, role: "member", canEdit: true };
    await adminDb.collection("workspaces").doc(workspaceId).update({
      members: FieldValue.arrayUnion(newMember),
    });

    await persistActiveWorkspace(userId, workspaceId);
    return { success: true, message: "Você entrou no grupo!" };
  } catch (error) {
    return { success: false, error: "Erro interno." };
  }
}

export async function getUserWorkspaces(userId: string) {
  const allWorkspaces = await adminDb.collection("workspaces").get();

  return allWorkspaces.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as any))
    .filter((workspace) => isWorkspaceMember(workspace, userId))
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type || "shared",
      isOwner: workspace.ownerId === userId,
    }));
}

export async function switchActiveWorkspace(workspaceId: string, userId?: string) {
  if (!userId) return { success: false, error: "UsuÃ¡rio nÃ£o autenticado." };

  const doc = await adminDb.collection("workspaces").doc(workspaceId).get();
  if (!doc.exists || !isWorkspaceMember(doc.data(), userId)) {
    return { success: false, error: "VocÃª nÃ£o faz parte deste workspace." };
  }

  await setActiveWorkspaceCookie(workspaceId);
  await adminDb.collection("users").doc(userId).set({ workspaceId }, { merge: true });
  return { success: true };
}

export async function setPrimaryWorkspace(userId: string, workspaceId: string, makePersonal = false) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();

    if (!doc.exists) return { success: false, error: "Workspace não encontrado." };
    const data = doc.data();
    if (!isWorkspaceMember(data, userId)) return { success: false, error: "Você não faz parte deste workspace." };

    if (makePersonal) {
      if (data?.ownerId !== userId) {
        return { success: false, error: "Apenas o dono pode transformar em espaço pessoal." };
      }

      const oldPersonal = await adminDb
        .collection("workspaces")
        .where("ownerId", "==", userId)
        .where("type", "==", "personal")
        .get();

      const batch = adminDb.batch();
      oldPersonal.docs.forEach((personalDoc) => {
        if (personalDoc.id !== workspaceId) batch.update(personalDoc.ref, { type: "shared" });
      });
      batch.update(wsRef, {
        type: "personal",
        inviteCode: data?.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      await batch.commit();
    }

    await persistActiveWorkspace(userId, workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao definir workspace principal." };
  }
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();
    if (!doc.exists) return { success: false, error: "Grupo não existe" };

    const data = doc.data();
    if (data?.type === "personal") return { success: false, error: "Você não pode sair do seu espaço pessoal." };
    if (data?.ownerId === userId) return { success: false, error: "Dono não pode sair. Exclua o grupo ou transfira a posse." };

    const updatedMembers = (data?.members || []).filter((member: any) => memberId(member) !== userId);
    await wsRef.update({ members: updatedMembers });

    const fallbackId = await getFallbackWorkspaceId(userId, workspaceId);
    if (fallbackId) await persistActiveWorkspace(userId, fallbackId);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao sair." };
  }
}

export async function updateMemberPermissions(workspaceId: string, userId: string, memberUid: string, permissions: any) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();
    if (!doc.exists) return { success: false };
    if (doc.data()?.ownerId !== userId) return { success: false };

    const members = doc.data()?.members || [];
    const updatedMembers = members.map((member: any) => {
      if (memberId(member) === memberUid && typeof member === "object") {
        return { ...member, ...permissions };
      }
      return member;
    });

    await wsRef.update({ members: updatedMembers });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateWorkspaceSettings(userId: string, settings: { budgetLimit: number }) {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) return { success: false, error: "Nenhum workspace ativo" };

  await adminDb.collection("workspaces").doc(workspaceId).update({ budgetLimit: settings.budgetLimit });
  return { success: true };
}

export async function updateWorkspaceName(userId: string, newName: string) {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) return { success: false, error: "Nenhum workspace ativo" };

  await adminDb.collection("workspaces").doc(workspaceId).update({ name: newName });
  return { success: true };
}

export async function getWorkspaceDetails(userId: string) {
  let workspaceId = await getActiveWorkspaceId();

  if (!workspaceId) {
    workspaceId = await getFallbackWorkspaceId(userId);
    if (workspaceId) await persistActiveWorkspace(userId, workspaceId);
    else return null;
  }

  let doc = await adminDb.collection("workspaces").doc(workspaceId).get();
  if (!doc.exists || !isWorkspaceMember(doc.data(), userId)) {
    workspaceId = await getFallbackWorkspaceId(userId, workspaceId);
    if (!workspaceId) return null;
    await persistActiveWorkspace(userId, workspaceId);
    doc = await adminDb.collection("workspaces").doc(workspaceId).get();
  }

  const data = doc.data();
  return {
    id: doc.id,
    name: data?.name,
    type: data?.type,
    members: data?.members || [],
    budgetLimit: data?.budgetLimit || 3000,
    inviteCode: data?.inviteCode,
    ownerId: data?.ownerId,
  };
}

export async function deleteWorkspace(userId: string, workspaceId: string) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();

    if (!doc.exists) return { success: false, error: "Workspace não encontrado." };
    const data = doc.data();

    if (data?.ownerId !== userId) {
      return { success: false, error: "Permissão negada. Apenas o dono pode excluir o grupo." };
    }

    const fallbackWorkspaceId = await getFallbackWorkspaceId(userId, workspaceId);
    if (data?.type === "personal" && !fallbackWorkspaceId) {
      return { success: false, error: "Crie ou defina outro workspace antes de excluir o espaço pessoal." };
    }

    const transactions = await wsRef.collection("transactions").get();
    let batch = adminDb.batch();
    let operationCount = 0;

    for (const transactionDoc of transactions.docs) {
      batch.delete(transactionDoc.ref);
      operationCount += 1;
      if (operationCount === 450) {
        await batch.commit();
        batch = adminDb.batch();
        operationCount = 0;
      }
    }

    batch.delete(wsRef);
    await batch.commit();

    if (fallbackWorkspaceId) {
      await persistActiveWorkspace(userId, fallbackWorkspaceId);
    } else {
      const cookieStore = await cookies();
      cookieStore.delete("active_workspace");
      await adminDb.collection("users").doc(userId).set({ workspaceId: FieldValue.delete() }, { merge: true });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro interno ao tentar excluir o grupo." };
  }
}
