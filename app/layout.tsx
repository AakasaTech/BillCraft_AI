import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BillCraft AI — Intelligent Billing for Modern Businesses',
    template: '%s | BillCraft AI',
  },
  description:
    'Smarter Billing. Stronger Business. AI-powered invoicing for freelancers and agencies.',
  keywords: ['invoicing', 'AI', 'freelancer', 'billing', 'invoice generator'],
  icons: {
    icon: [
      { url: '/favicon.ico',        sizes: 'any' },
      { url: '/favicon-16x16.png',  sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png',  sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png' },
    other: [{ rel: 'manifest', url: '/site.webmanifest' }],
  },
  openGraph: {
    type:    'website',
    locale:  'en_US',
    url:     process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'BillCraft AI',
    images:  [{ url: '/android-chrome-512x512.png', width: 512, height: 512 }],
  },
  twitter: {
    card:   'summary_large_image',
    images: ['/android-chrome-512x512.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
