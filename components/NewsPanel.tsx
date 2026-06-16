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
  Clock,
  TrendingDown,
  Minus,
  AlertCircle,
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
  { key: "id", label: "Indonesia", icon: <span className="text-[9px] font-bold leading-none">ID</span> },
];

// Source accent colours
const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  "CNBC Indonesia": { bg: "bg-red-500/10", text: "text-red-400" },
  "Kontan": { bg: "bg-orange-500/10", text: "text-orange-400" },
  "CoinDesk": { bg: "bg-amber-500/10", text: "text-amber-400" },
  "CoinTelegraph": { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  "Decrypt": { bg: "bg-purple-500/10", text: "text-purple-400" },
  "Reuters Business": { bg: "bg-blue-500/10", text: "text-blue-400" },
  "Investing.com": { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "MarketWatch": { bg: "bg-cyan-500/10", text: "text-cyan-400" },
};

const CATEGORY_STYLE: Record<string, { label: string; cls: string }> = {
  crypto: { label: "Crypto", cls: "bg-amber-500/10 text-amber-500" },
  stocks: { label: "Saham", cls: "bg-emerald-500/10 text-emerald-500" },
  macro: { label: "Makro", cls: "bg-blue-500/10 text-blue-400" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function friendlyDate(pubDate: string) {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 60000); // minutes ago
  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} mnt lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function SentimentBadge({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
  if (sentiment === "positive") return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
      <TrendingUp className="h-2.5 w-2.5" />
      Bullish
    </span>
  );
  if (sentiment === "negative") return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
      <TrendingDown className="h-2.5 w-2.5" />
      Bearish
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">
      <Minus className="h-2.5 w-2.5" />
      Netral
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// News Card
// ─────────────────────────────────────────────────────────────────────────────

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const src = SOURCE_COLORS[item.source] ?? { bg: "bg-slate-500/10", text: "text-slate-400" };
  const cat = CATEGORY_STYLE[item.category];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-md hover:shadow-black/5 transition-all duration-200"
    >
      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          {/* Source */}
          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${src.bg} ${src.text}`}>
            {item.source}
          </span>

          {/* Category */}
          {cat && (
            <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cat.cls}`}>
              {cat.label}
            </span>
          )}

          {/* Sentiment */}
          <SentimentBadge sentiment={item.sentiment} />

          {/* Spacer + time */}
          <div className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium shrink-0">
            {item.region === "id" ? "🇮🇩" : "🌐"}
            <Clock className="h-2.5 w-2.5 ml-0.5" />
            {friendlyDate(item.pubDate)}
          </div>
        </div>

        {/* Title */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-bold text-foreground leading-snug hover:text-brand-green transition-colors duration-150 line-clamp-2 mb-1.5 group-hover:text-brand-green"
        >
          {item.title}
        </a>

        {/* Description */}
        {item.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            {item.lang === "en" ? "EN" : "ID"}
          </span>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[10px] font-extrabold text-brand-green hover:underline cursor-pointer group/link"
          >
            <span>Baca Selengkapnya</span>
            <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-150" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NewsPanel
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
      // Fallback Dummy Data jika error
      setNews([
        { guid: "fb-1", title: "Bitcoin Holds Near $68K as Macro Uncertainty Lingers", link: "https://www.coindesk.com", pubDate: new Date().toISOString(), description: "Bitcoin consolidates around the $68,000 range as global macro headwinds and upcoming Fed minutes keep traders cautious.", source: "CoinDesk", region: "global", lang: "en", category: "crypto", sentiment: "neutral" },
        { guid: "fb-2", title: "IHSG Ditutup Menguat Ditopang Sentimen Suku Bunga BI", link: "https://www.cnbcindonesia.com/market", pubDate: new Date().toISOString(), description: "IHSG mencatatkan penguatan tipis seiring investor menyerap sinyal stabilitas makroekonomi domestik dan potensi pelonggaran suku bunga BI.", source: "CNBC Indonesia", region: "id", lang: "id", category: "stocks", sentiment: "positive" },
        { guid: "fb-3", title: "Federal Reserve Minutes Hint at Fewer Rate Cuts in 2025", link: "https://feeds.reuters.com/reuters/businessNews", pubDate: new Date().toISOString(), description: "Fed officials expressed caution about cutting rates too quickly, pointing to persistent core inflation readings and a resilient labor market.", source: "Reuters Business", region: "global", lang: "en", category: "macro", sentiment: "negative" },
        { guid: "fb-4", title: "Ethereum ETF Inflows Hit Record $800M in Single Week", link: "https://cointelegraph.com", pubDate: new Date().toISOString(), description: "Spot Ethereum ETFs recorded their largest weekly inflow since launch, driven by institutional demand and bullish on-chain metrics.", source: "CoinTelegraph", region: "global", lang: "en", category: "crypto", sentiment: "positive" },
        { guid: "fb-5", title: "S&P 500 Edges Higher on Tech Earnings Optimism", link: "https://feeds.marketwatch.com/marketwatch/topstories/", pubDate: new Date().toISOString(), description: "Equity markets advanced as major technology companies reported better-than-expected quarterly earnings, lifting broad market indices.", source: "MarketWatch", region: "global", lang: "en", category: "stocks", sentiment: "positive" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchNews(activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // Kita ubah ketinggian container utama ini menjadi flex agar sisa halamannya menempati tinggi maksimum dengan benar
    <div className="flex flex-col gap-4 h-screen max-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-white/20 shrink-0">
              <Globe className="h-5 w-5 drop-shadow-md" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight leading-tight">
                Market News
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {lastUpdated
                  ? `Diperbarui pukul ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                  : "Berita dari 8 sumber global & Indonesia"}
              </p>
            </div>
          </div>

          {/* Tombol Refresh yang dimodifikasi ukurannya agar lebih pas */}
          <button
            onClick={() => fetchNews(activeFilter)}
            disabled={isLoading}
            title="Refresh berita"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card p-2 sm:px-3 sm:py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 sm:h-3 sm:w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition cursor-pointer select-none border ${activeFilter === tab.key
                ? "bg-brand-green text-white border-transparent shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="h-px bg-border shrink-0" />

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl px-4 py-3 text-xs font-medium shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── News Feed (Scrollable Container) ────────────────────────────────── */}
      {/* PENTING: Tambahkan inline style untuk menyembunyikan scrollbar bawaan browser */}
      <div
        className="flex-1 overflow-y-auto space-y-3 pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          .flex-1::-webkit-scrollbar {
            display: none;
          }
        `}} />

        {isLoading ? (
          <div className="flex flex-col h-48 items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            <span className="text-xs font-semibold">Mengambil berita terbaru...</span>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col h-48 items-center justify-center gap-2 text-muted-foreground">
            <Newspaper className="h-8 w-8 opacity-30" />
            <span className="text-xs">Tidak ada berita ditemukan</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {news.map((item, i) => (
              <NewsCard key={item.guid} item={item} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}