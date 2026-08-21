"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  cycleRange?: { from: string; to: string };
  onUseCycle?: () => void;
  cycleStartDay?: number;
  cycleEndDay?: number;
  onSaveCycle?: (startDay: number, endDay: number) => Promise<unknown>;
}

const formatLabelDate = (date: string) => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
};

export function DateRangeFilter({ from, to, onChange, cycleRange, onUseCycle, cycleStartDay = 1, cycleEndDay = 31, onSaveCycle }: DateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [isOpen, setIsOpen] = useState(false);
  const [localCycleStart, setLocalCycleStart] = useState(cycleStartDay);
  const [localCycleEnd, setLocalCycleEnd] = useState(cycleEndDay);
  const [savingCycle, setSavingCycle] = useState(false);
  const [activeMode, setActiveMode] = useState<"cycle" | "custom">("cycle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  useEffect(() => {
    setLocalCycleStart(cycleStartDay);
    setLocalCycleEnd(cycleEndDay);
  }, [cycleStartDay, cycleEndDay]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = () => {
    onChange({ from: localFrom, to: localTo });
    setIsOpen(false);
  };

  const applyPreset = (preset: "cycle" | "month" | "year" | "all") => {
    const today = new Date();
    let nextRange = { from: localFrom, to: localTo };

    if (preset === "cycle" && cycleRange) {
      setLocalFrom(cycleRange.from);
      setLocalTo(cycleRange.to);
      onUseCycle?.();
      setActiveMode("cycle");
      return;
    }

    if (preset === "month") {
      nextRange = {
        from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    }

    if (preset === "year") {
      nextRange = {
        from: `${today.getFullYear()}-01-01`,
        to: `${today.getFullYear()}-12-31`,
      };
    }

    if (preset === "all") {
      nextRange = { from: "2000-01-01", to: "2099-12-31" };
    }

    setLocalFrom(nextRange.from);
    setLocalTo(nextRange.to);
    onChange(nextRange);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-11 w-full min-w-[220px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0B0E14] px-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-500/40 hover:bg-white/[0.03] sm:w-[260px]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar size={16} className="shrink-0 text-slate-500" />
          <span className="truncate font-medium">
            {formatLabelDate(from)} - {formatLabelDate(to)}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[120] w-[min(94vw,460px)] rounded-xl border border-white/10 bg-[#11151C] p-4 shadow-2xl shadow-black/50 ring-1 ring-white/5">
          <div className="grid grid-cols-5 gap-2">
            {cycleRange && <Button type="button" variant="ghost" onClick={() => applyPreset("cycle")} className={`h-10 px-2 text-[11px] ${activeMode === "cycle" ? "bg-indigo-500/20 text-indigo-200" : "bg-white/[0.03] text-slate-300"} hover:bg-indigo-500/25`}>
              Meu ciclo
            </Button>}
            <Button type="button" variant="ghost" onClick={() => applyPreset("month")} className="h-10 bg-white/[0.03] px-2 text-[11px] text-slate-300 hover:bg-white/10">
              Mes
            </Button>
            <Button type="button" variant="ghost" onClick={() => applyPreset("year")} className="h-10 bg-white/[0.03] px-2 text-[11px] text-slate-300 hover:bg-white/10">
              Ano
            </Button>
            <Button type="button" variant="ghost" onClick={() => applyPreset("all")} className="h-10 bg-white/[0.03] px-2 text-[11px] text-slate-300 hover:bg-white/10">
              Tudo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setActiveMode("custom")} className={`h-10 px-1 text-[10px] ${activeMode === "custom" ? "bg-indigo-500/20 text-indigo-200" : "bg-white/[0.03] text-slate-300"} hover:bg-indigo-500/25`}>Personalizado</Button>
          </div>

          {onSaveCycle && activeMode === "cycle" && (
            <div className="mt-4 rounded-xl border border-indigo-400/15 bg-indigo-500/[0.06] p-3">
              <div className="mb-3">
                <p className="text-xs font-bold text-indigo-200">Configurar meu ciclo</p>
                <p className="mt-1 text-[11px] text-slate-500">Informe apenas os dias. As datas e os meses são atualizados automaticamente.</p>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label><span className="mb-1 block text-[10px] uppercase text-slate-500">Começa dia</span><Input type="number" min={1} max={28} value={localCycleStart} onChange={(event) => setLocalCycleStart(Number(event.target.value))} className="h-10 border-white/10 bg-black/20" /></label>
                <label><span className="mb-1 block text-[10px] uppercase text-slate-500">Termina dia</span><Input type="number" min={1} max={31} value={localCycleEnd} onChange={(event) => setLocalCycleEnd(Number(event.target.value))} className="h-10 border-white/10 bg-black/20" /></label>
                <Button type="button" disabled={savingCycle} onClick={async () => { setSavingCycle(true); await onSaveCycle(localCycleStart, localCycleEnd); setSavingCycle(false); setIsOpen(false); }} className="h-10 bg-indigo-600 px-3 text-xs text-white">Salvar</Button>
              </div>
            </div>
          )}

          {activeMode === "custom" && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Inicio
              </span>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-11 border-white/10 bg-black/20 text-sm text-white focus-visible:ring-indigo-500"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fim
              </span>
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-11 border-white/10 bg-black/20 text-sm text-white focus-visible:ring-indigo-500"
              />
            </label>
          </div>}

          {activeMode === "custom" && <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-10 text-slate-400 hover:bg-white/10 hover:text-white">
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply} className="h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700">
              Aplicar
            </Button>
          </div>}
        </div>
      )}
    </div>
  );
}
