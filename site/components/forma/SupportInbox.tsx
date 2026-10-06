'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, MessageCircle, RefreshCw } from 'lucide-react';

type Ticket = { id: string; name: string; email: string; phone: string; order_id?: string; subject: string; message: string; status: string; response?: string; created: number };
const statusLabels: Record<string, [string, string]> = { open: ['Open', 'مفتوحة'], in_progress: ['In progress', 'قيد العمل'], resolved: ['Resolved', 'تم الحل'], closed: ['Closed', 'مغلقة'] };
const statusOptions: [string, string, string][] = [['open', 'Open', 'مفتوحة'], ['in_progress', 'In progress', 'قيد العمل'], ['resolved', 'Resolved', 'تم الحل'], ['closed', 'Closed', 'مغلقة']];
export default function SupportInbox({ ar }: { ar: boolean }) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [tickets, setTickets] = useState<Ticket[]>([]); const [refreshing, setRefreshing] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setRefreshing(true); setError('');
    try { const response = await fetch('/api/support/tickets'); const data = await response.json() as { tickets: Ticket[]; error?: string }; if (!response.ok) throw new Error(data.error ?? 'Could not load tickets.'); setTickets(data.tickets); } catch (err) { setError(err instanceof Error ? err.message : 'Try again.'); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => void refresh()); }, [refresh]);
  const openCount = tickets.filter(ticket => ticket.status === 'open').length;
  return <div className="support-inbox">
    <div className="support-inbox-heading">
      <div>
        <p>{t('Arrange payment meetings and respond to customer requests. Use the supplied contact details to agree the time and place.', 'رتب لقاءات الدفع ورد على طلبات العملاء. استخدم بيانات التواصل للاتفاق على الوقت والمكان.')}</p>
        {tickets.length > 0 && <span className="support-inbox-count" role="status" aria-live="polite">{openCount > 0 ? t(`${openCount} open request${openCount === 1 ? '' : 's'}`, `${openCount} طلب مفتوح`) : t('All requests handled.', 'تمت معالجة جميع الطلبات.')}</span>}
      </div>
      <button type="button" className="secondary-button" disabled={refreshing} aria-busy={refreshing} onClick={() => void refresh()}><RefreshCw size={15} className={refreshing ? 'spin' : ''} />{t('Refresh', 'تحديث')}</button>
    </div>
    {error && <p className="journey-error" role="alert">{error}</p>}
    {refreshing && !tickets.length && <p role="status" className="support-inbox-loading"><Loader2 className="spin" size={18} />{t('Loading requests…', 'نحمّل الطلبات…')}</p>}
    {!refreshing && !tickets.length && <div className="empty-state"><MessageCircle size={28} /><h2>{t('All caught up.', 'كل شيء محدث.')}</h2><p>{t('New customer requests will appear here.', 'تظهر طلبات العملاء الجديدة هنا.')}</p></div>}
    {tickets.map(ticket => <details key={ticket.id} open={openId === ticket.id} onToggle={event => { const isOpen = event.currentTarget.open; setOpenId(current => isOpen ? ticket.id : (current === ticket.id ? null : current)); }} className={`support-inbox-ticket is-${ticket.status}`}>
      <summary>
        <div>
          <strong>{ticket.subject}</strong>
          <span>{ticket.name} / {ticket.id}{ticket.order_id && ' / ' + ticket.order_id}</span>
          <time dir="auto" dateTime={new Date(ticket.created).toISOString()}>{new Date(ticket.created).toLocaleString(ar ? 'ar-SA' : 'en-GB', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        <span className={`support-ticket-status is-${ticket.status}`}><i aria-hidden="true" />{t(...(statusLabels[ticket.status] ?? [ticket.status, ticket.status]))}</span>
      </summary>
      <div className="support-inbox-content">
        <p>{ticket.message}</p>
        <div className="support-inbox-contact">
          <a className="journey-text-button" dir="ltr" href={`mailto:${ticket.email}?subject=${encodeURIComponent('Forma3D / ' + ticket.id)}`}><Mail size={16} />{ticket.email}</a>
          {ticket.phone && <a className="journey-text-button" dir="ltr" href={'tel:' + ticket.phone.replace(/[^+0-9]/g, '')}>{ticket.phone}</a>}
        </div>
        <form key={`${ticket.status}-${ticket.response ?? ''}`} onSubmit={async event => {
          event.preventDefault(); if (saving) return; const form = new FormData(event.currentTarget); setSaving(true); setError('');
          try { const response = await fetch('/api/support/tickets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ticket.id, status: form.get('status'), response: form.get('response') }) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error ?? 'Could not save response.'); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'Try again.'); } finally { setSaving(false); }
        }}>
          <label>{t('Request status', 'حالة الطلب')}<select name="status" defaultValue={ticket.status}>{statusOptions.map(([value, en, arabic]) => <option key={value} value={value}>{t(en, arabic)}</option>)}</select></label>
          <label>{t('Saved response / studio notes', 'الرد المحفوظ / ملاحظات الاستوديو')}<textarea name="response" defaultValue={ticket.response ?? ''} maxLength={2000} rows={3} /></label>
          <small>{t('This saves the response. Contact the customer to send meeting details.', 'هذا يحفظ الرد. تواصل مع العميل لإرسال تفاصيل اللقاء.')}</small>
          <button className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : null}{t('Save request update', 'حفظ تحديث الطلب')}</button>
        </form>
      </div>
    </details>)}
  </div>;
}
