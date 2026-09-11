"use client";

import { useState } from "react";
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
  const { snapshotTransactions, updateTransactionStatus, loading } =
    useFinance();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const bills = snapshotTransactions
    .filter((t) => {
      const isExpense = t.type === "expense";
      const isPending = t.status === "pending";
      const hasPix = t.pixCode && t.pixCode.trim().length > 5;
      const hasBarCode = t.barCode && t.barCode.trim().length > 5;

      return isExpense && isPending && (hasPix || hasBarCode);
    })
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
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
    await updateTransactionStatus(id, "paid");
    setPayingId(null);
  };

  const getUrgency = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (dateStr < today)
      return {
        color: "border-[#ffd1cc] bg-[#fff1ef] text-[#c94f44]",
        label: "Atrasado",
        icon: <AlertCircle size={14} />,
      };
    if (dateStr === today)
      return {
        color: "border-[#f1d9a5] bg-[#fff8e8] text-[#9a6710]",
        label: "Vence Hoje",
        icon: <AlertTriangle size={14} />,
      };
    return {
      color: "border-[#bfe8d9] bg-[#edf9f5] text-[#168267]",
      label: "No Prazo",
      icon: <CalendarClock size={14} />,
    };
  };

  if (loading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Receipt size={40} className="text-[#8b8e96]" />
          <p className="text-[#71747d]">Carregando todas as contas...</p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="app-kicker">Contas & Pix</p>
          <h2 className="app-title mt-1">Pagamentos pendentes</h2>
          <p className="mt-1 text-sm text-[#71747d]">
            Mostrando todos os boletos e pix pendentes, independente da data.
          </p>
        </div>
        <div className="w-full rounded-2xl border border-[#dedbe9] bg-[#f0efff] p-4 text-left md:w-auto md:min-w-[200px] md:text-right">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7e818a]">
            Total a Pagar
          </p>
          <p className="text-2xl font-bold tracking-tight text-[#27282e]">
            {formatCurrency(totalToPay)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfdde1] bg-white py-20">
            <div className="mb-4 rounded-2xl bg-[#e9f8f2] p-4 text-[#168267]">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-[#27282e]">Tudo em dia!</h3>
            <p className="mt-2 max-w-md px-6 text-center text-sm text-[#71747d]">
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
                className={`invoice-card group relative overflow-hidden border-[#e3e1e4] bg-white shadow-[0_16px_35px_-28px_rgba(31,29,43,0.45)] transition-all hover:border-[#cbc7df] hover:shadow-[0_20px_42px_-28px_rgba(31,29,43,0.5)] ${
                  isPaying ? "invoice-card-paying" : ""
                }`}
              >
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
                    <div className="invoice-slip-section relative flex items-center justify-between gap-3 border-b border-dashed border-[#d9d7dc] bg-[#faf9fb] p-4 lg:flex-col lg:items-center lg:justify-center lg:border-b-0 lg:border-r lg:border-dashed">
                      {isPaying && <div className="invoice-cut-seam" />}
                      <div className="absolute -right-3 top-6 hidden h-6 w-6 rounded-full border border-[#e3e1e4] bg-[#f7f6f3] lg:block" />
                      <div className="absolute -right-3 bottom-6 hidden h-6 w-6 rounded-full border border-[#e3e1e4] bg-[#f7f6f3] lg:block" />

                      <div className="text-left lg:text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#92949c]">
                          Vence
                        </p>
                        <p className="mt-1 text-3xl font-black leading-none text-[#27282e]">
                          {dateObj.getDate()}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#8a8c94]">
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
                          <span className="rounded-md border border-[#d8d4ff] bg-[#f1efff] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#635bff]">
                            Documento
                          </span>
                          <span className="rounded-md border border-[#e3e1e4] bg-[#f7f6f8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#71747d]">
                            Pendente
                          </span>
                        </div>
                        <h3 className="truncate text-lg font-bold text-[#27282e]">
                          {bill.description}
                        </h3>
                        <p className="text-sm font-medium text-[#71747d]">
                          {bill.category}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {bill.pixCode && bill.pixCode.trim().length > 5 && (
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_108px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#d8d4ff] bg-[#f1efff]">
                              <QrCode size={17} className="text-[#635bff]" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-[#e3e1e4] bg-white px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#92949c]">
                                Pix
                              </p>
                              <p className="block w-full truncate font-mono text-sm leading-5 text-[#292a30]">
                                {bill.pixCode}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="col-span-2 h-12 rounded-lg border border-[#635bff] bg-[#635bff] px-3 text-[#fff] shadow-[0_8px_18px_-10px_rgba(99,91,255,0.75)] hover:bg-[#554cf0] sm:col-span-1"
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
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#e3e1e4] bg-[#f7f6f8]">
                              <Barcode size={17} className="text-[#71747d]" />
                            </div>
                            <div className="min-w-0 rounded-lg border border-[#e3e1e4] bg-white px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#92949c]">
                                Linha digitável
                              </p>
                              <p className="block w-full truncate font-mono text-sm leading-5 tracking-wide text-[#292a30]">
                                {bill.barCode}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="col-span-2 h-12 rounded-lg border-[#dedce1] bg-white px-3 text-[#292a30] hover:border-[#c7c3d9] hover:bg-[#f8f7fa] sm:col-span-1"
                              onClick={() =>
                                handleCopy(bill.barCode!, bill.id + "bar")
                              }
                              disabled={isPaying}
                            >
                              {copiedId === bill.id + "bar" ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-[#168267]"
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

                    <div className="invoice-body-section flex flex-col justify-between gap-4 border-t border-dashed border-[#d9d7dc] bg-[#faf9fb] p-4 lg:border-l lg:border-t-0 lg:p-5">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#92949c]">
                          Valor
                        </p>
                        <p className="mt-2 font-mono text-2xl font-black text-[#27282e]">
                          {formatCurrency(Number(bill.amount))}
                        </p>
                      </div>

                      <Button
                        className="h-12 w-full rounded-lg bg-[#168267] px-4 font-bold text-[#fff] shadow-[0_8px_18px_-10px_rgba(22,130,103,0.7)] hover:bg-[#116e57]"
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
