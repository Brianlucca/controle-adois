export function parseCurrencyInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "").slice(0, 14);
  if (!digits || /^0+$/.test(digits)) return "";

  const padded = digits.padStart(3, "0");
  const integerPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const centsPart = padded.slice(-2);

  return `${integerPart}.${centsPart}`;
}

export function formatCurrencyInputValue(value: string): string {
  if (!value) return "";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return "";

  const cents = Math.round(numericValue * 100);
  const integerPart = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centsPart = String(cents % 100).padStart(2, "0");

  return `${integerPart},${centsPart}`;
}
