import { getLocalDateKey } from "@/lib/finance/date";

export interface ParsedTransactionCommand {
  type: "income" | "expense";
  status: "paid" | "pending";
  amount: number;
  description: string;
  dueDate: string;
  category: string;
}

export interface TransactionCommandDraft {
  command: ParsedTransactionCommand;
  missing: Array<"description" | "date" | "status">;
}

export function parseTransactionCommand(input: string, now = new Date()): TransactionCommandDraft | null {
  const normalized = normalize(input);
  if (/\b(quanto|qual|onde|quando|total|consulta|mostra)\b/.test(normalized)) return null;
  const income = /\b(recebi|recebeu|entrou|entrada|ganhei|caiu|vou receber|a receber)\b/.test(normalized);
  const expense = /\b(adiciona|adicione|coloca|coloque|registrar?|registre|lanca|lance|anota|anote|paguei|gastei|comprei|saida|vou pagar|tenho que pagar)\b/.test(normalized);
  if (!income && !expense) return null;

  const amountMatch = input.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais?|real)?/i);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const type = income ? "income" : "expense";
  const parsedStatus = parseCommandStatus(normalized);
  const parsedDate = parseCommandDate(input, now);
  const description = extractDescription(input, amountMatch[0]);
  const missing: TransactionCommandDraft["missing"] = [];
  if (!description) missing.push("description");
  if (!parsedDate.explicit) missing.push("date");
  if (!parsedStatus.explicit) missing.push("status");

  return {
    command: {
      type,
      status: parsedStatus.status,
      amount,
      description: description || (type === "income" ? "Entrada" : "Saída"),
      dueDate: parsedDate.date,
      category: inferCategory(description, type),
    },
    missing,
  };
}

export function completeTransactionCommand(
  draft: TransactionCommandDraft,
  input: string,
  now = new Date()
): TransactionCommandDraft {
  const parsedDate = parseCommandDate(input, now);
  const parsedStatus = parseCommandStatus(normalize(input));
  const parsedDescription = extractDescription(input);
  const missing = draft.missing.filter((field) => {
    if (field === "description") return !parsedDescription;
    if (field === "date") return !parsedDate.explicit;
    return !parsedStatus.explicit;
  });

  return {
    command: {
      ...draft.command,
      dueDate: draft.missing.includes("date") && parsedDate.explicit
        ? parsedDate.date
        : draft.command.dueDate,
      status: draft.missing.includes("status") && parsedStatus.explicit
        ? parsedStatus.status
        : draft.command.status,
      description: draft.missing.includes("description") && parsedDescription
        ? parsedDescription
        : draft.command.description,
      category: draft.missing.includes("description") && parsedDescription
        ? inferCategory(parsedDescription, draft.command.type)
        : draft.command.category,
    },
    missing,
  };
}

function parseCommandStatus(text: string) {
  const pending = /\b(vou receber|a receber|vou pagar|tenho que pagar|falta pagar|a pagar|pendente)\b/.test(text);
  const paid = /\b(recebi|recebeu|entrou|ganhei|caiu|paguei|gastei|comprei|pago|paga|recebido|recebida)\b/.test(text);
  return { status: pending ? "pending" as const : "paid" as const, explicit: pending || paid };
}

function parseCommandDate(input: string, now: Date) {
  const text = normalize(input);
  const date = new Date(now);
  if (/\bamanha\b/.test(text)) {
    date.setDate(date.getDate() + 1);
    return { date: getLocalDateKey(date), explicit: true };
  }
  if (/\bontem\b/.test(text)) {
    date.setDate(date.getDate() - 1);
    return { date: getLocalDateKey(date), explicit: true };
  }
  if (/\bhoje\b/.test(text)) return { date: getLocalDateKey(date), explicit: true };
  const explicit = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (explicit) {
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return { date: `${year}-${explicit[2].padStart(2, "0")}-${explicit[1].padStart(2, "0")}`, explicit: true };
  }
  const monthNames: Record<string, number> = {
    janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };
  const named = text.match(/\b(?:dia\s+)?(\d{1,2})\s+(?:de\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+(?:de\s+)?(\d{4}))?\b/);
  if (named) {
    const year = named[3] ? Number(named[3]) : now.getFullYear();
    const month = monthNames[named[2]];
    return { date: `${year}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`, explicit: true };
  }
  return { date: getLocalDateKey(date), explicit: false };
}

function extractDescription(input: string, amountText?: string) {
  let result = input;
  if (amountText) result = result.replace(new RegExp(escapeRegex(amountText), "i"), " ");
  result = result
    .replace(/\b(adiciona|adicione|coloca|coloque|registrar|registre|registra|lança|lanca|lance|anota|anote|recebi|recebeu|entrou|entrada|ganhei|caiu|paguei|gastei|comprei|saída|saida|vou receber|vou pagar|tenho que pagar)\b/gi, " ")
    .replace(/\b(?:como\s+)?(?:pendente|pago|paga|recebido|recebida|a pagar|a receber)\b/gi, " ")
    .replace(/(?:no dia de hoje|no dia|de hoje|hoje|amanhã|amanha|ontem|(?:para\s+|em\s+|no\s+)?(?:dia\s+)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:para\s+|em\s+|no\s+)?(?:dia\s+)?\d{1,2}\s+(?:de\s+)?(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+(?:de\s+)?\d{4})?)/gi, " ")
    .replace(/\b(reais|real|r\$)\b/gi, " ")
    .replace(/^\s*(de|do|da|em|no|na|com|para)\s+/i, " ")
    .replace(/[?!.,]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!result || /^\d+(?:[.,]\d+)?$/.test(result)) return "";
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

function parseAmount(value: string) {
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  const dots = value.match(/\./g)?.length || 0;
  if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(value))) return Number(value.replace(/\./g, ""));
  return Number(value);
}
