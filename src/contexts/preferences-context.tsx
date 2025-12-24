"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface PreferencesContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
  notifications: boolean;
  toggleNotifications: () => void;
}

const PreferencesContext = createContext<PreferencesContextType>({} as any);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedHide = localStorage.getItem("hideValues") === "true";
    const storedNotif = localStorage.getItem("notifications") !== "false";
    
    setHideValues(storedHide);
    setNotifications(storedNotif);
    setLoaded(true);
  }, []);

  const toggleHideValues = () => {
    const newValue = !hideValues;
    setHideValues(newValue);
    localStorage.setItem("hideValues", String(newValue));
  };

  const toggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem("notifications", String(newValue));
  };

  if (!loaded) return null;

  return (
    <PreferencesContext.Provider value={{ hideValues, toggleHideValues, notifications, toggleNotifications }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);