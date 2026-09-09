"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/server/action-context";

export async function saveNotificationToken(token: string) {
  const user = await getAuthenticatedUser();
  const safeToken = token.trim();
  if (!user || safeToken.length < 20 || safeToken.length > 4096 || /\s/.test(safeToken)) {
    return { success: false };
  }

  try {
    await adminDb.collection("users").doc(user.uid).set(
      {
        notificationTokens: FieldValue.arrayUnion(safeToken),
        notificationsEnabled: true,
        notificationsUpdatedAt: new Date(),
      },
      { merge: true }
    );
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function setPushNotificationsEnabled(enabled: boolean) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false };

  try {
    await adminDb.collection("users").doc(user.uid).set(
      {
        notificationsEnabled: Boolean(enabled),
        notificationsUpdatedAt: new Date(),
      },
      { merge: true }
    );
    return { success: true };
  } catch {
    return { success: false };
  }
}
