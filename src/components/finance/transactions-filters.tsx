import { ChangeEvent, RefObject } from "react";
import { Filter, Layers, Search } from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRange, TransactionStatusFilter } from "@/lib/types";

interface TransactionsFiltersProps {
  categories: string[];
  filterTerm: string;
  selectedCategory: string;
  statusFilter: TransactionStatusFilter;
  isGlobalStats: boolean;
  dateRange: DateRange;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilterTermChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusFilterChange: (value: TransactionStatusFilter) => void;
  onToggleGlobalStats: () => void;
  onDateRangeChange: (range: DateRange) => void;
  onImportFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function TransactionsFilters({
  categories,
  filterTerm,
  selectedCategory,
  statusFilter,
  isGlobalStats,
  dateRange,
  fileInputRef,
  onFilterTermChange,
  onCategoryChange,
  onStatusFilterChange,
  onToggleGlobalStats,
  onDateRangeChange,
  onImportFileChange,
}: TransactionsFiltersProps) {
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-[#121722] p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_auto_auto] lg:items-center">
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

        <Button
          variant="outline"
          onClick={onToggleGlobalStats}
          className={`h-11 rounded-lg border-white/10 px-4 ${
            isGlobalStats
              ? "bg-[#0B0E14] text-slate-300 hover:bg-white/10 hover:text-white"
              : "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30"
          }`}
          title={
            isGlobalStats
              ? "Os cartões mostram o total geral. Clique para filtrar os totais pela data."
              : "Os cartões mostram apenas o período selecionado."
          }
        >
          {isGlobalStats ? (
            <>
              <Layers size={16} className="mr-2" /> Totais Gerais
            </>
          ) : (
            <>
              <Filter size={16} className="mr-2" /> Filtrar Totais
            </>
          )}
        </Button>

        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={onDateRangeChange}
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
