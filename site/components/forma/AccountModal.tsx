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
  User,
  KeyRound,
  Search,
  Package,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Lock,
  LogOut,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ar: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  area: string;
  role: 'customer' | 'admin';
}

const statusLabels: Record<string, [string, string]> = {
  awaiting_payment: ['Awaiting payment', 'بانتظار الدفع'],
  pending: ['Pending review', 'بانتظار المراجعة'],
  reviewed: ['Reviewed', 'تمت المراجعة'],
  queued: ['In queue', 'في قائمة الانتظار'],
  printing: ['Printing', 'قيد الطباعة'],
  finishing: ['Finishing', 'مرحلة التشطيب'],
  ready: ['Ready for pickup', 'جاهز للاستلام'],
  completed: ['Completed', 'مكتمل'],
  declined: ['Declined', 'مرفوض'],
  changes_requested: ['Changes requested', 'مطلوب إجراء تعديلات'],
  cancelled: ['Cancelled', 'ملغي'],
};

export function AccountModal({ open, onOpenChange, ar }: AccountModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'track' | 'signin' | 'register'>('signin');
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');

  // Sign In / Register form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<Array<{
    id: string;
    total: number;
    status: string;
    fulfillment: string;
    created: number;
    items?: Array<{ name: string }>;
  }>>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [authError, setAuthError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const statusLabel = (status: string) => {
    const known = statusLabels[status.toLowerCase()];
    return known ? t(known[0], known[1]) : status.replaceAll('_', ' ');
  };

  // Clear credentials and transient errors whenever the dialog closes.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword('');
      setShowPassword(false);
      setAuthError('');
      setLogoutError('');
    }
    onOpenChange(nextOpen);
  };

  // Pinning the close button on scroll only needs one write per frame.
  const scrollFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const current = event.currentTarget;
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      if (current.isConnected) current.style.setProperty('--studio-scroll-y', `${current.scrollTop}px`);
    });
  };

  // Check auth and load orders on modal open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const d = data as { user: UserProfile | null } | null;
        if (d?.user) {
          setCurrentUser(d.user);
          setOrdersLoading(true);
          setOrdersError(false);
          fetch('/api/auth/orders')
            .then((res) => {
              if (!res.ok) throw new Error('Orders unavailable');
              return res.json();
            })
            .then((orderData: unknown) => {
              if (cancelled) return;
              const ord = orderData as { orders?: typeof userOrders };
              setUserOrders(ord.orders || []);
            })
            .catch(() => {
              if (!cancelled) {
                setUserOrders([]);
                setOrdersError(true);
              }
            })
            .finally(() => {
              if (!cancelled) setOrdersLoading(false);
            });
        } else {
          setCurrentUser(null);
          setUserOrders([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
          setUserOrders([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    const params = new URLSearchParams({
      id: orderId.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    });
    router.push(`/track?${params.toString()}`);
    handleOpenChange(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { error?: string; user?: UserProfile };
      if (!res.ok) throw new Error(data.error ?? 'Invalid email or password.');
      if (!data.user) throw new Error('Your account could not be loaded. Please try again.');
      setCurrentUser(data.user);
      window.dispatchEvent(new Event('forma-auth-changed'));
      setOrdersLoading(true);
      setOrdersError(false);
      void fetch('/api/auth/orders')
        .then((res) => {
          if (!res.ok) throw new Error('Orders unavailable');
          return res.json();
        })
        .then((orderData: unknown) => {
          const ord = orderData as { orders?: typeof userOrders };
          setUserOrders(ord.orders || []);
        })
        .catch(() => {
          setUserOrders([]);
          setOrdersError(true);
        })
        .finally(() => setOrdersLoading(false));

      toast.success(
        ar ? `أهلاً بك، ${data.user.name}` : `Welcome back, ${data.user.name}`
      );
      if (data.user.role === 'admin') {
        router.push('/admin');
        handleOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Sign in failed. Please try again.', 'تعذر تسجيل الدخول. حاول مرة أخرى.');
      setAuthError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: regPhone.trim(),
          area: area.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; user?: UserProfile };
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      if (!data.user) throw new Error('Your account could not be created. Please try again.');
      setCurrentUser(data.user);
      window.dispatchEvent(new Event('forma-auth-changed'));
      toast.success(
        ar
          ? 'تم إنشاء الحساب بنجاح! مرحبًا بك في فورما'
          : 'Account created successfully! Welcome to Forma3D.'
      );

    } catch (err) {
      const message = err instanceof Error ? err.message : t('Registration failed. Please try again.', 'تعذر إنشاء الحساب. حاول مرة أخرى.');
      setAuthError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Could not sign out. Please try again.');
      setCurrentUser(null);
      setUserOrders([]);
      setOrdersError(false);
      window.dispatchEvent(new Event('forma-auth-changed'));
      toast.success(ar ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Could not sign out. Please try again.', 'تعذر تسجيل الخروج. حاول مرة أخرى.');
      setLogoutError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="account-dialog max-w-5xl max-h-[92dvh] overflow-y-auto p-6 sm:p-8"
        dir={ar ? 'rtl' : 'ltr'}
        onScroll={handleScroll}
      >
        <div className="account-header border-b border-border/40 pb-4">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1.5">
            <User size={15} />
          <span>{t('Your Forma account', 'حسابك في فورما')}</span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight break-words">
            {currentUser
              ? t(`Signed In as ${currentUser.name}`, `مسجل كـ ${currentUser.name}`)
              : t('Your Forma account', 'حسابك في فورما')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm mt-1">
            {currentUser
              ? t(
                  `Role: ${currentUser.role === 'admin' ? 'Studio Administrator' : 'Customer'} · ${currentUser.email}`,
                  `الصلاحية: ${currentUser.role === 'admin' ? 'إدارة الاستوديو' : 'عميل'} · ${currentUser.email}`
                )
              : t(
                  'Track orders without a password, sign in to your profile, or access studio administration.',
                  'تتبع طلباتك بدون كلمة مرور، سجل دخولك، أو ادخل لوحة إدارة الاستوديو.'
                )}
          </DialogDescription>
        </div>

        <aside className="account-studio-art" aria-hidden="true">
          <span className="account-art-mark">F<span>3D</span></span>
          <span className="account-art-object" />
          <span className="account-art-caption">FORMA / OBJECT STUDIO</span>
        </aside>

        {currentUser ? (
          /* User Profile View when Logged In */
          <div className="py-4 space-y-4">
            {logoutError && <p className="studio-form-error" role="alert">{logoutError}</p>}
            <div className="p-4 rounded-md border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-sm font-semibold">{currentUser.name}</strong>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {currentUser.role === 'admin' ? t('Admin', 'مشرف') : t('Customer', 'عميل')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              {currentUser.phone && (
                <p className="text-xs text-muted-foreground dir-ltr font-mono">{currentUser.phone}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {currentUser.role === 'admin' && (
                <a
                  href="/admin"
                  className="flex-1 px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors flex items-center justify-center gap-2 text-center min-h-[44px]"
                >
                  <KeyRound size={14} />
                  <span>{t('Studio Admin Console', 'لوحة تحكم الاستوديو')}</span>
                </a>
              )}
              <a
                href="/track"
                className="flex-1 px-4 py-2.5 text-xs font-semibold border border-border hover:bg-muted/50 rounded-sm transition-colors flex items-center justify-center gap-2 text-center min-h-[44px]"
              >
                <Package size={14} />
                <span>{t('Find another order', 'ابحث عن طلب آخر')}</span>
              </a>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="px-4 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <LogOut size={14} />
                <span>{t('Sign Out', 'خروج')}</span>
              </button>
            </div>

            {/* Order History Section */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-primary" />
                  <span>{t('Your Order History', 'سجل طلباتك')}</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  {userOrders.length} {t('orders', 'طلبات')}
                </span>
              </div>

              {ordersLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2" role="status" aria-live="polite">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>{t('Loading your prints…', 'جارٍ تحميل طلباتك…')}</span>
                </div>
              ) : ordersError ? (
                <div className="p-4 rounded-md border border-dashed border-border/70 text-center text-xs text-muted-foreground" role="status">
                  {t('Order history could not load. Please try again later.', 'تعذر تحميل سجل الطلبات. حاول مرة أخرى لاحقًا.')}
                </div>
              ) : userOrders.length === 0 ? (
                <div className="p-4 rounded-md border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                  {t('No orders placed with this account yet.', 'لم تقم بإنشاء طلبات بهذا الحساب بعد.')}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto overscroll-contain pr-0.5">
                  {userOrders.map((ord) => (
                    <a
                      key={ord.id}
                      href={`/track?id=${ord.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border/70 bg-background hover:bg-muted/30 transition-colors block text-xs group cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-mono font-bold text-primary text-xs flex items-center gap-1.5 min-w-0">
                          <span className="break-all" title={ord.id}>{ord.id}</span>
                          <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                            {new Date(ord.created).toLocaleDateString(ar ? 'ar-SA' : 'en-GB')}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {ord.items?.map((it) => it.name).join(', ') || t('Custom 3D Print', 'طلب طباعة ثلاثية الأبعاد')}
                        </div>
                      </div>
                      <div className="text-end space-y-0.5 shrink-0">
                        <div className="font-bold text-foreground whitespace-nowrap">SAR {ord.total}</div>
                        <div className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-block">
                          {statusLabel(ord.status)}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : (
          /* Tabs for Not Logged In: Order Lookup vs Sign In vs Register */
          <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setAuthError(''); }} className="mt-3 account-tabs">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="track">{t('Quick Track', 'استعلام سريع')}</TabsTrigger>
              <TabsTrigger value="signin">{t('Sign In', 'دخول')}</TabsTrigger>
              <TabsTrigger value="register">{t('Register', 'تسجيل جديد')}</TabsTrigger>
            </TabsList>

            {/* TAB 1: Fast Order Lookup Without Password */}
            <TabsContent value="track" className="pt-3">
              <div className="p-4 rounded-md border border-border/70 bg-background/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Package size={16} className="text-primary" />
                    <span>{t('Track Your 3D Print', 'تتبع قطعتك المطبوعة')}</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {t('No password required', 'بدون كلمة مرور')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'Follow your order through review and production. Enter the order number and phone used at checkout.',
                    'تابع طلبك خلال المراجعة والإنتاج. أدخل رقم الطلب ورقم الجوال المستخدم عند الطلب.'
                  )}
                </p>
                <form onSubmit={handleLookup} className="account-form space-y-2.5">
                  <div>
                    <label htmlFor="account-order-id" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Order Number', 'رقم الطلب')}
                    </label>
                    <input
                      type="text"
                      id="account-order-id"
                      placeholder={t('e.g. JBL-1A2B3C', 'مثل JBL-1A2B3C')}
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background uppercase font-mono tracking-wider"
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="account-track-phone" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Phone Number (used at checkout)', 'رقم الجوال (المسجل عند الطلب)')}
                    </label>
                    <input
                      type="tel"
                      id="account-track-phone"
                      placeholder="050 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background font-mono"
                      dir="ltr"
                      autoComplete="tel"
                      inputMode="tel"
                      enterKeyHint="go"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="account-submit w-full mt-1 px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <Search size={14} />
                    <span>{t('Track Print Now', 'تتبع الطباعة الآن')}</span>
                  </button>
                </form>
              </div>

              {/* Studio Admin link badge */}
              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock size={13} className="text-primary" />
                  <span>{t('Studio Operator?', 'من طاقم الاستوديو؟')}</span>
                </span>
                <a
                  href="/admin"
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>{t('Admin Console', 'لوحة المشرف')}</span>
                  {ar ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </a>
              </div>
            </TabsContent>

            {/* TAB 2: Sign In with Email & Password */}
            <TabsContent value="signin" className="pt-3">
              {authError && <p className="studio-form-error" role="alert">{authError}</p>}
              <form onSubmit={handleLogin} className="account-form space-y-3" aria-busy={busy}>
                <div>
                  <label htmlFor="account-email" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Email Address', 'البريد الإلكتروني')}
                  </label>
                  <input
                    type="email"
                    id="account-email"
                    placeholder="name@example.com"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="account-password" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Password', 'كلمة المرور')}
                  </label>
                  <div className="studio-password-field"><input
                    type={showPassword ? 'text' : 'password'}
                    id="account-password"
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    dir="ltr"
                    required
                  /><button type="button" className="studio-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="account-submit w-full px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  <span>{busy ? t('Signing In…', 'جارٍ الدخول…') : t('Sign In', 'تسجيل الدخول')}</span>
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-border/40 text-center">
                <a
                  href="/admin"
                  onClick={() => handleOpenChange(false)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  <span>{t('Studio Operator Portal', 'بوابة المشرف على الاستوديو')}</span>
                </a>
              </div>
            </TabsContent>

            {/* TAB 3: Register New Account */}
            <TabsContent value="register" className="pt-3">
              {authError && <p className="studio-form-error" role="alert">{authError}</p>}
              <form onSubmit={handleRegister} className="account-form space-y-2.5" aria-busy={busy}>
                <div>
                  <label htmlFor="account-name" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Full Name', 'الاسم الكامل')}
                  </label>
                  <input
                    type="text"
                    id="account-name"
                    placeholder={t('e.g. Ahmad Al-Jubaili', 'مثل: أحمد الجبيلي')}
                    value={name}
                    autoComplete="name"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-email" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Email Address', 'البريد الإلكتروني')}
                  </label>
                  <input
                    type="email"
                    id="register-email"
                    placeholder="name@example.com"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-password" className="block text-[11px] font-medium text-muted-foreground mb-1">
                    {t('Password', 'كلمة المرور')}
                  </label>
                  <div className="studio-password-field"><input
                    type={showPassword ? 'text' : 'password'}
                    id="register-password"
                    placeholder="••••••••"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    dir="ltr"
                    minLength={6}
                    required
                  /><button type="button" className="studio-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="register-phone" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('Phone (optional)', 'الجوال (اختياري)')}
                    </label>
                    <input
                      type="tel"
                      id="register-phone"
                      placeholder="050 123 4567"
                      value={regPhone}
                      autoComplete="tel"
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label htmlFor="register-area" className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t('District / Area', 'الحي / المنطقة')}
                    </label>
                    <input
                      type="text"
                      id="register-area"
                      placeholder={t('Jubail', 'الجبيل')}
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs min-h-[44px] border border-border rounded-sm bg-background"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="account-submit w-full mt-2 px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>{busy ? t('Creating Account…', 'جارٍ إنشاء الحساب…') : t('Create Account', 'إنشاء الحساب')}</span>
                </button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <div className="pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('Forma3D Studio Security · Jubail', 'أمان استوديو فورما ثري دي · الجبيل')}</span>
          <ShieldCheck size={14} className="text-emerald-600" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
