"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Loader2, Pencil, Repeat2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RecurrencesModal({
  transactions,
  onClose,
  onEdit,
  onDelete,
  loading = false,
}: {
  transactions: Transaction[];
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<void>;
  loading?: boolean;
}) {
  const [busyGroup, setBusyGroup] = useState("");
  const recurrences = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const item of transactions) {
      if (item.deletedAt || item.recurrenceActive === false) continue;
      const groupId = item.recurrenceGroupId || item.id;
      const group = groups.get(groupId) || [];
      group.push(item);
      groups.set(groupId, group);
    }
    return [...groups.entries()].map(([id, items]) => {
      const ordered = [...items].sort((a, b) =>
        (a.recurrenceIndex || 0) - (b.recurrenceIndex || 0),
      );
      return { id, representative: ordered[0], items: ordered };
    }).sort((a, b) => a.representative.dueDate.localeCompare(b.representative.dueDate));
  }, [transactions]);

  async function run(groupId: string, action: () => Promise<void>) {
    setBusyGroup(groupId);
    try { await action(); } finally { setBusyGroup(""); }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[#25222e]/20 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[#e2dfe3] bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-[#e8e6e9] bg-[#faf9fb] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#eeecff] p-2.5 text-[#635bff]"><Repeat2 size={20} /></span>
            <div><h2 className="font-bold text-[#292a30] sm:text-lg">Recorrências</h2><p className="text-xs text-[#858891]">Edite ou interrompa lançamentos mensais</p></div>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 text-[#858891] hover:bg-[#eeecf0]"><X size={20} /></button>
        </header>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#635bff]" /></div>
          ) : !recurrences.length ? (
            <div className="py-16 text-center text-sm text-[#858891]">Nenhuma recorrência encontrada no período carregado.</div>
          ) : (
            <div className="space-y-3">
              {recurrences.map(({ id, representative, items }) => {
                const day = Number(representative.dueDate.slice(8, 10));
                const busy = busyGroup === id;
                const total = representative.recurrenceTotal || representative.recurrenceMonths || items.length;
                return (
                  <article key={id} className="rounded-xl border border-[#e5e3e7] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[#292a30]">{representative.description}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#73757d]">
                          <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Todo dia {day}</span>
                          <span>{formatCurrency(representative.amount)}</span>
                          <span>{total} {total === 1 ? "mês" : "meses"}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onEdit(representative)} className="h-9 px-3"><Pencil size={14} className="mr-1.5" />Editar</Button>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => void run(id, () => onDelete(representative))} className="h-9 border-red-200 px-3 text-red-600">{busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}Excluir</Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
