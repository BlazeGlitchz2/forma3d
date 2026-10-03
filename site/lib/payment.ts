export const paymentLocations = [
  { id: 'alhussan', name: 'Alhussan International School', ar: 'مدرسة الحصان العالمية', detail: 'Arrange a meeting with the studio', detailAr: 'اتفق على موعد مع الاستوديو' },
  { id: 'huwaylat', name: 'Al Huwaylat', ar: 'الحويلات', detail: 'Agree the exact meeting point with staff', detailAr: 'حدد نقطة اللقاء مع فريق الاستوديو' },
] as const;
export type PaymentLocation = typeof paymentLocations[number]['id'];
export type OrderPayment = { status: 'unpaid' | 'paid'; location: PaymentLocation; paidAmount: number; paidAt: number | null };
export type PaymentRecord = { total: number; payment_status?: unknown; paid_amount?: unknown; paid_at?: unknown; payment_location?: unknown; status?: unknown };
const productionStages = new Set(['queued', 'printing', 'finishing', 'ready', 'completed']);
export const moneyInCents = (amount: number) => Math.round(amount * 100);
export function orderPayment(row: PaymentRecord): OrderPayment {
  return { status: row.payment_status === 'paid' ? 'paid' : 'unpaid', location: row.payment_location === 'alhussan' ? 'alhussan' : 'huwaylat', paidAmount: Number(row.paid_amount ?? 0), paidAt: row.paid_at ? Number(row.paid_at) : null };
}
export function assertOrderUpdate(row: PaymentRecord, nextStatus: string, nextTotal: number) {
  const paid = row.payment_status === 'paid' && moneyInCents(Number(row.paid_amount)) >= moneyInCents(nextTotal);
  if (row.payment_status === 'paid' && moneyInCents(nextTotal) !== moneyInCents(row.total)) throw new Error('A paid quote is locked. Keep the confirmed total unchanged.');
  if (productionStages.has(nextStatus) && !paid) throw new Error('Confirm full payment before moving this order into production.');
}
export function assertPaymentConfirmation(row: PaymentRecord, amount: number) {
  if (row.payment_status === 'paid') throw new Error('Payment is already confirmed for this order.');
  if (row.status === 'declined') throw new Error('A declined order cannot receive payment.');
  if (!Number.isFinite(amount) || amount <= 0 || moneyInCents(amount) !== moneyInCents(row.total)) throw new Error('Record the exact confirmed order total. Partial payment cannot unlock production.');
}
