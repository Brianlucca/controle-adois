"use client";

import { useEffect, useState } from "react";
import { useFinance } from "@/hooks/use-finance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Copy,
  CalendarClock,
  AlertTriangle,
  QrCode,
  Barcode,
} from "lucide-react";

export default function PaymentsPage() {
  const { transactions, updateTransactionStatus, loading, setDateRange } =
    useFinance();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setDateRange({ from: "2020-01-01", to: "2030-12-31" });
  }, [setDateRange]);

  const bills = transactions
    .filter((t) => {
      const isExpense = t.type === "expense";
      const isPending = t.status === "pending";
      const hasPix = t.pixCode && t.pixCode.trim().length > 5;
      const hasBarCode = t.barCode && t.barCode.trim().length > 5;

      return isExpense && isPending && (hasPix || hasBarCode);
    })
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  const totalToPay = bills.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getUrgency = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (dateStr < today)
      return {
        color: "text-red-400 bg-red-500/10 border-red-500/20",
        label: "Atrasado",
        icon: <AlertCircle size={14} />,
      };
    if (dateStr === today)
      return {
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        label: "Vence Hoje",
        icon: <AlertTriangle size={14} />,
      };
    return {
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      label: "No Prazo",
      icon: <CalendarClock size={14} />,
    };
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Receipt size={40} className="text-slate-600" />
          <p className="text-slate-500">Carregando todas as contas...</p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="rounded-lg bg-indigo-600 p-2">
              <Receipt size={20} className="text-white" />
            </div>
            Pagamentos Pendentes
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Mostrando todos os boletos e pix pendentes, independente da data.
          </p>
        </div>
        <div className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left md:min-w-[200px] md:w-auto md:text-right">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
            Total a Pagar
          </p>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalToPay)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#121722] py-20">
            <div className="mb-4 rounded-lg bg-slate-800/50 p-4 text-slate-500">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Tudo em dia!</h3>
            <p className="text-slate-500 max-w-md text-center mt-2 text-sm px-6">
              Você não tem nenhuma conta pendente com código de barras ou Pix
              cadastrado.
            </p>
          </div>
        ) : (
          bills.map((bill) => {
            const status = getUrgency(bill.dueDate);
            const dateObj = new Date(bill.dueDate + "T12:00:00");

            return (
              <Card
                key={bill.id}
                className="group overflow-hidden border-white/10 bg-[#121722] shadow-xl shadow-black/10 transition-all hover:border-white/20"
              >
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[118px_minmax(0,1fr)_180px]">
                    <div className="flex items-center justify-between gap-3 border-b border-dashed border-white/10 bg-[#0B0E14]/70 p-3 md:flex-col md:items-center md:justify-center md:border-b-0 md:border-r">
                      <div className="text-left md:text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Vence
                        </p>
                        <p className="mt-1 text-2xl font-black leading-none text-white">
                          {dateObj.getDate()}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {dateObj
                            .toLocaleDateString("pt-BR", { month: "short" })
                            .replace(".", "")}
                          /{dateObj.getFullYear()}
                        </p>
                      </div>
                      <div
                        className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-bold ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </div>
                    </div>

                    <div className="min-w-0 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                              Documento
                            </span>
                            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Pendente
                            </span>
                          </div>
                          <h3 className="truncate text-lg font-bold text-white">
                            {bill.description}
                          </h3>
                          <p className="text-sm font-medium text-slate-400">
                            {bill.category}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {bill.pixCode && bill.pixCode.trim().length > 5 && (
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
                              <QrCode size={17} className="text-indigo-300" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-1.5">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                Pix
                              </p>
                              <p className="block w-full truncate font-mono text-sm leading-5 text-slate-200">
                                {bill.pixCode}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="col-span-2 h-10 rounded-lg border border-indigo-500/40 bg-indigo-600 px-3 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700 sm:col-span-1"
                              onClick={() =>
                                handleCopy(bill.pixCode!, bill.id + "pix")
                              }
                            >
                              {copiedId === bill.id + "pix" ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                              <span className="ml-2 text-xs">
                                {copiedId === bill.id + "pix"
                                  ? "Copiado"
                                  : "Copiar"}
                              </span>
                            </Button>
                          </div>
                        )}

                        {bill.barCode && bill.barCode.trim().length > 5 && (
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                              <Barcode size={17} className="text-slate-300" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-1.5">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                Linha digitável
                              </p>
                              <p className="block w-full truncate font-mono text-sm leading-5 tracking-wide text-slate-200">
                                {bill.barCode}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="col-span-2 h-10 rounded-lg border-white/10 bg-white/[0.06] px-3 text-slate-100 hover:bg-white/10 sm:col-span-1"
                              onClick={() =>
                                handleCopy(bill.barCode!, bill.id + "bar")
                              }
                            >
                              {copiedId === bill.id + "bar" ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Copy size={16} />
                              )}
                              <span className="ml-2 text-xs">
                                {copiedId === bill.id + "bar"
                                  ? "Copiado"
                                  : "Copiar"}
                              </span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t border-dashed border-white/10 bg-[#0B0E14]/45 p-3 md:border-l md:border-t-0 md:p-4">
                      <div className="hidden md:block">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Valor
                        </p>
                        <p className="mt-1 font-mono text-xl font-black text-white">
                          {formatCurrency(Number(bill.amount))}
                        </p>
                      </div>

                      <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:block">
                        <div className="md:hidden">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                            Total
                          </p>
                          <p className="font-mono text-xl font-black text-white">
                            {formatCurrency(Number(bill.amount))}
                          </p>
                        </div>
                        <Button
                          className="h-10 rounded-lg bg-emerald-600 px-4 font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 md:w-full"
                          onClick={() =>
                            updateTransactionStatus(bill.id, "paid")
                          }
                        >
                          <CheckCircle2 size={16} className="mr-2" /> Pagar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
