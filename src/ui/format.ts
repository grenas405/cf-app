/**
 * Number formatting for display. Pure functions, one locale.
 *
 * @module
 */

const LOCALE = "en-US";

/** `1234.5` -> `"$1,234.50"` */
export function usd(value: number): string {
  return value.toLocaleString(LOCALE, { style: "currency", currency: "USD" });
}

/** `1234567` -> `"1,234,567"` */
export function count(value: number): string {
  return Math.round(value).toLocaleString(LOCALE);
}

/** `12_400_000` -> `"12.4M"` */
export function compact(value: number): string {
  return value.toLocaleString(LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** `12.345` -> `"12 ms"` */
export function ms(value: number): string {
  return `${Math.max(0, Math.round(value))} ms`;
}

/** Middle value of a list (0 when empty). */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid] ?? 0
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
