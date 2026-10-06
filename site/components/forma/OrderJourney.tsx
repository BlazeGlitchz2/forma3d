'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Copy, Layers3, Loader2, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { PageLink as Link } from './PageLink';
import type { CartItem, Shared } from './Flows';
import { normalizePhone, type Quote } from '@/lib/pricing';
import { paymentLocations, type OrderPayment, type PaymentLocation } from '@/lib/payment';

const ModelViewport = lazy(() => import('./ModelViewport'));
const price = (amount: number) => amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const itemName = (item: CartItem, shared: Shared) => { const product = shared.products.find(p => p.id === item.productId); return product ? (shared.ar ? product.nameAr : product.name) : item.name; };
type ApiFallbacks = { network: string; server: string };
async function api<T>(url: string, body: unknown, fallback?: ApiFallbacks): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(fallback?.network ?? 'We could not reach the studio. Check your connection and try again.');
  }
  let data: T & { error?: string };
  try {
    data = await response.json() as T & { error?: string };
  } catch {
    throw new Error(fallback?.server ?? 'The studio could not complete this request. Try again.');
  }
  if (!response.ok) throw new Error(data.error ?? fallback?.server ?? 'The studio could not complete this request. Try again.');
  return data;
}
const lineKeys = new WeakMap<object, string>();
let lineKeySeed = 0;
function useStableLineKeys(items: CartItem[]) {
  return items.map((item) => {
    let key = lineKeys.get(item);
    if (!key) { lineKeySeed += 1; key = `journey-line-${lineKeySeed}`; lineKeys.set(item, key); }
    return key;
  });
}

export function ObjectStage({ item, shared, compact = false, modelQuery }: { item: CartItem; shared: Shared; compact?: boolean; modelQuery?: string }) {
  const product = shared.products.find(p => p.id === item.productId);
  const source = item.uploadId ?? product?.modelId;
  return <div className={`journey-object-stage ${compact ? 'journey-stage-compact' : ''}`}>
    <div className="journey-stage-orbit" aria-hidden="true" />
    <Suspense fallback={<div className="journey-object-loading"><Layers3 size={24} /><span>{shared.ar ? 'نفتح قطعتك…' : 'Opening your object…'}</span></div>}>
      <ModelViewport kind={product?.kind ?? item.kind} modelUrl={!item.file && source ? '/api/uploads/' + source + (modelQuery ? '?' + modelQuery : '') : undefined} file={item.file} color={item.colorHex} material={item.config.material} quality={item.config.quality} size={item.config.size / 100} compact studio cinematic ar={shared.ar} />
    </Suspense>
    <div className="journey-stage-caption"><span><i style={{ background: item.colorHex }} />{item.config.material.toUpperCase()}</span><span>{shared.ar ? 'اسحب لتدوير القطعة' : 'Drag to explore'}</span></div>
  </div>;
}

