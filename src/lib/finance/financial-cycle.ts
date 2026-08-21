import { DateRange, Transaction } from "@/lib/types";
import { getLocalDateKey } from "@/lib/finance/date";

export function inferFinancialCycleStartDay(transactions: Transaction[]) {
  const incomeDays = transactions
    .filter((item) => item.type === "income" && item.status === "paid" && item.dueDate)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 12)
    .map((item) => Math.min(Number(item.dueDate.slice(8, 10)), 28));
  if (!incomeDays.length) return 1;
  const counts = incomeDays.reduce((result, day) => {
    result[day] = (result[day] || 0) + 1;
    return result;
  }, {} as Record<number, number>);
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0][0]);
}

export function getFinancialCycleRange(reference: Date, startDay: number, endDay = startDay === 1 ? 31 : startDay - 1): DateRange {
  const safeDay = Math.max(1, Math.min(28, Math.round(startDay || 1)));
  const safeEndDay = Math.max(1, Math.min(31, Math.round(endDay || 1)));
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const startsThisMonth = reference.getDate() >= safeDay;
  const from = new Date(year, startsThisMonth ? month : month - 1, safeDay, 12);
  const targetEndMonth = startsThisMonth ? month + 1 : month;
  const lastDay = new Date(year, targetEndMonth + 1, 0).getDate();
  const to = new Date(year, targetEndMonth, Math.min(safeEndDay, lastDay), 12);
  return { from: getLocalDateKey(from), to: getLocalDateKey(to) };
}

export function filterByRange(transactions: Transaction[], range: DateRange) {
  return transactions.filter((item) => item.dueDate >= range.from && item.dueDate <= range.to);
}
