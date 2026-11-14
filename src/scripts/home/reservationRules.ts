/** Illustrative inventory rule, shared by the local demo and its checks. */
export function canReserve(stock: number, quantity: number): boolean {
  return Number.isSafeInteger(stock) && Number.isSafeInteger(quantity) && stock >= 0 && quantity > 0 && stock >= quantity;
}
