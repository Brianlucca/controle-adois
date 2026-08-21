import { Transaction } from "@/lib/types";
import { getLocalDateKey } from "@/lib/finance/date";
import { calculateFinancialPosition } from "@/lib/finance/financial-position";
import { FINANCIAL_KNOWLEDGE_BASE } from "./knowledge-base";
import { AssistantMessage, FinancialGoal } from "./types";

export interface AssistantContext { allTransactions?: Transaction[]; range?: { from: string; to: string } }

export const ASSISTANT_QUICK_QUESTIONS = [
  "Quanto gastei hoje?", "Quanto recebi hoje?", "Onde gastei mais neste ciclo?",
  "Quanto ainda tenho a receber?", "Quanto ainda tenho a pagar?",
  "Vai sobrar quanto no fim do ciclo?", "Tenho contas atrasadas?",
  "Qual é minha próxima conta?", "Como estão meus objetivos?",
] as const;

export const ASSISTANT_QUESTION_GROUPS = [
  { title: "Dia a dia", questions: ["Quanto gastei hoje?", "Quanto recebi hoje?", "Quanto gastei ontem?", "Quanto gastei esta semana?"] },
  { title: "Meu ciclo", questions: ["Onde gastei mais neste ciclo?", "Vai sobrar quanto no fim do ciclo?", "Quanto gastei neste mês?"] },
  { title: "Pendências", questions: ["Quanto ainda tenho a receber?", "Quanto ainda tenho a pagar?", "Tenho contas atrasadas?", "Qual é minha próxima conta?"] },
  { title: "Planejamento", questions: ["Como estão meus objetivos?", "Onde posso economizar?"] },
] as const;

export function buildProactiveMessages(transactions: Transaction[], goals: FinancialGoal[]): AssistantMessage[] {
  const today = getLocalDateKey(new Date());
  const current = transactions.filter((item) => item.dueDate <= today);
  const income = sum(current.filter((item) => item.type === "income" && item.status === "paid"));
  const overdue = transactions.filter((item) => item.type === "expense" && item.status === "pending" && item.dueDate < today);
  const messages: AssistantMessage[] = [];
  if (overdue.length) messages.push({ id: "overdue", severity: "critical", title: "Tem conta atrasada", body: `${overdue.length} conta(s) vencida(s), somando ${money(sum(overdue))}. Isso vem antes de lazer e novos investimentos.`, action: "Abra Contas & Pix e resolva as mais urgentes." });
  for (const rule of FINANCIAL_KNOWLEDGE_BASE) {
    const matched = current.filter((item) => item.type === "expense" && rule.patterns.some((pattern) => normalize(item.description).includes(normalize(pattern))));
    const total = sum(matched);
    if (!matched.length || rule.nature === "essential" || rule.nature === "neutral") continue;
    if (income > 0 ? total / income >= rule.warningShare : total >= 200) messages.push({ id: `rule:${rule.id}`, severity: rule.nature === "high-risk" || rule.nature === "waste" ? "critical" : "warning", title: `${money(total)} em ${rule.category}`, body: rule.opinion, action: rule.action });
  }
  for (const goal of goals) {
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const months = monthsUntil(goal.targetDate, today);
    messages.push(remaining === 0
      ? { id: `goal:${goal.id}`, severity: "success", title: `Meta “${goal.name}” alcançada`, body: `Você juntou ${money(goal.targetAmount)}.`, action: "Defina o próximo objetivo." }
      : { id: `goal:${goal.id}`, severity: "info", title: `Plano para “${goal.name}”`, body: `Faltam ${money(remaining)}. Para chegar até ${formatDate(goal.targetDate)}, separe cerca de ${money(remaining / months)} por mês.`, action: "Trate esse valor como uma conta fixa após receber." });
  }
  return messages.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 12);
}

