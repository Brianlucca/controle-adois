import { Transaction } from "@/lib/types";

const DB_NAME = "controle-a-dois-cache";
const STORE_NAME = "finance-snapshots";
const DB_VERSION = 1;

export interface FinanceCacheSnapshot {
  transactions: Transaction[];
  syncedAt: string;
}

export async function readFinanceCache(scope: string): Promise<FinanceCacheSnapshot | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(scope);
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

export async function writeFinanceCache(scope: string, transactions: Transaction[]) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  const value: FinanceCacheSnapshot = {
    transactions,
    syncedAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({ scope, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  localStorage.setItem(`finance-cache:${scope}`, JSON.stringify({ version: DB_VERSION, syncedAt: value.syncedAt, count: value.transactions.length }));
}

export function mergeTransactionRange(
  cached: Transaction[],
  incoming: Transaction[],
  range: { from: string; to: string }
) {
  const outsideRange = cached.filter((item) => item.dueDate < range.from || item.dueDate > range.to);
  const merged = new Map<string, Transaction>();
  [...outsideRange, ...incoming].forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export function trimFinanceCache(transactions: Transaction[]) {
  return transactions;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "scope" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
