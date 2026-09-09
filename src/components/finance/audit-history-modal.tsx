"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw, Search, Trash2, X } from "lucide-react";
import { getAuditLogs, restoreTransaction } from "@/actions/audit-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuditLog = { id: string; action: string; entityId: string; actorName: string; createdAt: string; before?: Record<string, unknown>; after?: Record<string, unknown> };
const labels: Record<string, string> = { created: "Adicionada", imported: "Importada", updated: "Alterada", status_changed: "Status alterado", deleted: "Enviada para a lixeira", restored: "Restaurada" };
const fields: Record<string, string> = { description: "Descrição", amount: "Valor", category: "Categoria", type: "Tipo", status: "Status", dueDate: "Data", observation: "Observação" };

export function AuditHistoryModal({ onClose, onRestored }: { onClose: () => void; onRestored: () => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]); const [loading, setLoading] = useState(true); const [restoring, setRestoring] = useState(""); const [search, setSearch] = useState("");
  const load = useCallback(async () => { setLoading(true); const result = await getAuditLogs(); if (result.success && "logs" in result) setLogs((result.logs || []) as AuditLog[]); setLoading(false); }, []);
  useEffect(() => {
    let active = true;
    void getAuditLogs().then((result) => {
      if (active && result.success && "logs" in result) {
        setLogs((result.logs || []) as AuditLog[]);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  async function restore(id: string) { setRestoring(id); const result = await restoreTransaction(id); setRestoring(""); if (!result.success) return alert(("error" in result && result.error) || "Não foi possível restaurar."); await load(); onRestored(); }
  const latestByTransaction = new Map<string, string>(); logs.forEach((log) => { if (!latestByTransaction.has(log.entityId)) latestByTransaction.set(log.entityId, log.action); });
  const filteredLogs = useMemo(() => { const term = normalizeSearch(search); if (!term) return logs; return logs.filter((log) => { const transaction = log.after || log.before || {}; const amount = Number(transaction.amount || 0); return normalizeSearch([transaction.description, transaction.category, log.entityId, log.actorName, labels[log.action] || log.action, amount, amount.toFixed(2), amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })].join(" ")).includes(term); }); }, [logs, search]);
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1420] shadow-2xl sm:max-h-[88vh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-white/10 bg-[#151b29] p-4 sm:p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-2.5 text-indigo-300"><History size={20} /></div><div><h2 className="font-bold text-white sm:text-lg">Histórico e lixeira</h2><p className="text-xs text-slate-400">Atividades do workspace atual</p></div></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={20} /></button></header>
      <div className="border-b border-white/10 p-3 sm:px-5"><div className="relative"><Search className="absolute left-3 top-3 text-slate-500" size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, valor, ID, ação ou responsável..." className="h-10 border-white/10 bg-[#090d15] pl-10 text-white placeholder:text-slate-600" /></div></div>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3 sm:p-5">{loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-300" /></div> : !logs.length ? <div className="py-20 text-center text-slate-500">Nenhuma atividade registrada.</div> : !filteredLogs.length ? <div className="py-20 text-center text-slate-500">Nenhum resultado para esta pesquisa.</div> : <div className="space-y-3">{filteredLogs.map((log) => <article key={log.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${log.action === "deleted" ? "bg-red-500/15 text-red-300" : log.action === "restored" ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-indigo-200"}`}>{log.action === "deleted" && <Trash2 size={12} />}{labels[log.action] || log.action}</span><h3 className="mt-2 font-bold text-white">{String(log.after?.description || log.before?.description || "Transação")}</h3></div><time className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</time></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div><p className="break-all font-mono text-[11px] text-slate-500">ID: {log.entityId}</p><p className="mt-1 text-xs text-slate-400">Responsável: {log.actorName}</p></div>{log.action === "deleted" && latestByTransaction.get(log.entityId) === "deleted" && <Button onClick={() => restore(log.entityId)} disabled={restoring === log.entityId} className="h-9 bg-emerald-600 text-white hover:bg-emerald-500">{restoring === log.entityId ? <Loader2 className="mr-2 animate-spin" size={14} /> : <RotateCcw className="mr-2" size={14} />}Restaurar</Button>}</div><Changes before={log.before} after={log.after} />
      </article>)}</div>}</div>
    </div></div>;
}
function Changes({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) { const keys = Object.keys(fields).filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null)); if (!keys.length) return null; return <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">{keys.map((key) => <div key={key} className="rounded-lg bg-[#1a2130] p-2.5 text-xs"><span className="text-slate-500">{fields[key]}: </span>{before && <span className="text-red-300 line-through">{formatValue(key, before[key])}</span>}{before && after && " → "}{after && <span className="text-emerald-300">{formatValue(key, after[key])}</span>}</div>)}</div>; }
function formatValue(key: string, value: unknown) { if (key === "amount") return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); if (key === "type") return value === "income" ? "Entrada" : "Saída"; if (key === "status") return value === "paid" ? "Pago" : "Pendente"; if (key === "dueDate" && value) return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); return String(value ?? "—"); }
function formatDateTime(value: string) { return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function normalizeSearch(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
