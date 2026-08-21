"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installation support is optional; the app should continue normally.
    });
  }, []);

  useEffect(() => {
    const recoverFromDeploymentSkew = (event: PromiseRejectionEvent) => {
      const message = String(event.reason?.message || event.reason || "");
      if (!message.includes("Minified React error #441")) return;
      const lastRecovery = Number(sessionStorage.getItem("deployment-skew-recovery") || 0);
      if (Date.now() - lastRecovery < 60_000) return;
      sessionStorage.setItem("deployment-skew-recovery", String(Date.now()));
      window.location.reload();
    };
    window.addEventListener("unhandledrejection", recoverFromDeploymentSkew);
    return () => window.removeEventListener("unhandledrejection", recoverFromDeploymentSkew);
  }, []);

  return null;
}
