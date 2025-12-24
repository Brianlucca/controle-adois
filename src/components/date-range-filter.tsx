"use client";

import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

export function DateRangeFilter({ from, to, onChange }: Props) {
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth())
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const years = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  const updateDates = (m: string, y: string) => {
    const monthIndex = parseInt(m);
    const yearNum = parseInt(y);

    const firstDay = new Date(yearNum, monthIndex, 1);
    const fromStr = firstDay.toISOString().split("T")[0];

    const lastDay = new Date(yearNum, monthIndex + 1, 0);
    const toStr = lastDay.toISOString().split("T")[0];

    onChange({ from: fromStr, to: toStr });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    updateDates(val, selectedYear);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedYear(val);
    updateDates(selectedMonth, val);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <div className="flex items-center gap-2 bg-[#1A1D24] p-1 rounded-lg border border-white/10">
        <div className="pl-2 pr-1 text-indigo-400">
          <Calendar size={14} />
        </div>

        <div className="relative">
          <select
            className="h-8 w-[110px] bg-transparent text-xs font-medium text-slate-200 focus:outline-none appearance-none cursor-pointer pl-1"
            value={selectedMonth}
            onChange={handleMonthChange}
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx} className="bg-slate-900 text-white">
                {m}
              </option>
            ))}
          </select>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronDown size={12} />
          </div>
        </div>

        <div className="w-px h-4 bg-white/10"></div>

        <div className="relative">
          <select
            className="h-8 w-[70px] bg-transparent text-xs font-medium text-slate-200 focus:outline-none appearance-none cursor-pointer pl-2"
            value={selectedYear}
            onChange={handleYearChange}
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-slate-900 text-white">
                {y}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronDown size={12} />
          </div>
        </div>
      </div>

      <div className="flex items-center bg-[#0B0E14] rounded-lg border border-white/10 p-1">
        <div className="relative group">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-600 uppercase pointer-events-none">
            De
          </span>
          <Input
            type="date"
            value={from}
            onChange={(e) => onChange({ from: e.target.value, to })}
            className="h-8 w-[120px] bg-transparent border-none text-xs font-medium text-slate-300 pl-7 focus-visible:ring-0 cursor-pointer [color-scheme:dark]"
          />
        </div>

        <div className="text-slate-600 px-1">
          <ArrowRight size={12} />
        </div>

        <div className="relative group">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-600 uppercase pointer-events-none">
            Até
          </span>
          <Input
            type="date"
            value={to}
            onChange={(e) => onChange({ from, to: e.target.value })}
            className="h-8 w-[120px] bg-transparent border-none text-xs font-medium text-slate-300 pl-8 focus-visible:ring-0 cursor-pointer [color-scheme:dark]"
          />
        </div>
      </div>
    </div>
  );
}
