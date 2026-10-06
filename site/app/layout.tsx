import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
  'https://forma3d-jubail.rasheelkhan545.chatgpt.site';

const description =
  'A digital material lab. Explore printed forms, upload your STL or 3MF, and make a physical object in Jubail.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Forma3D — Material World',
  description,
  applicationName: 'Forma3D',
  keywords: [
    'Forma3D',
    '3D printing',
    'Jubail',
    'Saudi Arabia',
    'STL',
    '3MF',
    'PLA',
    'custom prints',
  ],
  authors: [{ name: 'Forma3D Studio' }],
  creator: 'Forma3D Studio',
  publisher: 'Forma3D Studio',
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  manifest: '/site.webmanifest',
  appleWebApp: { capable: true, title: 'Forma3D', statusBarStyle: 'default' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Forma3D',
    title: 'Forma3D — Material World',
    description,
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
    images: [
      {
        url: '/studio-sky.webp',
        width: 1586,
        height: 992,
        alt: 'Printed forms from the Forma3D studio in Jubail',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forma3D — Material World',
    description,
    images: ['/studio-sky.webp'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efeee8' },
    { media: '(prefers-color-scheme: dark)', color: '#24251f' },
  ],
};

// Storefront updates documentElement.lang/dir on language change; mirror the
// saved preference before first paint so Arabic loads without a direction flash.
const languageSync = `try{if(localStorage.getItem('forma-language')==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/k3kQo8UDI-1M0wlSfdnoLg.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfQ.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: languageSync }} />
      </head>
      <body>
        <noscript>
          <div className="noscript-notice">
            Forma3D&apos;s 3D material lab needs JavaScript to run. Please enable
            JavaScript and reload. · يحتاج مختبر المواد من فورما ثري دي إلى تفعيل
            جافاسكربت. يرجى التفعيل وإعادة التحميل.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
