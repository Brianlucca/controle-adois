import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { saveNotificationToken } from "@/actions/notification-actions";
import { app } from "@/lib/firebase-client";

export async function registerPushNotifications() {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey || !(await isSupported()) || !("serviceWorker" in navigator)) return false;

  const config = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  });
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${config}`,
    { scope: "/firebase-cloud-messaging-push-scope" }
  );
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return false;
  return (await saveNotificationToken(token)).success;
}
