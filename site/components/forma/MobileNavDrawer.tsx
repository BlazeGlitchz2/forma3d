'use client';

import { useEffect } from 'react';
import { PageLink as Link } from './PageLink';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Package,
  Layers,
  Search,
  Info,
  HelpCircle,
  User,
  ShoppingBag,
  Globe,
  MapPin,
  X,
} from 'lucide-react';
import type { CartItem } from './Flows';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ar: boolean;
  onToggleLanguage: () => void;
  route: string;
  cart: CartItem[];
  onOpenCart: () => void;
  onOpenSupport: () => void;
  onOpenAccount: () => void;
}

export function MobileNavDrawer({
  open,
  onOpenChange,
  ar,
  onToggleLanguage,
  route,
  cart,
  onOpenCart,
  onOpenSupport,
  onOpenAccount,
}: MobileNavDrawerProps) {
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  useEffect(() => {
    onOpenChange(false);
  }, [route, onOpenChange]);

  const navItems = [
    {
      href: '/objects',
      label: t('Objects', 'القطع'),
      sub: t('Curated forms & desktop objects', 'قطع وتصميمات مختارة للمكتب والمنزل'),
      icon: Package,
      active: route === 'shop',
    },
    {
      href: '/lab',
      label: t('Lab', 'المختبر'),
      sub: t('Upload STL/3MF & configure print', 'ارفع ملفك وخصص إعدادات الطباعة'),
      icon: Layers,
      active: route === 'make',
    },
    {
      href: '/track',
      label: t('Track', 'تتبع'),
      sub: t('Live printing status & updates', 'متابعة حالة الطباعة والتجهيز'),
      icon: Search,
      active: route === 'track',
    },
    {
      href: '/about',
      label: t('About', 'عن الاستوديو'),
      sub: t('The studio, machines & materials', 'عن الاستوديو، الطابعات والخامات'),
      icon: Info,
      active: route === 'about',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id="mobile-nav-drawer"
        side={ar ? 'right' : 'left'}
        className="mobile-nav-sheet"
        dir={ar ? 'rtl' : 'ltr'}
        showCloseButton={false}
      >
        <SheetClose
          className="mobile-nav-close"
          aria-label={t('Close navigation menu', 'إغلاق قائمة التنقل')}
        >
          <X size={20} />
        </SheetClose>
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between pb-5 border-b border-border/40">
            <Link
              href="/"
              onClick={() => onOpenChange(false)}
              className="brand brand-wordmark flex flex-col items-start min-h-[44px] justify-center"
            >
              <SheetTitle className="brand-logotype text-2xl font-black tracking-tighter">
                {ar ? 'فورما' : 'FORMA'}
                <sup className="brand-sup text-xs text-primary ms-1">3D</sup>
              </SheetTitle>
              <SheetDescription className="brand-origin text-[9px] font-semibold tracking-widest text-muted-foreground uppercase mt-0.5">
                {ar ? 'الجبيل · استوديو ثلاثي الأبعاد' : 'JUBAIL · 3D STUDIO'}
              </SheetDescription>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1.5" aria-label={t('Mobile navigation', 'تنقل الجوال')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={`mobile-nav-item flex items-center gap-3.5 min-h-[50px] p-3 rounded-md transition-colors ${
                    item.active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-muted/50 text-foreground font-medium'
                  }`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <div
                    className={`w-9 h-9 rounded-sm grid place-items-center flex-shrink-0 ${
                      item.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm leading-tight">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.sub}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Action Buttons (Support & Account) */}
          <div className="mt-5 pt-4 border-t border-border/40 space-y-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenSupport();
              }}
              className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-md border border-border/60 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle size={16} className="text-primary" />
                <span>{t('Support & Contact', 'المساعدة والتواصل')}</span>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {t('WhatsApp / Info', 'واتساب / معلومات')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenAccount();
              }}
              className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-md border border-border/60 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <User size={16} className="text-primary" />
                <span>{t('Account & Studio Access', 'الحساب ودخول الاستوديو')}</span>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {t('Lookup / Admin', 'استعلام / إدارة')}
              </span>
            </button>
          </div>
        </div>

        {/* Footer controls: Cart, Language Toggle, and Studio Specs */}
        <div className="pt-4 border-t border-border/40 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenCart();
              }}
              className="flex items-center justify-center gap-2 min-h-[46px] p-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <ShoppingBag size={16} />
              <span>{t('Order', 'الطلب')}</span>
              <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded text-[11px] font-mono">
                {cart.length}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center justify-center gap-2 min-h-[46px] p-2.5 rounded-md border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              <Globe size={16} />
              <span>{ar ? 'English' : 'العربية'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {t('Jubail, Saudi Arabia', 'الجبيل، المملكة العربية السعودية')}
            </span>
            <span>Ender-3 V3 SE</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
