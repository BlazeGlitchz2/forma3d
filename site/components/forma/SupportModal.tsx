'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  MessageCircle,
  Phone,
  Clock,
  MapPin,
  Layers,
  HelpCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Bot,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ar: boolean;
  initialOrderId?: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const welcomeMessage = (ar: boolean) => ar
  ? 'مرحبًا بك في استوديو فورما3D! كيف يمكنني مساعدتك اليوم؟ اسألني عن الطباعة ثلاثية الأبعاد، الخامات، الملفات، أو متابعة طلبك.'
  : 'Welcome to Forma3D Studio. How can I help today? Ask about 3D printing, materials, files, or following an order.';

const DEFAULT_SUGGESTIONS_EN = [
  'How is price calculated?',
  'Creality Ender-3 V3 SE specs',
  'Available PLA colors',
  'Pickup and payment steps',
  'How to track an order?',
];

const DEFAULT_SUGGESTIONS_AR = [
  'كم سعر وتكلفة الطباعة؟',
  'أبعاد طابعة اندر Creality',
  'ألوان خامة PLA المتوفرة',
  'خطوات الاستلام والدفع',
  'كيف أتتبع طلبي؟',
];

export function SupportModal({ open, onOpenChange, ar, initialOrderId }: SupportModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ai' | 'ticket' | 'contact' | 'faq'>('ai');
  const [trackId, setTrackId] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [unread, setUnread] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(() => [
    { role: 'assistant', content: welcomeMessage(ar) },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<{ language: 'ar' | 'en'; items: string[] } | null>(null);
  const chatSuggestions = dynamicSuggestions?.language === (ar ? 'ar' : 'en')
    ? dynamicSuggestions.items
    : ar ? DEFAULT_SUGGESTIONS_AR : DEFAULT_SUGGESTIONS_EN;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dialogScrollRef = useRef<HTMLDivElement>(null);
  const appliedOrderRef = useRef<string | null>(null);

  // Ticket form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ id: string; message: string } | null>(null);
  const [ticketError, setTicketError] = useState('');

  const t = (en: string, arabic: string) => (ar ? arabic : en);

  useEffect(() => {
    const requestedOrderId = initialOrderId?.trim();
    if (!open) { appliedOrderRef.current = null; return; }
    if (!requestedOrderId || appliedOrderRef.current === requestedOrderId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      appliedOrderRef.current = requestedOrderId;
      setActiveTab('ticket');
      setOrderId(requestedOrderId);
      setSubject(ar ? 'تنسيق الدفع' : 'Arrange payment');
      setMessage(ar
        ? 'يرجى تأكيد السعر النهائي وموعد الاستلام ومكان اللقاء بالتحديد. يجب تأكيد استلام كامل المبلغ قبل بدء الطباعة.'
        : 'Please confirm the final quote, pickup time, and exact meeting point. Confirm full payment before printing begins.');
      setTicketResult(null);
      setTicketError('');
    });
    return () => { cancelled = true; };
  }, [open, initialOrderId, ar]);

  // Prefill user data if logged in
  useEffect(() => {
    if (!open) return;
    void fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const d = data as { user?: { name: string; email: string; phone: string } } | null;
        if (d?.user) {
          setName((prev) => prev || d.user!.name);
          setEmail((prev) => prev || d.user!.email);
          setPhone((prev) => prev || d.user!.phone);
        }
      })
      .catch(() => {});
  }, [open]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatBusy]);

  useEffect(() => {
    if (open && dialogScrollRef.current) dialogScrollRef.current.scrollTop = 0;
  }, [activeTab, open]);

  const sendChatMessage = async (textToSend?: string) => {
    const text = (textToSend ?? chatInput).trim();
    if (!text || chatBusy) return;
    setChatInput('');

    const userMsg: ChatMsg = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatBusy(true);

    try {
      const historyStart = Math.max(0, chatMessages.length - 6);
      const history = chatMessages.slice(historyStart).map((m, index) => ({
        role: m.role,
        content: historyStart === 0 && index === 0 && m.role === 'assistant' ? welcomeMessage(ar) : m.content,
      }));

      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          language: ar ? 'ar' : 'en',
        }),
      });

      const data = (await res.json()) as {
        message: string;
        suggestions?: string[];
      };

      if (!res.ok) throw new Error(data.message ?? 'Chat request failed');

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: typeof data.message === 'string' && data.message.trim()
            ? data.message
            : t('I could not prepare a reply. Please try again or send a support request.', 'تعذر تجهيز الرد. حاول مرة أخرى أو أرسل طلب دعم.'),
        },
      ]);
      if (activeTab !== 'ai') setUnread(true);

      if (Array.isArray(data.suggestions)) {
        setDynamicSuggestions({
          language: ar ? 'ar' : 'en',
          items: data.suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string' && suggestion.trim().length > 0).slice(0, 5),
        });
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: ar
            ? 'نعتذر، حدث انقطاع في الاتصال. يمكنك تقديم تذكرة دعم وسيتواصل معك فريقنا في الجبيل مباشرة!'
            : 'Sorry, a connection interruption occurred. Please submit a support ticket and our Jubail studio team will reach out directly!',
        },
      ]);
      if (activeTab !== 'ai') setUnread(true);
    } finally {
      setChatBusy(false);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    const query = new URLSearchParams({
      id: trackId.trim(),
      ...(phoneQuery.trim() ? { phone: phoneQuery.trim() } : {}),
    });
    router.push(`/track?${query.toString()}`);
    onOpenChange(false);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTicketError('');
    setBusy(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          orderId: orderId.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; id: string; message: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit ticket.');
      setTicketResult({ id: data.id, message: data.message });
      toast.success(
        ar ? `تم استلام تذكرتك بنجاح (${data.id})` : `Support ticket submitted (${data.id})`
      );
      setMessage('');
      setSubject('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Failed to submit ticket. Please try again.', 'تعذر إرسال التذكرة. حاول مرة أخرى.');
      setTicketError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogScrollRef}
        className="support-dialog max-w-4xl max-h-[92dvh] overflow-y-auto p-5 sm:p-8"
        dir={ar ? 'rtl' : 'ltr'}
        onScroll={(event) => event.currentTarget.style.setProperty('--studio-scroll-y', `${event.currentTarget.scrollTop}px`)}
      >
        <div className="support-header border-b border-border/40 pb-3.5">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={15} />
            <span>{t('Studio support', 'دعم الاستوديو')}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('Let’s talk about your print.', 'لنتحدث عن طباعتك.')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs mt-1">
            {t(
              'Ask about files, materials, pricing, order status, and pickup arrangements with the studio team.',
              'اسأل عن الملفات والخامات والأسعار وحالة الطلب وترتيبات الاستلام مع فريق الاستوديو.'
            )}
          </DialogDescription>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { const next = v as typeof activeTab; setActiveTab(next); if (next === 'ai') setUnread(false); }} className="mt-3">
          <TabsList className="grid grid-cols-4 w-full text-xs">
            <TabsTrigger value="ai" className="flex items-center gap-1.5 py-2">
              <Bot size={14} />
              <span>{t('AI Chat', 'المساعد الذكي')}</span>
              {unread && <span className="support-unread-dot" aria-hidden="true" />}
              {unread && <span className="sr-only">{t('New reply', 'رد جديد')}</span>}
            </TabsTrigger>
            <TabsTrigger value="ticket" className="flex items-center gap-1.5 py-2">
              <Send size={13} />
              <span>{t('Ticket', 'تذكرة دعم')}</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-1.5 py-2">
              <Phone size={13} />
              <span>{t('Contact', 'تواصل')}</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-1.5 py-2">
              <HelpCircle size={13} />
              <span>{t('Specs & FAQ', 'المواصفات')}</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AI Chat Assistant */}
          <TabsContent value="ai" className="pt-3 space-y-3">
            <div
              ref={chatScrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label={t('Support chat messages', 'رسائل الدعم')}
              className="chat-history-box support-chat-history overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3"
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 px-1">
                    {msg.role === 'user' ? (
                      <>
                        <span>{t('You', 'أنت')}</span>
                        <User size={11} />
                      </>
                    ) : (
                      <>
                        <Bot size={11} className="text-primary" />
                          <span>{t('Studio assistant', 'مساعد الاستوديو')}</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-background border border-border/70 text-foreground shadow-xs'
                    }`}
                  >
                  <div className="whitespace-pre-wrap">{i === 0 && msg.role === 'assistant' ? welcomeMessage(ar) : msg.content}</div>
                  </div>
                </div>
              ))}

              {chatBusy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>{t('Thinking & generating reply…', 'جارٍ التفكير وتجهيز الإجابة…')}</span>
                </div>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            {chatSuggestions.length > 0 && (
              <div className="support-chips flex flex-wrap gap-1.5 pt-1">
                {chatSuggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => sendChatMessage(suggestion)}
                    disabled={chatBusy}
                    className="text-xs px-3 py-1.5 min-h-[34px] rounded-full border border-border/70 bg-background/80 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input & Escalate Action */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendChatMessage();
              }}
              className="flex gap-2 pt-1"
            >
              <input
                type="text"
                aria-label={t('Message for studio support', 'رسالة إلى دعم الاستوديو')}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                autoComplete="off"
                enterKeyHint="send"
                placeholder={t(
                  'Ask about materials, files, pricing, or your order…',
                  'اسأل عن الخامات أو الملفات أو الأسعار أو طلبك…'
                )}
                className="flex-1 px-3 py-2 text-base sm:text-xs min-h-[48px] border border-border rounded-md bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label={t('Send message', 'إرسال الرسالة')}
                disabled={chatBusy || !chatInput.trim()}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[48px] shrink-0"
              >
                {chatBusy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className={ar ? 'rotate-180' : ''} />}
                <span>{t('Send', 'إرسال')}</span>
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span className="flex items-center gap-1"><Sparkles size={11} className="text-primary" />{t('Here to help with your print', 'نحن هنا لمساعدتك في طباعتك')}</span>
              <button
                type="button"
                onClick={() => setActiveTab('ticket')}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                {t('Need human staff? Submit Ticket →', 'تحتاج موظف بشري؟ قدم تذكرة ←')}
              </button>
            </div>
          </TabsContent>

          {/* TAB 2: Submit a Support Ticket */}
          <TabsContent value="ticket" className="pt-3">
            {ticketResult ? (
              <div role="status" aria-live="polite" className="p-5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-center space-y-3">
                <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-foreground">
                  {t('Support Ticket Created', 'تم استلام تذكرة الدعم')}
                </h3>
                <p className="text-xs font-mono text-primary font-bold">
                  {ticketResult.id}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {t('Thank you. Our studio team has received your request.', 'شكرًا لك. استلم فريق الاستوديو طلبك.')}
                </p>
                <button
                  type="button"
                  onClick={() => setTicketResult(null)}
                  className="px-4 py-1.5 text-xs font-medium border border-border bg-background hover:bg-muted rounded-sm transition-colors cursor-pointer"
                >
                  {t('Send Another Request', 'إرسال طلب آخر')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-3">
                {ticketError && <p className="studio-form-error" role="alert">{ticketError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="support-name" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Your Name', 'الاسم')}
                    </label>
                    <input
                      type="text"
                      id="support-name"
                      required
                      minLength={2}
                      autoComplete="name"
                      enterKeyHint="next"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('Full name', 'الاسم الكريم')}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    />
                  </div>
                  <div>
                    <label htmlFor="support-email" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Email Address', 'البريد الإلكتروني')}
                    </label>
                    <input
                      type="email"
                      id="support-email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      enterKeyHint="next"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="support-phone" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Phone (optional)', 'رقم الجوال (اختياري)')}
                    </label>
                    <input
                      type="tel"
                      id="support-phone"
                      autoComplete="tel"
                      inputMode="tel"
                      enterKeyHint="next"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050 123 4567"
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label htmlFor="support-order-id" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Order Number (optional)', 'رقم الطلب (اختياري)')}
                    </label>
                    <input
                      type="text"
                      id="support-order-id"
                      autoComplete="off"
                      autoCapitalize="characters"
                      enterKeyHint="next"
                      spellCheck={false}
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="JBL-..."
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background uppercase font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="support-subject" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Subject', 'الموضوع')}
                  </label>
                  <input
                      type="text"
                      id="support-subject"
                      required
                      minLength={3}
                      enterKeyHint="next"
                      value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t(
                      'e.g. Custom print scaling, material choice, batch order inquiry',
                      'مثل: استفسار عن دقة الطباعة أو الحجم أو طلب كميات'
                    )}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                  />
                </div>

                <div>
                  <label htmlFor="support-message" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Message', 'الرسالة')}
                  </label>
                  <textarea
                    id="support-message"
                    required
                    minLength={5}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t(
                      'Tell us about your 3D model, questions or special requirements…',
                      'اكتب تفاصيل استفسارك أو طلبك الخاص…'
                    )}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[100px] border border-border rounded-sm bg-background resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className={ar ? 'rotate-180' : ''} />}
                  <span>{busy ? t('Submitting…', 'جارٍ الإرسال…') : t('Send Support Ticket', 'إرسال تذكرة الدعم')}</span>
                </button>
              </form>
            )}
          </TabsContent>

          {/* TAB 3: Direct Contact */}
          <TabsContent value="contact" className="pt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button type="button" onClick={() => setActiveTab('ticket')} className="support-contact-card flex items-center justify-between p-4 rounded-md border border-border/60 bg-primary/5 hover:bg-primary/10 transition-colors group cursor-pointer text-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center flex-shrink-0">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-foreground">
                      {t('Send the studio a message', 'أرسل رسالة إلى الاستوديو')}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {t('Open a support request', 'افتح طلب دعم')}
                    </span>
                  </div>
                </div>
                <Send size={16} className="text-muted-foreground group-hover:text-primary" />
              </button>

              <div className="support-contact-card flex items-center justify-between p-4 rounded-md border border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary grid place-items-center flex-shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-foreground">
                      {t('Pickup is arranged with staff', 'يتم تنسيق الاستلام مع الموظفين')}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {t('Alhussan International School or Al Huwaylat', 'مدارس الحصان العالمية أو حي الحويلات')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="studio-pickup-note">{t('Agree on the exact meeting place with staff. Full payment must be confirmed by staff before printing begins.', 'يُتفق مع الموظفين على مكان اللقاء بالتحديد. يجب أن يؤكد الموظفون استلام كامل المبلغ قبل بدء الطباعة.')}</p>

            {/* Quick Order Tracking Lookup */}
            <div className="support-section p-4 rounded-md border border-border/60 bg-background/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Search size={16} className="text-primary" />
                <span>{t('Have an existing order?', 'لديك طلب بالفعل؟')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t(
                  'Enter your order code to follow its review and production status.',
                  'أدخل رمز الطلب لمتابعة حالة المراجعة والإنتاج.'
                )}
              </p>
              <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label={t('Order number', 'رقم الطلب')}
                  placeholder={t('Order code (e.g. JBL-1A2B)', 'رمز الطلب (مثل JBL-1A2B)')}
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background flex-1 uppercase tracking-wider"
                  dir="ltr"
                  autoComplete="off"
                  autoCapitalize="characters"
                  enterKeyHint="next"
                  spellCheck={false}
                  required
                />
                <input
                  type="tel"
                  aria-label={t('Phone number used at checkout', 'رقم الجوال المستخدم عند الطلب')}
                  placeholder={t('Phone number used at checkout', 'رقم الجوال المستخدم عند الطلب')}
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  className="px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background flex-1"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="search"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
                >
                  {t('Track Order', 'تتبع الطلب')}
                </button>
              </form>
            </div>
          </TabsContent>

          {/* TAB 4: Specs & FAQ */}
          <TabsContent value="faq" className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-3 rounded border border-border/40 bg-muted/15">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Clock size={14} className="text-primary" />
                  <span>{t('Turnaround & Production', 'مدة التنفيذ والإنتاج')}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t(
                    'The studio team will confirm timing after they review your model and payment.',
                    'يؤكد فريق الاستوديو موعد التنفيذ بعد مراجعة النموذج والدفع.'
                  )}
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded border border-border/40 bg-muted/15">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <MapPin size={14} className="text-primary" />
                  <span>{t('Pickup arrangements', 'ترتيبات الاستلام')}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t(
                    'Pickup is arranged with staff at Alhussan International School or Al Huwaylat. Agree on the exact meeting place with staff.',
                    'يتم تنسيق الاستلام مع الموظفين في مدارس الحصان العالمية أو حي الحويلات، ويُتفق معهم على مكان اللقاء بالتحديد.'
                  )}
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded border border-border/40 bg-muted/15">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Layers size={14} className="text-primary" />
                  <span>{t('Supported Formats & Build Bed', 'الصيغ وحجم الطباعة')}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t(
                    'We accept STL, 3MF and OBJ files up to 15 MB. Our Creality Ender-3 V3 SE offers a maximum build volume of 220 × 220 × 250 mm.',
                    'نقبل ملفات STL و3MF حتى ١٥ ميغابايت. مساحة الطباعة على جهاز Ender-3 V3 SE هي ٢٢٠ × ٢٢٠ × ٢٥٠ مم.'
                  )}
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded border border-border/40 bg-muted/15">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>{t('Payment before printing', 'الدفع قبل الطباعة')}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t(
                    'Full payment must be confirmed by staff before printing begins. After your file and quote are reviewed, arrange payment with the team.',
                    'يجب أن يؤكد الموظفون استلام كامل المبلغ قبل بدء الطباعة. بعد مراجعة الملف والسعر، نسّق الدفع مع الفريق.'
                  )}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('Forma3D Studio · Jubail, KSA', 'استوديو فورما ثري دي · الجبيل، السعودية')}</span>
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-primary" />
            {t('Ender-3 V3 SE · 0.4mm Nozzle', 'طابعة Ender-3 V3 SE · فوهة ٠٫٤ مم')}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
