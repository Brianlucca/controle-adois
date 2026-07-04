"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFinance } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandIcon } from "@/components/brand-icon";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Search,
  Copy,
  CalendarPlus,
  X,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Check,
  FileText,
  TrendingUp,
  PieChart,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Save,
  Filter,
  Layers,
  Upload,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Repeat2,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  createGoogleCalendarLink,
} from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";
import { TransactionList } from "@/components/finance/transaction-list";
import { TransactionStatusBadge } from "@/components/finance/transaction-status-badge";
import { TransactionsSummaryCards } from "@/components/finance/transactions-summary-cards";
import { usePreferences } from "@/contexts/preferences-context";
import {
  addMonthsToDateKey,
  getLocalDateKey,
} from "@/lib/finance/date";
import { parseTransactionsWorkbook } from "@/lib/finance/import-transactions";
import {
  calculateFinanceOverview,
  filterAndSortTransactions,
} from "@/lib/finance/transaction-calculations";
import {
  Transaction,
  TransactionFormData,
  TransactionSortMode,
  TransactionStatusFilter,
} from "@/lib/types";

const CATEGORIES = [
  "Todas",
  "Outros",
  "Alimentação",
  "Moradia",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Salário",
  "Investimento",
  "Rendimento de Investimento",
  "Cartão de Crédito",
  "Empréstimo",
  "Assinatura",
  "Compras",
];

const ITEMS_PER_PAGE = 15;

