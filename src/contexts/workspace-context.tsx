"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getUserWorkspaces, switchActiveWorkspace, getWorkspaceDetails } from "@/actions/workspace-actions";

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
};

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => Promise<void>;
  loadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({} as any);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const setActiveWorkspace = async (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("lastActiveWorkspaceId", ws.id);
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

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);
        const data = await getUserWorkspaces(currentUser.uid);
        if (!isMounted) return;

        const wsList = data.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          ownerId: ws.isOwner ? currentUser.uid : "",
          currency: "BRL",
        })) as Workspace[];

        setWorkspaces(wsList);

        const activeDetails = await getWorkspaceDetails(currentUser.uid);
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
        if (isMounted) {
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
