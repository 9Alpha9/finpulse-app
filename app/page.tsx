"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import Sidebar, { DashboardTab } from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// Dashboard panels
import ReferralCard from "@/components/ReferralCard";
import SpendingCard from "@/components/SpendingCard";
import PortfolioCard from "@/components/PortfolioCard";

import CryptoPanel from "@/components/CryptoPanel";
import StocksPanel from "@/components/StocksPanel";
import SignalsPanel from "@/components/SignalsPanel";
import NewsPanel from "@/components/NewsPanel";
import TechnicalsGauge, { KlineBasic } from "@/components/TechnicalsGauge";
import PortfolioWatchlistPanel from "@/components/PortfolioWatchlistPanel";
import GoldPanel from "@/components/GoldPanel";
import MarketScreener from "@/components/MarketScreener";
import StockMarketScreener from "@/components/StockMarketScreener";
import EconomicCalendar from "@/components/EconomicCalendar";
import BottomNav from "@/components/BottomNav";
import ProfilePanel from "@/components/ProfilePanel";
import MarketMarquee from "@/components/MarketMarquee";
import ForexPanel from "@/components/ForexPanel";

import {
  ChevronRight,
  Loader2,
  TrendingUp,
  Activity,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Technicals section: fetches klines for active symbol and renders gauge
// ─────────────────────────────────────────────────────────────────────────────

function TechnicalsSection({ marketType }: { marketType: "crypto" | "stocks" }) {
  const [klines, setKlines] = useState<KlineBasic[]>([]);
  const [symbol, setSymbol] = useState(marketType === "crypto" ? "BTCUSDT" : "IHSG");
  const [loading, setLoading] = useState(false);

  // Sync symbol default when marketType changes
  useEffect(() => {
    setSymbol(marketType === "crypto" ? "BTCUSDT" : "IHSG");
  }, [marketType]);

  // Fetch klines for the active symbol
  useEffect(() => {
    let active = true;
    async function fetchKlines() {
      // Prevent race condition fetches during tab transition
      if (marketType === "crypto" && symbol === "IHSG") return;
      if (marketType === "stocks" && symbol.includes("USDT")) return;

      setLoading(true);
      try {
        if (marketType === "crypto") {
          const res = await fetch(`/api/crypto/klines?symbol=${symbol}&interval=1d&limit=200`);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data: any[] = await res.json();
          const klineArr: KlineBasic[] = data.map((k: any) => ({
            time: Math.floor(Number(Array.isArray(k) ? k[0] : k.time) / 1000),
            open: parseFloat(Array.isArray(k) ? k[1] : k.open),
            high: parseFloat(Array.isArray(k) ? k[2] : k.high),
            low: parseFloat(Array.isArray(k) ? k[3] : k.low),
            close: parseFloat(Array.isArray(k) ? k[4] : k.close),
          }));
          if (active) setKlines(klineArr);
        } else {
          let ticker = symbol;
          if (symbol === "IHSG") {
            ticker = "^JKSE";
          } else if (!symbol.endsWith(".JK")) {
            ticker = `${symbol}.JK`;
          }
          const res = await fetch(`/api/stocks?symbol=${ticker}&interval=1d`);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          if (active) setKlines(data.klines ?? []);
        }
      } catch (e) {
        console.warn("[TechnicalsSection] fetch error:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchKlines();
    return () => { active = false; };
  }, [symbol, marketType]);

  const symbolDisplay = symbol.replace("USDT", "");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-500">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Analisis Teknikal
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              RSI · MACD · MA Cross · Stochastic · Bollinger · Volume
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          {marketType === "crypto" ? "Kripto" : "IDX Saham"} ·&nbsp;
          <span className="text-foreground font-bold">{symbolDisplay}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          Menghitung indikator teknikal...
        </div>
      ) : (
        <TechnicalsGauge klines={klines} symbol={symbolDisplay} market={marketType} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useThemeAuth();

  // State untuk mengontrol visibilitas BottomNav
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Referensi untuk auto-scroll ke atas
  const mainScrollRef = useRef<HTMLElement>(null);

  // Market Terminal Toggle State
  const [marketType, setMarketType] = useState<"crypto" | "stocks">("crypto");

  useEffect(() => { setIsMounted(true); }, []);

  // Efek untuk reset scroll ke atas saat ganti tab
  useEffect(() => {
    const resetScroll = () => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    };

    // Reset langsung saat klik tab (agar animasi transition dimulai dari atas)
    resetScroll();

    // Reset kembali setelah transition selesai (300ms) dan tab baru termuat
    const timer = setTimeout(resetScroll, 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  // Render active panel view
  const renderPanelContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <motion.div key="profile" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center gap-3 mb-6 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-foreground tracking-tight uppercase">Pengaturan Profil</h1>
                <p className="text-xs text-muted-foreground">Kelola akun dan preferensi langganan kamu</p>
              </div>
            </div>
            <ProfilePanel />
          </motion.div>
        );
      case "overview":
        return (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {/* LEFT COLUMN */}
            <div className="space-y-6 lg:col-span-2">
              <MarketMarquee marketType={marketType} />

              {/* TRADING TERMINAL WIDGET */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green/15 text-brand-green">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Terminal Transaksi FinPulse</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Analisis instrumen pasar finansial secara real-time</p>
                    </div>
                  </div>

                  <div className="flex rounded-lg border border-border bg-background p-1 text-xs font-bold">
                    <button
                      onClick={() => setMarketType("crypto")}
                      className={`rounded-md px-4 py-1.5 transition select-none cursor-pointer ${marketType === "crypto" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Kripto (Crypto)
                    </button>
                    <button
                      onClick={() => setMarketType("stocks")}
                      className={`rounded-md px-4 py-1.5 transition select-none cursor-pointer ${marketType === "stocks" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Saham (IDX)
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={marketType}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* PASTIKAN onOpenChange ADA DI SINI */}
                    {marketType === "crypto" ? (
                      <CryptoPanel onOpenChange={setIsPopupOpen} hideMarquee={true} />
                    ) : (
                      <StocksPanel onOpenChange={setIsPopupOpen} hideMarquee={true} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* TECHNICALS GAUGE */}
              {isMounted && <TechnicalsSection marketType={marketType} />}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6 flex flex-col lg:max-h-full">
              <ForexPanel />
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm h-[550px] flex flex-col overflow-hidden">
                <NewsPanel />
              </div>
              {marketType === "crypto" ? <MarketScreener /> : <StockMarketScreener />}
              <EconomicCalendar />
            </div>
          </motion.div>
        );

      case "crypto":
        return (
          <motion.div key="crypto"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}>
            <CryptoPanel onOpenChange={setIsPopupOpen} />
          </motion.div>
        );

      case "stocks":
        return (
          <motion.div key="stocks"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}>
            <StocksPanel onOpenChange={setIsPopupOpen} />
          </motion.div>
        );

      case "gold":
        return (
          <motion.div key="gold"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}>
            <GoldPanel onOpenChange={setIsPopupOpen} />
          </motion.div>
        );

      case "portfolio":
        return (
          <motion.div key="portfolio" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-foreground">Portfolio & Watchlist</h1>
                  <p className="text-xs text-muted-foreground">Lacak investasi dan pantau aset favorit kamu</p>
                </div>
              </div>
              <PortfolioWatchlistPanel />
            </div>
          </motion.div>
        );

      case "signals":
        return (
          <motion.div key="signals" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
            <SignalsPanel />
          </motion.div>
        );

      case "news":
        return (
          <motion.div
            key="news"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto h-[750px] flex flex-col"
          >
            <NewsPanel />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 lg:ml-64 w-full">
        {/* Topbar navigation */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Dashboard Content */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 mt-16 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            {renderPanelContent()}
          </AnimatePresence>
        </main>
      </div>

      {/* ── BOTTOM NAVIGATION (KHUSUS MOBILE) ── */}
      {/* PERBAIKAN UTAMA: Tambahkan isVisible={!isPopupOpen} agar 
        BottomNav bersembunyi saat menu timeframe/koin ditekan 
      */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setSidebarOpen(true)}
        isVisible={!isPopupOpen}
      />
    </div>
  );
}