/**
 * Manual currency formatting utilities.
 * IMPORTANT: Do NOT use Intl.NumberFormat with currency/compact notation
 * as it produces "millones de dólares" in certain browser locales.
 */

function formatNumber(value: number): string {
  // Manual thousand separator formatting (dot for es-CO)
  const parts = Math.abs(Math.round(value)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
}

/** $225.0M for millions, $450.000 for thousands, $500 for small */
export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m.toFixed(m >= 100 ? 0 : 1)}M`;
  }
  return `${sign}$${formatNumber(abs)}`;
}

/** $225.0M for millions, $450 mil for thousands */
export function formatCurrencyThousands(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m.toFixed(m >= 100 ? 0 : m >= 10 ? 1 : 1)}M`;
  }
  if (abs >= 1000) {
    const k = Math.round(abs / 1000);
    return `${sign}$${formatNumber(k * 1000)}`;
  }
  return `${sign}$${formatNumber(abs)}`;
}

/** Full format: $225.000.000 */
export function formatCurrencyFull(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${formatNumber(value)}`;
}

/** Chart axis format: $225M or $450K */
export function formatCurrencyAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}
