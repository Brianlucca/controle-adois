import { ChangeEvent, RefObject } from "react";
import { Search } from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Input } from "@/components/ui/input";
import { DateRange, TransactionStatusFilter } from "@/lib/types";

interface TransactionsFiltersProps {
  categories: string[];
  filterTerm: string;
  selectedCategory: string;
  statusFilter: TransactionStatusFilter;
  dateRange: DateRange;
  cycleRange: DateRange;
  cycleStartDay: number;
  cycleEndDay: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilterTermChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusFilterChange: (value: TransactionStatusFilter) => void;
  onUseCycle: () => void;
  onSaveCycle: (startDay: number, endDay: number) => Promise<unknown>;
  onDateRangeChange: (range: DateRange) => void;
  onImportFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function TransactionsFilters({
  categories,
  filterTerm,
  selectedCategory,
  statusFilter,
  dateRange,
  cycleRange,
  cycleStartDay,
  cycleEndDay,
  fileInputRef,
  onFilterTermChange,
  onCategoryChange,
  onStatusFilterChange,
  onUseCycle,
  onSaveCycle,
  onDateRangeChange,
  onImportFileChange,
}: TransactionsFiltersProps) {
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-[#121722] p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_auto] lg:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
          <Input
            placeholder="Buscar lançamentos..."
            className="h-11 w-full rounded-lg border-white/10 bg-[#0B0E14] pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0"
            value={filterTerm}
            onChange={(event) => onFilterTermChange(event.target.value)}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-indigo-500/50"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as TransactionStatusFilter)
          }
          className="h-11 w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-indigo-500/50"
        >
          <option value="all">Status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="received">Recebido</option>
        </select>

        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={onDateRangeChange}
          cycleRange={cycleRange}
          onUseCycle={onUseCycle}
          cycleStartDay={cycleStartDay}
          cycleEndDay={cycleEndDay}
          onSaveCycle={onSaveCycle}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onImportFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
