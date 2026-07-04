import * as XLSX from "xlsx";
import { getLocalDateKey } from "@/lib/finance/date";
import { TransactionPayload } from "@/lib/types";

type ImportRow = Record<string, unknown>;

export type ImportedTransaction = TransactionPayload;

function normalizeImportKey(key: string) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function readImportValue(row: ImportRow, keys: string[], fallbackIndex?: number) {
  const normalized = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeImportKey(key)] = value;
    return acc;
  }, {} as Record<string, unknown>);

  for (const key of keys) {
    const value = normalized[normalizeImportKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  if (fallbackIndex !== undefined) {
    const fallback = Object.values(row)[fallbackIndex];
    if (
      fallback !== undefined &&
      fallback !== null &&
      String(fallback).trim() !== ""
    ) {
      return fallback;
    }
  }

  return "";
}

function parseImportDate(value: unknown) {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d
      ).padStart(2, "0")}`;
    }
  }

  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const brDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brDate) {
    const year = brDate[3].length === 2 ? `20${brDate[3]}` : brDate[3];
    return `${year}-${brDate[2].padStart(2, "0")}-${brDate[1].padStart(
      2,
      "0"
    )}`;
  }

  return getLocalDateKey(new Date());
}

function parseImportAmount(value: unknown) {
  if (typeof value === "number") return value;

  const cleaned = String(value || "0")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  return Number(cleaned) || 0;
}

function normalizeImportText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapImportRow(row: ImportRow): ImportedTransaction | null {
  const description = String(
    readImportValue(row, ["descricao", "description", "nome"], 1)
  ).trim();
  const amount = parseImportAmount(readImportValue(row, ["valor", "amount"], 4));
  const typeRaw = normalizeImportText(readImportValue(row, ["tipo", "type"], 3));
  const statusRaw = normalizeImportText(readImportValue(row, ["status"], 5));

  if (!description || amount <= 0) return null;

  return {
    description,
    amount,
    category: String(
      readImportValue(row, ["categoria", "category"], 2) || "Outros"
    ).trim(),
    type:
      typeRaw.includes("entrada") ||
      typeRaw.includes("income") ||
      typeRaw.includes("receita")
        ? "income"
        : "expense",
    status: statusRaw.includes("pend") ? "pending" : "paid",
    dueDate: parseImportDate(readImportValue(row, ["data", "dueDate", "vencimento"], 0)),
    pixCode: String(readImportValue(row, ["pix", "pixCode"]) || ""),
    barCode: String(
      readImportValue(row, ["boleto", "codigo de barras", "barCode"]) || ""
    ),
    observation: String(
      readImportValue(row, ["observacao", "observation"], 6) || ""
    ),
    isRecurrent: false,
    recurrenceMonths: 12,
  };
}

export function parseTransactionsWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });

  if (workbook.SheetNames.length === 0) {
    return { items: [], hasSheets: false };
  }

  const rows = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
  });

  return {
    items: rows.map(mapImportRow).filter(Boolean) as ImportedTransaction[],
    hasSheets: true,
  };
}
