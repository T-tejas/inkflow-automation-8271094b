/**
 * Format a number as Indian Rupees with en-IN locale.
 * Examples: ₹34,000 | ₹1,25,000 | ₹12,50,000
 */
export function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`;
}

/**
 * Short format for chart axes: ₹34k, ₹1.2L
 */
export function formatINRShort(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}
