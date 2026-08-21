"use client";

import { useEffect } from "react";
import { Transaction } from "@/lib/types";
import { getLocalDateKey } from "@/lib/finance/date";

type NotificationInput = {
  transactions: Transaction[];
  enabled: boolean;
  projectedBalance: number;
};

export function useFinancialNotifications({
  transactions,
  enabled,
  projectedBalance,
}: NotificationInput) {
  useEffect(() => {
    if (!enabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const todayKey = getLocalDateKey(new Date());
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const threeDaysKey = getLocalDateKey(inThreeDays);
    const pendingExpenses = transactions.filter(
      (item) => item.type === "expense" && item.status === "pending"
    );
    const overdue = pendingExpenses.filter((item) => item.dueDate < todayKey);
    const dueToday = pendingExpenses.filter((item) => item.dueDate === todayKey);
    const dueSoon = pendingExpenses.filter(
      (item) => item.dueDate > todayKey && item.dueDate <= threeDaysKey
    );

    const alerts = [
      overdue.length > 0
        ? { key: "overdue", title: "Contas atrasadas", body: `${overdue.length} conta(s) precisam da sua atenção.` }
        : null,
      dueToday.length > 0
        ? { key: "today", title: "Vence hoje", body: `${dueToday.length} conta(s) vencem hoje.` }
        : null,
      dueSoon.length > 0
        ? { key: "soon", title: "Próximos vencimentos", body: `${dueSoon.length} conta(s) vencem nos próximos 3 dias.` }
        : null,
      projectedBalance < 0
        ? { key: "shortfall", title: "Atenção à projeção", body: "As contas previstas superam seu saldo até o fim do período." }
        : null,
    ].filter(Boolean) as Array<{ key: string; title: string; body: string }>;

    for (const alert of alerts) {
      const storageKey = `financial-notification:${todayKey}:${alert.key}`;
      if (localStorage.getItem(storageKey)) continue;

      showNotification(alert.title, alert.body).then(() => {
        localStorage.setItem(storageKey, "shown");
      });
    }
  }, [enabled, projectedBalance, transactions]);
}

async function showNotification(title: string, body: string) {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: "/app-icon.svg",
      badge: "/app-icon.svg",
      tag: `controle-a-dois:${title}`,
      data: { url: "/dashboard" },
    });
    return;
  }

  new Notification(title, { body, icon: "/app-icon.svg" });
}
