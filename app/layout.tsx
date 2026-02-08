import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ClerkProviderWrapper } from "@/components/auth/clerk-provider-wrapper";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { MainNav } from "@/components/navigation/main-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoulPlay - Real-time Social Card Games",
  description: "Play interactive card-based games with friends in real-time",
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
              <MainNav />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}
