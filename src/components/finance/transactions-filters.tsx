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
    <div className="mt-5 rounded-xl border border-[#e3e1e4] bg-white p-3 shadow-[0_12px_30px_-28px_rgba(31,29,43,0.45)]">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_auto] lg:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3.5 text-[#92949c]" size={16} />
          <Input
            placeholder="Buscar por nome, categoria, valor ou ID..."
            className="h-11 w-full rounded-lg border-[#dedce1] bg-white pl-10 text-[#292a30] placeholder:text-[#a0a2a9] focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/10"
            value={filterTerm}
            onChange={(event) => onFilterTermChange(event.target.value)}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-[#dedce1] bg-white px-3 text-sm text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/10"
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
          className="h-11 w-full rounded-lg border border-[#dedce1] bg-white px-3 text-sm text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/10"
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
