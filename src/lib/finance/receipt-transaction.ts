import { getLocalDateKey } from "@/lib/finance/date";
import { TransactionPayload } from "@/lib/types";

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface ReceiptExtractionResult {
  merchantName?: string;
  purchasedAt?: string;
  totalAmount: number;
  items: ReceiptItem[];
  rawText?: string;
}

interface ReceiptTransactionDefaults {
  category?: string;
  status?: TransactionPayload["status"];
}

export function buildTransactionFromReceipt(
  receipt: ReceiptExtractionResult,
  defaults: ReceiptTransactionDefaults = {}
): TransactionPayload {
  const itemLines = receipt.items
    .slice(0, 30)
    .map((item) => {
      const total = item.total ? ` - ${item.total.toFixed(2)}` : "";
      return `- ${item.description}${total}`;
    })
    .join("\n");

  return {
    description: receipt.merchantName || "Nota fiscal",
    amount: receipt.totalAmount,
    category: defaults.category || "Compras",
    type: "expense",
    status: defaults.status || "paid",
    dueDate: receipt.purchasedAt || getLocalDateKey(new Date()),
    pixCode: "",
    barCode: "",
    observation: itemLines
      ? `Itens extraidos da nota fiscal:\n${itemLines}`
      : receipt.rawText || "",
    isRecurrent: false,
    recurrenceMonths: 12,
  };
}
