export function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonthsToDateKey(dateStr: string, months: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().split("T")[0];
}

export function getDateTime(date?: string) {
  if (!date) return 0;
  return new Date(`${date}T00:00:00`).getTime();
}

export function isDueUntil(dateKey: string, limitDateKey: string) {
  return Boolean(dateKey && dateKey <= limitDateKey);
}
