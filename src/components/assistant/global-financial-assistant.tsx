"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle2, CircleHelp, Flag, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { useFinance } from "@/hooks/use-finance";
import { ASSISTANT_QUESTION_GROUPS, ASSISTANT_QUICK_QUESTIONS, buildProactiveMessages, answerWithoutAI } from "@/lib/assistant/engine";
import { FinancialGoal } from "@/lib/assistant/types";
import { deleteFinancialGoal, getFinancialGoals, saveFinancialGoal } from "@/actions/goal-actions";
import { formatCurrency } from "@/lib/utils";
import { parseTransactionCommand } from "@/lib/assistant/transaction-command";

type ChatMessage = { role: "assistant" | "user"; text: string };

export function GlobalFinancialAssistant() {
  const pathname = usePathname();
  const { transactions, snapshotTransactions, loading, dateRange, cycleRange, cycleStartDay, cycleEndDay, addTransaction, ensureRangeLoaded, loadAllTransactions } = useFinance();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "goals">("chat");
  const [assistantPeriod, setAssistantPeriod] = useState<"current" | "custom" | "previous" | "all">("current");
  const [customRange, setCustomRange] = useState(dateRange);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: "Pergunte sobre suas contas ou registre naturalmente: “gastei 20 reais com lanche hoje” e “recebi 30 reais hoje”. Toque em “Como usar” para ver exemplos." }]);
  const [saving, setSaving] = useState(false);
  const [answering, setAnswering] = useState(false);
  const answeringRef = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "" });

  async function loadGoals() {
    setGoals(await getFinancialGoals() as FinancialGoal[]);
  }
  useEffect(() => { loadGoals(); }, []);
  const proactive = useMemo(() => buildProactiveMessages(transactions, goals), [transactions, goals]);
  const merchantQuestions = useMemo(() => [...new Set(
    snapshotTransactions.filter((item) => item.type === "expense").map((item) => item.description.trim()).filter(Boolean)
  )].slice(0, 2).map((description) => `Quanto gastei em ${description}?`), [snapshotTransactions]);
  const assistantRange = useMemo(() => {
    if (assistantPeriod === "custom") return customRange;
    if (assistantPeriod === "previous") return { from: shiftMonth(cycleRange.from, -1), to: shiftMonth(cycleRange.to, -1) };
    if (assistantPeriod === "all") {
      const dates = snapshotTransactions.map((item) => item.dueDate).filter(Boolean).sort();
      return { from: dates[0] || cycleRange.from, to: dates.at(-1) || cycleRange.to };
    }
    return cycleRange;
  }, [assistantPeriod, customRange, cycleRange, snapshotTransactions]);
  const currentOpinion = proactive[0];

  useEffect(() => {
    if (assistantPeriod === "all") {
      void loadAllTransactions();
      return;
    }
    if (assistantPeriod === "custom" || assistantPeriod === "previous") {
      void ensureRangeLoaded(assistantRange);
    }
  }, [assistantPeriod, assistantRange.from, assistantRange.to, ensureRangeLoaded, loadAllTransactions]);

  useEffect(() => {
    if (!currentOpinion || loading) return;
    const key = `assistant-opinion:${pathname}:${currentOpinion.id}`;
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, "seen");
  }, [currentOpinion, loading, pathname]);

  function ask(event: FormEvent) {
    event.preventDefault();
    answerQuestion(question);
  }

  function answerQuestion(value: string) {
    const clean = value.trim();
    if (!clean || answeringRef.current) return;
    answeringRef.current = true;
    setMessages((items) => [...items, { role: "user", text: clean }]);
    setQuestion("");
    setAnswering(true);
    const command = parseTransactionCommand(clean);
    if (command) {
      void registerTransactionCommand(command);
      return;
    }
    window.setTimeout(() => {
      const answer = answerWithoutAI(clean, transactions, goals, {
        allTransactions: snapshotTransactions,
        range: assistantRange,
      });
      setMessages((items) => [...items, { role: "assistant", text: answer }]);
      setAnswering(false);
      answeringRef.current = false;
    }, 280);
  }

  async function registerTransactionCommand(command: NonNullable<ReturnType<typeof parseTransactionCommand>>) {
    try {
      const result = await addTransaction({
        ...command,
        pixCode: "", barCode: "", observation: "", isRecurrent: false, recurrenceMonths: 12,
      });
      const typeLabel = command.type === "income" ? "Entrada" : "Saída";
      const statusLabel = command.status === "pending" ? (command.type === "income" ? "a receber" : "a pagar") : (command.type === "income" ? "recebida" : "paga");
      const response = result?.success
        ? `${typeLabel} registrada: ${command.description}, ${formatCurrency(command.amount)}, em ${command.dueDate.split("-").reverse().join("/")} (${statusLabel}).`
        : "Não consegui registrar esse lançamento. O banco pode estar temporariamente indisponível; tente novamente depois.";
      setMessages((items) => [...items, { role: "assistant", text: response }]);
    } catch {
      setMessages((items) => [...items, { role: "assistant", text: "Não consegui acessar o banco agora. Nenhum lançamento foi confirmado." }]);
    } finally {
      setAnswering(false);
      answeringRef.current = false;
    }
  }

  async function createGoal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await saveFinancialGoal({ ...goalForm, targetAmount: Number(goalForm.targetAmount), currentAmount: Number(goalForm.currentAmount) });
    setSaving(false);
    if (!result.success) return alert(result.error);
    setGoalForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "" });
    setShowGoalForm(false);
    await loadGoals();
  }

  async function removeGoal(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    await deleteFinancialGoal(id);
    await loadGoals();
  }

  async function addGoalContribution(goal: FinancialGoal) {
    const raw = prompt(`Quanto deseja adicionar à meta “${goal.name}”?`);
    if (!raw) return;
    const contribution = Number(raw.replace(",", "."));
    if (!Number.isFinite(contribution) || contribution <= 0) return alert("Informe um valor válido.");
    await saveFinancialGoal({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: Math.min(goal.targetAmount, goal.currentAmount + contribution),
      targetDate: goal.targetDate,
    }, goal.id);
    await loadGoals();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={currentOpinion ? `Assistente: ${currentOpinion.title}` : "Abrir assistente financeiro"}
        title={currentOpinion ? "Tenho uma opinião sobre suas contas" : "Abrir assistente"}
        className={`fixed bottom-5 right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-950/50 transition-transform hover:scale-110 lg:right-6 ${currentOpinion && !loading ? "assistant-nudge" : ""}`}
      >
        <Bot size={22} />
        {currentOpinion && !loading && (
          <>
            <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#080b12] ${currentOpinion.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
            <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 animate-ping rounded-full opacity-60 ${currentOpinion.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
          </>
        )}
      </button>

      {open && (
        <aside className="fixed inset-0 z-[100] flex items-end justify-end bg-black/40 backdrop-blur-sm sm:p-4 lg:p-6" onClick={() => setOpen(false)}>
          <div className="flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d111b] shadow-2xl sm:h-[min(760px,88dvh)] sm:max-w-[500px] sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <header className="shrink-0 border-b border-white/10 bg-gradient-to-r from-violet-500/15 to-cyan-500/10 p-4">
              <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/20 p-2 text-violet-200"><Bot size={22} /></div><div><h2 className="font-bold text-white">Assistente Controle</h2><p className="text-[11px] text-slate-400">Ciclo dia {cycleStartDay} ao dia {cycleEndDay} · {dateRange.from.slice(8, 10)}/{dateRange.from.slice(5, 7)}–{dateRange.to.slice(8, 10)}/{dateRange.to.slice(5, 7)}</p></div><button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={19} /></button></div>
              <div className="mt-4 grid grid-cols-2 rounded-xl bg-black/20 p-1"><button onClick={() => setTab("chat")} className={`rounded-lg py-2 text-xs font-bold ${tab === "chat" ? "bg-white/10 text-white" : "text-slate-500"}`}>Conversa</button><button onClick={() => setTab("goals")} className={`rounded-lg py-2 text-xs font-bold ${tab === "goals" ? "bg-white/10 text-white" : "text-slate-500"}`}>Objetivos ({goals.length})</button></div>
            </header>

            {tab === "chat" ? <>
              <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><label className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Período analisado</span><select value={assistantPeriod} onChange={(event) => setAssistantPeriod(event.target.value as "current" | "custom" | "previous" | "all")} className="rounded-lg border border-white/10 bg-[#151a26] px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none"><option value="current">Meu ciclo</option><option value="custom">Personalizado</option><option value="previous">Ciclo anterior</option><option value="all">Todo o histórico</option></select></label>{assistantPeriod === "custom" && <div className="mt-2 grid grid-cols-2 gap-2"><input aria-label="Início" type="date" value={customRange.from} onChange={(event) => setCustomRange((range) => ({ ...range, from: event.target.value }))} className="h-9 w-full rounded-lg border border-white/10 bg-[#151a26] px-2 text-[11px] text-slate-200" /><input aria-label="Fim" type="date" value={customRange.to} onChange={(event) => setCustomRange((range) => ({ ...range, to: event.target.value }))} className="h-9 w-full rounded-lg border border-white/10 bg-[#151a26] px-2 text-[11px] text-slate-200" /></div>}<p className="mt-1.5 text-[10px] text-slate-500">{assistantRange.from.split("-").reverse().join("/")} até {assistantRange.to.split("-").reverse().join("/")}</p></div>
                <button type="button" onClick={() => setShowHelp((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-2.5 text-left text-xs font-bold text-cyan-100">
                  <span className="flex items-center gap-2"><CircleHelp size={16} /> Como usar o Assistente Controle</span>
                  <span className="text-[10px] text-cyan-300">{showHelp ? "FECHAR" : "VER PERGUNTAS"}</span>
                </button>
                {showHelp && <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs leading-5 text-slate-400">Escolha uma pergunta ou escreva do seu jeito. Para lançar valores, diga “adiciona 20 reais de cachorro-quente hoje”, “recebi 30 reais hoje” ou “tenho que pagar 100 reais de internet amanhã”.</p>
                  {ASSISTANT_QUESTION_GROUPS.map((group) => <div key={group.title}><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.title}</p><div className="flex flex-wrap gap-1.5">{group.questions.map((item) => <button key={item} type="button" disabled={answering} onClick={() => { answerQuestion(item); setShowHelp(false); }} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-left text-[11px] text-slate-300 hover:border-violet-400/30 hover:text-white disabled:opacity-40">{item}</button>)}</div></div>)}
                  <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Suas compras</p><p className="mb-2 text-[11px] leading-4 text-slate-400">Digite “quanto gastei em” e o nome de qualquer compra. Erros pequenos de escrita também são reconhecidos.</p><div className="flex flex-wrap gap-1.5">{merchantQuestions.map((item) => <button key={item} type="button" onClick={() => { answerQuestion(item); setShowHelp(false); }} className="rounded-lg border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-2 text-left text-[11px] text-violet-200">{item}</button>)}</div></div>
                </div>}
                {proactive.slice(0, 3).map((item) => <div key={item.id} className={`rounded-2xl border p-3 ${item.severity === "critical" ? "border-red-500/20 bg-red-500/[0.07]" : "border-amber-500/15 bg-amber-500/[0.06]"}`}><p className="text-xs font-bold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p>{item.action && <p className="mt-2 text-xs font-medium text-violet-300">→ {item.action}</p>}</div>)}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ASSISTANT_QUICK_QUESTIONS.map((item) => <button key={item} type="button" disabled={answering} onClick={() => answerQuestion(item)} className="shrink-0 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-2 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-400/15 disabled:opacity-40">{item}</button>)}
                </div>
                {messages.map((message, index) => <div key={index} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-violet-600 text-white" : "border border-white/10 bg-white/[0.05] text-slate-200"}`}>{message.text}</div>)}
                {answering && <div className="flex max-w-[88%] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-400"><Loader2 className="animate-spin" size={15} /> Conferindo seus lançamentos...</div>}
              </div>
              <form onSubmit={ask} className="flex shrink-0 gap-2 border-t border-white/10 bg-[#0d111b]/95 p-4 backdrop-blur-xl"><input disabled={answering} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: gastei 20 reais com lanche hoje" className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-violet-400/50 disabled:opacity-60" /><button disabled={answering || !question.trim()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500 text-white disabled:opacity-40">{answering ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}</button></form>
            </> : <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
              <button onClick={() => setShowGoalForm((value) => !value)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white"><Plus size={17} /> Novo objetivo</button>
              {showGoalForm && <form onSubmit={createGoal} className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-300">Nome do objetivo</span><input required placeholder="Ex.: Meu carro" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="mb-1 block text-[11px] font-bold text-slate-300">Quanto custa?</span><input required type="number" min="1" step="0.01" placeholder="Ex.: 10.000" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white" /></label>
                  <label><span className="mb-1 block text-[11px] font-bold text-slate-300">Quanto já guardou?</span><input type="number" min="0" step="0.01" placeholder="Deixe vazio se for R$ 0" value={goalForm.currentAmount} onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white" /></label>
                </div>
                <p className="text-[10px] leading-4 text-slate-500">O valor já guardado é o dinheiro que você possui hoje reservado especificamente para este objetivo.</p>
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-300">Quero alcançar até</span><input required type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white" /></label>
                <button disabled={saving} className="h-11 w-full rounded-xl bg-emerald-500 font-bold text-slate-950">{saving ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Criar objetivo"}</button>
              </form>}
              <div className="space-y-3">{goals.map((goal) => { const progress = Math.min(100, goal.currentAmount / goal.targetAmount * 100); return <div key={goal.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start gap-3"><Flag className="mt-0.5 text-violet-300" size={18} /><div className="min-w-0 flex-1"><p className="font-bold text-white">{goal.name}</p><p className="mt-1 text-xs text-slate-400">{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</p></div><button onClick={() => removeGoal(goal.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16} /></button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex items-center justify-between"><p className="flex items-center gap-1 text-[11px] text-slate-500">{progress >= 100 && <CheckCircle2 className="text-emerald-400" size={12} />}{progress.toFixed(0)}% · até {goal.targetDate.split("-").reverse().join("/")}</p>{progress < 100 && <button onClick={() => addGoalContribution(goal)} className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200">+ Registrar aporte</button>}</div></div>; })}{!goals.length && <p className="py-10 text-center text-sm text-slate-500">Crie uma meta e eu calculo quanto guardar por mês.</p>}</div>
            </div>}
          </div>
        </aside>
      )}
    </>
  );
}

function shiftMonth(key: string, offset: number) {
  const [year, month, day] = key.split("-").map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
