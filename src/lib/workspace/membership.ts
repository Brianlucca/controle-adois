export type WorkspaceMember =
  | string
  | {
      uid?: string;
      [key: string]: unknown;
    };

type WorkspaceLike = {
  members?: WorkspaceMember[];
} & Record<string, unknown>;

export function getWorkspaceMemberId(member: WorkspaceMember) {
  return typeof member === "string" ? member : member?.uid;
}

export function isWorkspaceMember(
  workspace: WorkspaceLike | undefined,
  userId: string
) {
  return (workspace?.members || []).some(
    (member: WorkspaceMember) => getWorkspaceMemberId(member) === userId
  );
}

export function removeWorkspaceMember(
  members: WorkspaceMember[] = [],
  userId: string
) {
  return members.filter((member) => getWorkspaceMemberId(member) !== userId);
}

export function applyWorkspaceMemberPermissions(
  members: WorkspaceMember[] = [],
  memberUid: string,
  permissions: Record<string, unknown>
) {
  return members.map((member) => {
    if (getWorkspaceMemberId(member) === memberUid && typeof member === "object") {
      return { ...member, ...permissions };
    }

    return member;
  });
}
