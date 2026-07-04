export type WorkspaceListItem = {
  id: string;
  name: string;
  type: "personal" | "shared" | string;
  isOwner: boolean;
};

export type WorkspaceMember =
  | string
  | {
      uid?: string;
      email?: string;
      role?: string;
      canEdit?: boolean;
    };

export type WorkspaceDetails = {
  id: string;
  name: string;
  type: "personal" | "shared" | string;
  members: WorkspaceMember[];
  budgetLimit: number;
  inviteCode?: string;
  ownerId: string;
};
