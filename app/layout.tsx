import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeAuthProvider } from "@/app/context/ThemeAuthContext";
import { StockPriceProvider } from "@/app/context/StockPriceContext";

const cabinetGrotesk = localFont({
  src: [
    {
      path: "./fonts/CabinetGrotesk/CabinetGrotesk-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
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
      lang="id"
      className={`${cabinetGrotesk.variable} font-sans h-full antialiased`}
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
