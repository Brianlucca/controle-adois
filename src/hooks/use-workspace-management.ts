"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createSharedWorkspace,
  deleteWorkspace,
  getUserWorkspaces,
  getWorkspaceDetails,
  joinWorkspace,
  leaveWorkspace,
  setPrimaryWorkspace,
  switchActiveWorkspace,
  updateMemberPermissions,
  updateWorkspaceName,
  updateWorkspaceSettings,
} from "@/actions/workspace-actions";
import { auth } from "@/lib/firebase-client";
import type {
  WorkspaceDetails,
  WorkspaceListItem,
  WorkspaceMember,
} from "@/components/workspace/types";

type CurrentUser = {
  uid: string;
  email: string;
};

export function useWorkspaceManagement() {
  const [activeData, setActiveData] = useState<WorkspaceDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [myWorkspaces, setMyWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [copied, setCopied] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const loadData = useCallback(async (uid: string) => {
    try {
      const [details, workspaces] = await Promise.all([
        getWorkspaceDetails(uid),
        getUserWorkspaces(uid),
      ]);

      setActiveData(details as WorkspaceDetails | null);
      setMyWorkspaces(workspaces as WorkspaceListItem[]);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setCurrentUser(null);
        setInitialLoading(false);
        return;
      }

      setCurrentUser({
        uid: user.uid,
        email: user.email || "",
      });
      loadData(user.uid);
    });

    return () => unsubscribe();
  }, [loadData]);

  useEffect(() => {
    if (!activeData) return;

    setEditName(activeData.name || "");
    setEditBudget(String(activeData.budgetLimit || 0));
  }, [activeData]);

  const reloadPage = () => {
    window.location.reload();
  };

  const handleCreate = async () => {
    if (!currentUser || !newWorkspaceName.trim()) return;

    setLoading(true);
    const response = await createSharedWorkspace(
      currentUser.uid,
      currentUser.email,
      newWorkspaceName.trim()
    );

    if (response.success) reloadPage();
    else {
      alert(response.error);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!currentUser || !inviteCode.trim()) return;

    setLoading(true);
    const response = await joinWorkspace(
      currentUser.uid,
      currentUser.email,
      inviteCode.trim()
    );

    if (response.success) reloadPage();
    else {
      alert(response.error);
      setLoading(false);
    }
  };

  const handleSwitch = async (workspaceId: string) => {
    if (!currentUser) return;

    setLoading(true);
    localStorage.setItem("lastActiveWorkspaceId", workspaceId);
    await switchActiveWorkspace(workspaceId, currentUser.uid);
    reloadPage();
  };

  const handleSetPrimary = async (
    workspaceId: string,
    makePersonal = false
  ) => {
    if (!currentUser) return;

    setLoading(true);
    localStorage.setItem("lastActiveWorkspaceId", workspaceId);
    const response = await setPrimaryWorkspace(
      currentUser.uid,
      workspaceId,
      makePersonal
    );

    if (response.success) reloadPage();
    else {
      alert(response.error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser || !activeData) return;

    setSavingSettings(true);
    try {
      const nextBudget = Number(editBudget);

      if (editName !== activeData.name) {
        await updateWorkspaceName(currentUser.uid, editName);
      }
      if (nextBudget !== activeData.budgetLimit) {
        await updateWorkspaceSettings(currentUser.uid, {
          budgetLimit: nextBudget,
        });
      }

      setActiveData((previous) =>
        previous
          ? { ...previous, name: editName, budgetLimit: nextBudget }
          : previous
      );
      alert("Configurações salvas.");
    } catch {
      alert("Erro ao salvar.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLeave = async () => {
    if (!activeData || !currentUser) return;
    if (!confirm("Tem certeza que deseja sair do grupo?")) return;

    setLoading(true);
    const response = await leaveWorkspace(currentUser.uid, activeData.id);

    if (response.success) reloadPage();
    else {
      alert(response.error);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeData || !currentUser) return;

    const confirmation = window.prompt(
      `DIGITE O NOME DO GRUPO PARA CONFIRMAR A EXCLUSÃO:\n\n${activeData.name}`
    );
    if (confirmation !== activeData.name) return;

    setLoading(true);
    const response = await deleteWorkspace(currentUser.uid, activeData.id);

    if (response.success) reloadPage();
    else {
      alert(response.error);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!activeData?.inviteCode) return;

    navigator.clipboard.writeText(activeData.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = async (
    memberUid: string,
    field: string,
    currentValue: boolean
  ) => {
    if (!currentUser || activeData?.ownerId !== currentUser.uid) return;

    setActiveData((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        members: previous.members.map((member) => {
          const uid = typeof member === "string" ? member : member.uid;
          if (uid !== memberUid || typeof member === "string") return member;

          return {
            ...member,
            [field]: !currentValue,
          };
        }) as WorkspaceMember[],
      };
    });

    try {
      await updateMemberPermissions(activeData.id, currentUser.uid, memberUid, {
        [field]: !currentValue,
      });
    } catch {
      await loadData(currentUser.uid);
      alert("Erro ao atualizar permissão.");
    }
  };

  return {
    activeData,
    copied,
    currentUser,
    editBudget,
    editName,
    initialLoading,
    inviteCode,
    loading,
    myWorkspaces,
    newWorkspaceName,
    savingSettings,
    handleCopy,
    handleCreate,
    handleDelete,
    handleJoin,
    handleLeave,
    handleSaveSettings,
    handleSetPrimary,
    handleSwitch,
    setEditBudget,
    setEditName,
    setInviteCode,
    setNewWorkspaceName,
    togglePermission,
  };
}
