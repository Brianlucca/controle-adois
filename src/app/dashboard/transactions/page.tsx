"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { useFinance } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Loader2, CheckCircle2, Search, CalendarIcon, Copy, CalendarPlus, X, Trash2,
  ArrowUpCircle, ArrowDownCircle, Wallet, Eye, EyeOff, AlertTriangle, Check, FileText, TrendingUp,
  PieChart, ArrowLeft, ArrowRight, Pencil, Save
} from "lucide-react";
import { formatCurrency, formatDate, createGoogleCalendarLink } from "@/lib/utils"; 
import { DateRangeFilter } from "@/components/date-range-filter"; 
import { usePreferences } from "@/contexts/preferences-context"; 

const CATEGORIES = [
  "Todas", "Outros", "Alimentação", "Moradia", "Transporte", 
  "Lazer", "Saúde", "Educação", "Salário", "Investimento",
  "Cartão de Crédito", "Empréstimo"
];

const ITEMS_PER_PAGE = 50;

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, loading, addTransaction, editTransaction, deleteTransaction, updateTransactionStatus, dateRange, setDateRange } = useFinance();
  const { hideValues, toggleHideValues } = usePreferences(); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [filterTerm, setFilterTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    description: "", amount: "", category: "Outros", type: "expense" as "income" | "expense", status: "paid" as "paid" | "pending",
    dueDate: new Date().toISOString().split('T')[0], pixCode: "", barCode: "", observation: "", isRecurrent: false 
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTerm, selectedCategory, statusFilter, dateRange]);

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
        description: "", amount: "", category: "Outros", type: "expense", status: "paid", 
        dueDate: new Date().toISOString().split('T')[0], pixCode: "", barCode: "", observation: "", isRecurrent: false 
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
        dueDate: selectedTx.dueDate.split('T')[0], 
        pixCode: selectedTx.pixCode || "",
        barCode: selectedTx.barCode || "",
        observation: selectedTx.observation || "",
        isRecurrent: selectedTx.isRecurrent || false
    });
    setIsEditing(true);
  };

  const handleSaveWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    
    let result;
    const amountNumber = Number(formData.amount);

    if (isEditing && selectedTx) {
        result = await editTransaction(selectedTx.id, { ...formData, amount: amountNumber });
    } else {
        result = await addTransaction({ ...formData, amount: amountNumber });
    }

    if (handleAuthError(result)) return;

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

  const handleStatusWrapper = async (id: string, newStatus: "paid" | "pending") => {
     const result = await updateTransactionStatus(id, newStatus);
     if (handleAuthError(result)) return;
     if (selectedTx) {
        setSelectedTx({ ...selectedTx, status: newStatus });
     }
  };

  const handleRedeemInvestment = (tx: any) => {
    setFormData({
        description: `Resgate: ${tx.description}`,
        amount: tx.amount.toString(),
        category: "Investimento",
        type: "income",
        status: "paid",
        dueDate: new Date().toISOString().split('T')[0],
        pixCode: "",
        barCode: "",
        observation: `Resgate referente ao investimento de ${formatDate(tx.dueDate)}`,
        isRecurrent: false
    });
    setSelectedTx(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const displayValue = (val: number) => {
    return hideValues ? "••••••" : formatCurrency(val);
  };

  const income = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingExpense = transactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const balance = income - expense;

  const grossInvestments = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid' && t.category === 'Investimento')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const redeemedInvestments = transactions
    .filter(t => t.type === 'income' && t.status === 'paid' && t.category === 'Investimento')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const netInvestments = grossInvestments - redeemedInvestments;
  const totalAssets = balance + netInvestments;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesTerm = t.description.toLowerCase().includes(filterTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || t.category === selectedCategory;
    
    let matchesStatus = true;
    if (statusFilter === "pending") matchesStatus = t.status === "pending";
    if (statusFilter === "paid") matchesStatus = t.status === "paid" && t.type === "expense";
    if (statusFilter === "received") matchesStatus = t.type === "income";

    return matchesTerm && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (t: any) => {
    if (t.status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          <CalendarIcon size={12} className="mr-1.5"/> PENDENTE
        </span>
      );
    }

    if (t.type === 'expense') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
          <CheckCircle2 size={12} className="mr-1.5"/> PAGO
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
        <CheckCircle2 size={12} className="mr-1.5"/> RECEBIDO
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
                 {hideValues ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>

              <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-110 transition-transform pointer-events-none"><Wallet size={80}/></div>
              
              <div className="flex items-center gap-2 mb-2">
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Patrimônio</p>
                 <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">Saldo + Inv.</span>
              </div>

              <h3 className={`text-3xl font-bold ${totalAssets >= 0 ? "text-white" : "text-red-400"}`}>
                  {displayValue(totalAssets)}
              </h3>
              
              <div className="flex flex-col gap-1 mt-4 pt-3 border-t border-white/5">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Em Conta:</span>
                    <span className="font-bold text-slate-300">{displayValue(balance)}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 flex items-center gap-1"><TrendingUp size={10} className="text-indigo-400"/> Investido:</span>
                    <span className="font-bold text-indigo-400">{displayValue(netInvestments)}</span>
                 </div>
              </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-emerald-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><ArrowUpCircle size={24}/></div>
                  <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Receitas</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{displayValue(income)}</h3>
              <p className="text-sm text-slate-500 mt-1">Entradas confirmadas</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-red-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500"><ArrowDownCircle size={24}/></div>
                  <span className="text-xs font-bold bg-red-500/10 text-red-400 px-2 py-1 rounded">Despesas</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{displayValue(expense)}</h3>
              <p className="text-sm text-slate-500 mt-1">Saídas (Inclui investimentos)</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1D24] border border-white/5 relative overflow-hidden hover:border-amber-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><AlertTriangle size={24}/></div>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded">Pendente</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{displayValue(pendingExpense)}</h3>
              <p className="text-sm text-slate-500 mt-1">Contas a pagar</p>
          </div>
      </div>

      <div className="bg-[#13161C] p-4 rounded-2xl border border-white/5">
         <div className="flex flex-col xl:flex-row gap-4 justify-between">
            
            <div className="relative w-full xl:max-w-xs">
                <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                <Input 
                    placeholder="Buscar lançamentos..." 
                    className="pl-10 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 h-10 w-full" 
                    value={filterTerm} 
                    onChange={e => setFilterTerm(e.target.value)} 
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex gap-2 w-full lg:w-auto">
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-10 rounded-md border border-white/10 bg-[#0B0E14] text-white text-sm px-3 outline-none focus:ring-1 focus:ring-indigo-500 w-full lg:w-40"
                    >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                
                <div className="w-full lg:w-auto">
                    <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
                </div>
                
                <Button onClick={openNewTransactionModal} className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95 shrink-0 border border-indigo-500/20">
                    <Plus size={18} className="mr-2" /> Nova
                </Button>
            </div>
         </div>
      </div>

      <div className="bg-[#13161C] rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col">
            {loading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 h-8 w-8"/></div> : (
            <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px] sm:min-w-full">
                <thead className="bg-white/[0.02] text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-white/5">
                    <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Categoria</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Data</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {paginatedTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="p-16 text-center text-slate-500">Nenhuma transação encontrada neste período.</td></tr>
                    ) : paginatedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.03] cursor-pointer transition-colors group" onClick={() => openDetailsModal(t)}>
                        <td className="px-6 py-4">
                        {getStatusBadge(t)}
                        </td>
                        <td className="px-6 py-4">
                        <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{t.description}</p>
                        <p className="text-xs text-slate-500 sm:hidden">{t.category}</p>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-slate-300 text-xs font-medium">
                                {t.category}
                            </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-slate-400 font-mono text-xs">{formatDate(t.dueDate)}</td>
                        <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                        {t.type === 'expense' ? '- ' : '+ '}{displayValue(t.amount)}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            
            {filteredTransactions.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/5 bg-white/[0.01] gap-4">
                    <div className="text-xs text-slate-500 order-2 sm:order-1">
                        Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 sm:flex-none h-8 border-white/10 bg-transparent text-slate-300 hover:bg-white/5 disabled:opacity-30"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ArrowLeft size={14} className="mr-1"/> Anterior
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 sm:flex-none h-8 border-white/10 bg-transparent text-slate-300 hover:bg-white/5 disabled:opacity-30"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Próxima <ArrowRight size={14} className="ml-1"/>
                        </Button>
                    </div>
                </div>
            )}
            </>
            )}
      </div>

      {(isModalOpen || selectedTx) && (
        <div className="fixed inset-0 bg-[#000000]/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#13161C] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 ring-1 ring-white/10">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold text-lg text-white tracking-tight">
                    {isEditing ? "Editar Transação" : (selectedTx ? "Detalhes" : "Nova Movimentação")}
                </h3>
                <button type="button" onClick={() => {setIsModalOpen(false); setSelectedTx(null); setIsEditing(false);}} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full"><X size={18}/></button>
            </div>

            <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
            {selectedTx && !isEditing ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8 bg-[#0B0E14] rounded-xl border border-white/5 relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-10 ${selectedTx.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    
                    <h4 className="text-xl font-bold text-white mb-1 text-center px-4">{selectedTx.description}</h4>
                    
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">{selectedTx.type === 'income' ? 'Entrada' : 'Saída'}</p>
                    <p className={`text-4xl font-bold tracking-tight ${selectedTx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                        {displayValue(selectedTx.amount)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Categoria</p><p className="font-bold text-white">{selectedTx.category}</p></div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Data</p><p className="font-bold text-white">{formatDate(selectedTx.dueDate)}</p></div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Responsável</p><p className="font-bold text-white">{selectedTx.userName?.split(' ')[0] || 'Eu'}</p></div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Status</p>
                      <p className={`font-bold ${selectedTx.status === 'pending' ? 'text-amber-400' : selectedTx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedTx.status === 'pending' ? 'Pendente' : selectedTx.type === 'income' ? 'Recebido' : 'Pago'}
                      </p>
                  </div>
                </div>

                {selectedTx.observation && (
                   <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 mb-2 text-slate-500">
                         <FileText size={14} />
                         <span className="text-[10px] uppercase font-bold tracking-wider">Observações</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedTx.observation}
                      </p>
                   </div>
                )}

                {(selectedTx.pixCode || selectedTx.barCode) && (
                    <div className="space-y-3 pt-2">
                        {selectedTx.pixCode && (
                            <div className="flex items-center justify-between p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mr-2">Pix</span>
                                <p className="text-xs font-mono truncate flex-1 text-slate-300">{selectedTx.pixCode}</p>
                                <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-indigo-500/20 text-indigo-300 transition-all" onClick={() => handleCopy(selectedTx.pixCode, 'pix')}>
                                    {copiedField === 'pix' ? <span className="text-emerald-400 flex items-center gap-1 font-bold text-xs"><Check size={14}/> Copiado</span> : <Copy size={14}/>}
                                </Button>
                            </div>
                        )}
                        {selectedTx.barCode && (
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Boleto</span>
                                <p className="text-xs font-mono truncate flex-1 text-slate-300">{selectedTx.barCode}</p>
                                <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-white/10 text-slate-300 transition-all" onClick={() => handleCopy(selectedTx.barCode, 'barCode')}>
                                    {copiedField === 'barCode' ? <span className="text-emerald-400 flex items-center gap-1 font-bold text-xs"><Check size={14}/> Copiado</span> : <Copy size={14}/>}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {selectedTx.category === 'Investimento' && selectedTx.type === 'expense' && (
                    <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20 border-emerald-500/50"
                        onClick={() => handleRedeemInvestment(selectedTx)}
                    >
                        <PieChart size={18} className="mr-2"/> Resgatar Valor
                    </Button>
                )}
                
                {selectedTx.type === 'expense' && selectedTx.status === 'pending' && (
                    <Button variant="outline" className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => {
                            const link = createGoogleCalendarLink(selectedTx.description, selectedTx.dueDate, selectedTx.amount, selectedTx.observation);
                            window.open(link, '_blank');
                        }}>
                        <CalendarPlus size={16} className="mr-2"/> Adicionar ao Google Agenda
                    </Button>
                )}

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <Button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold" onClick={handleStartEdit}>
                        <Pencil size={18} className="mr-2"/> Editar
                    </Button>
                    
                    {selectedTx.type === 'expense' && (
                        <Button className="bg-white hover:bg-slate-200 text-slate-900 font-bold shadow-md" onClick={() => handleStatusWrapper(selectedTx.id, selectedTx.status === 'paid' ? 'pending' : 'paid')}>
                            {selectedTx.status === 'paid' ? "Pendente" : "Pagar"}
                        </Button>
                    )}
                    
                    <Button variant="destructive" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-0" onClick={() => handleDeleteWrapper(selectedTx.id)}>
                        <Trash2 size={18}/>
                    </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveWrapper} className="space-y-5">
                 <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] rounded-xl border border-white/10">
                    <button type="button" onClick={() => setFormData({...formData, type: "income"})} className={`py-2.5 text-sm font-bold rounded-lg transition-all ${formData.type === "income" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>Entrada</button>
                    <button type="button" onClick={() => setFormData({...formData, type: "expense"})} className={`py-2.5 text-sm font-bold rounded-lg transition-all ${formData.type === "expense" ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>Saída</button>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Descrição</label>
                    <Input placeholder="Ex: Mercado, Salário..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="input-dark h-11 border-white/10 bg-black/20 focus:border-indigo-500/50" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Valor (R$)</label>
                        <Input type="number" placeholder="0,00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="input-dark h-11 font-bold text-lg border-white/10 bg-black/20 focus:border-indigo-500/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Data</label>
                        <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required className="input-dark h-11 border-white/10 bg-black/20 focus:border-indigo-500/50" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Categoria</label>
                     <select className="w-full h-11 border border-white/10 rounded-md px-3 text-sm bg-black/20 text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        {CATEGORIES.slice(1).map(cat => <option key={cat} className="bg-slate-900">{cat}</option>)}
                     </select>
                   </div>
                   {formData.type === 'expense' && (
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Status Inicial</label>
                         <select className="w-full h-11 border border-white/10 rounded-md px-3 text-sm bg-black/20 text-white outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})}>
                           <option value="paid" className="bg-slate-900">Já Pago</option><option value="pending" className="bg-slate-900">Pendente</option>
                         </select>
                       </div>
                   )}
                 </div>

                 {formData.type === 'expense' && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                            <input type="checkbox" id="recurrent" checked={formData.isRecurrent} onChange={e => setFormData({...formData, isRecurrent: e.target.checked})} className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-offset-0 focus:ring-0" />
                            <label htmlFor="recurrent" className="text-sm text-slate-300 font-medium">Repetir esta conta mensalmente?</label>
                        </div>
                        <Input placeholder="Código Pix (Copia e Cola)" value={formData.pixCode} onChange={e => setFormData({...formData, pixCode: e.target.value})} className="input-dark text-xs font-mono border-white/10 bg-black/20" />
                        <Input placeholder="Código de Barras (Boleto)" value={formData.barCode} onChange={e => setFormData({...formData, barCode: e.target.value})} className="input-dark text-xs font-mono border-white/10 bg-black/20" />
                        <Textarea placeholder="Observações opcionais..." value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="input-dark min-h-[80px] border-white/10 bg-black/20" />
                    </div>
                 )}

                 <div className="flex gap-3">
                    {isEditing && (
                        <Button type="button" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700" onClick={() => setIsEditing(false)}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" className={`flex-1 h-12 text-base font-bold shadow-lg mt-2 text-white ${formData.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'}`}>
                        {isEditing ? <><Save size={18} className="mr-2"/> Salvar Alterações</> : "Salvar Movimentação"}
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