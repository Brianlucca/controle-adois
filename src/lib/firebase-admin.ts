import "server-only";
import { initializeApp, getApps, cert, getApp, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

interface ServiceAccount {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

let serviceAccount: ServiceAccount | null = null;

try {
  serviceAccount = require("../../serviceAccountKey.json");
} catch (error) {
}

if (getApps().length === 0) {
  try {
    const options: any = {
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    };

    if (serviceAccount) {
      options.credential = cert(serviceAccount);
    }

    initializeApp(options);
  } catch (error) {
  }
}

function getAdminApp(): App {
  if (!getApps().length) {
  }
  return getApp();
}

export const adminDb = getFirestore(getAdminApp());
export const adminAuth = getAuth(getAdminApp());
export const adminRdb = getDatabase(getAdminApp());

export const db = adminDb;