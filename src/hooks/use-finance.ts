"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { getTransactions, addTransaction, deleteTransaction, updateTransactionStatus, editTransaction } from "@/actions/finance-actions";
import { Transaction } from "@/lib/types";

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    from: firstDay,
    to: lastDay
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData(currentUser.uid);
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [dateRange]);

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
      if (res.success) refresh();
      else alert(res.error);
      return res;
    },
    editTransaction: async (id: string, data: any) => {
      const res = await editTransaction(id, data);
      if (res.success) refresh();
      else alert(res.error);
      return res;
    },
    deleteTransaction: async (id: string) => {
      const res = await deleteTransaction(id);
      if (res.success) refresh();
      return res;
    },
    updateTransactionStatus: async (id: string, status: 'paid' | 'pending') => {
      const res = await updateTransactionStatus(id, status);
      if (res.success) refresh();
      return res;
    }
  };
}