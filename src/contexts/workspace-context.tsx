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
};

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => Promise<void>;
  loadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({} as any);

function workspaceCacheKey(userId: string) {
  return `workspace-cache:${userId}`;
}

function readWorkspaceCache(userId: string): Workspace[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(workspaceCacheKey(userId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Workspace =>
      Boolean(item && typeof item.id === "string" && typeof item.name === "string")
    );
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

        const wsList = data.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          ownerId: ws.isOwner ? currentUser.uid : "",
          currency: "BRL",
          budgetLimit: Number(ws.budgetLimit) || 3000,
        })) as Workspace[];

        setWorkspaces(wsList);
        writeWorkspaceCache(currentUser.uid, wsList);

        const lastId = localStorage.getItem("lastActiveWorkspaceId");
        const nextWorkspace =
          (activeDetails?.id && wsList.find((workspace) => workspace.id === activeDetails.id)) ||
          (lastId && wsList.find((workspace) => workspace.id === lastId)) ||
          wsList[0] ||
          null;

        if (nextWorkspace) {
          setActiveWorkspaceState(nextWorkspace);
          localStorage.setItem("lastActiveWorkspaceId", nextWorkspace.id);
        } else {
          setActiveWorkspaceState(null);
        }
      } catch (error) {
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

export const useWorkspace = () => useContext(WorkspaceContext);
