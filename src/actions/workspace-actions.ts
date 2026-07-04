"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  clearPersistedActiveWorkspace,
  getActiveWorkspaceId as resolveActiveWorkspaceId,
  getFallbackWorkspaceId,
  persistActiveWorkspace,
} from "@/lib/server/workspace-session";
import {
  applyWorkspaceMemberPermissions,
  isWorkspaceMember,
  removeWorkspaceMember,
} from "@/lib/workspace/membership";
import {
  buildWorkspaceMember,
  buildWorkspaceRecord,
  createInviteCode,
  DEFAULT_PERSONAL_WORKSPACE_NAME,
  toWorkspaceDetails,
  toWorkspaceListItem,
} from "@/lib/workspace/workspace-records";

export async function getActiveWorkspaceId(userId?: string) {
  return resolveActiveWorkspaceId(userId);
}

export async function ensurePersonalWorkspace(userId: string, email: string) {
  try {
    const savedWorkspaceId = await getFallbackWorkspaceId(userId);
    if (savedWorkspaceId) {
      await persistActiveWorkspace(userId, savedWorkspaceId);
      return { workspaceId: savedWorkspaceId };
    }

    const workspaceRef = adminDb.collection("workspaces").doc();
    await workspaceRef.set(
      buildWorkspaceRecord({
        ownerId: userId,
        email,
        type: "personal",
        name: DEFAULT_PERSONAL_WORKSPACE_NAME,
        budgetLimit: 3000,
      })
    );

    await persistActiveWorkspace(userId, workspaceRef.id);
    return { workspaceId: workspaceRef.id };
  } catch {
    return { error: "Erro interno" };
  }
}

export async function createSharedWorkspace(
  userId: string,
  email: string,
  name: string
) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc();
    await workspaceRef.set(
      buildWorkspaceRecord({
        ownerId: userId,
        email,
        type: "shared",
        name,
        budgetLimit: 5000,
        inviteCode: createInviteCode(),
      })
    );

    await persistActiveWorkspace(userId, workspaceRef.id);
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao criar grupo." };
  }
}

export async function joinWorkspace(
  userId: string,
  email: string,
  inviteCode: string
) {
  try {
    const querySnapshot = await adminDb
      .collection("workspaces")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return { success: false, error: "Código de convite inválido." };
    }

    const workspaceDoc = querySnapshot.docs[0];
    const workspaceId = workspaceDoc.id;
    const workspaceData = workspaceDoc.data();

    if (isWorkspaceMember(workspaceData, userId)) {
      return { success: false, error: "Você já está neste grupo." };
    }

    await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .update({
        members: FieldValue.arrayUnion(
          buildWorkspaceMember(userId, email, "member")
        ),
      });

    await persistActiveWorkspace(userId, workspaceId);
    return { success: true, message: "Você entrou no grupo!" };
  } catch {
    return { success: false, error: "Erro interno." };
  }
}

export async function getUserWorkspaces(userId: string) {
  const allWorkspaces = await adminDb.collection("workspaces").get();

  return allWorkspaces.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as any))
    .filter((workspace) => isWorkspaceMember(workspace, userId))
    .map((workspace) => toWorkspaceListItem(workspace.id, workspace, userId));
}

export async function switchActiveWorkspace(
  workspaceId: string,
  userId?: string
) {
  if (!userId) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const doc = await adminDb.collection("workspaces").doc(workspaceId).get();
  if (!doc.exists || !isWorkspaceMember(doc.data(), userId)) {
    return { success: false, error: "Você não faz parte deste workspace." };
  }

  await persistActiveWorkspace(userId, workspaceId);
  return { success: true };
}

