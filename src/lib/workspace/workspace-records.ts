import type { WorkspaceMember } from "@/lib/workspace/membership";

type WorkspaceRecordInput = {
  ownerId: string;
  email: string;
  type: "personal" | "shared";
  name: string;
  budgetLimit: number;
  inviteCode?: string;
};

export const DEFAULT_PERSONAL_WORKSPACE_NAME = "Meu Espaco Pessoal";

export function createInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function buildWorkspaceMember(
  userId: string,
  email: string,
  role: "admin" | "member"
) {
  return {
    uid: userId,
    email,
    role,
    canEdit: true,
  };
}

export function buildWorkspaceRecord({
  ownerId,
  email,
  type,
  name,
  budgetLimit,
  inviteCode,
}: WorkspaceRecordInput) {
  return {
    ownerId,
    type,
    name,
    ...(inviteCode ? { inviteCode } : {}),
    members: [buildWorkspaceMember(ownerId, email, "admin")],
    budgetLimit,
    createdAt: new Date(),
  };
}

export function toWorkspaceListItem(
  id: string,
  workspace: Record<string, any>,
  userId: string
) {
  return {
    id,
    name: workspace.name,
    type: workspace.type || "shared",
    isOwner: workspace.ownerId === userId,
  };
}

export function toWorkspaceDetails(id: string, workspace: Record<string, any>) {
  return {
    id,
    name: workspace.name,
    type: workspace.type,
    members: (workspace.members || []) as WorkspaceMember[],
    budgetLimit: workspace.budgetLimit || 3000,
    inviteCode: workspace.inviteCode,
    ownerId: workspace.ownerId,
  };
}
