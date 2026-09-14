"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getUserWorkspaces, switchActiveWorkspace, getWorkspaceDetails } from "@/actions/workspace-actions";

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
  budgetLimit: number;
  participants: WorkspaceParticipant[];
};

export type WorkspaceParticipant = {
  userId: string;
  displayName: string;
  email: string;
  isCurrentUser: boolean;
};

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => Promise<void>;
  loadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

function workspaceCacheKey(userId: string) {
  return `workspace-cache:${userId}`;
}

function readWorkspaceCache(userId: string): Workspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(workspaceCacheKey(userId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) =>
        Boolean(item && typeof item.id === "string" && typeof item.name === "string")
      )
      .map((item) => ({
        ...item,
        participants: Array.isArray(item.participants) ? item.participants : [],
      })) as Workspace[];
  } catch {
    return [];
  }
}

function writeWorkspaceCache(userId: string, items: Workspace[]) {
  localStorage.setItem(workspaceCacheKey(userId), JSON.stringify(items));
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const setActiveWorkspace = async (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("lastActiveWorkspaceId", ws.id);
    if (user) writeWorkspaceCache(user.uid, workspaces.some((item) => item.id === ws.id) ? workspaces : [...workspaces, ws]);
    await switchActiveWorkspace(ws.id, user?.uid);
    if (!user) return;

    const details = await getWorkspaceDetails(user.uid);
    if (!details || details.id !== ws.id) return;

    const hydratedWorkspace = {
      ...ws,
      ownerId: details.ownerId || ws.ownerId,
      participants: buildWorkspaceParticipants(details.members, user),
    };
    setActiveWorkspaceState(hydratedWorkspace);
    setWorkspaces((current) => {
      const updated = current.map((item) =>
        item.id === hydratedWorkspace.id ? hydratedWorkspace : item,
      );
      writeWorkspaceCache(user.uid, updated);
      return updated;
    });
  };

  useEffect(() => {
    if (!user) {
        setWorkspaces([]);
        setLoadingWorkspaces(false);
        return;
    }

    let isMounted = true;

    const currentUser = user;
    const cachedWorkspaces = readWorkspaceCache(currentUser.uid);
    const cachedActiveId = localStorage.getItem("lastActiveWorkspaceId");
    const cachedActive =
      cachedWorkspaces.find((workspace) => workspace.id === cachedActiveId) ||
      cachedWorkspaces[0] ||
      null;
    if (cachedWorkspaces.length) setWorkspaces(cachedWorkspaces);
    if (cachedActive) setActiveWorkspaceState(cachedActive);

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);
        const [data, activeDetails] = await Promise.all([
          getUserWorkspaces(currentUser.uid),
          getWorkspaceDetails(currentUser.uid),
        ]);
        if (!isMounted) return;

        const wsList = data.map((ws) => ({
          id: ws.id,
          name: ws.name,
          ownerId: ws.isOwner ? currentUser.uid : "",
          currency: "BRL",
          budgetLimit: Number(ws.budgetLimit) || 3000,
          participants:
            cachedWorkspaces.find((cached) => cached.id === ws.id)?.participants || [],
        })) as Workspace[];

        const hydratedList = activeDetails
          ? wsList.map((workspace) =>
              workspace.id === activeDetails.id
                ? {
                    ...workspace,
                    ownerId: activeDetails.ownerId || workspace.ownerId,
                    participants: buildWorkspaceParticipants(
                      activeDetails.members,
                      currentUser,
                    ),
                  }
                : workspace,
            )
          : wsList;

        setWorkspaces(hydratedList);
        writeWorkspaceCache(currentUser.uid, hydratedList);

        const lastId = localStorage.getItem("lastActiveWorkspaceId");
        const nextWorkspace =
          (activeDetails?.id && hydratedList.find((workspace) => workspace.id === activeDetails.id)) ||
          (lastId && hydratedList.find((workspace) => workspace.id === lastId)) ||
          hydratedList[0] ||
          null;

        if (nextWorkspace) {
          setActiveWorkspaceState(nextWorkspace);
          localStorage.setItem("lastActiveWorkspaceId", nextWorkspace.id);
        } else {
          setActiveWorkspaceState(null);
        }
      } catch {
        if (isMounted && cachedWorkspaces.length === 0) {
          setWorkspaces([]);
          setActiveWorkspaceState(null);
        }
      } finally {
        if (isMounted) setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, loadingWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace precisa estar dentro de WorkspaceProvider.");
  }
  return context;
}

function buildWorkspaceParticipants(
  members: Array<string | { uid?: string; email?: string }> = [],
  currentUser: { uid: string; email: string | null; displayName: string | null },
): WorkspaceParticipant[] {
  const participants = members
    .map((member) => {
      const userId = typeof member === "string" ? member : member.uid || "";
      const email =
        typeof member === "string"
          ? userId === currentUser.uid
            ? currentUser.email || ""
            : ""
          : member.email || "";
      const isCurrentUser = userId === currentUser.uid;
      const displayName = isCurrentUser
        ? currentUser.displayName || email.split("@")[0] || "Você"
        : email.split("@")[0] || "Participante";

      return { userId, displayName, email, isCurrentUser };
    })
    .filter((participant) => participant.userId);

  if (!participants.some((participant) => participant.userId === currentUser.uid)) {
    participants.unshift({
      userId: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Você",
      email: currentUser.email || "",
      isCurrentUser: true,
    });
  }

  return [...new Map(participants.map((participant) => [participant.userId, participant])).values()]
    .sort((a, b) => Number(b.isCurrentUser) - Number(a.isCurrentUser));
}
