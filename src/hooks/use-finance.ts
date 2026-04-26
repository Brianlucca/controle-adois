"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { getTransactions, addTransaction, deleteTransaction, updateTransactionStatus, editTransaction, importTransactions, deleteRecurrence } from "@/actions/finance-actions";
import { logout } from "@/actions/auth-actions";
import { Transaction } from "@/lib/types";

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    from: firstDay,
    to: lastDay
  });

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
      setUser(currentUser);
      if (!currentUser) {
        setTransactions([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) fetchData(user.uid);
  }, [user, dateRange.from, dateRange.to]);

  async function fetchData(uid: string) {
    setLoading(true);
    const data = await getTransactions(uid, dateRange.from, dateRange.to);
    setTransactions(data);
    setLoading(false);
  }

  const refresh = () => {
    if (user) fetchData(user.uid);
  };

  return {
    transactions,
    loading,
    user,
    dateRange,
    setDateRange,
    refresh,
    
    addTransaction: async (data: any) => {
      const res = await addTransaction(data);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
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
      const res = await deleteTransaction(id);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
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
      const res = await updateTransactionStatus(id, status);
      if (await handleAuthError(res)) return res;

      if (res.success) refresh();
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
