'use client';

import { useState, useEffect } from 'react';
import { PageLink as Link } from './PageLink';
import { Direction } from 'radix-ui';
import { WebTools } from './WebTools';
import { MaterialWorld } from './MaterialWorld';
import {
  products as initialProducts,
  materials as initialMaterials,
  colors as initialColors,
  qualityOptions as initialProfiles,
  type Product,
  type Material,
} from '@/lib/catalog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from 'sonner';
import {
  MakeFlow,
  CatalogFlow,
  TrackingFlow,
  CheckoutFlow,
  AboutFlow,
  AdminFlow,
  CartContents,
  request,
  type CartItem,
} from './Flows';
import ObjectCinema from './ObjectCinema';
import { SiteHeader } from './SiteHeader';
import { SupportModal } from './SupportModal';
import { AccountModal } from './AccountModal';
import { MobileNavDrawer } from './MobileNavDrawer';

export default function Storefront({ route = 'home' }: { route?: string }) {
  const [ar, setAr] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [materials, setMaterials] = useState(initialMaterials);
  const [categories, setCategories] = useState([
    'All',
    'Desk setup',
    'Room',
    'Useful',
    'Gifts',
    'Miniatures',
  ]);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [slicingAvailable, setSlicingAvailable] = useState(false);
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportOrderId, setSupportOrderId] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serviceError, setServiceError] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setAr(localStorage.getItem('forma-language') === 'ar');
        const legacy: Record<string, string> = {
          cloud: 'white',
          sea: 'blue',
          sage: 'grey',
          coral: 'red',
          charcoal: 'black',
        };
        const draft = JSON.parse(sessionStorage.getItem('forma-draft') ?? '[]');
        if (Array.isArray(draft)) {
          setCartState(
            draft.map((item: CartItem) => ({
              ...item,
              config: {
                ...item.config,
                color: legacy[item.config.color] ?? item.config.color,
              },
            }))
          );
        }
      } catch {}
    });

    let alive = true;
    void request<{
      products: Product[];
      materials: Material[];
      categories: string[];
      profiles: typeof initialProfiles;
      slicingAvailable: boolean;
    }>('/api/catalog')
      .then((d) => {
        if (alive) {
          setProducts(d.products);
          setMaterials(d.materials);
          setCategories(d.categories);
          setProfiles(d.profiles);
          setSlicingAvailable(d.slicingAvailable);
          setServiceError('');
        }
      })
      .catch((e) => {
        if (alive) setServiceError((e as Error).message);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = ar ? 'ar' : 'en';
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
  }, [ar]);

  const toggleLanguage = () => {
    const nextAr = !ar;
    setAr(nextAr);
    localStorage.setItem('forma-language', nextAr ? 'ar' : 'en');
  };

  const setCart = (items: CartItem[]) => {
    setCartState(items);
    sessionStorage.setItem(
      'forma-draft',
      JSON.stringify(items.map(({ file, ...rest }) => {
        void file;
        return rest;
      }))
    );
  };

  const addItem = (item: CartItem) => {
    if (cart.length >= 12) { toast.error(ar ? 'الحد الأقصى ١٢ قطعة مختلفة لكل طلب.' : 'You can add up to 12 different objects per order.'); return; }
    setCart([...cart, item]);
    setCartOpen(true);
    toast.success(ar ? 'أُضيف إلى طلبك' : 'Added to your order');
  };

  const palette = [
    ...new Map(
      [...initialColors, ...materials.flatMap((m) => m.swatches ?? [])].map((c) => [c.id, c])
    ).values(),
  ];

  const shared = {
    onOpenSupport: (orderId?: string) => { setSupportOrderId(orderId ?? ''); setSupportOpen(true); },
    onOpenAccount: () => setAccountOpen(true),
    ar,
    products,
    materials,
    categories,
    cart,
    setCart,
    addItem,
    profiles,
    slicingAvailable,
    palette,
  };

  const t = (en: string, arabic: string) => (ar ? arabic : en);

  return (
    <MaterialWorld route={route}>
      <Direction.Provider dir={ar ? 'rtl' : 'ltr'}>
        <TooltipProvider delayDuration={200}>
          <WebTools />
          <div
            className={`site-root route-${route}`}
            lang={ar ? 'ar' : 'en'}
            dir={ar ? 'rtl' : 'ltr'}
          >
            <a className="skip-link" href="#main">
              {t('Skip to content', 'انتقل للمحتوى')}
            </a>
            <div className="site-shell">
              {/* Modernized Site Header with Clean Nav, Support & Account Triggers */}
              <SiteHeader
                ar={ar}
                route={route}
                cart={cart}
                onOpenCart={() => setCartOpen(true)}
                onOpenSupport={() => { setSupportOrderId(''); setSupportOpen(true); }}
                onOpenAccount={() => setAccountOpen(true)}
                onOpenMobileMenu={() => setMobileMenuOpen(true)}
                onToggleLanguage={toggleLanguage}
                menuOpen={mobileMenuOpen}
              />

              <main id="main">
                {serviceError && (
                  <div className="service-warning" role="status">
                    {t(
                      'The studio is offline. Try again shortly.',
                      'الاستوديو غير متصل. حاول مجددًا قريبًا.'
                    )}
                  </div>
                )}
                {route === 'home' && <ObjectCinema {...shared} />}
                {route === 'make' && <MakeFlow {...shared} />}
                {route === 'shop' && <CatalogFlow {...shared} />}
                {route === 'track' && <TrackingFlow {...shared} />}
                {route === 'checkout' && <CheckoutFlow {...shared} />}
                {route === 'about' && <AboutFlow {...shared} />}
                {route === 'admin' && <AdminFlow {...shared} />}
              </main>

              <footer>
                <Link className="footer-brand brand-wordmark" href="/">
                  <span className="brand-logotype">
                    FORMA<sup className="brand-sup">3D</sup>
                  </span>
                  <span className="footer-tagline">
                    {t('From file to thing.', 'من ملف إلى قطعة.')}
                  </span>
                </Link>
                <div className="footer-provenance">
                  <span>
                    {t(
                      '3D Printing Studio · Jubail, Saudi Arabia',
                      'استوديو طباعة ثلاثية الأبعاد · الجبيل، السعودية'
                    )}
                  </span>
                  <span className="footer-meta">
                    © {new Date().getFullYear()} Forma3D ·{' '}
                    {t(
                      'Creality Ender-3 V3 SE · 220×220×250 mm',
                      'كرياليتي إندر-٣ · ٢٢٠×٢٢٠×٢٥٠ مم'
                    )}
                  </span>
                </div>
                <div className="footer-nav">
                  <button
                    type="button"
                    onClick={() => { setSupportOrderId(''); setSupportOpen(true); }}
                    className="footer-link-btn"
                  >
                    {t('Support', 'المساعدة')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountOpen(true)}
                    className="footer-link-btn"
                  >
                    {t('Sign In', 'دخول')}
                  </button>
                  <Link href="/about">{t('About', 'عن الاستوديو')}</Link>
                  <Link href="/admin">{t('Studio access', 'دخول الاستوديو')}</Link>
                </div>
              </footer>
            </div>

            {/* Cart Sheet */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetContent
                side={ar ? 'left' : 'right'}
                className="cart-sheet"
                dir={ar ? 'rtl' : 'ltr'}
              >
                <SheetTitle>{t('Your next objects.', 'قطعك القادمة.')}</SheetTitle>
                <SheetDescription>
                  {t('Choose it. Shape it. We’ll print it.', 'اخترها وصممها. ونحن نطبعها.')}
                </SheetDescription>
                <CartContents {...shared} />
              </SheetContent>
            </Sheet>

            {/* Support Modal */}
            <SupportModal open={supportOpen} onOpenChange={setSupportOpen} ar={ar} initialOrderId={supportOrderId} />

            {/* Account / Sign In Modal */}
            <AccountModal open={accountOpen} onOpenChange={setAccountOpen} ar={ar} />

            {/* Mobile Navigation Drawer */}
            <MobileNavDrawer
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
              ar={ar}
              onToggleLanguage={toggleLanguage}
              route={route}
              cart={cart}
              onOpenCart={() => setCartOpen(true)}
              onOpenSupport={() => { setSupportOrderId(''); setSupportOpen(true); }}
              onOpenAccount={() => setAccountOpen(true)}
            />

            <Toaster position="bottom-center" />
          </div>
        </TooltipProvider>
      </Direction.Provider>
    </MaterialWorld>
  );
}
