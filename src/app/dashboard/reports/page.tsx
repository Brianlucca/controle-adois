"use client";

import { useFinance } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";

export default function ReportsPage() {
  const { transactions, dateRange, setDateRange } = useFinance();

  const handleExportCSV = () => {
    const headers = "Data,Descrição,Categoria,Tipo,Valor,Status,Observação\n";
    const rows = transactions
      .map(
        (t) =>
          `${t.dueDate},${t.description},${t.category},${t.type},${t.amount},${
            t.status
          },"${t.observation || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${dateRange.from}-a-${dateRange.to}.csv`;
    a.click();
  };

  const addToCalendar = (t: any) => {
    const title = encodeURIComponent(
      `Pagar: ${t.description} (R$ ${t.amount})`
    );
    const details = encodeURIComponent(
      `Valor: R$ ${t.amount}\nCategoria: ${t.category}\nObs: ${
        t.observation || "Sem observações"
      }`
    );
    const startDate = t.dueDate.replace(/-/g, "");
    const dateObj = new Date(t.dueDate + "T00:00:00");
    dateObj.setDate(dateObj.getDate() + 1);
    const endDate = dateObj.toISOString().split("T")[0].replace(/-/g, "");
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startDate}/${endDate}&ctz=America/Sao_Paulo`,
      "_blank"
    );
  };

  const pendingBills = transactions.filter(
    (t) => t.type === "expense" && t.status === "pending"
  );

  const getDateParts = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return {
      day: date.getDate().toString().padStart(2, "0"),
      month: date
        .toLocaleString("pt-BR", { month: "short" })
        .toUpperCase()
        .replace(".", ""),
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Relatórios & Ferramentas
          </h1>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Exporte seus dados para análise externa ou sincronize suas contas
            pendentes com sua agenda pessoal.
          </p>
        </div>
        <div className="w-full md:w-auto">
          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onChange={setDateRange}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1D24] to-[#13161C] border border-white/5 shadow-2xl group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
            <FileSpreadsheet size={200} />
          </div>

          <div className="p-8 flex flex-col h-full relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-900/20 border border-emerald-500/20">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Exportar Dados</h3>
                <p className="text-xs text-emerald-400 font-medium">
                  CSV Compatível com Excel
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-sm mb-8 leading-relaxed flex-1">
              Gere um arquivo CSV contendo todas as transações do período
              selecionado ({transactions.length} registros). Ideal para backups
              ou análises avançadas em planilhas.
            </p>

            <Button
              onClick={handleExportCSV}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-14 text-base font-bold shadow-lg shadow-emerald-900/20 rounded-xl transition-all active:scale-[0.98]"
            >
              <Download className="mr-2" size={20} /> Baixar Relatório Completo
            </Button>
          </div>
        </div>

        <div className="flex flex-col rounded-3xl bg-[#1A1D24] border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Calendar size={20} />
              </div>
              <h3 className="font-bold text-white text-lg">
                Próximos Pagamentos
              </h3>
            </div>
            <span className="text-xs font-bold bg-white/5 text-slate-400 px-3 py-1 rounded-full border border-white/5">
              {pendingBills.length} pendentes
            </span>
          </div>

          <div className="flex-1 p-6 bg-[#13161C]">
            {pendingBills.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                {pendingBills.map((t) => {
                  const dateParts = getDateParts(t.dueDate);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 bg-[#1A1D24] p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group hover:bg-[#20242D]"
                    >
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-white/5 rounded-lg border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                        <span className="text-lg font-bold text-white leading-none">
                          {dateParts.day}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                          {dateParts.month}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {t.description}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {t.category}
                          </span>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 rounded border border-indigo-500/10 font-mono">
                            R$ {t.amount}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-slate-500 hover:text-white hover:bg-indigo-600 rounded-lg transition-all"
                        onClick={() => addToCalendar(t)}
                        title="Adicionar ao Google Agenda"
                      >
                        <ExternalLink size={18} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="bg-emerald-500/10 p-4 rounded-full mb-4 text-emerald-500">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-white font-bold mb-1">Tudo em dia!</h4>
                <p className="text-xs text-slate-500 max-w-[200px] text-center">
                  Não há contas pendentes filtradas para este período.
                </p>
              </div>
            )}
          </div>

          {pendingBills.length > 0 && (
            <div className="p-4 bg-[#1A1D24] border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                <Clock size={12} /> Clique no ícone lateral para agendar o
                lembrete
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
