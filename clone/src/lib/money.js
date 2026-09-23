/** Integer UGX helpers (mirror backend/src/lib/money.ts). */

export function lineTotalUgx(item) {
  const qty = Math.trunc(Number(item?.quantity) || 0);
  const cost = Math.trunc(Number(item?.unitCost) || 0);
  if (qty < 0 || cost < 0) return 0;
  return qty * cost;
}

export function requisitionTotalUgx(items) {
  return (items || []).reduce((sum, item) => sum + lineTotalUgx(item), 0);
}

export function formatUgx(amount) {
  const n = Math.trunc(Number(amount) || 0);
  return `UGX ${n.toLocaleString("en-UG")}`;
}
