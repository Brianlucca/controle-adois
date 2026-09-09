"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { registerPushNotifications } from "@/lib/notifications/register-push";
import { setPushNotificationsEnabled } from "@/actions/notification-actions";

interface PreferencesContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
  notifications: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  toggleNotifications: (enabled?: boolean) => Promise<boolean>;
}

const PreferencesContext = createContext<PreferencesContextType>({} as any);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedHide = localStorage.getItem("hideValues") === "true";
    const storedNotif = localStorage.getItem("notifications") !== "false";
    
    setHideValues(storedHide);
    const permission = "Notification" in window ? Notification.permission : "unsupported";
    setNotifications(storedNotif && permission === "granted");
    setNotificationPermission(permission);
    setLoaded(true);

    if (storedNotif && permission === "granted") {
      const refreshPushToken = () => {
        void registerPushNotifications()
          .then((registered) => {
            localStorage.setItem("pushNotifications", String(registered));
          })
          .catch(() => {
            localStorage.setItem("pushNotifications", "false");
          });
      };
      refreshPushToken();
      window.addEventListener("online", refreshPushToken);
      return () => window.removeEventListener("online", refreshPushToken);
    }
  }, []);

  const toggleHideValues = () => {
    const newValue = !hideValues;
    setHideValues(newValue);
    localStorage.setItem("hideValues", String(newValue));
  };

  const toggleNotifications = async (enabled = !notifications) => {
    if (enabled && !("Notification" in window)) {
      setNotifications(false);
      localStorage.setItem("notifications", "false");
      await setPushNotificationsEnabled(false).catch(() => undefined);
      return false;
    }

    let permission = "Notification" in window ? Notification.permission : "denied";
    if (enabled && permission === "default") {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    const newValue = enabled && permission === "granted";
    const pushRegistered = newValue
      ? await registerPushNotifications().catch(() => false)
      : false;
    if (!newValue) await setPushNotificationsEnabled(false).catch(() => undefined);
    setNotifications(newValue);
    localStorage.setItem("notifications", String(newValue));
    localStorage.setItem("pushNotifications", String(pushRegistered));
    return newValue;
  };

  if (!loaded) return null;

  return (
    <PreferencesContext.Provider value={{ hideValues, toggleHideValues, notifications, notificationPermission, toggleNotifications }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
