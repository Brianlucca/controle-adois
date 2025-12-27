"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";

async function setActiveWorkspaceCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_workspace", id);
}

export async function getActiveWorkspaceId() {
  const cookieStore = await cookies();
  return cookieStore.get("active_workspace")?.value || null;
}

export async function ensurePersonalWorkspace(userId: string, email: string) {
  try {
    const snapshot = await adminDb.collection("workspaces")
      .where("ownerId", "==", userId)
      .where("type", "==", "personal")
      .get();

    if (!snapshot.empty) {
      const personalId = snapshot.docs[0].id;
      await setActiveWorkspaceCookie(personalId);
      return { workspaceId: personalId };
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

    await setActiveWorkspaceCookie(workspaceRef.id);
    return { workspaceId: workspaceRef.id };
  } catch (error) {
    return { error: "Erro interno" };
  }
}

export async function createSharedWorkspace(userId: string, email: string, name: string) {
  try {
    const workspaceRef = adminDb.collection("workspaces").doc();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newMember = {
        uid: userId, 
        email, 
        role: "admin", 
        canEdit: true 
    };

    await workspaceRef.set({
      ownerId: userId,
      type: "shared",
      name: name,
      inviteCode,
      members: [newMember],
      budgetLimit: 5000,
      createdAt: new Date(),
    });

    await setActiveWorkspaceCookie(workspaceRef.id);
    return { success: true };

  } catch (error) {
    return { success: false, error: "Erro ao criar grupo." };
  }
}

export async function joinWorkspace(userId: string, email: string, inviteCode: string) {
  try {
    const querySnapshot = await adminDb.collection("workspaces").where("inviteCode", "==", inviteCode).limit(1).get();
    
    if (querySnapshot.empty) return { success: false, error: "Código de convite inválido." };

    const workspaceDoc = querySnapshot.docs[0];
    const workspaceId = workspaceDoc.id;
    const workspaceData = workspaceDoc.data();

    const isAlreadyMember = workspaceData.members.some((m: any) => (m.uid || m) === userId);
    if (isAlreadyMember) return { success: false, error: "Você já está neste grupo." };

    const newMember = {
      uid: userId,
      email,
      role: "member",
      canEdit: true
    };

    await adminDb.collection("workspaces").doc(workspaceId).update({
      members: FieldValue.arrayUnion(newMember)
    });

    await setActiveWorkspaceCookie(workspaceId);

    return { success: true, message: "Você entrou no grupo!" };

  } catch (error) {
    return { success: false, error: "Erro interno." };
  }
}

export async function getUserWorkspaces(userId: string) {
  const allWorkspaces = await adminDb.collection("workspaces").get();
  
  const myWorkspaces = allWorkspaces.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter((ws: any) => ws.members.some((m: any) => (typeof m === 'string' ? m === userId : m.uid === userId)));

  return myWorkspaces.map((ws: any) => ({
    id: ws.id,
    name: ws.name,
    type: ws.type || 'shared',
    isOwner: ws.ownerId === userId
  }));
}

export async function switchActiveWorkspace(workspaceId: string) {
  await setActiveWorkspaceCookie(workspaceId);
  return { success: true };
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();
    
    if (!doc.exists) return { success: false, error: "Grupo não existe" };
    const data = doc.data();

    if (data?.type === 'personal') {
        return { success: false, error: "Você não pode sair do seu espaço pessoal." };
    }
    if (data?.ownerId === userId) {
        return { success: false, error: "Dono não pode sair. Exclua o grupo ou transfira a posse." };
    }

    const currentMembers = data?.members || [];
    const updatedMembers = currentMembers.filter((m: any) => (m.uid || m) !== userId);
    
    await wsRef.update({ members: updatedMembers });

    const personalSnapshot = await adminDb.collection("workspaces")
        .where("ownerId", "==", userId)
        .where("type", "==", "personal")
        .limit(1)
        .get();

    if (!personalSnapshot.empty) {
        await setActiveWorkspaceCookie(personalSnapshot.docs[0].id);
    }

    return { success: true };

  } catch (error) {
    return { success: false, error: "Erro ao sair." };
  }
}

export async function updateMemberPermissions(workspaceId: string, memberUid: string, permissions: any) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();
    
    if (!doc.exists) return { success: false };

    const members = doc.data()?.members || [];
    
    const updatedMembers = members.map((m: any) => {
      const id = typeof m === 'string' ? m : m.uid;
      if (id === memberUid && typeof m === 'object') {
        return { ...m, ...permissions };
      }
      return m;
    });

    await wsRef.update({ members: updatedMembers });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateWorkspaceSettings(userId: string, settings: { budgetLimit: number }) {
    const cookieStore = await cookies();
    const workspaceId = cookieStore.get("active_workspace")?.value;
    if (!workspaceId) return { success: false, error: "Nenhum workspace ativo" };
    
    await adminDb.collection("workspaces").doc(workspaceId).update({ budgetLimit: settings.budgetLimit });
    return { success: true };
}

export async function updateWorkspaceName(userId: string, newName: string) {
    const cookieStore = await cookies();
    const workspaceId = cookieStore.get("active_workspace")?.value;
    if (!workspaceId) return { success: false, error: "Nenhum workspace ativo" };

    await adminDb.collection("workspaces").doc(workspaceId).update({ name: newName });
    return { success: true };
}

export async function getWorkspaceDetails(userId: string) {
    const cookieStore = await cookies();
    let workspaceId = cookieStore.get("active_workspace")?.value;

    if (!workspaceId) {
        const snap = await adminDb.collection("workspaces").where("ownerId", "==", userId).where("type", "==", "personal").limit(1).get();
        if (!snap.empty) {
            workspaceId = snap.docs[0].id;
            await setActiveWorkspaceCookie(workspaceId); 
        }
        else return null;
    }

    const doc = await adminDb.collection("workspaces").doc(workspaceId).get();
    if (!doc.exists) return null;
    const data = doc.data();

    return { 
        id: doc.id, 
        name: data?.name, 
        type: data?.type,
        members: data?.members,
        budgetLimit: data?.budgetLimit || 3000,
        inviteCode: data?.inviteCode,
        ownerId: data?.ownerId
    };
}

export async function deleteWorkspace(userId: string, workspaceId: string) {
  try {
    const wsRef = adminDb.collection("workspaces").doc(workspaceId);
    const doc = await wsRef.get();

    if (!doc.exists) {
      return { success: false, error: "Workspace não encontrado." };
    }

    const data = doc.data();

    if (data?.ownerId !== userId) {
      return { success: false, error: "Permissão negada. Apenas o dono pode excluir o grupo." };
    }

    if (data?.type === 'personal') {
      return { success: false, error: "Não é possível excluir o Workspace Pessoal padrão." };
    }

    await wsRef.delete();

    const personalSnapshot = await adminDb.collection("workspaces")
        .where("ownerId", "==", userId)
        .where("type", "==", "personal")
        .limit(1)
        .get();

    if (!personalSnapshot.empty) {
        await setActiveWorkspaceCookie(personalSnapshot.docs[0].id);
    } else {
        const cookieStore = await cookies();
        cookieStore.delete("active_workspace");
    }

    return { success: true };

  } catch (error) {
    return { success: false, error: "Erro interno ao tentar excluir o grupo." };
  }
}