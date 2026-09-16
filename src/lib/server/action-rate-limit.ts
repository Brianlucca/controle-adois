import "server-only";

import { createHash } from "node:crypto";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  evaluateActionRateLimit,
  type ActionRateLimitPolicy,
  type ActionRateLimitState,
} from "@/lib/security/action-rate-limit";

export async function consumeWorkspaceActionRateLimit({
  workspaceRef,
  userId,
  scope,
  policy,
}: {
  workspaceRef: FirebaseFirestore.DocumentReference;
  userId: string;
  scope: string;
  policy: ActionRateLimitPolicy;
}) {
  const key = createHash("sha256")
    .update(`${userId}\u0000${scope}`)
    .digest("hex")
    .slice(0, 40);
  const rateRef = workspaceRef.collection("actionRateLimits").doc(key);

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const decision = evaluateActionRateLimit(
      toRateLimitState(snapshot.data()),
      policy,
    );

    if (decision.allowed) {
      transaction.set(rateRef, {
        count: decision.nextState.count,
        windowStartedAtMs: decision.nextState.windowStartedAtMs,
        expiresAt: new Date(
          decision.nextState.windowStartedAtMs + policy.windowMs * 2,
        ),
        updatedAt: new Date(),
      });
    }

    return {
      allowed: decision.allowed,
      remaining: decision.remaining,
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  });
}

function toRateLimitState(data: DocumentData | undefined): ActionRateLimitState | null {
  if (!data) return null;
  return {
    count: Number(data.count),
    windowStartedAtMs: Number(data.windowStartedAtMs),
  };
}
