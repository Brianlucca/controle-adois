"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFinance } from "@/hooks/use-finance";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type {
  DatesSetArg,
  EventClickArg,
  MoreLinkArg,
} from "@fullcalendar/core";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BrandIcon } from "@/components/brand-icon";
import type { Transaction } from "@/lib/types";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import "@/app/calendar.css";

export default function CalendarPage() {
  const { transactions, loading, setDateRange } = useFinance();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Transaction | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Transaction[]>([]);
  const [selectedDayTitle, setSelectedDayTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileCalendar, setIsMobileCalendar] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    setDateRange({ from: "2023-01-01", to: "2030-12-31" });
    return () => cancelAnimationFrame(frame);
  }, [setDateRange]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewportMode = () => setIsMobileCalendar(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);

    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  const handleDatesSet = (arg: DatesSetArg) => {
    const title = arg.view.title.replace(/^\w/, (c: string) => c.toUpperCase());
    setCurrentTitle(title);
  };

  const handleEventClick = (info: EventClickArg) => {
    const txData = info.event.extendedProps.originalData as Transaction;
    setSelectedEvent(txData);
    setIsModalOpen(true);
  };

  const handleMoreLinkClick = (arg: MoreLinkArg) => {
    const dayEvents = arg.allSegs
      .map((segment) => segment.event.extendedProps.originalData as Transaction)
      .filter((transaction): transaction is Transaction => Boolean(transaction))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    setSelectedDayEvents(dayEvents);
    setSelectedDayTitle(formatDate(arg.date.toISOString().split("T")[0]));
    setIsDayModalOpen(true);

    return "none";
  };

  const events = transactions.map((t) => {
    let bgColor = "";
    let borderColor = "";

    if (t.type === "income") {
      bgColor = "#e5f6ef";
      borderColor = "#54ae91";
    } else if (t.status === "paid") {
      bgColor = "#efedf3";
      borderColor = "#aaa6b2";
    } else {
      const isLate = new Date(t.dueDate) < new Date();
      bgColor = isLate ? "#ffebe8" : "#fff1e5";
      borderColor = isLate ? "#df796d" : "#df9a63";
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
    <div className="mx-auto h-full max-w-[1920px] space-y-5 pb-24 animate-in fade-in duration-500 lg:pb-12">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div>
            <p className="app-kicker">Agenda financeira</p>
            <h1 className="app-title mt-1 capitalize">
              {currentTitle || "Carregando..."}
            </h1>
          </div>
        </div>

        <div className="flex w-full items-center justify-between rounded-xl border border-[#dedce1] bg-white p-1 md:w-auto">
          <button
            onClick={() => calendarRef.current?.getApi().prev()}
            className="rounded-lg p-2 text-[#686a72] transition-colors hover:bg-[#f1f0f3] hover:text-[#292a30]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => calendarRef.current?.getApi().today()}
            className="rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#55575f] transition-colors hover:bg-[#f1f0f3]"
          >
            Hoje
          </button>
          <button
            onClick={() => calendarRef.current?.getApi().next()}
            className="rounded-lg p-2 text-[#686a72] transition-colors hover:bg-[#f1f0f3] hover:text-[#292a30]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative z-0 rounded-2xl border border-[#e5e3e4] bg-white p-1 shadow-[0_12px_35px_-30px_rgba(31,29,43,.4)] md:h-[75vh]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={false}
          events={events}
          height={isMobileCalendar ? "auto" : "100%"}
          dayMaxEvents={isMobileCalendar ? 2 : 3}
          fixedWeekCount={false}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          moreLinkClick={handleMoreLinkClick}
          eventContent={(arg) => {
            const { amount, status, type } = arg.event.extendedProps;
            const isPaid = status === "paid" && type === "expense";

            return (
              <div className="flex w-full items-center justify-between overflow-hidden px-1.5 py-1 sm:px-2">
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
                    className={`truncate text-[9px] font-medium sm:text-[10px] ${
                      isPaid ? "text-slate-400 line-through" : "text-white"
                    }`}
                  >
                    {isMobileCalendar
                      ? formatCurrency(amount).split(",")[0]
                      : arg.event.title}
                  </span>
                </div>
                {!isMobileCalendar && (
                  <span
                    className={`ml-1 text-[9px] font-bold ${
                      type === "income" ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {formatCurrency(amount).split(",")[0]}
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      {mounted &&
        isDayModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#25222e]/15 p-4 animate-in fade-in duration-200"
            onClick={() => setIsDayModalOpen(false)}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e2dfe3] bg-white shadow-[0_24px_70px_-25px_rgba(30,27,48,.42)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#e8e6e9] bg-[#faf9fb] px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Transações do dia
                  </p>
                  <h3 className="text-lg font-bold text-[#292a30]">
                    {selectedDayTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDayModalOpen(false)}
                  className="rounded-full p-1.5 text-[#8b8d95] transition-colors hover:bg-[#eeecf0] hover:text-[#292a30]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-3 custom-scrollbar">
                {selectedDayEvents.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(tx);
                      setIsDayModalOpen(false);
                      setIsModalOpen(true);
                    }}
                    className={`mb-2 flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                      tx.type === "income"
                        ? "border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15"
                        : tx.status === "paid"
                          ? "border-[#e3e1e4] bg-[#faf9fb] hover:bg-[#f5f4f6]"
                          : "border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <BrandIcon
                        description={tx.description}
                        category={tx.category}
                        type={tx.type}
                        className="h-9 w-9 rounded-lg bg-white ring-1 ring-[#e8e5e9]"
                      />
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-bold ${tx.status === "paid" && tx.type === "expense" ? "text-[#9a9ca3] line-through" : "text-[#292a30]"}`}
                        >
                          {tx.description}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {tx.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${tx.type === "income" ? "text-emerald-400" : "text-slate-200"}`}
                    >
                      {tx.type === "expense" ? "- " : "+ "}
                      {formatCurrency(tx.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        isModalOpen &&
        selectedEvent &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#25222e]/15 p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#e2dfe3] bg-white shadow-[0_24px_70px_-25px_rgba(30,27,48,.42)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`h-24 relative flex items-center justify-center ${
                  selectedEvent.type === "income"
                    ? "bg-emerald-500/20"
                    : selectedEvent.status === "paid"
                      ? "bg-[#f1f0f3]"
                      : "bg-red-500/20"
                }`}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-3 top-3 rounded-full bg-white/80 p-1.5 text-[#55575f] transition-colors hover:bg-white"
                >
                  <X size={16} />
                </button>

                <div className="flex flex-col items-center z-10 mt-4">
                  <BrandIcon
                    description={selectedEvent.description}
                    category={selectedEvent.category}
                    type={selectedEvent.type}
                    className="mb-[-28px] h-14 w-14 rounded-xl border-4 border-white shadow-lg"
                  />
                </div>
              </div>

              <div className="pt-10 pb-8 px-6 text-center">
                <h3 className="mb-1 text-lg font-bold leading-tight text-[#292a30]">
                  {selectedEvent.description}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {selectedEvent.category}
                </p>

                <div className="mb-6 text-3xl font-bold tracking-tight text-[#292a30]">
                  {selectedEvent.type === "expense" ? "- " : "+ "}
                  {formatCurrency(selectedEvent.amount)}
                </div>

                <div className="space-y-3 rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Vencimento</span>
                    <span className="font-medium text-[#45474e]">
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
          document.body,
        )}
    </div>
  );
}
