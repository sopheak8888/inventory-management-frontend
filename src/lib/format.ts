const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en-US");

export const fmtMoney = (v: number) => currency.format(v);
export const fmtMoneyCompact = (v: number) => compactCurrency.format(v);
export const fmtNumber = (v: number) => number.format(v);
export const fmtSigned = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`;
export const fmtPct = (v: number) => `${Math.abs(v).toFixed(1)}%`;

export const fmtDate = (iso: string | null, opts?: Intl.DateTimeFormatOptions) =>
  iso ? new Date(iso).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" }) : "—";

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "9:12 AM" for today, "Yesterday", otherwise a short date. */
export function fmtWhen(iso: string, now = new Date()) {
  const then = new Date(iso);
  const days = Math.floor((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days === 0) return fmtTime(iso);
  if (days === 1) return "Yesterday";
  return fmtDate(iso);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