export function CartJourney(shared: Shared) {
  const { ar, cart, setCart } = shared; const t = (en: string, arabic: string) => ar ? arabic : en;
  const [selected, setSelected] = useState(0); const [busy, setBusy] = useState<number | null>(null); const [error, setError] = useState('');
  const keys = useStableLineKeys(cart);
  const preview = cart[Math.min(selected, cart.length - 1)];
  const saved = cart.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  async function quantity(index: number, next: number) {
    const clamped = Math.max(1, Math.min(20, Math.round(next)));
    if (busy !== null || cart[index]?.config.quantity === clamped) return;
    setBusy(index); setError('');
    try {
      const item = cart[index]; const quote = await api<Quote>('/api/quote', { item: { productId: item.productId, uploadId: item.uploadId, name: item.name, config: { ...item.config, quantity: clamped } } }, { network: t('We couldn’t reach the studio. Check your connection and try again.', 'تعذر الوصول إلى الاستوديو. تحقق من اتصالك وحاول مجددًا.'), server: t('The studio couldn’t complete this request. Try again.', 'تعذر على الاستوديو إكمال الطلب. حاول مجددًا.') });
      setCart(cart.map((entry, i) => i === index ? { ...entry, config: quote.config, price: quote.total, discount: quote.breakdown.discount, dimensions: quote.dimensions } : entry));
    } catch (err) { setError(err instanceof Error ? err.message : t('Could not update quantity. Try again.', 'تعذر تحديث الكمية. حاول مجددًا.')); } finally { setBusy(null); }
  }
  function remove(index: number) {
    if (busy !== null) return;
    setError('');
    const next = cart.filter((_, i) => i !== index);
    setCart(next);
    setSelected((previous) => Math.max(0, Math.min(previous > index ? previous - 1 : previous, next.length - 1)));
  }
  if (!cart.length) return <div className="journey-cart-empty"><div className="journey-empty-sculpture" aria-hidden="true"><span /><span /><span /></div><ShoppingBag size={28} /><h2>{t('Something worth making.', 'شيء يستحق أن نصنعه.')}</h2><p>{t('Your next favourite object starts with an idea. Find a form, choose a colour, make it yours.', 'قطعتك المفضلة القادمة تبدأ بفكرة. اختر الشكل واللون واجعلها لك.')}</p><Link href="/objects" className="journey-button">{t('Find your object', 'اكتشف قطعتك')}<ArrowRight size={18} /></Link><Link href="/lab" className="journey-text-button">{t('Or bring your own 3D model', 'أو أحضر نموذجك ثلاثي الأبعاد')}</Link></div>;
  return <div className="journey-cart">
    <ObjectStage key={preview.productId ?? preview.uploadId} item={preview} shared={shared} compact />
    <div className="journey-cart-lines" aria-label={t('Objects in your cart', 'القطع في سلتك')}>
      {cart.map((item, index) => <article className={`journey-cart-line ${index === selected ? 'is-selected' : ''}`} key={keys[index]} aria-busy={busy === index}>
        <button type="button" className="journey-cart-preview" style={{ '--object-colour': item.colorHex } as React.CSSProperties} onClick={() => setSelected(index)} aria-label={t('Preview ' + itemName(item, shared), 'معاينة ' + itemName(item, shared))}><Layers3 size={22} /></button>
        <div className="journey-cart-info"><strong>{itemName(item, shared)}</strong><span>{item.config.material.toUpperCase()} / {shared.palette.find(c => c.id === item.config.color)?.[ar ? 'ar' : 'name'] ?? item.config.color}</span><small dir="ltr">{item.dimensions.join(' × ')} mm</small>{!!item.discount && <small className="journey-line-saving" dir="ltr">−{price(item.discount)} SAR · {t('volume','كمية')}</small>}<div className="journey-quantity" aria-label={t('Quantity', 'الكمية')}><button type="button" disabled={busy !== null || item.config.quantity <= 1} onClick={() => void quantity(index, item.config.quantity - 1)} aria-label={t('Decrease quantity of ' + itemName(item, shared), 'تقليل كمية ' + itemName(item, shared))}><Minus size={15} /></button><span aria-live="polite">{busy === index ? <Loader2 size={14} className="spin" /> : item.config.quantity}</span><button type="button" disabled={busy !== null || item.config.quantity >= 20} onClick={() => void quantity(index, item.config.quantity + 1)} aria-label={t('Increase quantity of ' + itemName(item, shared), 'زيادة كمية ' + itemName(item, shared))}><Plus size={15} /></button></div></div>
        <div className="journey-cart-price"><strong dir="ltr">{price(item.price)}<small>SAR</small></strong><button type="button" disabled={busy !== null} className="journey-remove" onClick={() => remove(index)} aria-label={t('Remove ' + itemName(item, shared), 'إزالة ' + itemName(item, shared))}><Trash2 size={17} /></button></div>
      </article>)}
    </div>
    {error && <p className="journey-error" role="alert">{error}</p>}
    <div className="journey-cart-footer"><div className="journey-subtotal"><span>{t('Estimated total', 'الإجمالي التقديري')}</span><strong dir="ltr">{price(cart.reduce((sum, item) => sum + item.price, 0))}<small>SAR</small></strong></div>{saved > 0 && <p className="journey-volume-saving" dir="ltr">{t('Volume savings applied', 'خصم الكمية المطبق')} −{price(saved)} SAR</p>}<p><MapPin size={15} />{t('Free local pickup. Made in Jubail.', 'استلام محلي مجاني. صُنعت في الجبيل.')}</p><Link href="/checkout" className={`journey-button ${busy !== null ? 'is-disabled' : ''}`} aria-disabled={busy !== null} onClick={e => { if (busy !== null) e.preventDefault(); }}>{t('Build my order', 'أكمل طلبي')}<ArrowRight size={18} /></Link><div className="journey-trust"><ShieldCheck size={16} /><span>{t('Payment verified before we print', 'نؤكد الدفع قبل بدء الطباعة')}</span></div></div>
  </div>;
}

