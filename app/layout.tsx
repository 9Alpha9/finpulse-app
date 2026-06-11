import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeAuthProvider } from "@/app/context/ThemeAuthContext";
import { StockPriceProvider } from "@/app/context/StockPriceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinPulse - Smart Financial Dashboard",
  description: "Manage your portfolio, track expenses, and grow your wealth with FinPulse.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeAuthProvider>
          <StockPriceProvider>
            {children}
          </StockPriceProvider>
        </ThemeAuthProvider>
      </body>
    </html>
  );
}
