import "server-only";
import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

function formatPrivateKey(key: string | undefined) {
  if (!key) return undefined;
  const trimmed = key.trim().replace(/^['"]|['"]$/g, "");
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("BEGIN PRIVATE KEY")) return decoded;
  } catch { /* not base64 */ }
  return trimmed.replace(/\\n/g, "\n");
}

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({ projectId: projectId.trim(), clientEmail: clientEmail.trim(), privateKey: formatPrivateKey(privateKey) }),
      });
    } catch (error) {
      console.error("firebase_admin_initialization_failed", { code: error instanceof Error ? error.name : "unknown" });
    }
  }

  if (getApps().length === 0) {
    // Keep modules renderable when production credentials are temporarily
    // unavailable. Database calls will fail inside their guarded actions
    // instead of crashing every Server Component during module evaluation.
    initializeApp({
      projectId: projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const app = getApp();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export function getAdminMessaging() {
  return getMessaging(app);
}

export const db = adminDb;
