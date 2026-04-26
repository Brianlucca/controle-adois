"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

const formatLabelDate = (date: string) => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
};

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

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

  const applyPreset = (preset: "month" | "year" | "all") => {
    const today = new Date();
    let nextRange = { from: localFrom, to: localTo };

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
        className="flex h-10 w-full min-w-[220px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0B0E14] px-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-500/40 hover:bg-white/[0.03] sm:w-[260px]"
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
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] rounded-xl border border-white/10 bg-[#11151C] p-4 shadow-2xl shadow-black/40 ring-1 ring-white/5">
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="ghost" onClick={() => applyPreset("month")} className="h-9 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/10">
              Mes
            </Button>
            <Button type="button" variant="ghost" onClick={() => applyPreset("year")} className="h-9 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/10">
              Ano
            </Button>
            <Button type="button" variant="ghost" onClick={() => applyPreset("all")} className="h-9 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/10">
              Tudo
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Inicio
              </span>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-10 border-white/10 bg-black/20 text-sm text-white focus-visible:ring-indigo-500"
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
                className="h-10 border-white/10 bg-black/20 text-sm text-white focus-visible:ring-indigo-500"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-9 text-slate-400 hover:bg-white/10 hover:text-white">
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply} className="h-9 bg-indigo-600 px-4 text-white hover:bg-indigo-700">
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
