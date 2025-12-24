"use client";

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
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

export default function PaymentsPage() {
  const { transactions, updateTransactionStatus, loading } = useFinance();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bills = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.status === "pending" &&
        (t.pixCode || t.barCode)
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  const totalToPay = bills.reduce((acc, curr) => acc + curr.amount, 0);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        document.execCommand("copy");
        document.body.removeChild(textArea);

        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (fallbackErr) {
        alert(
          "Não foi possível copiar automaticamente. Selecione o texto manualmente."
        );
      }
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
      <div className="p-12 text-center text-slate-500">
        Carregando pagamentos...
      </div>
    );

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="bg-[#1A1D24] p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-5 z-10">
          <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/5 border border-orange-500/20 text-orange-400 rounded-2xl shadow-lg shadow-orange-900/20">
            <Receipt size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Central de Pagamentos
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Gerencie boletos e códigos Pix pendentes.
            </p>
          </div>
        </div>

        <div className="text-right bg-[#0B0E14]/50 p-5 rounded-xl border border-white/10 min-w-[240px] backdrop-blur-md z-10">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
            Total em Aberto
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(totalToPay)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-[#1A1D24]/50 rounded-2xl border border-white/5 border-dashed">
            <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Tudo pago!</h3>
            <p className="text-slate-500 max-w-sm text-center mt-2 text-sm">
              Não existem contas com códigos de pagamento pendentes para este
              mês.
            </p>
          </div>
        ) : (
          bills.map((bill) => {
            const status = getUrgency(bill.dueDate);
            return (
              <Card
                key={bill.id}
                className="bg-[#1A1D24] border-white/5 hover:border-white/10 hover:bg-[#20242D] transition-all group overflow-hidden"
              >
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="p-6 flex flex-col items-center justify-center min-w-[140px] border-b md:border-b-0 md:border-r border-white/5 bg-[#16181D]">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 mb-3 ${status.color}`}
                    >
                      {status.icon} {status.label}
                    </span>
                    <span className="text-4xl font-bold text-white tracking-tighter">
                      {bill.dueDate.split("-")[2]}
                    </span>
                    <span className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">
                      {new Date(bill.dueDate).toLocaleDateString("pt-BR", {
                        month: "long",
                      })}
                    </span>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-white">
                          {bill.description}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-bold">
                          {bill.category}
                        </p>
                      </div>
                      <span className="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded">
                        Criado por{" "}
                        {bill.userName
                          ? bill.userName.split(" ")[0]
                          : "Usuário"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 mt-5">
                      {bill.pixCode && (
                        <div className="flex items-center gap-3 bg-[#0B0E14] p-3 rounded-lg border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                          <div className="h-8 w-8 bg-indigo-500/20 rounded flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-indigo-400">
                              PIX
                            </span>
                          </div>
                          <p className="text-xs font-mono truncate flex-1 text-slate-300">
                            {bill.pixCode}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400"
                            onClick={() => handleCopy(bill.pixCode!, bill.id)}
                          >
                            {copiedId === bill.id ? (
                              <span className="text-emerald-400 text-xs font-bold flex gap-1">
                                <CheckCircle2 size={14} /> Copiado
                              </span>
                            ) : (
                              <span className="flex gap-1 text-xs">
                                <Copy size={14} /> Copiar
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                      {bill.barCode && (
                        <div className="flex items-center gap-3 bg-[#0B0E14] p-3 rounded-lg border border-white/5 group-hover:border-white/20 transition-colors">
                          <div className="h-8 w-8 bg-slate-700/30 rounded flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-slate-400">
                              CÓD
                            </span>
                          </div>
                          <p className="text-xs font-mono truncate flex-1 text-slate-300">
                            {bill.barCode}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 hover:bg-white/10 hover:text-white text-slate-400"
                            onClick={() => handleCopy(bill.barCode!, bill.id)}
                          >
                            {copiedId === bill.id ? (
                              <span className="text-emerald-400 text-xs font-bold flex gap-1">
                                <CheckCircle2 size={14} /> Copiado
                              </span>
                            ) : (
                              <span className="flex gap-1 text-xs">
                                <Copy size={14} /> Copiar
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-center items-end gap-3 border-t md:border-t-0 md:border-l border-white/5 min-w-[180px] bg-[#16181D]/50">
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {formatCurrency(bill.amount)}
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
                      onClick={() => updateTransactionStatus(bill.id, "paid")}
                    >
                      <CheckCircle2 size={16} className="mr-2" /> Marcar Pago
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