export function answerWithoutAI(question: string, transactions: Transaction[], goals: FinancialGoal[], context: AssistantContext = {}) {
  const text = normalize(question);
  const today = getLocalDateKey(new Date());
  const all = context.allTransactions || transactions;
  const range = context.range || inferRange(transactions, today);
  const period = resolvePeriod(text, today, range);
  const periodItems = all.filter((item) => transactionDate(item) >= period.from && transactionDate(item) <= period.to);
  const expenses = periodItems.filter((item) => item.type === "expense" && item.status === "paid");
  const incomes = periodItems.filter((item) => item.type === "income" && item.status === "paid");
  const messages = buildProactiveMessages(transactions, goals);

  if (/(ajuda|pode fazer|o que voce|comandos|perguntas)/.test(text)) return "Eu sou o Assistente Controle. Consulto seus lançamentos sem enviar dados para serviços externos. Posso responder sobre hoje, ontem, semana, mês, ciclo, entradas, gastos, categorias, lojas, pendências, atrasos, previsão e objetivos.";
  if (/(meta|objetivo|carro|casa|viagem)/.test(text)) {
    if (!goals.length) return "Você ainda não tem um objetivo. Crie um com valor, quanto já possui e data desejada; eu calculo quanto separar por mês e acompanho o progresso.";
    return goals.map((goal) => { const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0); return `${goal.name}: ${money(goal.currentAmount)} de ${money(goal.targetAmount)} (${Math.min(100, goal.currentAmount / goal.targetAmount * 100).toFixed(0)}%). Falta ${money(remaining)}; separe aproximadamente ${money(remaining / monthsUntil(goal.targetDate, today))} por mês.`; }).join("\n");
  }
  const namedSearch = extractNamedSearch(text);
  if (namedSearch) {
    const matches = periodItems.filter((item) => fuzzyContains(item.description, namedSearch) || fuzzyContains(item.category, namedSearch));
    if (matches.length) return answerNamedSearch(text, namedSearch, matches, period);
    const suggestions = closestDescriptions(periodItems, namedSearch);
    return suggestions.length
      ? `Não encontrei “${namedSearch}”, mas encontrei nomes parecidos: ${suggestions.map((item) => `“${item}”`).join(" e ")}. Tente tocar no nome ou escrever um pouco mais dele.`
      : `Não encontrei nenhuma conta, entrada ou compra parecida com “${namedSearch}” ${period.label.toLowerCase()}. Tente outro período no filtro do chat.`;
  }
  if (/(atrasad|vencid)/.test(text)) {
    const overdue = periodItems.filter((item) => item.type === "expense" && item.status === "pending" && item.dueDate < today).sort(byDate);
    return overdue.length ? `Você tem ${overdue.length} conta(s) atrasada(s), totalizando ${money(sum(overdue))}. A mais antiga é ${overdue[0].description}, vencida em ${formatDate(overdue[0].dueDate)}.` : "Você não tem contas atrasadas cadastradas.";
  }
  if (/(proxima|proximo).*(conta|boleto|pagamento)|vence primeiro/.test(text)) {
    const next = periodItems.filter((item) => item.type === "expense" && item.status === "pending" && item.dueDate >= today).sort(byDate)[0];
    return next ? `Sua próxima conta é ${next.description}: ${money(next.amount)}, com vencimento em ${formatDate(next.dueDate)}.` : "Não encontrei contas futuras pendentes.";
  }
  if (/(receber|entrada pendente|receita pendente)/.test(text)) {
    const pending = periodItems.filter((item) => item.type === "income" && item.status === "pending");
    return pending.length
      ? `${period.label}, você tem ${money(sum(pending))} a receber, em ${pending.length} entrada(s) pendente(s).`
      : `Você não tem entradas pendentes ${period.label.toLowerCase()}.`;
  }
  if (/(pagar|conta pendente|despesa pendente)/.test(text)) {
    const pending = periodItems.filter((item) => item.type === "expense" && item.status === "pending");
    return pending.length
      ? `${period.label}, você tem ${money(sum(pending))} a pagar, em ${pending.length} conta(s) pendente(s).`
      : `Você não tem contas pendentes ${period.label.toLowerCase()}.`;
  }
  if (/(vai sobrar|quanto sobra|saldo prev|fim do ciclo|previsao)/.test(text)) {
    const position = calculateFinancialPosition(all, today, range.to);
    return `Hoje você tem ${money(position.availableBalance)} disponível. Até ${formatDate(range.to)}, há ${money(position.scheduledIncome)} a receber e ${money(position.scheduledExpense)} a pagar. A previsão do ciclo é ${money(position.projectedBalance)}.`;
  }
  if (/(quanto|total).*(recebi|entrou|entrada|ganhei)|recebi (hoje|ontem)/.test(text)) return `${period.label}, você recebeu ${money(sum(incomes))} em ${incomes.length} entrada(s) confirmada(s).`;
  const purchaseSearch = extractPurchaseSearch(text);
  if (purchaseSearch) {
    const relevant = expenses.filter((item) => fuzzyContains(item.description, purchaseSearch) || fuzzyContains(item.category, purchaseSearch));
    if (relevant.length) {
      const descriptions = [...new Set(relevant.map((item) => item.description))].slice(0, 3).join(", ");
      return `${period.label}, você gastou ${money(sum(relevant))} em ${relevant.length} lançamento(s) relacionado(s) a “${purchaseSearch}”. Encontrei: ${descriptions}.`;
    }
    const suggestions = closestDescriptions(expenses, purchaseSearch);
    return suggestions.length
      ? `Não encontrei “${purchaseSearch}” ${period.label.toLowerCase()}. Você quis dizer ${suggestions.map((item) => `“${item}”`).join(" ou ")}?`
      : `Não encontrei uma compra parecida com “${purchaseSearch}” ${period.label.toLowerCase()}.`;
  }
  const rule = FINANCIAL_KNOWLEDGE_BASE.find((item) => item.patterns.some((pattern) => text.includes(normalize(pattern))) || text.includes(normalize(item.category)));
  if (rule) {
    const relevant = expenses.filter((item) => rule.patterns.some((pattern) => normalize(item.description).includes(normalize(pattern))) || normalize(item.category).includes(normalize(rule.category)));
    return relevant.length ? `${period.label}, você gastou ${money(sum(relevant))} em ${rule.category}, em ${relevant.length} compra(s). ${rule.opinion} ${rule.action}` : `Não encontrei gasto confirmado em ${rule.category} ${period.label.toLowerCase()}.`;
  }
  if (/(onde|maior|categoria|gastei mais)/.test(text)) {
    const categories = Object.entries(groupExpenses(expenses)).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return categories.length ? `${period.label}, seus maiores gastos foram:\n${categories.map(([name, value]) => `• ${name}: ${money(value)}`).join("\n")}` : `Não encontrei despesas confirmadas ${period.label.toLowerCase()}.`;
  }
  if (/(quanto|total|gastei|gasto|despesa)/.test(text)) {
    const largest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    return `${period.label}, você gastou ${money(sum(expenses))} em ${expenses.length} lançamento(s) confirmado(s).${largest ? ` O maior foi ${largest.description}, de ${money(largest.amount)}.` : ""}`;
  }
  if (/(econom|guardar|poupar)/.test(text)) return messages[0] ? `${messages[0].body} ${messages[0].action || ""}` : "Comece separando 10% da renda ao receber e aumente gradualmente até 20%.";
  return messages[0] ? `${messages[0].title}: ${messages[0].body} ${messages[0].action || ""}` : "Não entendi exatamente. Tente perguntar “quanto gastei hoje?”, “quanto tenho a pagar?” ou “onde gastei mais neste ciclo?”.";
}

