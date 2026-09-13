import "server-only";
import { Timestamp } from "firebase-admin/firestore";

export type AuditAction = "created" | "updated" | "status_changed" | "deleted" | "restored" | "imported";
export type EntityAuditAction = AuditAction | "archived" | "reversed";

export function buildAuditRecord({ action, user, transactionId, before = null, after = null }: {
  action: AuditAction;
  user: { uid: string; name?: string; email?: string };
  transactionId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  return buildEntityAuditRecord({
    action,
    entityType: "transaction",
    entityId: transactionId,
    user,
    before,
    after,
  });
}

export function buildEntityAuditRecord({
  action,
  entityType,
  entityId,
  user,
  before = null,
  after = null,
}: {
  action: EntityAuditAction;
  entityType: "transaction" | "account" | "transfer";
  entityId: string;
  user: { uid: string; name?: string; email?: string };
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  return {
    action,
    entityType,
    entityId,
    actorId: user.uid,
    actorName: user.name || user.email || "Usuario",
    before: normalize(before),
    after: normalize(after),
    createdAt: new Date(),
  };
}

function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value ?? null;
}
