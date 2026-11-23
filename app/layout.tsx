import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ClerkProviderWrapper } from "@/components/auth/clerk-provider-wrapper";
import { AgeGateProvider } from "@/components/auth/age-gate-provider";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { DomainAwareNav } from "@/components/navigation/domain-aware-nav";
import { DomainAwareFooter } from "@/components/navigation/domain-aware-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  applicationName: "FoulPlay",
  title: "FoulPlay - Real-time Social Card Games",
  description: "Play interactive card-based games with friends in real-time",
  appleWebApp: {
    capable: true,
    title: "FoulPlay",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-new.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "FoulPlay - Real-time Social Card Games",
    description: "Play interactive card-based games with friends in real-time",
    images: [
      {
        url: `${baseUrl}/social-branding.png`,
        width: 1200,
        height: 630,
        alt: "FoulPlay - Real-time Social Card Games",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoulPlay - Real-time Social Card Games",
    description: "Play interactive card-based games with friends in real-time",
    images: [`${baseUrl}/social-branding.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProviderWrapper>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <AgeGateProvider>
                <div className="min-h-screen flex flex-col">
                  <DomainAwareNav />
                  <main className="flex-1 min-h-0 flex flex-col">
                    {children}
                  </main>
                  <DomainAwareFooter />
                </div>
              </AgeGateProvider>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}
