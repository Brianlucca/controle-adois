import { getLocalDateKey } from "@/lib/finance/date";

export interface ParsedTransactionCommand {
  type: "income" | "expense";
  status: "paid" | "pending";
  amount: number;
  description: string;
  dueDate: string;
  category: string;
}

export function parseTransactionCommand(input: string, now = new Date()): ParsedTransactionCommand | null {
  const normalized = normalize(input);
  if (/\b(quanto|qual|onde|quando|total|consulta|mostra)\b/.test(normalized)) return null;
  const income = /\b(recebi|recebeu|entrou|entrada|ganhei|caiu|vou receber|a receber)\b/.test(normalized);
  const expense = /\b(adiciona|adicione|registrar?|registre|lanca|lance|anota|anote|paguei|gastei|comprei|saida|vou pagar|tenho que pagar)\b/.test(normalized);
  if (!income && !expense) return null;

  const amountMatch = input.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais?|real)?/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const type = income ? "income" : "expense";
  const status = /\b(vou receber|a receber|vou pagar|tenho que pagar|falta pagar|pendente)\b/.test(normalized) ? "pending" : "paid";
  const dueDate = parseCommandDate(input, now);
  const description = extractDescription(input, amountMatch[0], type);

  return { type, status, amount, description, dueDate, category: inferCategory(description, type) };
}

function parseCommandDate(input: string, now: Date) {
  const text = normalize(input);
  const date = new Date(now);
  if (/\bamanha\b/.test(text)) date.setDate(date.getDate() + 1);
  if (/\bontem\b/.test(text)) date.setDate(date.getDate() - 1);
  const explicit = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (explicit) {
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${explicit[2].padStart(2, "0")}-${explicit[1].padStart(2, "0")}`;
  }
  return getLocalDateKey(date);
}

function extractDescription(input: string, amountText: string, type: "income" | "expense") {
  let result = input
    .replace(new RegExp(escapeRegex(amountText), "i"), " ")
    .replace(/\b(adiciona|adicione|registrar|registre|registra|lança|lanca|lance|anota|anote|recebi|recebeu|entrou|entrada|ganhei|caiu|paguei|gastei|comprei|saída|saida|vou receber|vou pagar|tenho que pagar)\b/gi, " ")
    .replace(/(?:no dia de hoje|no dia|de hoje|hoje|amanhã|amanha|ontem|dia \d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, " ")
    .replace(/\b(reais|real|r\$)\b/gi, " ")
    .replace(/^\s*(de|do|da|em|no|na|com)\s+/i, " ")
    .replace(/[?!.,]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!result) result = type === "income" ? "Entrada" : "Saída";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function inferCategory(description: string, type: "income" | "expense") {
  if (type === "income") return /salario|pagamento|empresa/i.test(normalize(description)) ? "Salário" : "Renda";
  const text = normalize(description);
  if (/lanche|cachorro quente|pizza|ifood|comida|mercado|restaurante/.test(text)) return "Alimentação";
  if (/internet|fibra|energia|agua|telefone/.test(text)) return "Contas";
  if (/uber|99|gasolina|onibus/.test(text)) return "Transporte";
  if (/aluguel|condominio|casa/.test(text)) return "Moradia";
  return "Outros";
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