type Reservation = { id: string; token?: string; total: number; payment: OrderPayment };
export function CheckoutJourney(shared: Shared) {
  const { ar, cart, setCart } = shared; const t = (en: string, arabic: string) => ar ? arabic : en;
  const [step, setStep] = useState(0); const [customer, setCustomer] = useState(''); const [phone, setPhone] = useState(''); const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<PaymentLocation>('huwaylat'); const [acknowledged, setAcknowledged] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState<{ name: string | null; phone: string | null }>({ name: null, phone: null });
  const [reservation, setReservation] = useState<Reservation | null>(null); const [reservedItems, setReservedItems] = useState<CartItem[]>([]); const [preview, setPreview] = useState(0); const [copied, setCopied] = useState(false);
  const requestId = useRef(''); const formRef = useRef<HTMLFormElement>(null); const stepHeading = useRef<HTMLHeadingElement>(null); const receiptHeading = useRef<HTMLHeadingElement>(null); const nameInput = useRef<HTMLInputElement>(null); const phoneInput = useRef<HTMLInputElement>(null); const touched = useRef(false); const submitting = useRef(false);
  const cartSignature = cart.map((item) => `${item.productId ?? item.uploadId ?? item.name}:${item.config.material}:${item.config.color}:${item.config.size}:${item.config.quantity}:${item.price}`).join('|');
  useEffect(() => { requestId.current = ''; }, [cartSignature]);
  useEffect(() => { if (reservation) receiptHeading.current?.focus(); }, [reservation]);
  useEffect(() => {
    let alive = true;
    const prefill = () => { void fetch('/api/auth/me').then(res => res.ok ? res.json() : null).then((data: unknown) => { const profile=data as {user?:{name?:string;phone?:string}}|null; if (alive && profile?.user && !touched.current) { setCustomer(profile.user.name ?? ''); setPhone(profile.user.phone ?? ''); } }).catch(() => {}); };
    prefill(); window.addEventListener('forma-auth-changed', prefill);
    return () => { alive = false; window.removeEventListener('forma-auth-changed', prefill); };
  }, []);
  const currentItems = reservation ? reservedItems : cart; const activeItem = currentItems[Math.min(preview, currentItems.length - 1)];
  const total = reservation?.total ?? cart.reduce((sum, item) => sum + item.price, 0);
  const moveTo = (next: number) => { setError(''); setFieldErrors({ name: null, phone: null }); setStep(next); requestAnimationFrame(() => stepHeading.current?.focus()); };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || submitting.current) return;
    if (customer.trim().length < 2) { moveTo(0); setFieldErrors({ name: t('Enter your name (at least 2 characters).', 'أدخل اسمك (حرفان على الأقل).'), phone: null }); requestAnimationFrame(() => nameInput.current?.focus()); return; }
    let normalized = '';
    try { normalized = normalizePhone(phone); } catch { moveTo(0); setFieldErrors({ name: null, phone: t('Enter a Saudi mobile number, such as 050 123 4567.', 'أدخل رقم جوال سعودي مثل ٠٥٠١٢٣٤٥٦٧.') }); requestAnimationFrame(() => phoneInput.current?.focus()); return; }
    if (step < 2) { moveTo(step + 1); return; }
    if (!acknowledged) { setError(t('Confirm that payment is required before printing.', 'أكد أنك توافق على الدفع قبل الطباعة.')); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      setPhone(normalized);
      requestId.current ||= globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await api<Reservation>('/api/orders', { customer: customer.trim(), phone: normalized, fulfillment: 'pickup', paymentLocation: location, paymentAcknowledged: true, notes, items: cart.map(({ productId, uploadId, name, config }) => ({ productId, uploadId, name, config })), requestId: requestId.current }, { network: t('We couldn’t reach the studio. Check your connection and try again.', 'تعذر الوصول إلى الاستوديو. تحقق من اتصالك وحاول مجددًا.'), server: t('Could not reserve your order. Please try again.', 'تعذر حجز الطلب. حاول مجددًا.') });
      setReservedItems(cart); setReservation(result); setCart([]); setPreview(0); window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) { setError(err instanceof Error ? err.message : t('Could not reserve your order. Please try again.', 'تعذر حجز الطلب. حاول مجددًا.')); } finally { submitting.current = false; setBusy(false); }
  }
  function copyOrder() {
    if (!reservation) return;
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) { setError(t('Select the order number to copy it.', 'حدد رقم الطلب لنسخه.')); return; }
    void clipboard.writeText(reservation.id).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2500); }).catch(() => setError(t('Select the order number to copy it.', 'حدد رقم الطلب لنسخه.')));
  }
  const locationInfo = paymentLocations.find(entry => entry.id === (reservation?.payment.location ?? location)) ?? paymentLocations[0];
  if (!currentItems.length) return <section className="journey-page journey-empty-page"><div className="journey-cart-empty"><div className="journey-empty-sculpture" aria-hidden="true"><span /><span /><span /></div><h1>{t('A blank canvas.', 'مساحة لفكرتك.')}</h1><p>{t('Choose an object or upload a model. We’ll turn it into something you can hold.', 'اختر قطعة أو ارفع نموذجًا. نحول فكرتك إلى شيء يمكنك حمله.')}</p><Link href="/objects" className="journey-button">{t('Explore the collection', 'اكتشف المجموعة')}<ArrowRight size={18} /></Link><Link href="/lab" className="journey-text-button">{t('Upload my model', 'ارفع نموذجي')}</Link></div></section>;
  return <section className={`journey-page ${reservation ? 'journey-reserved' : ''}`}>
    <header className="journey-heading"><div><p><Layers3 size={17} />{t('Your idea, taking shape', 'فكرتك تأخذ شكلًا')}</p><h1>{reservation ? t('One step closer.', 'اقتربت من فكرتك.') : t('Let’s make it real.', 'لنجعلها حقيقية.')}</h1><span>{reservation ? t('Your reservation is saved. Next, arrange your local payment.', 'تم حفظ حجزك. الخطوة التالية هي ترتيب الدفع محليًا.') : t('Made for you. Paid before printing. Collected locally.', 'نصنعها لك. الدفع قبل الطباعة. والاستلام محليًا.')}</span></div><Link href="/objects" className="journey-back-link"><ArrowLeft size={16} />{t('Back to objects', 'العودة للقطع')}</Link></header>
    <div className="journey-layout">
      <aside className="journey-showcase"><ObjectStage key={activeItem.productId ?? activeItem.uploadId} item={activeItem} shared={shared} /><div className="journey-showcase-title"><div><span>{t('Made to order', 'صُنعت حسب طلبك')}</span><h2>{itemName(activeItem, shared)}</h2></div><span dir="ltr">{activeItem.dimensions.join(' × ')} mm</span></div>{currentItems.length > 1 && <div className="journey-object-selector" aria-label={t('Preview an object', 'اختر قطعة للمعاينة')}>{currentItems.map((item, i) => <button key={i} className={preview === i ? 'is-selected' : ''} onClick={() => setPreview(i)} type="button" aria-pressed={preview === i}><i style={{ background: item.colorHex }} />{itemName(item, shared)}</button>)}</div>}<div className="journey-order-manifest">{currentItems.map((item, i) => <div key={i}><span>{item.config.quantity} × {itemName(item, shared)}<small>{item.config.material.toUpperCase()} / {t(shared.profiles.find(p => p.id === item.config.quality)?.name ?? item.config.quality, shared.profiles.find(p => p.id === item.config.quality)?.ar ?? item.config.quality)}</small></span><strong dir="ltr">SAR {price(item.price)}</strong></div>)}<div className="journey-manifest-pickup"><span>{t('Local pickup', 'الاستلام المحلي')}</span><span>{t('Included', 'مجاني')}</span></div></div><div className="journey-showcase-total"><span>{t('Estimated total', 'الإجمالي التقديري')}</span><strong dir="ltr">{price(total)}<small>SAR</small></strong></div><p className="journey-price-note">{t('The studio reviews your model and confirms the final quote before you pay.', 'يراجع الاستوديو النموذج ويؤكد السعر النهائي قبل الدفع.')}</p></aside>
      {reservation ? <div className="journey-panel journey-receipt" aria-live="polite"><div className="journey-receipt-symbol"><CheckCheck size={28} /></div><span className="journey-status"><span />{t('Reserved · awaiting payment', 'تم الحجز · بانتظار الدفع')}</span><h2 ref={receiptHeading} tabIndex={-1}>{t('Your print is reserved.', 'حجزنا طباعتك.')}</h2><p>{t('Keep this order number. Printing begins once our team has received and verified the full payment.', 'احتفظ برقم الطلب. تبدأ الطباعة بعد استلام المبلغ كاملًا وتأكيده من فريقنا.')}</p><div className="journey-order-code"><div><small>{t('Order reference', 'رقم الطلب')}</small><strong dir="ltr">{reservation.id}</strong></div><button type="button" aria-label={t('Copy order number', 'نسخ رقم الطلب')} className={copied ? 'is-copied' : ''} onClick={copyOrder}>{copied ? <Check size={18} /> : <Copy size={18} />}</button></div><ol className="journey-next-steps"><li><span>1</span><div><strong>{t('Arrange your meeting', 'رتب موعد اللقاء')}</strong><p>{ar ? locationInfo.ar : locationInfo.name}<br />{t('Contact support with your order number to agree the exact time and place.', 'تواصل مع الدعم برقم الطلب للاتفاق على المكان والوقت.')}</p></div></li><li><span>2</span><div><strong>{t('Pay the confirmed amount', 'ادفع المبلغ المؤكد')}</strong><p>{t('Confirm the final quote with staff, pay in person, and ask for a receipt.', 'أكد السعر النهائي مع الفريق وادفع شخصيًا واطلب إيصالًا.')}</p></div></li><li><span>3</span><div><strong>{t('Watch your print come to life', 'شاهد طباعتك تصبح حقيقة')}</strong><p>{t('Staff verifies payment, then printing starts. Track it until it is ready for pickup.', 'يؤكد الفريق الدفع ثم تبدأ الطباعة. تتبع الطلب حتى يصبح جاهزًا للاستلام.')}</p></div></li></ol><button className="journey-button" type="button" onClick={() => shared.onOpenSupport?.(reservation.id)}>{t('Arrange payment with support', 'رتب الدفع مع الدعم')}<ArrowRight size={18} /></button><Link className="journey-secondary-button" href={`/track?id=${reservation.id}${reservation.token ? '&token=' + reservation.token : '&phone=' + encodeURIComponent(phone)}`}>{t('Track my reservation', 'تتبع حجزي')}</Link>{error && <p className="journey-error" role="alert">{error}</p>}</div> : <div className="journey-panel"><nav className="journey-stepper" aria-label={t('Checkout steps', 'خطوات إتمام الطلب')}>{[['Your details', 'بياناتك'], ['Meeting point', 'مكان اللقاء'], ['Review', 'المراجعة']].map(([en, arabic], i) => <button key={en} type="button" disabled={i > step || busy} onClick={() => moveTo(i)} aria-current={i === step ? 'step' : undefined} className={i === step ? 'is-current' : i < step ? 'is-complete' : ''}><span>{i < step ? <Check size={14} /> : i + 1}</span><span className="journey-stepper-label">{t(en, arabic)}</span></button>)}</nav>
        <form ref={formRef} onSubmit={submit} className="journey-form" noValidate>
          <div className="journey-step-content" key={step}>
            <h2 tabIndex={-1} ref={stepHeading}>{step === 0 ? t('Who are we making this for?', 'لمن نصنع هذه القطعة؟') : step === 1 ? t('Meet us locally.', 'نلتقي محليًا.') : t('Ready to take shape?', 'جاهز لتصبح فكرتك حقيقة؟')}</h2>
            <p>{step === 0 ? t('Just the essentials, so we can keep you in the loop.', 'بيانات بسيطة لنبقيك على اطلاع بطلبك.') : step === 1 ? t('Choose where you’d like to arrange payment and pickup.', 'اختر المكان الأنسب لترتيب الدفع والاستلام.') : t('Check the details, then reserve your print.', 'راجع التفاصيل ثم احجز طباعتك.')}</p>
            {step === 0 && <><label htmlFor="checkout-name">{t('Your name', 'اسمك')}<input ref={nameInput} id="checkout-name" name="customer" required minLength={2} maxLength={80} autoComplete="name" enterKeyHint="next" spellCheck={false} value={customer} onChange={e => { touched.current = true; setCustomer(e.target.value); setFieldErrors(previous => previous.name ? { ...previous, name: null } : previous); }} placeholder={t('Name for your order', 'الاسم على الطلب')} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined} /></label>{fieldErrors.name && <p id="checkout-name-error" className="journey-error" role="alert">{fieldErrors.name}</p>}<label htmlFor="checkout-phone">{t('Saudi mobile number', 'رقم الجوال السعودي')}<input ref={phoneInput} id="checkout-phone" name="phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" spellCheck={false} required maxLength={30} value={phone} onChange={e => { touched.current = true; setPhone(e.target.value); setFieldErrors(previous => previous.phone ? { ...previous, phone: null } : previous); }} placeholder="050 123 4567" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'checkout-phone-error' : 'checkout-phone-help'} /><small id="checkout-phone-help">{t('For your payment meeting and order updates.', 'لترتيب موعد الدفع وتحديثات الطلب.')}</small></label>{fieldErrors.phone && <p id="checkout-phone-error" className="journey-error" role="alert">{fieldErrors.phone}</p>}{shared.onOpenAccount && <button type="button" className="journey-text-button" onClick={shared.onOpenAccount}>{t('Already have an account? Sign in', 'لديك حساب؟ سجل الدخول')}</button>}</>}
            {step === 1 && <><fieldset className="journey-locations"><legend className="sr-only">{t('Payment and pickup meeting area', 'منطقة اللقاء للدفع والاستلام')}</legend>{paymentLocations.map(entry => <label key={entry.id} className={location === entry.id ? 'is-selected' : ''}><input type="radio" name="paymentLocation" value={entry.id} checked={location === entry.id} onChange={() => setLocation(entry.id)} /><span className="journey-location-icon"><MapPin size={21} /></span><span className="journey-location-body"><strong>{ar ? entry.ar : entry.name}</strong><small>{ar ? entry.detailAr : entry.detail}</small></span><span className="journey-radio-mark" aria-hidden="true">{location === entry.id && <Check size={12} />}</span></label>)}</fieldset><div className="journey-meeting-note"><ShieldCheck size={20} /><p>{t('We arrange every meeting directly. Wait for staff to confirm the time and place before visiting or paying.', 'نرتب كل لقاء مباشرة. انتظر تأكيد الفريق للوقت والمكان قبل الزيارة أو الدفع.')}</p></div><label htmlFor="checkout-notes">{t('A note for the studio', 'ملاحظة للاستوديو')}<span className="journey-optional">{t('Optional', 'اختياري')}</span><textarea id="checkout-notes" name="notes" maxLength={1000} rows={3} enterKeyHint="done" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('A preferred meeting time or anything about your print…', 'الوقت المناسب للقاء أو ملاحظة عن طباعتك…')} /></label></>}
            {step === 2 && <><div className="journey-review"><div><span>{t('Made for', 'صُنعت لـ')}</span><strong>{customer}</strong><small dir="ltr">{phone}</small><button type="button" onClick={() => moveTo(0)}>{t('Edit', 'تعديل')}</button></div><div><span>{t('Payment & pickup', 'الدفع والاستلام')}</span><strong>{ar ? locationInfo.ar : locationInfo.name}</strong><small>{t('Exact meeting arranged with staff', 'نحدد موعد ومكان اللقاء مع الفريق')}</small><button type="button" onClick={() => moveTo(1)}>{t('Edit', 'تعديل')}</button></div>{notes && <div><span>{t('Your note', 'ملاحظتك')}</span><p>{notes}</p></div>}</div><div className="journey-payment-rule"><ShieldCheck size={22} /><div><strong>{t('Payment first. Then we print.', 'الدفع أولًا. ثم نطبع.')}</strong><p>{t('This reserves your order. Pay the full confirmed quote in person; our team verifies it before your print enters production.', 'هذه الخطوة تحجز طلبك. ادفع السعر المؤكد كاملًا شخصيًا؛ يتحقق فريقنا منه قبل بدء الإنتاج.')}</p></div></div><label className="journey-acknowledgment"><input type="checkbox" required checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>{t('I understand that full payment must be confirmed before printing starts.', 'أوافق على تأكيد الدفع كاملًا قبل بدء الطباعة.')}</span></label></>}
          </div>
          {error && <p className="journey-error" role="alert">{error}</p>}
          <div className="journey-form-actions">{step > 0 && <button type="button" disabled={busy} className="journey-previous" onClick={() => moveTo(step - 1)} aria-label={t('Previous step', 'الخطوة السابقة')}><ArrowLeft size={18} /></button>}<button className="journey-button" type="submit" disabled={busy}>{busy ? <><Loader2 size={18} className="spin" />{t('Reserving your print…', 'نحجز طباعتك…')}</> : <>{step === 2 ? t('Reserve my print', 'احجز طباعتي') : t('Continue', 'متابعة')}<ArrowRight size={18} /></>}</button></div><div className="journey-trust"><ShieldCheck size={16} /><span>{t('No account needed. Full payment before production.', 'بدون حساب. الدفع كاملًا قبل الإنتاج.')}</span></div>
        </form>
      </div>}
    </div>
    <div className="journey-bottom-process"><span><Layers3 size={18} />{t('Reserve your object', 'احجز قطعتك')}</span><ArrowRight size={14} /><span><ShieldCheck size={18} />{t('Pay & get verified', 'ادفع واحصل على التأكيد')}</span><ArrowRight size={14} /><span><ShoppingBag size={18} />{t('Print & collect', 'نطبع وتستلم')}</span></div>
  </section>;
}
