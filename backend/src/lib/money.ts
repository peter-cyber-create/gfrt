/**
 * Integer UGX money helpers — avoid floating point for totals.
 */

export type MoneyItem = {
  quantity: number;
  unitCost?: number | null;
};

/** Line total in UGX (integer). */
export function lineTotalUgx(item: MoneyItem): number {
  const qty = Math.trunc(Number(item.quantity) || 0);
  const cost = Math.trunc(Number(item.unitCost) || 0);
  if (qty < 0 || cost < 0) return 0;
  return qty * cost;
}

/** Sum of line totals — server source of truth for requisition amountValue. */
export function requisitionTotalUgx(items: MoneyItem[]): number {
  return (items || []).reduce((sum, item) => sum + lineTotalUgx(item), 0);
}
