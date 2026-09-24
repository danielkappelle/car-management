const LOCALE = "nl-NL";

const currency = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const formatCurrency = (value: number) => currency.format(value);

export const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const formatKm = (value: number) => `${formatNumber(value)} km`;

/** Formats an ISO `YYYY-MM-DD` date. */
export const formatDate = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));

/** Today as ISO `YYYY-MM-DD`, in the user's local timezone. */
export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function addYears(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

/** Whole days from today until the given ISO date (negative when in the past). */
export function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) / 86_400_000);
}

/** Formats a number for an editable input, using a decimal comma. */
export const toInputDecimal = (value: number) => String(value).replace(".", ",");
