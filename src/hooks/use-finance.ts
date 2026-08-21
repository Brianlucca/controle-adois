"use client";

import { createContext, createElement, ReactNode, useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { getTransactions, getTransactionsThrough, addTransaction, deleteTransaction, updateTransactionStatus, editTransaction, importTransactions, deleteRecurrence } from "@/actions/finance-actions";
import { logout } from "@/actions/auth-actions";
import { Transaction } from "@/lib/types";
import { getFinancialCycleRange, inferFinancialCycleStartDay } from "@/lib/finance/financial-cycle";
import { getFinancialCyclePreferences, updateFinancialCyclePreferences } from "@/actions/user-actions";
import { mergeTransactionRange, readFinanceCache, writeFinanceCache } from "@/lib/finance/finance-cache";
import { useWorkspace } from "@/contexts/workspace-context";

function useFinanceController() {
  const [snapshotTransactions, setSnapshotTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  
  const today = new Date();
  const initialCycle = getFinancialCycleRange(today, 1);
  const [cycleStartDay, setCycleStartDay] = useState(1);
  const [cycleEndDay, setCycleEndDay] = useState(31);
  const [hasSavedCycle, setHasSavedCycle] = useState(false);
  const [cycleReady, setCycleReady] = useState(false);
  const [rangeMode, setRangeMode] = useState<"cycle" | "custom">("cycle");

  const [dateRange, setInternalDateRange] = useState(initialCycle);
  const requestSequence = useRef(0);
  const loadedRanges = useRef(new Set<string>());
  const cacheReady = useRef(false);
  const cacheScope = user?.uid && activeWorkspace?.id ? `${user.uid}:${activeWorkspace.id}` : "";
  const transactions = useMemo(
    () => snapshotTransactions.filter((item) => item.dueDate >= dateRange.from && item.dueDate <= dateRange.to),
    [snapshotTransactions, dateRange.from, dateRange.to]
  );

  const handleAuthError = async (response: any) => {
    if (response?.error === "unauthenticated") {
      await signOut(auth);
      await logout();
      router.replace("/");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setCycleReady(false);
      setHasSavedCycle(false);
      setUser(currentUser);
      if (!currentUser) {
        setSnapshotTransactions([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user && cycleReady && cacheScope) hydrateAndSync(user.uid, cacheScope);
  }, [user, cycleReady, cacheScope]);

  useEffect(() => {
    if (!cacheScope || !cacheReady.current) return;
    const timeout = window.setTimeout(() => {
      void writeFinanceCache(cacheScope, snapshotTransactions).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [cacheScope, snapshotTransactions]);

  useEffect(() => {
    if (!user) return;
    getFinancialCyclePreferences().then((preferences) => {
      if (preferences) {
        setHasSavedCycle(true);
        setCycleStartDay(preferences.startDay);
        setCycleEndDay(preferences.endDay);
        setRangeMode("cycle");
        setInternalDateRange(
          getFinancialCycleRange(new Date(), preferences.startDay, preferences.endDay)
        );
      }
    }).catch(() => undefined).finally(() => setCycleReady(true));
  }, [user]);

  async function fetchData(uid: string) {
    const sequence = ++requestSequence.current;
    setLoading(true);
    const snapshotData = await getTransactionsThrough("2100-12-31");
    if (sequence !== requestSequence.current) return;
    setSnapshotTransactions(snapshotData);
    const inferredDay = inferFinancialCycleStartDay(snapshotData);
    if (cycleReady && !hasSavedCycle && rangeMode === "cycle" && inferredDay !== cycleStartDay) {
      setCycleStartDay(inferredDay);
      const inferredEnd = inferredDay === 1 ? 31 : inferredDay - 1;
      setCycleEndDay(inferredEnd);
      setInternalDateRange(getFinancialCycleRange(new Date(), inferredDay, inferredEnd));
    }
    if (sequence === requestSequence.current) setLoading(false);
  }

  async function hydrateAndSync(uid: string, scope: string) {
    const sequence = ++requestSequence.current;
    setLoading(true);
    cacheReady.current = false;
    loadedRanges.current.clear();
    try {
    const cached = await readFinanceCache(scope).catch(() => null);
    if (sequence !== requestSequence.current) return;
    if (cached?.transactions.length) {
      setSnapshotTransactions(cached.transactions);
      setLoading(false);
    }

    const cycle = getFinancialCycleRange(new Date(), cycleStartDay, cycleEndDay);
    const syncEnd = new Date();
    syncEnd.setFullYear(syncEnd.getFullYear() + 1);
    const syncRange = { from: cycle.from, to: syncEnd.toISOString().slice(0, 10) };
    const serverData = cached
      ? await getTransactions(uid, syncRange.from, syncRange.to)
      : await getTransactionsThrough("2100-12-31");
    if (sequence !== requestSequence.current) return;
    const merged = cached
      ? mergeTransactionRange(cached.transactions, serverData, syncRange)
      : serverData;
    setSnapshotTransactions(merged);
    loadedRanges.current.add(`${syncRange.from}:${syncRange.to}`);
    cacheReady.current = true;
    await writeFinanceCache(scope, merged).catch(() => undefined);
    } catch {
      cacheReady.current = true;
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  const ensureRangeLoaded = useCallback(async (range: { from: string; to: string }, force = false) => {
    if (!user || !cacheScope || !range.from || !range.to) return;
    const key = `${range.from}:${range.to}`;
    if (!force && loadedRanges.current.has(key)) return;
    try {
      const serverData = await getTransactions(user.uid, range.from, range.to);
      setSnapshotTransactions((items) => mergeTransactionRange(items, serverData, range));
      loadedRanges.current.add(key);
    } catch { /* preserve cached data when a deployment changes */ }
  }, [user, cacheScope]);

  const loadAllTransactions = useCallback(async () => {
    if (!user || !cacheScope) return;
    try {
      const serverData = await getTransactionsThrough("2100-12-31");
      setSnapshotTransactions(serverData);
      loadedRanges.current.add("all");
      await writeFinanceCache(cacheScope, serverData).catch(() => undefined);
    } catch { /* preserve cached data when a deployment changes */ }
  }, [user, cacheScope]);

  const setDateRange = useCallback((range: { from: string; to: string }) => {
    setRangeMode("custom");
    setInternalDateRange(range);
    void ensureRangeLoaded(range);
  }, [ensureRangeLoaded]);

  const resetToFinancialCycle = useCallback(() => {
    setRangeMode("cycle");
    setInternalDateRange(getFinancialCycleRange(new Date(), cycleStartDay, cycleEndDay));
  }, [cycleStartDay, cycleEndDay]);

  const saveFinancialCycle = useCallback(async (startDay: number, endDay: number) => {
    const result = await updateFinancialCyclePreferences(startDay, endDay);
    if (!result.success || !result.startDay || !result.endDay) return result;
    setHasSavedCycle(true);
    setCycleStartDay(result.startDay);
    setCycleEndDay(result.endDay);
    setRangeMode("cycle");
    setInternalDateRange(getFinancialCycleRange(new Date(), result.startDay, result.endDay));
    return result;
  }, []);

  const refresh = () => {
    if (user) fetchData(user.uid);
  };

  return {
    transactions,
    snapshotTransactions,
    loading,
    user,
    dateRange,
    setDateRange,
    cycleStartDay,
    cycleEndDay,
    cycleRange: getFinancialCycleRange(new Date(), cycleStartDay, cycleEndDay),
    rangeMode,
    resetToFinancialCycle,
    saveFinancialCycle,
    refresh,
    ensureRangeLoaded,
    loadAllTransactions,
    
    addTransaction: async (data: any) => {
      const res = await addTransaction(data);
      if (await handleAuthError(res)) return res;

      if (res.success && "transactions" in res && Array.isArray(res.transactions)) {
        setSnapshotTransactions((items) => [...items, ...(res.transactions as Transaction[])]);
      }
      else alert((res as any).error);
      return res;
    },
    editTransaction: async (id: string, data: any) => {
      const res = await editTransaction(id, data);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
      else alert((res as any).error);
      return res;
    },
    deleteTransaction: async (id: string) => {
      const previous = snapshotTransactions.find((item) => item.id === id);
      setSnapshotTransactions((items) => items.filter((item) => item.id !== id));
      const res = await deleteTransaction(id);
      if (await handleAuthError(res)) {
        if (previous) setSnapshotTransactions((items) => [...items, previous]);
        return res;
      }

      if (!res.success && previous) setSnapshotTransactions((items) => [...items, previous]);
      return res;
    },
    deleteRecurrence: async (id: string) => {
      const res = await deleteRecurrence(id);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
      else alert((res as any).error);
      return res;
    },
    updateTransactionStatus: async (id: string, status: 'paid' | 'pending') => {
      const previous = snapshotTransactions.find((item) => item.id === id);
      setSnapshotTransactions((items) => items.map((item) => item.id === id ? {
        ...item,
        status,
        paidAt: status === "paid" ? new Date().toISOString() : undefined,
      } : item));
      const res = await updateTransactionStatus(id, status);
      if (await handleAuthError(res)) {
        if (previous) setSnapshotTransactions((items) => items.map((item) => item.id === id ? previous : item));
        return res;
      }

      if (!res.success) {
        if (previous) setSnapshotTransactions((items) => items.map((item) => item.id === id ? previous : item));
        alert((res as any).error || "Não foi possível atualizar a conta.");
      }
      return res;
    },
    importTransactions: async (items: any[]) => {
      const res = await importTransactions(items);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
      else alert((res as any).error);
      return res;
    }
  };
}

type FinanceContextValue = ReturnType<typeof useFinanceController>;
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const value = useFinanceController();
  return createElement(FinanceContext.Provider, { value }, children);
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance precisa estar dentro de FinanceProvider.");
  return value;
}
