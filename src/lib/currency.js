function formatINR(value) {
  return `\u20B9${new Intl.NumberFormat("en-IN").format(Math.round(value))}`;
}
function formatINRShort(value) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const formatCompact = (num) => num.toFixed(1).replace(/\.0$/, "");
  if (absValue >= 1e5) return `${sign}\u20B9${formatCompact(absValue / 1e5)}L`;
  if (absValue >= 1e3) return `${sign}\u20B9${formatCompact(absValue / 1e3)}k`;
  return `${sign}\u20B9${Math.round(absValue)}`;
}
export {
  formatINR,
  formatINRShort
};
