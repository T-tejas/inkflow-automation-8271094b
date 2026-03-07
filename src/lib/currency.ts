/**
 * Format a number as Indian Rupees with en-IN locale.
 * Examples: ₹34,000 | ₹1,25,000 | ₹12,50,000
 */
export function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`;
}

/**
 * Short format for chart axes: ₹34k, ₹1.6k, ₹1.2L
 */
export function formatINRShort(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  const formatCompact = (num: number) => num.toFixed(1).replace(/\.0$/, '');

  if (absValue >= 100000) return `${sign}₹${formatCompact(absValue / 100000)}L`;
  if (absValue >= 1000) return `${sign}₹${formatCompact(absValue / 1000)}k`;
  return `${sign}₹${Math.round(absValue)}`;
}
