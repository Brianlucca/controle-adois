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

export function DateRangeFilter({
  from,
  to,
  onChange,
  cycleRange,
  onUseCycle,
  cycleStartDay = 1,
  cycleEndDay = 31,
  onSaveCycle,
}: DateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [isOpen, setIsOpen] = useState(false);
  const [localCycleStart, setLocalCycleStart] = useState(cycleStartDay);
  const [localCycleEnd, setLocalCycleEnd] = useState(cycleEndDay);
  const [savingCycle, setSavingCycle] = useState(false);
  const [activeMode, setActiveMode] = useState<"cycle" | "custom">("cycle");
  const containerRef = useRef<HTMLDivElement>(null);

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
        from: new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
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
        onClick={() => {
          if (!isOpen) {
            setLocalFrom(from);
            setLocalTo(to);
            setLocalCycleStart(cycleStartDay);
            setLocalCycleEnd(cycleEndDay);
          }
          setIsOpen((value) => !value);
        }}
        className="flex h-11 w-full min-w-[220px] items-center justify-between gap-3 rounded-xl border border-[#dedce1] bg-white px-3 text-left text-sm text-[#4b4d54] transition-colors hover:border-[#aaa5e8] sm:w-[260px]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar size={16} className="shrink-0 text-[#7e818a]" />
          <span className="truncate font-medium">
            {formatLabelDate(from)} - {formatLabelDate(to)}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#7e818a] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[120] w-[min(94vw,460px)] rounded-2xl border border-[#e2dfe4] bg-white p-4 text-[#2b2c31] shadow-[0_24px_60px_-24px_rgba(35,30,55,.32)]">
          <div className="grid grid-cols-5 gap-2">
            {cycleRange && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyPreset("cycle")}
                className={`h-10 px-2 text-[11px] ${activeMode === "cycle" ? "bg-[#eeecff] text-[#635bff]" : "bg-transparent text-[#71747d]"} hover:bg-[#f1efff] hover:text-[#635bff]`}
              >
                Meu ciclo
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => applyPreset("month")}
              className="h-10 bg-transparent px-2 text-[11px] text-[#71747d] hover:bg-[#f1efff] hover:text-[#635bff]"
            >
              Mês
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => applyPreset("year")}
              className="h-10 bg-transparent px-2 text-[11px] text-[#71747d] hover:bg-[#f1efff] hover:text-[#635bff]"
            >
              Ano
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => applyPreset("all")}
              className="h-10 bg-transparent px-2 text-[11px] text-[#71747d] hover:bg-[#f1efff] hover:text-[#635bff]"
            >
              Tudo
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveMode("custom")}
              className={`h-10 px-1 text-[10px] ${activeMode === "custom" ? "bg-[#eeecff] text-[#635bff]" : "bg-transparent text-[#71747d]"} hover:bg-[#f1efff] hover:text-[#635bff]`}
            >
              Personalizado
            </Button>
          </div>

          {onSaveCycle && activeMode === "cycle" && (
            <div className="mt-4 rounded-xl border border-[#dedaff] bg-[#f5f3ff] p-3">
              <div className="mb-3">
                <p className="text-xs font-bold text-[#5148e5]">
                  Configurar meu ciclo
                </p>
                <p className="mt-1 text-[11px] text-[#71747d]">
                  Informe apenas os dias. As datas e os meses são atualizados
                  automaticamente.
                </p>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label>
                  <span className="mb-1 block text-[10px] uppercase text-[#7e818a]">
                    Começa dia
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={localCycleStart}
                    onChange={(event) =>
                      setLocalCycleStart(Number(event.target.value))
                    }
                    className="h-10 border-[#dedce1] bg-white text-[#292a30]"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[10px] uppercase text-[#7e818a]">
                    Termina dia
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={localCycleEnd}
                    onChange={(event) =>
                      setLocalCycleEnd(Number(event.target.value))
                    }
                    className="h-10 border-[#dedce1] bg-white text-[#292a30]"
                  />
                </label>
                <Button
                  type="button"
                  disabled={savingCycle}
                  onClick={async () => {
                    setSavingCycle(true);
                    await onSaveCycle(localCycleStart, localCycleEnd);
                    setSavingCycle(false);
                    setIsOpen(false);
                  }}
                  className="h-10 bg-[#635bff] px-3 text-xs text-[#fff] hover:bg-[#554cf0]"
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {activeMode === "custom" && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7e818a]">
                  Início
                </span>
                <Input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="h-11 border-[#dedce1] bg-white text-sm text-[#292a30] focus-visible:ring-[#635bff]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7e818a]">
                  Fim
                </span>
                <Input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="h-11 border-[#dedce1] bg-white text-sm text-[#292a30] focus-visible:ring-[#635bff]"
                />
              </label>
            </div>
          )}

          {activeMode === "custom" && (
            <div className="mt-4 flex justify-end gap-2 border-t border-[#efedf0] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-10 text-[#71747d] hover:bg-[#f5f4f6] hover:text-[#292a30]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                className="h-10 bg-[#635bff] px-4 text-[#fff] hover:bg-[#554cf0]"
              >
                Aplicar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