function resolvePeriod(text: string, today: string, cycle: { from: string; to: string }) {
  const current = new Date(`${today}T12:00:00`);
  if (/ontem/.test(text)) { const date = new Date(current); date.setDate(date.getDate() - 1); const key = getLocalDateKey(date); return { from: key, to: key, label: "Ontem" }; }
  if (/hoje/.test(text)) return { from: today, to: today, label: "Hoje" };
  if (/semana/.test(text)) { const date = new Date(current); date.setDate(date.getDate() - 6); return { from: getLocalDateKey(date), to: today, label: "Nos últimos 7 dias" }; }
  if (/(ciclo anterior|ciclo passado)/.test(text)) { const from = shiftMonthKey(cycle.from, -1); const to = shiftMonthKey(cycle.to, -1); return { from, to, label: `No ciclo anterior, de ${formatDate(from)} a ${formatDate(to)}` }; }
  if (/(mes passado|mes anterior)/.test(text)) { const date = new Date(current.getFullYear(), current.getMonth() - 1, 1); const from = getLocalDateKey(date); const to = getLocalDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)); return { from, to, label: `No mês anterior, de ${formatDate(from)} a ${formatDate(to)}` }; }
  if (/(este mes|nesse mes|no mes|mes atual)/.test(text)) return { from: `${today.slice(0, 7)}-01`, to: today, label: "Neste mês até hoje" };
  const namedMonth = parseNamedMonth(text, current);
  if (namedMonth) return namedMonth;
  return { from: cycle.from, to: cycle.to, label: `No ciclo de ${formatDate(cycle.from)} a ${formatDate(cycle.to)}` };
}

