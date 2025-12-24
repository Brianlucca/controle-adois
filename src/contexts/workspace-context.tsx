"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@/contexts/auth-context";

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
};

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  loadingWorkspaces: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({} as any);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("lastActiveWorkspaceId", ws.id);
  };

  useEffect(() => {
    if (!user) {
        setWorkspaces([]);
        setLoadingWorkspaces(false);
        return;
    }

    const q = query(collection(db, "workspaces"), where("ownerId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      setWorkspaces(wsList);

      const lastId = localStorage.getItem("lastActiveWorkspaceId");
      
      if (lastId && wsList.some(w => w.id === lastId)) {
        setActiveWorkspaceState(wsList.find(w => w.id === lastId) || wsList[0]);
      } else if (wsList.length > 0) {
        setActiveWorkspace(wsList[0]);
      }
      
      setLoadingWorkspaces(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, loadingWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);