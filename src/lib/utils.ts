import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

export const createGoogleCalendarLink = (title: string, date: string, amount: number, obs?: string) => {
  const cleanDate = date.replace(/-/g, '');
  const dates = `${cleanDate}T090000/${cleanDate}T100000`;
  
  const details = `Valor: ${formatCurrency(amount)}\n\nGerado pelo Financeiro.\n${obs || ''}`;
  
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", `Pagar: ${title}`);
  url.searchParams.append("dates", dates);
  url.searchParams.append("details", details);
  url.searchParams.append("sf", "true");
  url.searchParams.append("output", "xml");

  return url.toString();
};