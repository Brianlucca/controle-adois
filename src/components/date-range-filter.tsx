"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  const handleApply = () => {
    if (localFrom !== from || localTo !== to) {
      onChange({ from: localFrom, to: localTo });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleApply();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-[#0B0E14] p-1 rounded-lg border border-white/10 shadow-sm">
      <Input
        type="date"
        value={localFrom}
        onChange={(e) => setLocalFrom(e.target.value)}
        onBlur={handleApply}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-none text-xs w-auto min-w-[110px] h-8 focus-visible:ring-0 text-slate-300 cursor-pointer"
      />
      <span className="text-slate-600 font-normal">até</span>
      <Input
        type="date"
        value={localTo}
        onChange={(e) => setLocalTo(e.target.value)}
        onBlur={handleApply}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-none text-xs w-auto min-w-[110px] h-8 focus-visible:ring-0 text-slate-300 cursor-pointer"
      />
    </div>
  );
}
