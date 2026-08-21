"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFinance } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import { TransactionsFilters } from "@/components/finance/transactions-filters";
import { InvestmentRedemptionModalContent } from "@/components/finance/investment-redemption-modal-content";
import { TransactionDetailsModalContent } from "@/components/finance/transaction-details-modal-content";
import { TransactionFormModalContent } from "@/components/finance/transaction-form-modal-content";
import { TransactionList } from "@/components/finance/transaction-list";
import { TransactionsSummaryCards } from "@/components/finance/transactions-summary-cards";
import { usePreferences } from "@/contexts/preferences-context";
import { getLocalDateKey } from "@/lib/finance/date";
import { parseTransactionsWorkbook } from "@/lib/finance/import-transactions";
import {
  calculateFinanceOverview,
  filterAndSortTransactions,
} from "@/lib/finance/transaction-calculations";
import { calculateFinancialPosition } from "@/lib/finance/financial-position";
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
    snapshotTransactions,
    loading,
    addTransaction,
    editTransaction,
    deleteTransaction,
    deleteRecurrence,
    updateTransactionStatus,
    importTransactions,
    dateRange,
    setDateRange,
    cycleRange,
    cycleStartDay,
    cycleEndDay,
    resetToFinancialCycle,
    saveFinancialCycle,
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

  const todayKey = getLocalDateKey(new Date());

  const [uiDateRange, setUiDateRange] = useState(dateRange);

  useEffect(() => {
    setUiDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTerm, selectedCategory, statusFilter, uiDateRange]);

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
      const { items: imported, hasSheets } = await parseTransactionsWorkbook(buffer);

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
  const assetOverview = useMemo(
    () => calculateFinanceOverview(snapshotTransactions, todayKey),
    [snapshotTransactions, todayKey]
  );
  const {
    income,
    expense,
    pendingExpense,
  } = overview;
  const {
    netInvestments,
    totalAssets,
    investmentOptions,
  } = assetOverview;
  const financialPosition = useMemo(
    () =>
      calculateFinancialPosition(
        snapshotTransactions,
        todayKey,
        dateRange.to
      ),
    [snapshotTransactions, todayKey, dateRange.to]
  );
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
        projectedBalance={financialPosition.projectedBalance}
        balance={financialPosition.availableBalance}
        netInvestments={netInvestments}
        totalAssets={totalAssets}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <TransactionsFilters
        categories={CATEGORIES}
        filterTerm={filterTerm}
        selectedCategory={selectedCategory}
        statusFilter={statusFilter}
        dateRange={uiDateRange}
        cycleRange={cycleRange}
        cycleStartDay={cycleStartDay}
        cycleEndDay={cycleEndDay}
        fileInputRef={fileInputRef}
        onFilterTermChange={setFilterTerm}
        onCategoryChange={setSelectedCategory}
        onStatusFilterChange={setStatusFilter}
        onUseCycle={resetToFinancialCycle}
        onSaveCycle={saveFinancialCycle}
        onDateRangeChange={(range) => {
          setUiDateRange(range);
          setDateRange(range);
        }}
        onImportFileChange={handleImportExcel}
      />

      <TransactionList
        transactions={paginatedTransactions}
        loading={loading}
        totalCount={filteredTransactions.length}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        sortMode={sortMode}
        todayKey={todayKey}
        displayValue={displayValue}
        onOpenDetails={openDetailsModal}
        onSortToggle={handleDateSortToggle}
        onPageChange={setCurrentPage}
      />

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
                <InvestmentRedemptionModalContent
                  investmentOptions={investmentOptions}
                  selectedInvestment={selectedInvestment}
                  redeemAmount={redeemAmount}
                  netInvestments={netInvestments}
                  isRedeeming={isRedeeming}
                  displayValue={displayValue}
                  onRedeemAmountChange={setRedeemAmount}
                  onSelectInvestment={(investment) => {
                    setSelectedInvestmentId(investment.id);
                    setRedeemAmount(String(investment.remainingAmount));
                  }}
                  onCancel={closeRedeemInvestmentModal}
                  onSubmit={handleRedeemInvestment}
                />
              ) : selectedTx && !isEditing ? (
                <TransactionDetailsModalContent
                  transaction={selectedTx}
                  copiedField={copiedField}
                  canRedeemInvestment={
                    selectedTx.category === "Investimento" &&
                    selectedTx.type === "expense" &&
                    investmentOptions.some(
                      (investment) => investment.id === selectedTx.id
                    )
                  }
                  displayValue={displayValue}
                  onCopy={handleCopy}
                  onStartEdit={handleStartEdit}
                  onDelete={handleDeleteWrapper}
                  onDeleteRecurrence={handleDeleteRecurrenceWrapper}
                  onStatusChange={handleStatusWrapper}
                  onRedeemInvestment={openRedeemInvestmentModal}
                />
              ) : (
                <TransactionFormModalContent
                  categories={CATEGORIES}
                  formData={formData}
                  isEditing={isEditing}
                  onFormDataChange={setFormData}
                  onCancelEdit={() => setIsEditing(false)}
                  onSubmit={handleSaveWrapper}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
