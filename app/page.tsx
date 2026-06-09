"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import Sidebar, { DashboardTab } from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// Dashboard panels
import NetWorthCard from "@/components/NetWorthCard";
import CashFlowCard from "@/components/CashFlowCard";
import BudgetBreakdownCard from "@/components/BudgetBreakdownCard";
import ReferralCard from "@/components/ReferralCard";
import SpendingCard from "@/components/SpendingCard";
import PortfolioCard from "@/components/PortfolioCard";

import CryptoPanel from "@/components/CryptoPanel";
import StocksPanel from "@/components/StocksPanel";
import SignalsPanel from "@/components/SignalsPanel";
import NewsPanel from "@/components/NewsPanel";

import {
  ChevronRight,
  Edit2,
  Loader2,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useThemeAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Market Terminal Toggle State
  const [marketType, setMarketType] = useState<"crypto" | "stocks">("crypto");

  // Mount effect to avoid hydration errors with Recharts & Lightweight Charts
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            {/* LEFT COLUMN: Net Worth, Markets Terminal, Cashflow, Budget */}
            <div className="space-y-6 lg:col-span-2">
              <NetWorthCard isMounted={isMounted} />

              {/* COHESIVE TRADING TERMINAL WIDGET */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green/15 text-brand-green">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Terminal Transaksi ArthaVerse</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Analisis instrumen pasar finansial secara real-time</p>
                    </div>
                  </div>

                  {/* Crypto / Stock Selector Tab Group */}
                  <div className="flex rounded-lg border border-border bg-background p-1 text-xs font-bold">
                    <button
                      onClick={() => setMarketType("crypto")}
                      className={`rounded-md px-4 py-1.5 transition select-none cursor-pointer ${marketType === "crypto"
                        ? "bg-brand-green text-white"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Kripto (Crypto)
                    </button>
                    <button
                      onClick={() => setMarketType("stocks")}
                      className={`rounded-md px-4 py-1.5 transition select-none cursor-pointer ${marketType === "stocks"
                        ? "bg-brand-green text-white"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
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
                    {marketType === "crypto" ? <CryptoPanel /> : <StocksPanel />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Cash Flow vs Budget Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CashFlowCard isMounted={isMounted} />
                <BudgetBreakdownCard isMounted={isMounted} />
              </div>
            </div>

            {/* RIGHT COLUMN: CNBC Indonesia News feed & Personal Wealth stats */}
            <div className="space-y-6 flex flex-col lg:max-h-[1600px]">

              {/* CNBC Indonesia news feed component */}
              <div className="bg-card rounded-2xl border border-border p-4 shadow-sm h-[550px] flex flex-col overflow-hidden">
                <NewsPanel />
              </div>

              {/* CHECKLIST: Get your money's worth */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="relative flex items-center justify-center h-12 w-12 rounded-full border-4 border-brand-green/20">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-green border-r-transparent border-b-transparent animate-spin-slow" />
                    <span className="text-xs font-bold text-foreground">1/6</span>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Get your money's worth</h4>
                    <p className="mt-0.5 text-xs text-foreground font-semibold">Selesaikan pembuatan profil ArthaVerse</p>
                  </div>

                  <ChevronRight className="h-4.5 w-4.5 text-muted-foreground self-center" />
                </div>
              </div>

              <ReferralCard />
              <SpendingCard isMounted={isMounted} />
              <PortfolioCard isMounted={isMounted} />
            </div>
          </motion.div>
        );
      case "crypto":
        return (
          <motion.div
            key="crypto"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <CryptoPanel />
          </motion.div>
        );
      case "stocks":
        return (
          <motion.div
            key="stocks"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <StocksPanel />
          </motion.div>
        );
      case "signals":
        return (
          <motion.div
            key="signals"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 mt-16">
          <AnimatePresence mode="wait">
            {renderPanelContent()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