export default function TransactionsPage() {
  const router = useRouter();
  const {
    transactions,
    loading,
    addTransaction,
    editTransaction,
    deleteTransaction,
    deleteRecurrence,
    updateTransactionStatus,
    importTransactions,
    setDateRange,
  } = useFinance();
  const { hideValues, toggleHideValues } = usePreferences();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [filterTerm, setFilterTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [statusFilter, setStatusFilter] =
    useState<TransactionStatusFilter>("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [sortMode, setSortMode] =
    useState<TransactionSortMode>("priority");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGlobalStats, setIsGlobalStats] = useState(true);
  
  const todayKey = getLocalDateKey(new Date());

  const [uiDateRange, setUiDateRange] = useState({
    from: "2000-01-01",
    to: "2099-12-31",
  });

  useEffect(() => {
    if (isGlobalStats) {
      setDateRange({ from: "2000-01-01", to: "2099-12-31" });
    } else {
      setDateRange(uiDateRange);
    }
  }, [isGlobalStats, uiDateRange, setDateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTerm, selectedCategory, statusFilter, uiDateRange, isGlobalStats]);

  const handleAuthError = (response: any) => {
    if (response?.error === "unauthenticated") {
      router.push("/");
      return true;
    }
    return false;
  };

  const openNewTransactionModal = () => {
    setSelectedTx(null);
    setIsEditing(false);
    setFormData({
      description: "",
      amount: "",
      category: "Outros",
      type: "expense",
      status: "paid",
      dueDate: getLocalDateKey(new Date()),
      pixCode: "",
      barCode: "",
      observation: "",
      isRecurrent: false,
      recurrenceMonths: 12,
    });
    setIsModalOpen(true);
  };

  const openDetailsModal = (t: Transaction) => {
    setSelectedTx(t);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleStartEdit = () => {
    if (!selectedTx) return;
    setFormData({
      description: selectedTx.description,
      amount: selectedTx.amount.toString(),
      category: selectedTx.category,
      type: selectedTx.type,
      status: selectedTx.status,
      dueDate: selectedTx.dueDate.split("T")[0],
      pixCode: selectedTx.pixCode || "",
      barCode: selectedTx.barCode || "",
      observation: selectedTx.observation || "",
      isRecurrent: selectedTx.isRecurrent || false,
      recurrenceMonths: selectedTx.recurrenceMonths || 12,
    });
    setIsEditing(true);
  };

  const [formData, setFormData] = useState<TransactionFormData>({
    description: "",
    amount: "",
    category: "Outros",
    type: "expense" as "income" | "expense",
    status: "paid" as "paid" | "pending",
    dueDate: getLocalDateKey(new Date()),
    pixCode: "",
    barCode: "",
    observation: "",
    isRecurrent: false,
    recurrenceMonths: 12,
  });

  const handleSaveWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    let result;
    const amountNumber = Number(formData.amount);

    if (isEditing && selectedTx) {
      result = await editTransaction(selectedTx.id, {
        ...formData,
        amount: amountNumber,
      });
    } else {
      result = await addTransaction({ ...formData, amount: amountNumber });
    }

    if (handleAuthError(result)) return;

    if (!isEditing && result?.success && "count" in result && Number(result.count) > 1) {
      alert(`${Number(result.count)} lançamentos recorrentes foram criados.`);
    }

    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedTx(null);
  };

  const handleDeleteWrapper = async (id: string) => {
    const result = await deleteTransaction(id);
    if (handleAuthError(result)) return;
    setSelectedTx(null);
    setIsModalOpen(false);
  };

  const handleDeleteRecurrenceWrapper = async (id: string) => {
    if (!confirm("Excluir apenas as parcelas pendentes desta recorrencia? As parcelas ja pagas serão preservadas.")) return;

    const result = await deleteRecurrence(id);
    if (handleAuthError(result)) return;

    if (result?.success && "count" in result) {
      alert(`${Number(result.count)} parcelas pendentes da recorrencia foram excluidas.`);
    }

    setSelectedTx(null);
    setIsModalOpen(false);
  };

  const handleStatusWrapper = async (
    id: string,
    newStatus: "paid" | "pending"
  ) => {
    const result = await updateTransactionStatus(id, newStatus);
    if (handleAuthError(result)) return;
    if (selectedTx) {
      setSelectedTx({ ...selectedTx, status: newStatus });
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { items: imported, hasSheets } = parseTransactionsWorkbook(buffer);

      if (!hasSheets) {
        alert("Esse arquivo nao tem nenhuma aba para importar.");
        return;
      }

      if (imported.length === 0) {
        alert("Nao encontrei transacoes validas nesse arquivo.");
        return;
      }

      const result = await importTransactions(imported);
      if (handleAuthError(result)) return;
      if (result?.success) {
        const importedCount = "count" in result ? result.count : imported.length;
        alert(`${importedCount} transações importadas.`);
      }
    } catch (error) {
      alert("Não foi possível ler esse arquivo. Confira se ele tem colunas como Data, Descrição, Categoria, Tipo, Valor e Status.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const openRedeemInvestmentModal = (tx?: any) => {
    const investment = tx
      ? investmentOptions.find((item) => item.id === tx.id)
      : investmentOptions[0];

    setSelectedTx(null);
    setIsEditing(false);
    setIsModalOpen(false);
    setSelectedInvestmentId(investment?.id || "");
    setRedeemAmount(
      investment?.remainingAmount ? String(investment.remainingAmount) : ""
    );
    setIsRedeemModalOpen(true);
  };

  const closeRedeemInvestmentModal = () => {
    setIsRedeemModalOpen(false);
    setSelectedInvestmentId("");
    setRedeemAmount("");
    setIsRedeeming(false);
  };

  const handleRedeemInvestment = async (e: React.FormEvent) => {
    e.preventDefault();

    const investment =
      investmentOptions.find((item) => item.id === selectedInvestmentId) ||
      investmentOptions[0];
    const amount = Number(redeemAmount);

    if (!investment || !amount || amount <= 0) return;

    const investedAmount = Number(investment.remainingAmount) || 0;
    let principalAmount = amount;
    let gainAmount = 0;

    if (amount > investedAmount) {
      const confirmed = window.confirm(
        `O valor de resgate (${formatCurrency(
          amount
        )}) é maior que o saldo disponível desse investimento (${formatCurrency(
          investedAmount
        )}). Houve ganho nesse investimento?`
      );

      if (!confirmed) return;

      principalAmount = investedAmount;
      gainAmount = amount - investedAmount;
    }

    setIsRedeeming(true);

    const principalResult = await addTransaction({
      description: `Resgate: ${investment.description}`,
      amount: principalAmount,
      category: "Investimento",
      type: "income",
      status: "paid",
      dueDate: todayKey,
      pixCode: "",
      barCode: "",
      observation: `Resgate referente ao investimento de ${formatDate(
        investment.dueDate
      )}.`,
      linkedInvestmentId: investment.id,
      isRecurrent: false,
      recurrenceMonths: 12,
    });

    if (handleAuthError(principalResult)) {
      setIsRedeeming(false);
      return;
    }

    if (!principalResult?.success) {
      setIsRedeeming(false);
      return;
    }

    if (gainAmount > 0) {
      const gainResult = await addTransaction({
        description: `Rendimento: ${investment.description}`,
        amount: gainAmount,
        category: "Rendimento de Investimento",
        type: "income",
        status: "paid",
        dueDate: todayKey,
        pixCode: "",
        barCode: "",
        observation: `Ganho registrado automaticamente no resgate de ${formatCurrency(
          amount
        )}.`,
        isRecurrent: false,
        recurrenceMonths: 12,
      });

      if (handleAuthError(gainResult)) {
        setIsRedeeming(false);
        return;
      }

      if (!gainResult?.success) {
        setIsRedeeming(false);
        return;
      }
    }

    closeRedeemInvestmentModal();
  };

  const displayValue = (val: number) => {
    return hideValues ? "••••••" : formatCurrency(val);
  };

  const overview = useMemo(
    () => calculateFinanceOverview(transactions, todayKey),
    [transactions, todayKey]
  );
  const {
    income,
    expense,
    pendingExpense,
    balance,
    netInvestments,
    totalAssets,
    investmentOptions,
  } = overview;
  const selectedInvestment =
    investmentOptions.find((item) => item.id === selectedInvestmentId) ||
    investmentOptions[0];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredTransactions = useMemo(
    () =>
      filterAndSortTransactions(transactions, {
        filterTerm,
        selectedCategory,
        statusFilter,
        dateRange: uiDateRange,
        sortMode,
        todayKey,
      }),
    [
      transactions,
      filterTerm,
      selectedCategory,
      statusFilter,
      uiDateRange,
      sortMode,
      todayKey,
    ]
  );

  const handleDateSortToggle = () => {
    setSortMode((mode) => {
      if (mode === "priority") return "desc";
      if (mode === "desc") return "asc";
      return "priority";
    });
  };

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [currentPage, filteredTransactions]
  );

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-10">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Transações
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white lg:text-3xl">
            Movimento financeiro
          </h1>
        </div>

        <div className="hidden gap-2 lg:flex">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-10 rounded-lg border-white/10 bg-[#121722] px-3 text-slate-200 hover:bg-white/10"
          >
            {isImporting ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Upload size={16} className="mr-2" />
            )}
            Importar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => openRedeemInvestmentModal()}
            disabled={investmentOptions.length === 0}
            className="h-10 rounded-lg border-emerald-500/25 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
          >
            <TrendingUp size={16} className="mr-2" /> Resgatar
          </Button>

          <Button
            onClick={openNewTransactionModal}
            className="h-10 rounded-lg bg-white px-4 font-bold text-slate-950 hover:bg-slate-200"
          >
            <Plus size={18} className="mr-2" /> Nova
          </Button>
        </div>
      </div>
      <TransactionsSummaryCards
        income={income}
        expense={expense}
        pendingExpense={pendingExpense}
        balance={balance}
        netInvestments={netInvestments}
        totalAssets={totalAssets}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <div className="mt-5 rounded-lg border border-white/10 bg-[#121722] p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_auto_auto] lg:items-center">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-3.5 text-slate-500"
              size={16}
            />
            <Input
              placeholder="Buscar lançamentos..."
              className="h-11 w-full rounded-lg border-white/10 bg-[#0B0E14] pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0"
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-indigo-500/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TransactionStatusFilter)
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
            onClick={() => setIsGlobalStats(!isGlobalStats)}
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
            from={uiDateRange.from}
            to={uiDateRange.to}
            onChange={setUiDateRange}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Lançamentos</h2>
          <p className="text-xs text-slate-500">
            {filteredTransactions.length} registros encontrados
          </p>
        </div>
        <button
          type="button"
          onClick={handleDateSortToggle}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#121722] px-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {sortMode === "priority" ? (
            <AlertTriangle size={14} className="text-amber-300" />
          ) : sortMode === "desc" ? (
            <ArrowDownWideNarrow size={14} className="text-indigo-300" />
          ) : (
            <ArrowUpWideNarrow size={14} className="text-indigo-300" />
          )}
          {sortMode === "priority"
            ? "Prioridade"
            : sortMode === "desc"
            ? "Recentes"
            : "Antigas"}
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-xl shadow-black/10">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma transação encontrada neste período.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_160px] gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 lg:grid">
              <span>Descrição</span>
              <span>Status</span>
              <span>Data</span>
              <span className="text-right">Valor</span>
            </div>

            {paginatedTransactions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openDetailsModal(t)}
                className={`group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3 text-left transition-colors lg:grid-cols-[minmax(0,1fr)_140px_140px_160px] lg:gap-4 lg:px-5 lg:py-3 ${getTransactionRowStateClass(
                  t,
                  todayKey
                )}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BrandIcon
                    description={t.description}
                    category={t.category}
                    type={t.type}
                    className="h-11 w-11 shrink-0 rounded-lg bg-black/20 ring-1 ring-white/5 lg:h-10 lg:w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-indigo-200">
                      {t.description}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                      <span className="truncate">{t.category}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-700" />
                      <span className="lg:hidden">{formatDate(t.dueDate)}</span>
                      <span className="hidden lg:inline">
                        {t.type === "income" ? "Entrada" : "Saída"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <TransactionStatusBadge transaction={t} />
                </div>
                <div className="hidden font-mono text-xs font-semibold text-slate-400 lg:block">
                  {formatDate(t.dueDate)}
                </div>
                <div className="col-span-2 mt-1 flex items-center justify-between gap-3 lg:col-span-1 lg:mt-0 lg:block lg:text-right">
                  <div className="lg:hidden">
                    <TransactionStatusBadge transaction={t} />
                  </div>
                  <p
                    className={`font-mono text-sm font-bold ${
                      t.type === "income" ? "text-emerald-300" : "text-slate-100"
                    }`}
                  >
                    {t.type === "expense" ? "- " : "+ "}
                    {displayValue(t.amount)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!loading && filteredTransactions.length > ITEMS_PER_PAGE && (
        <div className="mt-3 flex flex-col items-stretch justify-between gap-3 rounded-lg border border-white/10 bg-[#121722] p-3 sm:flex-row sm:items-center">
          <div className="order-2 text-center text-xs font-medium text-slate-500 sm:order-1 sm:text-left">
            Página {currentPage} de {totalPages} - {paginatedTransactions.length} itens
          </div>
          <div className="order-1 flex gap-2 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-lg border-white/10 bg-[#121722] text-slate-300 hover:bg-white/5 disabled:opacity-30"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ArrowLeft size={14} className="mr-1" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-lg border-white/10 bg-[#121722] text-slate-300 hover:bg-white/5 disabled:opacity-30"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima <ArrowRight size={14} className="ml-1" />
          </Button>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B0E14]/95 p-3 backdrop-blur lg:hidden">
        <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-11 rounded-lg border-white/10 bg-white/5 px-2 text-xs text-slate-200"
          >
            {isImporting ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Upload size={16} className="mr-1" />
            )}
            Importar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => openRedeemInvestmentModal()}
            disabled={investmentOptions.length === 0}
            className="h-11 rounded-lg border-emerald-500/25 bg-emerald-500/10 px-2 text-xs text-emerald-200"
          >
            <TrendingUp size={16} className="mr-1" />
            Resgatar
          </Button>
          <Button
            onClick={openNewTransactionModal}
            className="h-11 rounded-lg bg-white px-2 text-sm font-bold text-slate-950 hover:bg-slate-200"
          >
            <Plus size={18} className="mr-1" /> Nova
          </Button>
        </div>
      </div>

      {(isModalOpen || selectedTx || isRedeemModalOpen) && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <div
            className={`max-h-[94dvh] w-full overflow-hidden rounded-t-lg border border-white/10 bg-[#10141D] shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 sm:max-h-[92vh] sm:rounded-lg sm:zoom-in-95 ${
              isRedeemModalOpen ? "max-w-2xl" : "max-w-xl"
            }`}
          >
            <div className="relative border-b border-white/10 bg-[#151A24] px-4 pb-4 pt-5 sm:px-5">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15 sm:hidden" />
              <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isRedeemModalOpen
                    ? "Investimentos"
                    : isEditing
                    ? "Edição"
                    : selectedTx
                    ? "Lançamento"
                    : "Novo registro"}
                </p>
                <h3 className="mt-1 truncate text-xl font-bold tracking-tight text-white">
                  {isRedeemModalOpen
                    ? "Resgatar investimento"
                    : isEditing
                    ? "Editar transação"
                    : selectedTx
                    ? "Detalhes da transação"
                    : "Adicionar movimentação"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isRedeemModalOpen) {
                    closeRedeemInvestmentModal();
                  } else {
                    setIsModalOpen(false);
                    setSelectedTx(null);
                    setIsEditing(false);
                  }
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            <div className="max-h-[calc(94dvh-92px)] overflow-y-auto p-4 custom-scrollbar sm:max-h-[calc(92vh-93px)] sm:p-5">
              {isRedeemModalOpen ? (
                <form onSubmit={handleRedeemInvestment} className="space-y-5">
                  {investmentOptions.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <TrendingUp size={22} />
                      </div>
                      <p className="text-sm font-bold text-white">
                        Nenhum investimento com saldo encontrado.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cadastre uma saída paga na categoria Investimento para
                        fazer um resgate, ou confira se os aportes já foram
                        resgatados.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          Valor do resgate
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={redeemAmount}
                          onChange={(e) => setRedeemAmount(e.target.value)}
                          className="mt-2 h-12 border-emerald-500/20 bg-black/20 text-lg font-bold text-white focus:border-emerald-500/50"
                          autoFocus
                        />
                        {selectedInvestment &&
                          Number(redeemAmount) >
                            Number(selectedInvestment.remainingAmount) && (
                            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                              O valor acima do saldo disponível será confirmado
                              como rendimento e lançado automaticamente em
                              Rendimento de Investimento.
                            </p>
                          )}
                        {selectedInvestment && (
                          <p className="mt-3 text-xs text-emerald-100">
                            Resgatando do investimento de{" "}
                            {formatDate(selectedInvestment.dueDate)}. Restante:{" "}
                            <span className="font-bold">
                              {displayValue(selectedInvestment.remainingAmount)}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Escolha o investimento
                          </p>
                          <span className="text-xs font-bold text-indigo-300">
                            {displayValue(netInvestments)} investidos
                          </span>
                        </div>

                        <div className="space-y-2">
                          {investmentOptions.map((investment) => {
                            const isSelected =
                              selectedInvestment?.id === investment.id;

                            return (
                              <button
                                key={investment.id}
                                type="button"
                                onClick={() => {
                                  setSelectedInvestmentId(investment.id);
                                  setRedeemAmount(
                                    String(investment.remainingAmount)
                                  );
                                }}
                                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                                  isSelected
                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                    : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                                }`}
                              >
                                <BrandIcon
                                  description={investment.description}
                                  category={investment.category}
                                  type={investment.type}
                                  className="h-10 w-10 rounded-lg bg-[#0B0E14] border border-white/5"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-white">
                                    {investment.description}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatDate(investment.dueDate)} · Original{" "}
                                    {displayValue(investment.investedAmount)}
                                    {investment.redeemedAmount > 0
                                      ? ` · Já resgatado ${displayValue(
                                          investment.redeemedAmount
                                        )}`
                                      : ""}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block text-sm font-bold font-mono text-emerald-300">
                                    {displayValue(investment.remainingAmount)}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    restante
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
                          onClick={closeRedeemInvestmentModal}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isRedeeming || !redeemAmount}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20"
                        >
                          {isRedeeming ? (
                            <Loader2 size={18} className="mr-2 animate-spin" />
                          ) : (
                            <TrendingUp size={18} className="mr-2" />
                          )}
                          Confirmar Resgate
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              ) : selectedTx && !isEditing ? (
                <div className="space-y-4 pb-2">
                  <div
                    className={`overflow-hidden rounded-lg border p-4 ${
                      selectedTx.type === "income"
                        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
                        : "border-red-500/20 bg-red-500/[0.07]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <BrandIcon
                        description={selectedTx.description}
                        category={selectedTx.category}
                        type={selectedTx.type}
                        className="h-12 w-12 shrink-0 rounded-lg bg-black/20 ring-1 ring-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-white">
                          {selectedTx.description}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {selectedTx.category} ·{" "}
                          {selectedTx.type === "income" ? "Entrada" : "Saída"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <TransactionStatusBadge transaction={selectedTx} />
                      </div>
                      <p
                        className={`font-mono text-3xl font-bold tracking-tight sm:text-right ${
                          selectedTx.type === "income"
                            ? "text-emerald-300"
                            : "text-white"
                        }`}
                      >
                        {selectedTx.type === "expense" ? "- " : "+ "}
                        {displayValue(selectedTx.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Categoria
                      </p>
                      <p className="truncate font-bold text-white">
                        {selectedTx.category}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Data
                      </p>
                      <p className="truncate font-bold text-white">
                        {formatDate(selectedTx.dueDate)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Responsável
                      </p>
                      <p className="truncate font-bold text-white">
                        {selectedTx.userName?.split(" ")[0] || "Eu"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </p>
                      <p
                        className={`font-bold ${
                          selectedTx.status === "pending"
                            ? "text-amber-400"
                            : selectedTx.type === "income"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {selectedTx.status === "pending"
                          ? "Pendente"
                          : selectedTx.type === "income"
                          ? "Recebido"
                          : "Pago"}
                      </p>
                    </div>
                  </div>

                  {selectedTx.observation && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-2 flex items-center gap-2 text-slate-500">
                        <FileText size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Observações
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {selectedTx.observation}
                      </p>
                    </div>
                  )}

                  {selectedTx.isRecurrent && (
                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                            <Repeat2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              Transação recorrente
                            </p>
                            <p className="text-xs text-indigo-200">
                              {selectedTx.recurrenceIndex && selectedTx.recurrenceTotal
                                ? `${selectedTx.recurrenceIndex} de ${selectedTx.recurrenceTotal}`
                                : "Serie mensal ativa"}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10 border border-red-500/20 bg-red-500/10 px-3 text-red-300 hover:bg-red-500/20"
                          onClick={() => handleDeleteRecurrenceWrapper(selectedTx.id)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          Excluir recorrencia
                        </Button>
                      </div>
                    </div>
                  )}

                  {(selectedTx.pixCode || selectedTx.barCode) && (
                    <div className="space-y-2">
                      {selectedTx.pixCode && (
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
                          <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                            Pix
                          </span>
                          <p className="truncate font-mono text-xs text-slate-300">
                            {selectedTx.pixCode}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2 text-indigo-200 transition-all hover:bg-indigo-500/20 hover:text-white"
                            onClick={() =>
                              handleCopy(selectedTx.pixCode || "", "pix")
                            }
                          >
                            {copiedField === "pix" ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                                <Check size={14} /> Copiado
                              </span>
                            ) : (
                              <Copy size={15} />
                            )}
                          </Button>
                        </div>
                      )}
                      {selectedTx.barCode && (
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            Boleto
                          </span>
                          <p className="truncate font-mono text-xs text-slate-300">
                            {selectedTx.barCode}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                            onClick={() =>
                              handleCopy(selectedTx.barCode || "", "barCode")
                            }
                          >
                            {copiedField === "barCode" ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                                <Check size={14} /> Copiado
                              </span>
                            ) : (
                              <Copy size={15} />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTx.category === "Investimento" &&
                    selectedTx.type === "expense" &&
                    investmentOptions.some(
                      (investment) => investment.id === selectedTx.id
                    ) && (
                      <Button
                        className="h-11 w-full rounded-lg border border-emerald-500/40 bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700"
                        onClick={() => openRedeemInvestmentModal(selectedTx)}
                      >
                        <PieChart size={18} className="mr-2" /> Resgatar Valor
                      </Button>
                    )}

                  {selectedTx.type === "expense" &&
                    selectedTx.status === "pending" && (
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-lg border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          const link = createGoogleCalendarLink(
                            selectedTx.description,
                            selectedTx.dueDate,
                            selectedTx.amount,
                            selectedTx.observation
                          );
                          window.open(link, "_blank");
                        }}
                      >
                        <CalendarPlus size={16} className="mr-2" /> Adicionar ao
                        Google Agenda
                      </Button>
                    )}

                  <div
                    className={`sticky bottom-0 -mx-4 -mb-4 grid gap-2 border-t border-white/10 bg-[#10141D]/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 ${
                      selectedTx.type === "expense"
                        ? "grid-cols-3"
                        : "grid-cols-2"
                    }`}
                  >
                    <Button
                      className="h-12 rounded-lg border border-white/10 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 sm:text-sm"
                      onClick={handleStartEdit}
                    >
                      <Pencil size={16} className="mr-1.5" /> Editar
                    </Button>

                    {selectedTx.type === "expense" && (
                      <Button
                        className="h-12 rounded-lg bg-white text-xs font-bold text-slate-950 shadow-md hover:bg-slate-200 sm:text-sm"
                        onClick={() =>
                          handleStatusWrapper(
                            selectedTx.id,
                            selectedTx.status === "paid" ? "pending" : "paid"
                          )
                        }
                      >
                        {selectedTx.status === "paid" ? "Pendente" : "Pagar"}
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      className="h-12 rounded-lg border border-red-500/20 bg-red-500/10 px-0 text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDeleteWrapper(selectedTx.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveWrapper} className="space-y-4 pb-2">
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#0B0E14] p-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: "income",
                          status: "paid",
                          isRecurrent: false,
                          recurrenceMonths: 12,
                        })
                      }
                      className={`inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all ${
                        formData.type === "income"
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                          : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                      }`}
                    >
                      <ArrowUpCircle size={17} />
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, type: "expense" })
                      }
                      className={`inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all ${
                        formData.type === "expense"
                          ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                          : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                      }`}
                    >
                      <ArrowDownCircle size={17} />
                      Saída
                    </button>
                  </div>

                  <div
                    className={`rounded-lg border p-4 ${
                      formData.type === "income"
                        ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                        : "border-red-500/20 bg-red-500/[0.05]"
                    }`}
                  >
                  <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                    <label className="space-y-1.5">
                      <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Descrição
                      </span>
                      <Input
                        placeholder="Ex: Mercado, Salário..."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        required
                        className="input-dark h-12 rounded-lg border-white/10 bg-black/25 text-base focus:border-indigo-500/50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Valor
                      </span>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        required
                        className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-lg font-bold focus:border-indigo-500/50"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1.5">
                      <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Data
                      </span>
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                        required
                        className="input-dark h-12 rounded-lg border-white/10 bg-black/25 focus:border-indigo-500/50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Categoria
                      </span>
                      <select
                        className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                      >
                        {CATEGORIES.slice(1).map((cat) => (
                          <option key={cat} className="bg-slate-900">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>

                    {formData.type === "expense" ? (
                      <label className="space-y-1.5">
                        <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </span>
                        <select
                          className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          value={formData.status}
                          onChange={(e: any) =>
                            setFormData({ ...formData, status: e.target.value })
                          }
                        >
                          <option value="paid" className="bg-slate-900">
                            Já Pago
                          </option>
                          <option value="pending" className="bg-slate-900">
                            Pendente
                          </option>
                        </select>
                      </label>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </span>
                        <div className="flex h-12 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-300">
                          <CheckCircle2 size={16} />
                          Recebido
                        </div>
                      </div>
                    )}
                  </div>

                  </div>

                  {formData.type === "expense" && (
                    <div className="space-y-4 rounded-lg border border-white/10 bg-[#0B0E14]/70 p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            isRecurrent: !formData.isRecurrent,
                          })
                        }
                        className={`flex w-full flex-col gap-3 rounded-lg border p-3 text-left transition-all sm:flex-row sm:items-center sm:justify-between ${
                          formData.isRecurrent
                            ? "border-indigo-500/50 bg-indigo-500/15 shadow-lg shadow-indigo-950/20"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              formData.isRecurrent
                                ? "bg-indigo-500 text-white"
                                : "bg-black/20 text-slate-500"
                            }`}
                          >
                            <Repeat2 size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-white">
                              Repetir mensalmente
                            </span>
                            <span className="block text-xs text-slate-400">
                              Cria lançamentos mensais a partir desta data.
                            </span>
                          </span>
                        </span>

                        <span
                          className={`w-fit rounded-md px-3 py-1 text-xs font-bold ${
                            formData.isRecurrent
                              ? "bg-indigo-500 text-white"
                              : "bg-white/5 text-slate-500"
                          }`}
                        >
                          {formData.isRecurrent ? "Ativado" : "Desativado"}
                        </span>
                      </button>

                      {formData.isRecurrent && (
                        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <label>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                Quantidade de meses
                              </span>
                              <select
                                value={formData.recurrenceMonths}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    recurrenceMonths: Number(e.target.value),
                                  })
                                }
                                className="mt-1 h-11 w-full rounded-lg border border-indigo-500/30 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 sm:w-44"
                              >
                                <option value={3}>3 meses</option>
                                <option value={6}>6 meses</option>
                                <option value={12}>12 meses</option>
                                <option value={24}>24 meses</option>
                              </select>
                            </label>
                            <div className="text-xs text-indigo-200">
                              Serão criados {formData.recurrenceMonths} lançamentos.
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from({ length: Math.min(4, formData.recurrenceMonths) }).map((_, index) => (
                              <span key={index} className="rounded-md bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100">
                                {formatDate(addMonthsToDateKey(formData.dueDate, index))}
                              </span>
                            ))}
                            {formData.recurrenceMonths > 4 && (
                              <span className="rounded-md bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100">
                                +{formData.recurrenceMonths - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="Código Pix (Copia e Cola)"
                          value={formData.pixCode}
                          onChange={(e) =>
                            setFormData({ ...formData, pixCode: e.target.value })
                          }
                          className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-xs"
                        />
                        <Input
                          placeholder="Código de Barras (Boleto)"
                          value={formData.barCode}
                          onChange={(e) =>
                            setFormData({ ...formData, barCode: e.target.value })
                          }
                          className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-xs"
                        />
                      </div>
                      <Textarea
                        placeholder="Observações opcionais..."
                        value={formData.observation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            observation: e.target.value,
                          })
                        }
                        className="input-dark min-h-[96px] rounded-lg border-white/10 bg-black/25"
                      />
                    </div>
                  )}

                  <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#10141D]/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end">
                    {isEditing && (
                      <Button
                        type="button"
                        className="h-12 rounded-lg border border-white/10 bg-slate-800 px-5 font-bold text-white hover:bg-slate-700 sm:min-w-32"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className={`h-12 rounded-lg px-5 text-sm font-bold text-white shadow-lg sm:min-w-44 ${
                        formData.type === "income"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <Save size={18} className="mr-2" /> Salvar alterações
                        </>
                      ) : (
                        <>
                          <Plus size={18} className="mr-2" /> Salvar movimentação
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
