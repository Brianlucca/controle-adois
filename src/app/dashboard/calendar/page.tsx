"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFinance } from "@/hooks/use-finance";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BrandIcon } from "@/components/brand-icon";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import "@/app/calendar.css";

export default function CalendarPage() {
  const { transactions, loading, setDateRange } = useFinance();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDateRange({ from: "2023-01-01", to: "2030-12-31" });
  }, [setDateRange]);

  const handleDatesSet = (arg: any) => {
    const title = arg.view.title.replace(/^\w/, (c: string) => c.toUpperCase());
    setCurrentTitle(title);
  };

  const handleEventClick = (info: any) => {
    const txData = info.event.extendedProps.originalData;
    setSelectedEvent(txData);
    setIsModalOpen(true);
  };

  const events = transactions.map((t) => {
    let bgColor = "";
    let borderColor = "";

    if (t.type === "income") {
      bgColor = "#064e3b";
      borderColor = "#10b981";
    } else if (t.status === "paid") {
      bgColor = "#1e293b";
      borderColor = "#475569";
    } else {
      const isLate = new Date(t.dueDate) < new Date();
      bgColor = isLate ? "#450a0a" : "#451a03";
      borderColor = isLate ? "#ef4444" : "#f59e0b";
    }

    return {
      id: t.id,
      title: t.description,
      start: t.dueDate,
      backgroundColor: bgColor,
      borderColor: borderColor,
      extendedProps: {
        amount: t.amount,
        type: t.type,
        status: t.status,
        originalData: t,
      },
    };
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto animate-in fade-in duration-500 pb-12 h-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#13161C] p-4 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl hidden md:block">
            <CalendarIcon size={24} className="text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight capitalize">
            {currentTitle || "Carregando..."}
          </h1>
        </div>

        <div className="flex items-center bg-black/20 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => calendarRef.current?.getApi().prev()}
            className="p-2 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => calendarRef.current?.getApi().today()}
            className="px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-white/5 rounded-md transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => calendarRef.current?.getApi().next()}
            className="p-2 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-[#1A1D24] p-1 rounded-2xl border border-white/5 shadow-2xl h-[75vh] relative z-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={false}
          events={events}
          height="100%"
          dayMaxEvents={3}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventContent={(arg) => {
            const { amount, status, type } = arg.event.extendedProps;
            const isPaid = status === "paid" && type === "expense";

            return (
              <div className="flex items-center justify-between w-full overflow-hidden px-2 py-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      arg.event.backgroundColor === "#064e3b"
                        ? "bg-emerald-400"
                        : isPaid
                        ? "bg-slate-400"
                        : "bg-white"
                    }`}
                  ></div>
                  <span
                    className={`text-[10px] font-medium truncate ${
                      isPaid ? "text-slate-400 line-through" : "text-white"
                    }`}
                  >
                    {arg.event.title}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold ml-1 ${
                    type === "income" ? "text-emerald-400" : "text-slate-300"
                  }`}
                >
                  {type === "expense" && !isPaid ? "" : ""}
                  {formatCurrency(amount).split(",")[0]}
                </span>
              </div>
            );
          }}
        />
      </div>

      {mounted &&
        isModalOpen &&
        selectedEvent &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-[#1A1D24] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`h-24 relative flex items-center justify-center ${
                  selectedEvent.type === "income"
                    ? "bg-emerald-500/20"
                    : selectedEvent.status === "paid"
                    ? "bg-slate-700/20"
                    : "bg-red-500/20"
                }`}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-3 right-3 p-1.5 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="flex flex-col items-center z-10 mt-4">
                  <BrandIcon
                    description={selectedEvent.description}
                    category={selectedEvent.category}
                    type={selectedEvent.type}
                    className="w-14 h-14 rounded-2xl shadow-lg mb-[-28px] border-4 border-[#1A1D24]"
                  />
                </div>
              </div>

              <div className="pt-10 pb-8 px-6 text-center">
                <h3 className="text-lg font-bold text-white leading-tight mb-1">
                  {selectedEvent.description}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {selectedEvent.category}
                </p>

                <div className="text-3xl font-bold text-white mb-6 tracking-tight">
                  {selectedEvent.type === "expense" ? "- " : "+ "}
                  {formatCurrency(selectedEvent.amount)}
                </div>

                <div className="bg-[#13161C] rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Vencimento</span>
                    <span className="text-slate-300 font-medium">
                      {formatDate(selectedEvent.dueDate)}
                    </span>
                  </div>
                  <div className="h-px bg-white/5"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Status</span>
                    {selectedEvent.status === "paid" ? (
                      <span className="flex items-center text-emerald-400 font-bold gap-1.5 text-xs bg-emerald-500/10 px-2 py-1 rounded">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-400 font-bold gap-1.5 text-xs bg-amber-500/10 px-2 py-1 rounded">
                        <Clock size={12} /> Pendente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