const sum = (items: Transaction[]) => items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatDate = (key: string) => key.split("-").reverse().join("/");
// Perguntas por período seguem a data financeira escolhida pelo usuário.
// `paidAt` registra quando o status foi alterado e não muda o dia da transação.
const transactionDate = (item: Transaction) => item.dueDate;
const monthsUntil = (target: string, today: string) => Math.max(1, Math.ceil((new Date(`${target}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 2_629_800_000));
const severityRank = (value: AssistantMessage["severity"]) => ({ info: 1, success: 2, warning: 3, critical: 4 }[value]);
const byDate = (a: Transaction, b: Transaction) => a.dueDate.localeCompare(b.dueDate);
const inferRange = (items: Transaction[], today: string) => ({ from: items.map((item) => item.dueDate).sort()[0] || today, to: items.map((item) => item.dueDate).sort().at(-1) || today });
function groupExpenses(items: Transaction[]) { return items.reduce((result, item) => { result[item.category || "Outros"] = (result[item.category || "Outros"] || 0) + Number(item.amount || 0); return result; }, {} as Record<string, number>); }

function extractPurchaseSearch(text: string) {
  const match = text.match(/(?:quanto|total).*?(?:gastei|gasto|gastou).*?(?:em|no|na|com)\s+(.+)/);
  if (!match?.[1]) return "";
  return match[1]
    .replace(/\b(hoje|ontem|esta semana|nesta semana|este mes|neste mes|nesse mes|no ciclo|neste ciclo)\b/g, "")
    .replace(/[?!.,]+$/g, "")
    .trim();
}

function extractNamedSearch(text: string) {
  const patterns = [
    /(?:falta|ainda falta)\s+(?:pagar|receber)(?:\s+(?:a|o|da|do|de))?\s+(.+)/,
    /(?:paguei|recebi)(?:\s+(?:a|o|da|do|de|em|no|na))?\s+(.+)/,
    /(?:quanto|total).*?(?:gastei|gasto|gastou).*?(?:em|no|na|com)\s+(.+)/,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) return cleanSearchPeriod(value);
  }
  const isKnownCommand = /(quanto|total|onde|maior|categoria|gastei|gasto|despesa|receber|pagar|saldo|sobra|previsao|meta|objetivo|econom|guardar|poupar|atrasad|vencid|proxima conta|ajuda)/.test(text);
  if (!isKnownCommand && text.length >= 2 && text.length <= 80) return text.replace(/[?!.,]+$/g, "").trim();
  return "";
}

function cleanSearchPeriod(value: string) {
  return value
    .replace(/\b(hoje|ontem|esta semana|nesta semana|este mes|neste mes|nesse mes|mes passado|mes anterior|no ciclo atual|neste ciclo|no ciclo anterior|ciclo passado|em (?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))\b/g, "")
    .replace(/[?!.,]+$/g, "").trim();
}

function answerNamedSearch(text: string, search: string, matches: Transaction[], period: { from: string; to: string; label: string }) {
  const inPeriod = matches.filter((item) => item.dueDate >= period.from && item.dueDate <= period.to);
  const paidExpenses = inPeriod.filter((item) => item.type === "expense" && item.status === "paid");
  const pendingExpenses = matches.filter((item) => item.type === "expense" && item.status === "pending");
  const paidIncome = inPeriod.filter((item) => item.type === "income" && item.status === "paid");
  const pendingIncome = matches.filter((item) => item.type === "income" && item.status === "pending");
  const names = [...new Set(matches.map((item) => item.description))].slice(0, 3).join(", ");

  if (/(receber|recebi|entrada)/.test(text)) {
    return `Encontrei “${names}”. ${period.label}, você recebeu ${money(sum(paidIncome))}. Ainda há ${money(sum(pendingIncome))} a receber em ${pendingIncome.length} lançamento(s).`;
  }
  if (/(falta|pagar|pendente)/.test(text)) {
    const next = [...pendingExpenses].sort(byDate)[0];
    return `Encontrei “${names}”. Falta pagar ${money(sum(pendingExpenses))} em ${pendingExpenses.length} conta(s).${next ? ` Próximo vencimento: ${formatDate(next.dueDate)}.` : " Não existe valor pendente para esse nome."}`;
  }
  const historicalPaid = matches.filter((item) => item.type === "expense" && item.status === "paid");
  const outside = historicalPaid.filter((item) => item.dueDate < period.from || item.dueDate > period.to);
  return `Encontrei “${names}”. ${period.label}, você pagou ${money(sum(paidExpenses))} em ${paidExpenses.length} lançamento(s). Há também ${money(sum(pendingExpenses))} pendente(s).${outside.length ? ` Fora desse período, encontrei mais ${money(sum(outside))} já pago.` : ""}`;
}

function parseNamedMonth(text: string, current: Date) {
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const month = months.findIndex((name) => new RegExp(`\\b${name}\\b`).test(text));
  if (month < 0) return null;
  const explicitYear = text.match(/\b(20\d{2})\b/)?.[1];
  const year = explicitYear ? Number(explicitYear) : (month > current.getMonth() ? current.getFullYear() - 1 : current.getFullYear());
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = getLocalDateKey(new Date(year, month + 1, 0));
  return { from, to, label: `Em ${months[month]} de ${year}` };
}

function shiftMonthKey(key: string, offset: number) {
  const [year, month, day] = key.split("-").map(Number);
  const lastDay = new Date(year, month + offset, 0).getDate();
  return getLocalDateKey(new Date(year, month - 1 + offset, Math.min(day, lastDay)));
}

function fuzzyContains(value: string, search: string) {
  const source = normalize(value);
  const target = normalize(search);
  if (source.includes(target) || target.includes(source)) return true;
  const sourceWords = source.split(/[^a-z0-9]+/).filter(Boolean);
  const targetWords = target.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  return targetWords.length > 0 && targetWords.every((word) => sourceWords.some((candidate) => {
    const tolerance = word.length >= 8 ? 2 : 1;
    return levenshtein(candidate, word) <= tolerance;
  }));
}

function closestDescriptions(items: Transaction[], search: string) {
  const unique = [...new Set(items.map((item) => item.description))];
  return unique
    .map((description) => ({ description, distance: wordDistance(normalize(description), normalize(search)) }))
    .filter((item) => item.distance <= Math.max(2, Math.ceil(search.length * 0.35)))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map((item) => item.description);
}

function wordDistance(source: string, target: string) {
  return Math.min(levenshtein(source, target), ...source.split(/[^a-z0-9]+/).filter(Boolean).map((word) => levenshtein(word, target)));
}

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const stored = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = stored;
    }
  }
  return row[b.length];
}
