import { isWorkspaceMember } from "@/lib/workspace/membership";

export function isSameIdentity(authenticatedUid: string | null | undefined, claimedUid: string | null | undefined) {
  return Boolean(authenticatedUid && claimedUid && authenticatedUid === claimedUid);
}

export function canAccessWorkspace(workspace: unknown, authenticatedUid: string | null | undefined) {
  if (!authenticatedUid || !workspace || typeof workspace !== "object") return false;
  const record = workspace as Record<string, unknown>;
  return record.ownerId === authenticatedUid || isWorkspaceMember(record, authenticatedUid);
}
