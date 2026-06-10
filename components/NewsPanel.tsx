"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  Newspaper,
  Loader2,
  RefreshCw,
  Globe,
  TrendingUp,
  Bitcoin,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NewsItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  source: string;
  region: string;
  lang: string;
  category: "crypto" | "stocks" | "macro";
  sentiment: "positive" | "negative" | "neutral";
}

type FilterTab = "all" | "crypto" | "stocks" | "macro" | "global" | "id";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Semua", icon: <Newspaper className="h-3 w-3" /> },
  { key: "crypto", label: "Crypto", icon: <Bitcoin className="h-3 w-3" /> },
  { key: "stocks", label: "Saham", icon: <BarChart2 className="h-3 w-3" /> },
  { key: "macro", label: "Makro", icon: <TrendingUp className="h-3 w-3" /> },
  { key: "global", label: "Global", icon: <Globe className="h-3 w-3" /> },
  { key: "id", label: "Indonesia", icon: <span className="text-[9px] font-bold">ID</span> },
];

// Source → colour pill mapping
const SOURCE_COLORS: Record<string, string> = {
  "CNBC Indonesia": "bg-red-500/10 text-red-400",
  "Kontan": "bg-orange-500/10 text-orange-400",
  "CoinDesk": "bg-amber-500/10 text-amber-400",
  "CoinTelegraph": "bg-yellow-500/10 text-yellow-500",
  "Decrypt": "bg-purple-500/10 text-purple-400",
  "Reuters Business": "bg-blue-500/10 text-blue-400",
  "Investing.com": "bg-emerald-500/10 text-emerald-400",
  "MarketWatch": "bg-cyan-500/10 text-cyan-400",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function friendlyDate(pubDate: string) {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  return (
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
    ", " +
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async (filter: FilterTab = activeFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?filter=${filter}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.items?.length) throw new Error("Tidak ada berita");
      setNews(data.items);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("[NewsPanel]", err);
      setError("Gagal memuat berita. Coba refresh.");
      // Minimal fallback agar panel tidak kosong
      setNews([
        {
          guid: "fb-1",
          title: "Bitcoin Holds Near $68K as Macro Uncertainty Lingers",
          link: "https://www.coindesk.com",
          pubDate: new Date().toISOString(),
          description:
            "Bitcoin consolidates around the $68,000 range as global macro headwinds and upcoming Fed minutes keep traders cautious.",
          source: "CoinDesk",
          region: "global",
          lang: "en",
          category: "crypto",
          sentiment: "neutral",
        },
        {
          guid: "fb-2",
          title: "IHSG Ditutup Menguat Ditopang Sentimen Suku Bunga BI",
          link: "https://www.cnbcindonesia.com/market",
          pubDate: new Date().toISOString(),
          description:
            "IHSG mencatatkan penguatan tipis seiring investor menyerap sinyal stabilitas makroekonomi domestik dan potensi pelonggaran suku bunga BI.",
          source: "CNBC Indonesia",
          region: "id",
          lang: "id",
          category: "stocks",
          sentiment: "positive",
        },
        {
          guid: "fb-3",
          title: "Federal Reserve Minutes Hint at Fewer Rate Cuts in 2025",
          link: "https://feeds.reuters.com/reuters/businessNews",
          pubDate: new Date().toISOString(),
          description:
            "Fed officials expressed caution about cutting rates too quickly, pointing to persistent core inflation readings and a resilient labor market.",
          source: "Reuters Business",
          region: "global",
          lang: "en",
          category: "macro",
          sentiment: "negative",
        },
        {
          guid: "fb-4",
          title: "Ethereum ETF Inflows Hit Record $800M in Single Week",
          link: "https://cointelegraph.com",
          pubDate: new Date().toISOString(),
          description:
            "Spot Ethereum ETFs recorded their largest weekly inflow since launch, driven by institutional demand and bullish on-chain metrics.",
          source: "CoinTelegraph",
          region: "global",
          lang: "en",
          category: "crypto",
          sentiment: "positive",
        },
        {
          guid: "fb-5",
          title: "S&P 500 Edges Higher on Tech Earnings Optimism",
          link: "https://feeds.marketwatch.com/marketwatch/topstories/",
          pubDate: new Date().toISOString(),
          description:
            "Equity markets advanced as major technology companies reported better-than-expected quarterly earnings, lifting broad market indices.",
          source: "MarketWatch",
          region: "global",
          lang: "en",
          category: "stocks",
          sentiment: "positive",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  // Initial fetch
  useEffect(() => {
    fetchNews(activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 flex flex-col h-full">

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground tracking-tight">
                Global Market News
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {lastUpdated
                  ? `Diperbarui ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                  : "8 sumber berita global & Indonesia"}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchNews(activeFilter)}
            disabled={isLoading}
            title="Refresh berita"
            className="p-2 hover:bg-secondary rounded-lg transition text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer select-none ${activeFilter === tab.key
                ? "bg-brand-green text-white shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 text-xs leading-relaxed shrink-0">
          ⚠️ {error}
        </div>
      )}

      {/* News List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col h-48 items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            <span className="text-xs font-semibold">Mengambil berita dari berbagai sumber...</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {news.map((item, i) => (
              <motion.div
                key={item.guid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-muted-foreground/30 transition duration-150 flex flex-col gap-2"
              >
                {/* Top row: badges + date */}
                <div className="flex flex-wrap items-center gap-1.5">

                  {/* Source pill */}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${SOURCE_COLORS[item.source] ?? "bg-slate-500/10 text-slate-400"
                    }`}>
                    {item.source}
                  </span>

                  {/* Category pill */}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.category === "crypto"
                    ? "bg-amber-500/10 text-amber-500"
                    : item.category === "stocks"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-blue-500/10 text-blue-400"
                    }`}>
                    {item.category === "crypto" ? "Crypto" : item.category === "stocks" ? "Saham" : "Makro"}
                  </span>

                  {/* Sentiment dot */}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.sentiment === "positive"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : item.sentiment === "negative"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-slate-500/10 text-slate-400"
                    }`}>
                    {item.sentiment === "positive" ? "↑ bullish" : item.sentiment === "negative" ? "↓ bearish" : "◦ netral"}
                  </span>

                  {/* Region flag */}
                  <span className="text-[9px] text-muted-foreground/60 font-semibold ml-auto">
                    {item.region === "id" ? "🇮🇩" : "🌐"} {friendlyDate(item.pubDate)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs font-extrabold text-foreground leading-snug hover:text-brand-green transition line-clamp-2">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-0.5">
                  <span className="text-[9px] text-muted-foreground font-bold font-mono tracking-wider opacity-60">
                    {item.lang === "en" ? "EN" : "ID"} • {item.source}
                  </span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[10px] font-extrabold text-brand-green hover:underline cursor-pointer group"
                  >
                    <span>BACA</span>
                    <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-150" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
