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
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#13161C] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Receipt size={20} className="text-white" />
            </div>
            Pagamentos Pendentes
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Mostrando todos os boletos e pix pendentes, independente da data.
          </p>
        </div>
        <div className="text-right bg-white/5 p-4 rounded-xl border border-white/10 min-w-[200px]">
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
          <div className="flex flex-col items-center justify-center py-24 bg-[#1A1D24]/50 rounded-2xl border border-white/5 border-dashed">
            <div className="p-4 bg-slate-800/50 rounded-full mb-4 text-slate-500">
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
                className="bg-[#1A1D24] border-white/5 hover:border-white/10 transition-all overflow-hidden group"
              >
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="p-5 flex flex-row md:flex-col items-center justify-between md:justify-center gap-2 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 md:w-32 shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Vence em
                      </span>
                      <span className="text-2xl font-bold text-white">
                        {dateObj.getDate()}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        {dateObj
                          .toLocaleDateString("pt-BR", { month: "short" })
                          .replace(".", "")}
                        /{dateObj.getFullYear()}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 ${status.color}`}
                    >
                      {status.icon} {status.label}
                    </div>
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-center gap-4 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-lg truncate">
                          {bill.description}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">
                          {bill.category}
                        </p>
                      </div>
                      <div className="text-right block md:hidden shrink-0">
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(Number(bill.amount))}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      {bill.pixCode && bill.pixCode.trim().length > 5 && (
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-9 w-9 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/20">
                            <QrCode size={18} className="text-indigo-400" />
                          </div>
                          <div className="flex-1 bg-black/20 rounded-lg border border-white/5 h-9 flex items-center px-3 min-w-0 overflow-hidden">
                            <p className="text-xs text-slate-400 font-mono truncate w-full block">
                              {bill.pixCode}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/50 shadow-md shadow-indigo-900/20 shrink-0"
                            onClick={() =>
                              handleCopy(bill.pixCode!, bill.id + "pix")
                            }
                          >
                            {copiedId === bill.id + "pix" ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Copy size={16} />
                            )}
                            <span className="ml-2 hidden sm:inline">
                              {copiedId === bill.id + "pix"
                                ? "Copiado"
                                : "Copiar"}
                            </span>
                          </Button>
                        </div>
                      )}

                      {bill.barCode && bill.barCode.trim().length > 5 && (
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-9 w-9 bg-slate-700/20 rounded-lg flex items-center justify-center shrink-0 border border-white/10">
                            <Barcode size={18} className="text-slate-400" />
                          </div>
                          <div className="flex-1 bg-black/20 rounded-lg border border-white/5 h-9 flex items-center px-3 min-w-0 overflow-hidden">
                            <p className="text-xs text-slate-400 font-mono truncate w-full block">
                              {bill.barCode}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 shrink-0"
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
                            <span className="ml-2 hidden sm:inline">
                              {copiedId === bill.id + "bar"
                                ? "Copiado"
                                : "Copiar"}
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 border-t md:border-t-0 md:border-l border-white/5 md:w-48 bg-white/[0.01] shrink-0">
                    <div className="text-left md:text-right hidden md:block">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">
                        Valor
                      </p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(Number(bill.amount))}
                      </p>
                    </div>

                    <Button
                      className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 shadow-lg shadow-emerald-900/20"
                      onClick={() => updateTransactionStatus(bill.id, "paid")}
                    >
                      <CheckCircle2 size={18} className="mr-2" /> Pagar
                    </Button>
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
