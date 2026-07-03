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
  const [payingId, setPayingId] = useState<string | null>(null);

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
    } catch {
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

  const handlePay = async (id: string) => {
    if (payingId) return;

    setPayingId(id);
    window.setTimeout(async () => {
      await updateTransactionStatus(id, "paid");
      setPayingId(null);
    }, 950);
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Receipt size={40} className="text-slate-600" />
          <p className="text-slate-500">Carregando todas as contas...</p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <div className="rounded-lg bg-indigo-600 p-2">
              <Receipt size={20} className="text-white" />
            </div>
            Pagamentos Pendentes
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Mostrando todos os boletos e pix pendentes, independente da data.
          </p>
        </div>
        <div className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left md:w-auto md:min-w-[200px] md:text-right">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Total a Pagar
          </p>
          <p className="text-2xl font-bold tracking-tight text-white">
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
            <p className="mt-2 max-w-md px-6 text-center text-sm text-slate-500">
              Você não tem nenhuma conta pendente com código de barras ou Pix
              cadastrado.
            </p>
          </div>
        ) : (
          bills.map((bill) => {
            const status = getUrgency(bill.dueDate);
            const dateObj = new Date(bill.dueDate + "T12:00:00");
            const isPaying = payingId === bill.id;

            return (
              <Card
                key={bill.id}
                className={`invoice-card group relative overflow-hidden border-white/10 bg-[#121722] shadow-xl shadow-black/10 transition-all hover:border-white/20 ${
                  isPaying ? "invoice-card-paying" : ""
                }`}
              >
                <div className="pointer-events-none absolute inset-x-4 top-0 hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent sm:block" />
                {isPaying && (
                  <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                    <div className="invoice-paid-stamp">
                      <CheckCircle2 size={18} />
                      Pago
                    </div>
                  </div>
                )}

                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-[148px_minmax(0,1fr)_224px]">
                    <div className="invoice-slip-section relative flex items-center justify-between gap-3 border-b border-dashed border-white/10 bg-[#0B0E14]/70 p-4 lg:flex-col lg:items-center lg:justify-center lg:border-b-0 lg:border-r lg:border-dashed">
                      {isPaying && <div className="invoice-cut-seam" />}
                      <div className="absolute -right-3 top-6 hidden h-6 w-6 rounded-full border border-white/10 bg-[#0B0E14] lg:block" />
                      <div className="absolute -right-3 bottom-6 hidden h-6 w-6 rounded-full border border-white/10 bg-[#0B0E14] lg:block" />

                      <div className="text-left lg:text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Vence
                        </p>
                        <p className="mt-1 text-3xl font-black leading-none text-white">
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
                        className={`flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-bold ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </div>
                    </div>

                    <div className="invoice-body-section min-w-0 p-4 sm:p-5">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
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

                      <div className="mt-4 space-y-2.5">
                        {bill.pixCode && bill.pixCode.trim().length > 5 && (
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_108px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
                              <QrCode size={17} className="text-indigo-300" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                Pix
                              </p>
                              <p className="block w-full truncate font-mono text-sm leading-5 text-slate-200">
                                {bill.pixCode}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="col-span-2 h-12 rounded-lg border border-indigo-500/40 bg-indigo-600 px-3 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700 sm:col-span-1"
                              onClick={() =>
                                handleCopy(bill.pixCode!, bill.id + "pix")
                              }
                              disabled={isPaying}
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
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_108px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                              <Barcode size={17} className="text-slate-300" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2">
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
                              className="col-span-2 h-12 rounded-lg border-white/10 bg-white/[0.06] px-3 text-slate-100 hover:bg-white/10 sm:col-span-1"
                              onClick={() =>
                                handleCopy(bill.barCode!, bill.id + "bar")
                              }
                              disabled={isPaying}
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

                    <div className="invoice-body-section flex flex-col justify-between gap-4 border-t border-dashed border-white/10 bg-[#0B0E14]/45 p-4 lg:border-l lg:border-t-0 lg:p-5">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Valor
                        </p>
                        <p className="mt-2 font-mono text-2xl font-black text-white">
                          {formatCurrency(Number(bill.amount))}
                        </p>
                      </div>

                      <Button
                        className="h-12 w-full rounded-lg bg-emerald-600 px-4 font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500"
                        onClick={() => handlePay(bill.id)}
                        disabled={Boolean(payingId)}
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        {isPaying ? "Pagando" : "Pagar"}
                      </Button>
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
