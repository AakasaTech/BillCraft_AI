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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://billcraft.aakasa.dev'),
  title: {
    default:  'BillCraft AI — Intelligent Billing for Modern Businesses',
    template: '%s | BillCraft AI',
  },
  description:
    'BillCraft AI is an AI-powered invoicing and billing platform for freelancers, consultants, and agencies. Create professional invoices instantly, automate payment reminders, track expenses, and get paid faster.',
  keywords: ['invoicing', 'AI invoicing', 'freelancer billing', 'invoice generator', 'billing software'],
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
    type:        'website',
    locale:      'en_US',
    url:         process.env.NEXT_PUBLIC_APP_URL,
    siteName:    'BillCraft AI',
    title:       'BillCraft AI — Intelligent Billing for Modern Businesses',
    description: 'AI-powered invoicing and billing platform for freelancers, consultants, and agencies.',
    images:      [{ url: '/android-chrome-512x512.png', width: 512, height: 512, alt: 'BillCraft AI' }],
  },
  twitter: {
    card:        'summary',
    title:       'BillCraft AI — Intelligent Billing for Modern Businesses',
    description: 'AI-powered invoicing and billing platform for freelancers, consultants, and agencies.',
    images:      ['/android-chrome-512x512.png'],
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
