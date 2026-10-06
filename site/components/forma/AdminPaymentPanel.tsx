'use client';
import { useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import type { OrderPayment } from '@/lib/payment';

export default function AdminPaymentPanel({ order, ar, onConfirmed }: { order: { id: string; total: number; version: number; status: string; payment?: OrderPayment }; ar: boolean; onConfirmed: () => Promise<void> }) {
  const [reference, setReference] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = (en: string, arabic: string) => ar ? arabic : en;

  if (order.payment?.status === 'paid') return <section className="admin-payment-panel is-paid"><strong><ShieldCheck size={19} />{t('Full payment verified', 'تم تأكيد الدفع كاملًا')}</strong><p dir="ltr">SAR {order.payment.paidAmount.toFixed(2)}{order.payment.paidAt && ' / ' + new Date(order.payment.paidAt).toLocaleString(ar ? 'ar-SA' : 'en-GB', { timeZone: 'Asia/Riyadh' })}</p></section>;
  if (order.status === 'declined') return <section className="admin-payment-panel"><strong>{t('Order declined', 'الطلب مرفوض')}</strong><p>{t('Payment cannot be recorded for this order.', 'لا يمكن تسجيل دفعة لهذا الطلب.')}</p></section>;

  return <form
    className="admin-payment-panel"
    aria-busy={busy}
    onSubmit={async event => {
      event.preventDefault();
      if (!verified || busy) return;
      setBusy(true);
      setError('');
      try {
        const response = await fetch('/api/admin/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, version: order.version, amount: order.total, reference, verified: true }) });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Payment confirmation failed.');
        await onConfirmed();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('Try again.', 'حاول مجددًا.'));
      } finally {
        setBusy(false);
      }
    }}
  >
    <strong><ShieldCheck size={19} />{t('Payment required before production', 'الدفع مطلوب قبل الإنتاج')}</strong>
    <p>{t('Save the final quote first. Only confirm after you have received the full amount in person and checked the receipt.', 'احفظ السعر النهائي أولًا. أكد الدفع بعد استلام المبلغ كاملًا شخصيًا والتحقق من الإيصال.')}</p>
    <label htmlFor="admin-payment-ref">
      {t('Receipt / payment reference', 'رقم الإيصال / مرجع الدفع')}
      <input
        id="admin-payment-ref"
        name="payment-reference"
        required
        minLength={3}
        maxLength={100}
        value={reference}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={busy}
        onChange={event => setReference(event.target.value)}
        placeholder={t('Your studio receipt number', 'رقم إيصال الاستوديو')}
      />
    </label>
    <label className="journey-acknowledgment">
      <input
        type="checkbox"
        required
        checked={verified}
        disabled={busy}
        onChange={event => setVerified(event.target.checked)}
      />
      <span>{t(`I verified full payment of SAR ${order.total.toFixed(2)}.`, `تحققت من استلام المبلغ كاملًا: ${order.total.toFixed(2)} ريال.`)}</span>
    </label>
    <button type="submit" className="journey-button" disabled={busy || !verified}>{busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />}{t('Confirm received payment', 'تأكيد استلام الدفع')}</button>
    {error && <p className="journey-error" role="alert">{error}</p>}
  </form>;
}
