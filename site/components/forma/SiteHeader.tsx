'use client';

import { PageLink as Link } from './PageLink';
import {
  HelpCircle,
  User,
  ShoppingBag,
  Menu,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import type { CartItem } from './Flows';

interface SiteHeaderProps {
  ar: boolean;
  route: string;
  cart: CartItem[];
  onOpenCart: () => void;
  onOpenSupport: () => void;
  onOpenAccount: () => void;
  onOpenMobileMenu: () => void;
  onToggleLanguage: () => void;
}

export function SiteHeader({
  ar,
  route,
  cart,
  onOpenCart,
  onOpenSupport,
  onOpenAccount,
  onOpenMobileMenu,
  onToggleLanguage,
}: SiteHeaderProps) {
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  return (
    <header className="site-header" role="banner">
      {/* Brand Logotype */}
      <Link className="brand brand-wordmark" href="/" aria-label="Forma3D">
        <span className="brand-logotype">
          {ar ? 'فورما' : 'FORMA'}
          <sup className="brand-sup">3D</sup>
        </span>
        <span className="brand-origin">{ar ? 'الجبيل' : 'JUBAIL'}</span>
      </Link>

      {/* Desktop Main Navigation */}
      <nav className="site-nav" aria-label={t('Main navigation', 'التنقل الرئيسي')}>
        <Link
          className="nav-link"
          aria-current={route === 'shop' ? 'page' : undefined}
          href="/objects"
        >
          {t('Objects', 'القطع')}
        </Link>
        <Link
          className="nav-link"
          aria-current={route === 'make' ? 'page' : undefined}
          href="/lab"
        >
          {t('Lab', 'المختبر')}
        </Link>
        <Link
          className="nav-link"
          aria-current={route === 'track' ? 'page' : undefined}
          href="/track"
        >
          {t('Track', 'تتبع')}
        </Link>
        <Link
          className="nav-link"
          aria-current={route === 'about' ? 'page' : undefined}
          href="/about"
        >
          {t('About', 'عن الاستوديو')}
        </Link>
      </nav>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Support Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="header-action-button support-trigger"
              onClick={onOpenSupport}
              aria-label={t('Support and contact', 'المساعدة والتواصل')}
            >
              <HelpCircle size={16} />
              <span className="action-label">{t('Support', 'مساعدة')}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t('Studio assistance, payment & print specs', 'مساعدة الاستوديو، الدفع ومواصفات الطباعة')}
          </TooltipContent>
        </Tooltip>

        {/* Account / Sign In Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="header-action-button account-trigger"
              onClick={onOpenAccount}
              aria-label={t('Account and sign in', 'الحساب وتسجيل الدخول')}
            >
              <User size={16} />
              <span className="action-label">{t('Account', 'دخول')}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t('Look up orders & studio operator sign in', 'الاستعلام عن الطلبات ودخول إدارة الاستوديو')}
          </TooltipContent>
        </Tooltip>

        {/* Language Switcher */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="language-button"
              onClick={onToggleLanguage}
              aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <span>{ar ? 'EN' : 'عربي'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {ar ? 'Switch language to English' : 'التبديل إلى اللغة العربية'}
          </TooltipContent>
        </Tooltip>

        {/* Order / Cart Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="order-button"
              onClick={onOpenCart}
              aria-label={t(
                `Your order, ${cart.length} item${cart.length === 1 ? '' : 's'}`,
                `طلبك، ${cart.length} قطعة`
              )}
            >
              <ShoppingBag size={15} className="order-icon" />
              <span className="order-text">{t('Order', 'الطلب')}</span>
              <span className="order-counter" aria-hidden="true">
                [{String(cart.length).padStart(2, '0')}]
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t(`View your order (${cart.length} items)`, `عرض محتويات طلبك (${cart.length} قطعة)`)}
          </TooltipContent>
        </Tooltip>

        {/* Mobile Hamburger Trigger */}
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={onOpenMobileMenu}
          aria-label={t('Open navigation menu', 'فتح قائمة التنقل')}
          aria-haspopup="dialog"
        >
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}
