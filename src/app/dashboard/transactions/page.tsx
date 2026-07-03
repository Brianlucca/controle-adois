"use client";

import { useState, useEffect, useRef } from "react";
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
  CalendarIcon,
  Copy,
  CalendarPlus,
  X,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Eye,
  EyeOff,
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
import * as XLSX from "xlsx";
import {
  formatCurrency,
  formatDate,
  createGoogleCalendarLink,
} from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";
import { usePreferences } from "@/contexts/preferences-context";

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
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [filterTerm, setFilterTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [sortMode, setSortMode] = useState<"priority" | "desc" | "asc">("priority");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGlobalStats, setIsGlobalStats] = useState(true);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

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
      dueDate: new Date().toISOString().split("T")[0],
      pixCode: "",
      barCode: "",
      observation: "",
      isRecurrent: false,
      recurrenceMonths: 12,
    });
    setIsModalOpen(true);
  };

  const openDetailsModal = (t: any) => {
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

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "Outros",
    type: "expense" as "income" | "expense",
    status: "paid" as "paid" | "pending",
    dueDate: new Date().toISOString().split("T")[0],
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

  const normalizeImportKey = (key: string) =>
    key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const readImportValue = (row: Record<string, any>, keys: string[], fallbackIndex?: number) => {
    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
      acc[normalizeImportKey(key)] = value;
      return acc;
    }, {} as Record<string, any>);

    for (const key of keys) {
      const value = normalized[normalizeImportKey(key)];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }

    if (fallbackIndex !== undefined) {
      const fallback = Object.values(row)[fallbackIndex];
      if (fallback !== undefined && fallback !== null && String(fallback).trim() !== "") return fallback;
    }

    return "";
  };

  const parseImportDate = (value: any) => {
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    }

    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const brDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (brDate) {
      const year = brDate[3].length === 2 ? `20${brDate[3]}` : brDate[3];
      return `${year}-${brDate[2].padStart(2, "0")}-${brDate[1].padStart(2, "0")}`;
    }

    return new Date().toISOString().split("T")[0];
  };

  const parseImportAmount = (value: any) => {
    if (typeof value === "number") return value;
    const cleaned = String(value || "0")
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    return Number(cleaned) || 0;
  };

  const normalizeImportText = (value: any) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      if (workbook.SheetNames.length === 0) {
        alert("Esse arquivo nao tem nenhuma aba para importar.");
        return;
      }

      const rows = workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      });

      const imported = rows
        .map((row) => {
          const description = String(readImportValue(row, ["descricao", "descrição", "description", "nome"], 1)).trim();
          const amount = parseImportAmount(readImportValue(row, ["valor", "amount"], 4));
          const typeRaw = normalizeImportText(readImportValue(row, ["tipo", "type"], 3));
          const statusRaw = normalizeImportText(readImportValue(row, ["status"], 5));

          if (!description || amount <= 0) return null;

          return {
            description,
            amount,
            category: String(readImportValue(row, ["categoria", "category"], 2) || "Outros").trim(),
            type: typeRaw.includes("entrada") || typeRaw.includes("income") || typeRaw.includes("receita") ? "income" : "expense",
            status: statusRaw.includes("pend") ? "pending" : "paid",
            dueDate: parseImportDate(readImportValue(row, ["data", "dueDate", "vencimento"], 0)),
            pixCode: String(readImportValue(row, ["pix", "pixCode"]) || ""),
            barCode: String(readImportValue(row, ["boleto", "codigo de barras", "barCode"]) || ""),
            observation: String(readImportValue(row, ["observacao", "observação", "observation"], 6) || ""),
            isRecurrent: false,
            recurrenceMonths: 12,
          };
        })
        .filter(Boolean);

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
    setSelectedTx(null);
    setIsEditing(false);
    setIsModalOpen(false);
    setSelectedInvestmentId(tx?.id || "");
    setRedeemAmount(tx?.amount ? String(tx.amount) : "");
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

    const investedAmount = Number(investment.amount) || 0;
    let principalAmount = amount;
    let gainAmount = 0;

    if (amount > investedAmount) {
      const confirmed = window.confirm(
        `O valor de resgate (${formatCurrency(
          amount
        )}) é maior que o valor investido (${formatCurrency(
          investedAmount
        )}). Houve ganho nesse investimento?`
      );

      if (!confirmed) return;

      principalAmount = investedAmount;
      gainAmount = amount - investedAmount;
    }

    setIsRedeeming(true);

    const todayKey = new Date().toISOString().split("T")[0];
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

  const previewMonthlyDate = (dateStr: string, months: number) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().split("T")[0];
  };

  const income = transactions
    .filter((t) => t.type === "income" && t.status === "paid")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "expense" && t.status === "paid")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "pending")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const balance = income - expense;

  const grossInvestments = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.status === "paid" &&
        t.category === "Investimento"
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const redeemedInvestments = transactions
    .filter(
      (t) =>
        t.type === "income" &&
        t.status === "paid" &&
        t.category === "Investimento"
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const netInvestments = grossInvestments - redeemedInvestments;
  const totalAssets = balance + netInvestments;
  const investmentOptions = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.status === "paid" &&
        t.category === "Investimento"
    )
    .sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  const selectedInvestment =
    investmentOptions.find((item) => item.id === selectedInvestmentId) ||
    investmentOptions[0];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDateTime = (date?: string) => {
    if (!date) return 0;
    return new Date(`${date}T00:00:00`).getTime();
  };

  const getPriorityRank = (transaction: any) => {
    const todayKey = new Date().toISOString().split("T")[0];

    if (transaction.status === "pending") {
      if (transaction.dueDate < todayKey) return 0;
      return 1;
    }

    return 2;
  };

  const getRowStateClass = (transaction: any) => {
    const todayKey = new Date().toISOString().split("T")[0];

    if (transaction.status !== "pending") {
      return "hover:bg-white/[0.03]";
    }

    if (transaction.dueDate < todayKey) {
      return "bg-red-500/[0.06] hover:bg-red-500/[0.1] border-l-2 border-red-500/70";
    }

    return "bg-amber-500/[0.06] hover:bg-amber-500/[0.1] border-l-2 border-amber-500/70";
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesTerm = t.description
      .toLowerCase()
      .includes(filterTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || t.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === "pending") matchesStatus = t.status === "pending";
    if (statusFilter === "paid")
      matchesStatus = t.status === "paid" && t.type === "expense";
    if (statusFilter === "received") matchesStatus = t.type === "income";

    const matchesDate =
      t.dueDate >= uiDateRange.from && t.dueDate <= uiDateRange.to;

    return matchesTerm && matchesCategory && matchesStatus && matchesDate;
  }).sort((a, b) => {
    const dateA = getDateTime(a.dueDate);
    const dateB = getDateTime(b.dueDate);

    if (sortMode === "asc") return dateA - dateB;
    if (sortMode === "desc") return dateB - dateA;

    const rankA = getPriorityRank(a);
    const rankB = getPriorityRank(b);

    if (rankA !== rankB) return rankA - rankB;

    if (rankA === 0) return dateA - dateB;
    if (rankA === 1) return dateA - dateB;

    return dateB - dateA;
  });

  const handleDateSortToggle = () => {
    setSortMode((mode) => {
      if (mode === "priority") return "desc";
      if (mode === "desc") return "asc";
      return "priority";
    });
  };

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (t: any) => {
    if (t.status === "pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          <CalendarIcon size={12} className="mr-1.5" /> PENDENTE
        </span>
      );
    }

    if (t.type === "expense") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
          <CheckCircle2 size={12} className="mr-1.5" /> PAGO
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
        <CheckCircle2 size={12} className="mr-1.5" /> RECEBIDO
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden group">
          <button
            onClick={toggleHideValues}
            className="absolute top-4 right-4 z-20 text-slate-500 hover:text-white transition-colors bg-black/20 p-2 rounded-lg backdrop-blur-sm"
          >
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
            <Wallet size={80} />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Patrimônio
            </p>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
              Saldo + Inv.
            </span>
          </div>

          <h3
            className={`text-3xl font-bold ${
              totalAssets >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {displayValue(totalAssets)}
          </h3>

          <div className="flex flex-col gap-1 mt-4 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Em Conta:</span>
              <span className="font-bold text-slate-300">
                {displayValue(balance)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <TrendingUp size={10} className="text-indigo-400" /> Investido:
              </span>
              <span className="font-bold text-indigo-400">
                {displayValue(netInvestments)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-emerald-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <ArrowUpCircle size={24} />
            </div>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">
              Receitas
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {displayValue(income)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Entradas confirmadas</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-red-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <ArrowDownCircle size={24} />
            </div>
            <span className="text-xs font-bold bg-red-500/10 text-red-400 px-2 py-1 rounded">
              Despesas
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {displayValue(expense)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Saídas (Inclui investimentos)
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-amber-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <span className="text-xs font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
              Pendente
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {displayValue(pendingExpense)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Contas a pagar</p>
        </div>
      </div>

      <div className="bg-[#13161C] p-4 rounded-2xl border border-white/5">
        <div className="flex flex-col xl:flex-row gap-4 justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search
              className="absolute left-3 top-3 text-slate-500"
              size={16}
            />
            <Input
              placeholder="Buscar lançamentos..."
              className="pl-10 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 h-10 w-full"
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex gap-2 w-full lg:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 rounded-md border border-white/10 bg-[#0B0E14] text-white text-sm px-3 outline-none focus:ring-1 focus:ring-indigo-500 w-full lg:w-40"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-white/10 bg-[#0B0E14] text-white text-sm px-3 outline-none focus:ring-1 focus:ring-indigo-500 w-full lg:w-32"
              >
                <option value="all">Status</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="received">Recebido</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsGlobalStats(!isGlobalStats)}
                className={`h-10 px-4 border-white/10 ${
                  isGlobalStats
                    ? "bg-[#0B0E14] text-slate-400 hover:text-slate-800"
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

              <div className="w-full lg:w-auto">
                <DateRangeFilter
                  from={uiDateRange.from}
                  to={uiDateRange.to}
                  onChange={setUiDateRange}
                />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full lg:w-auto h-10 px-4 border-white/10 bg-[#0B0E14] text-slate-300 hover:bg-white/10 shrink-0"
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
              className="w-full lg:w-auto h-10 px-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-100 shrink-0"
            >
              <TrendingUp size={16} className="mr-2" /> Resgatar
            </Button>

            <Button
              onClick={openNewTransactionModal}
              className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95 shrink-0 border border-indigo-500/20"
            >
              <Plus size={18} className="mr-2" /> Nova
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[#13161C] rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[600px] sm:min-w-full">
                <thead className="bg-white/[0.02] text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 hidden sm:table-cell">
                      Categoria
                    </th>
                    <th className="px-6 py-4 hidden sm:table-cell">
                      <div className="group/sort relative inline-flex">
                        <button
                          type="button"
                          onClick={handleDateSortToggle}
                          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:text-white"
                        >
                          {sortMode === "priority" ? "Prioridade" : "Data"}
                          {sortMode === "priority" ? (
                            <AlertTriangle size={13} className="text-amber-400" />
                          ) : sortMode === "desc" ? (
                            <ArrowDownWideNarrow size={13} className="text-indigo-400" />
                          ) : (
                            <ArrowUpWideNarrow size={13} className="text-indigo-400" />
                          )}
                        </button>
                        <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-slate-200 opacity-0 shadow-xl shadow-black/40 transition-opacity duration-150 group-hover/sort:opacity-100">
                          {sortMode === "priority"
                            ? "Prioridade: vencidas, proximas e depois concluidas"
                            : sortMode === "desc"
                            ? "Datas futuras primeiro"
                            : "Datas antigas primeiro"}
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-16 text-center text-slate-500"
                      >
                        Nenhuma transação encontrada neste período.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => openDetailsModal(t)}
                        className={`${getRowStateClass(t)} cursor-pointer transition-colors group`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <BrandIcon
                              description={t.description}
                              category={t.category}
                              type={t.type}
                              className="w-10 h-10 rounded-xl bg-white/5"
                            />
                            <div>
                              <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                                {t.description}
                              </p>
                              <p className="text-xs text-slate-500 sm:hidden">
                                {t.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(t)}</td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-slate-300 text-xs font-medium">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-slate-400 font-mono text-xs">
                          {formatDate(t.dueDate)}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-bold font-mono ${
                            t.type === "income"
                              ? "text-emerald-400"
                              : "text-white"
                          }`}
                        >
                          {t.type === "expense" ? "- " : "+ "}
                          {displayValue(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/5 bg-white/[0.01] gap-4">
                <div className="text-xs text-slate-500 order-2 sm:order-1 font-medium">
                  Página {currentPage} de {totalPages} •{" "}
                  {paginatedTransactions.length} itens
                </div>
                <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none h-8 border-white/10 bg-transparent text-slate-300 hover:bg-white/5 disabled:opacity-30"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft size={14} className="mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none h-8 border-white/10 bg-transparent text-slate-300 hover:bg-white/5 disabled:opacity-30"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {(isModalOpen || selectedTx || isRedeemModalOpen) && (
        <div className="fixed inset-0 bg-[#000000]/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className={`bg-[#13161C] border border-white/10 rounded-2xl shadow-2xl w-full overflow-hidden animate-in zoom-in-95 ring-1 ring-white/10 ${
              isRedeemModalOpen ? "max-w-2xl" : "max-w-lg"
            }`}
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-bold text-lg text-white tracking-tight">
                {isRedeemModalOpen
                  ? "Resgatar Investimento"
                  : isEditing
                  ? "Editar Transação"
                  : selectedTx
                  ? "Detalhes"
                  : "Nova Movimentação"}
              </h3>
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
                className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
              {isRedeemModalOpen ? (
                <form onSubmit={handleRedeemInvestment} className="space-y-5">
                  {investmentOptions.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <TrendingUp size={22} />
                      </div>
                      <p className="text-sm font-bold text-white">
                        Nenhum investimento pago encontrado.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cadastre uma saída paga na categoria Investimento para
                        fazer um resgate.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
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
                            Number(selectedInvestment.amount) && (
                            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                              O valor acima do principal será confirmado como
                              rendimento e lançado automaticamente em
                              Rendimento de Investimento.
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
                                onClick={() =>
                                  setSelectedInvestmentId(investment.id)
                                }
                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
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
                                    {formatDate(investment.dueDate)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-bold font-mono text-emerald-300">
                                  {displayValue(Number(investment.amount))}
                                </span>
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
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-8 bg-[#0B0E14] rounded-xl border border-white/5 relative overflow-hidden">
                    <div
                      className={`absolute inset-0 opacity-10 ${
                        selectedTx.type === "income"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    ></div>

                    <BrandIcon
                      description={selectedTx.description}
                      category={selectedTx.category}
                      type={selectedTx.type}
                      className="w-16 h-16 mb-4 rounded-2xl bg-white/10"
                    />

                    <h4 className="text-xl font-bold text-white mb-1 text-center px-4">
                      {selectedTx.description}
                    </h4>

                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">
                      {selectedTx.type === "income" ? "Entrada" : "Saída"}
                    </p>
                    <p
                      className={`text-4xl font-bold tracking-tight ${
                        selectedTx.type === "income"
                          ? "text-emerald-400"
                          : "text-white"
                      }`}
                    >
                      {displayValue(selectedTx.amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">
                        Categoria
                      </p>
                      <p className="font-bold text-white">
                        {selectedTx.category}
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">
                        Data
                      </p>
                      <p className="font-bold text-white">
                        {formatDate(selectedTx.dueDate)}
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">
                        Responsável
                      </p>
                      <p className="font-bold text-white">
                        {selectedTx.userName?.split(" ")[0] || "Eu"}
                      </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">
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
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <FileText size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          Observações
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedTx.observation}
                      </p>
                    </div>
                  )}

                  {selectedTx.isRecurrent && (
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                      <div className="flex items-center justify-between gap-4">
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
                          className="h-9 bg-red-500/10 px-3 text-red-300 hover:bg-red-500/20 border border-red-500/20"
                          onClick={() => handleDeleteRecurrenceWrapper(selectedTx.id)}
                        >
                          <Trash2 size={14} className="mr-2" />
                          Excluir recorrencia
                        </Button>
                      </div>
                    </div>
                  )}

                  {(selectedTx.pixCode || selectedTx.barCode) && (
                    <div className="space-y-3 pt-2">
                      {selectedTx.pixCode && (
                        <div className="flex items-center justify-between p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mr-2">
                            Pix
                          </span>
                          <p className="text-xs font-mono truncate flex-1 text-slate-300">
                            {selectedTx.pixCode}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 hover:bg-indigo-500/20 text-indigo-300 transition-all"
                            onClick={() =>
                              handleCopy(selectedTx.pixCode, "pix")
                            }
                          >
                            {copiedField === "pix" ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold text-xs">
                                <Check size={14} /> Copiado
                              </span>
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                        </div>
                      )}
                      {selectedTx.barCode && (
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                            Boleto
                          </span>
                          <p className="text-xs font-mono truncate flex-1 text-slate-300">
                            {selectedTx.barCode}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 hover:bg-white/10 text-slate-300 transition-all"
                            onClick={() =>
                              handleCopy(selectedTx.barCode, "barCode")
                            }
                          >
                            {copiedField === "barCode" ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold text-xs">
                                <Check size={14} /> Copiado
                              </span>
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTx.category === "Investimento" &&
                    selectedTx.type === "expense" && (
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20 border-emerald-500/50"
                        onClick={() => openRedeemInvestmentModal(selectedTx)}
                      >
                        <PieChart size={18} className="mr-2" /> Resgatar Valor
                      </Button>
                    )}

                  {selectedTx.type === "expense" &&
                    selectedTx.status === "pending" && (
                      <Button
                        variant="outline"
                        className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
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

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <Button
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold"
                      onClick={handleStartEdit}
                    >
                      <Pencil size={18} className="mr-2" /> Editar
                    </Button>

                    {selectedTx.type === "expense" && (
                      <Button
                        className="bg-white hover:bg-slate-200 text-slate-900 font-bold shadow-md"
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
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-0"
                      onClick={() => handleDeleteWrapper(selectedTx.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveWrapper} className="space-y-5">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] rounded-xl border border-white/10">
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
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all ${
                        formData.type === "income"
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, type: "expense" })
                      }
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all ${
                        formData.type === "expense"
                          ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      Saída
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                      Descrição
                    </label>
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
                      className="input-dark h-11 border-white/10 bg-black/20 focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Valor (R$)
                      </label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        required
                        className="input-dark h-11 font-bold text-lg border-white/10 bg-black/20 focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Data
                      </label>
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                        required
                        className="input-dark h-11 border-white/10 bg-black/20 focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Categoria
                      </label>
                      <select
                        className="w-full h-11 border border-white/10 rounded-md px-3 text-sm bg-black/20 text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                    </div>
                    {formData.type === "expense" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Status Inicial
                        </label>
                        <select
                          className="w-full h-11 border border-white/10 rounded-md px-3 text-sm bg-black/20 text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                      </div>
                    )}
                  </div>

                  {formData.type === "expense" && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            isRecurrent: !formData.isRecurrent,
                          })
                        }
                        className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
                          formData.isRecurrent
                            ? "border-indigo-500/50 bg-indigo-500/15 shadow-lg shadow-indigo-950/20"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              formData.isRecurrent
                                ? "bg-indigo-500 text-white"
                                : "bg-black/20 text-slate-500"
                            }`}
                          >
                            <Repeat2 size={18} />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-white">
                              Repetir mensalmente
                            </span>
                            <span className="block text-xs text-slate-400">
                              Cria 12 lancamentos, um para cada mes.
                            </span>
                          </span>
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            formData.isRecurrent
                              ? "bg-indigo-500 text-white"
                              : "bg-white/5 text-slate-500"
                          }`}
                        >
                          {formData.isRecurrent ? "Ativado" : "Desativado"}
                        </span>
                      </button>
                      {formData.isRecurrent && (
                        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                              <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                                Quantidade de meses
                              </label>
                              <select
                                value={formData.recurrenceMonths}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    recurrenceMonths: Number(e.target.value),
                                  })
                                }
                                className="mt-1 h-10 w-full rounded-md border border-indigo-500/30 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 sm:w-44"
                              >
                                <option value={3}>3 meses</option>
                                <option value={6}>6 meses</option>
                                <option value={12}>12 meses</option>
                                <option value={24}>24 meses</option>
                              </select>
                            </div>
                            <div className="text-xs text-indigo-200">
                              Serão criados {formData.recurrenceMonths} lançamentos.
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from({ length: Math.min(4, formData.recurrenceMonths) }).map((_, index) => (
                              <span key={index} className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100">
                                {formatDate(previewMonthlyDate(formData.dueDate, index))}
                              </span>
                            ))}
                            {formData.recurrenceMonths > 4 && (
                              <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100">
                                +{formData.recurrenceMonths - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <Input
                        placeholder="Código Pix (Copia e Cola)"
                        value={formData.pixCode}
                        onChange={(e) =>
                          setFormData({ ...formData, pixCode: e.target.value })
                        }
                        className="input-dark text-xs font-mono border-white/10 bg-black/20"
                      />
                      <Input
                        placeholder="Código de Barras (Boleto)"
                        value={formData.barCode}
                        onChange={(e) =>
                          setFormData({ ...formData, barCode: e.target.value })
                        }
                        className="input-dark text-xs font-mono border-white/10 bg-black/20"
                      />
                      <Textarea
                        placeholder="Observações opcionais..."
                        value={formData.observation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            observation: e.target.value,
                          })
                        }
                        className="input-dark min-h-[80px] border-white/10 bg-black/20"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    {isEditing && (
                      <Button
                        type="button"
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className={`flex-1 h-12 text-base font-bold shadow-lg mt-2 text-white ${
                        formData.type === "income"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <Save size={18} className="mr-2" /> Salvar Alterações
                        </>
                      ) : (
                        "Salvar Movimentação"
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