export async function setPrimaryWorkspace(
  userId: string,
  workspaceId: string,
  makePersonal = false
) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceDoc = await workspaceRef.get();

    if (!workspaceDoc.exists) {
      return { success: false, error: "Workspace não encontrado." };
    }

    const workspace = workspaceDoc.data();
    if (!isWorkspaceMember(workspace, userId)) {
      return { success: false, error: "Você não faz parte deste workspace." };
    }

    if (makePersonal) {
      if (workspace?.ownerId !== userId) {
        return {
          success: false,
          error: "Apenas o dono pode transformar em espaço pessoal.",
        };
      }

      const oldPersonal = await adminDb
        .collection("workspaces")
        .where("ownerId", "==", userId)
        .where("type", "==", "personal")
        .get();

      const batch = adminDb.batch();
      oldPersonal.docs.forEach((personalDoc) => {
        if (personalDoc.id !== workspaceId) {
          batch.update(personalDoc.ref, { type: "shared" });
        }
      });
      batch.update(workspaceRef, {
        type: "personal",
        inviteCode: workspace?.inviteCode || createInviteCode(),
      });
      await batch.commit();
    }

    await persistActiveWorkspace(userId, workspaceId);
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao definir workspace principal." };
  }
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceDoc = await workspaceRef.get();

    if (!workspaceDoc.exists) {
      return { success: false, error: "Grupo não existe." };
    }

    const workspace = workspaceDoc.data();
    if (workspace?.type === "personal") {
      return {
        success: false,
        error: "Você não pode sair do seu espaço pessoal.",
      };
    }
    if (workspace?.ownerId === userId) {
      return {
        success: false,
        error: "Dono não pode sair. Exclua o grupo ou transfira a posse.",
      };
    }

    await workspaceRef.update({
      members: removeWorkspaceMember(workspace?.members, userId),
    });

    const fallbackId = await getFallbackWorkspaceId(userId, workspaceId);
    if (fallbackId) await persistActiveWorkspace(userId, fallbackId);

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao sair." };
  }
}

export async function updateMemberPermissions(
  workspaceId: string,
  userId: string,
  memberUid: string,
  permissions: Record<string, unknown>
) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceDoc = await workspaceRef.get();

    if (!workspaceDoc.exists) return { success: false };
    if (workspaceDoc.data()?.ownerId !== userId) return { success: false };

    await workspaceRef.update({
      members: applyWorkspaceMemberPermissions(
        workspaceDoc.data()?.members,
        memberUid,
        permissions
      ),
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updateWorkspaceSettings(
  userId: string,
  settings: { budgetLimit: number }
) {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) {
    return { success: false, error: "Nenhum workspace ativo" };
  }

  await adminDb
    .collection("workspaces")
    .doc(workspaceId)
    .update({ budgetLimit: settings.budgetLimit });

  return { success: true };
}

export async function updateWorkspaceName(userId: string, newName: string) {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) {
    return { success: false, error: "Nenhum workspace ativo" };
  }

  await adminDb.collection("workspaces").doc(workspaceId).update({ name: newName });
  return { success: true };
}

export async function getWorkspaceDetails(userId: string) {
  let workspaceId = await getActiveWorkspaceId(userId);

  if (!workspaceId) {
    workspaceId = await getFallbackWorkspaceId(userId);
    if (!workspaceId) return null;

    await persistActiveWorkspace(userId, workspaceId);
  }

  let workspaceDoc = await adminDb.collection("workspaces").doc(workspaceId).get();
  if (!workspaceDoc.exists || !isWorkspaceMember(workspaceDoc.data(), userId)) {
    workspaceId = await getFallbackWorkspaceId(userId, workspaceId);
    if (!workspaceId) return null;

    await persistActiveWorkspace(userId, workspaceId);
    workspaceDoc = await adminDb.collection("workspaces").doc(workspaceId).get();
  }

  return toWorkspaceDetails(workspaceDoc.id, workspaceDoc.data() || {});
}

export async function deleteWorkspace(userId: string, workspaceId: string) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceDoc = await workspaceRef.get();

    if (!workspaceDoc.exists) {
      return { success: false, error: "Workspace não encontrado." };
    }

    const workspace = workspaceDoc.data();
    if (workspace?.ownerId !== userId) {
      return {
        success: false,
        error: "Permissão negada. Apenas o dono pode excluir o grupo.",
      };
    }

    const fallbackWorkspaceId = await getFallbackWorkspaceId(
      userId,
      workspaceId
    );
    if (workspace?.type === "personal" && !fallbackWorkspaceId) {
      return {
        success: false,
        error: "Crie ou defina outro workspace antes de excluir o espaço pessoal.",
      };
    }

    const transactions = await workspaceRef.collection("transactions").get();
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

    batch.delete(workspaceRef);
    await batch.commit();

    if (fallbackWorkspaceId) {
      await persistActiveWorkspace(userId, fallbackWorkspaceId);
    } else {
      await clearPersistedActiveWorkspace(userId);
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro interno ao tentar excluir o grupo." };
  }
}
