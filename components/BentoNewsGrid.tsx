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

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  const diff = Math.floor((now - d.getTime()) / 60000);
  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} mnt lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function SentimentBadge({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
  if (sentiment === "positive") return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
      <TrendingUp className="h-2.5 w-2.5" /> Bullish
    </span>
  );
  if (sentiment === "negative") return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full shrink-0">
      <TrendingDown className="h-2.5 w-2.5" /> Bearish
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full shrink-0">
      <Minus className="h-2.5 w-2.5" /> Netral
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bento News Card
// ─────────────────────────────────────────────────────────────────────────────

function BentoNewsCard({ item, index, isFeatured = false }: { item: NewsItem; index: number; isFeatured?: boolean }) {
  const src = SOURCE_COLORS[item.source] ?? { bg: "bg-slate-500/10", text: "text-slate-400" };
  const cat = CATEGORY_STYLE[item.category];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group rounded-2xl border border-border bg-card hover:border-brand-green/50 hover:shadow-lg hover:shadow-brand-green/5 transition-all duration-300 flex flex-col overflow-hidden ${
        isFeatured ? "md:col-span-2 md:row-span-2" : "col-span-1"
      }`}
    >
      <div className={`p-5 flex flex-col h-full ${isFeatured ? "justify-between" : "justify-start"}`}>
        
        {/* Top Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${src.bg} ${src.text}`}>
            {item.source}
          </span>
          {cat && (
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${cat.cls}`}>
              {cat.label}
            </span>
          )}
          <SentimentBadge sentiment={item.sentiment} />
          <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-medium shrink-0">
            {item.region === "id" ? "🇮🇩" : "🌐"}
            <Clock className="h-3 w-3 ml-0.5" />
            {friendlyDate(item.pubDate)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block font-bold text-foreground leading-tight hover:text-brand-green transition-colors duration-200 mb-2 ${
              isFeatured ? "text-2xl sm:text-3xl line-clamp-3" : "text-base sm:text-lg line-clamp-2"
            }`}
          >
            {item.title}
          </a>
          {item.description && (
            <p className={`text-muted-foreground leading-relaxed ${
              isFeatured ? "text-sm sm:text-base line-clamp-4 mb-6" : "text-xs sm:text-sm line-clamp-3 mb-4"
            }`}>
              {item.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
            {item.lang === "en" ? "EN" : "ID"}
          </span>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-extrabold text-brand-green hover:underline cursor-pointer group/link"
          >
            <span>Baca Selengkapnya</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BentoNewsGrid
// ─────────────────────────────────────────────────────────────────────────────

export default function BentoNewsGrid() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // 1 featured + 6 normal

  const fetchNews = useCallback(async (filter: FilterTab = activeFilter) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(1); // Reset page on filter change
    try {
      const res = await fetch(`/api/news?filter=${filter}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.items?.length) throw new Error("Tidak ada berita");
      setNews(data.items);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("[BentoNewsGrid]", err);
      setError("Gagal memuat berita. Coba refresh.");
      // Fallback Dummy Data
      setNews(Array.from({ length: 25 }, (_, i) => ({
        guid: `fb-${i}`,
        title: `Berita Market Terbaru dan Terhangat ${i + 1}`,
        link: "https://example.com",
        pubDate: new Date(Date.now() - i * 3600000).toISOString(),
        description: "Ini adalah simulasi deskripsi berita yang panjang untuk memastikan desain bento grid bekerja dengan baik pada konten yang membutuhkan lebih banyak ruang teks. Pasar saat ini menunjukkan fluktuasi.",
        source: i % 2 === 0 ? "CNBC Indonesia" : "CoinDesk",
        region: i % 2 === 0 ? "id" : "global",
        lang: i % 2 === 0 ? "id" : "en",
        category: i % 3 === 0 ? "crypto" : i % 3 === 1 ? "stocks" : "macro",
        sentiment: i % 3 === 0 ? "positive" : i % 3 === 1 ? "negative" : "neutral"
      })));
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchNews(activeFilter);
  }, [activeFilter, fetchNews]);

  // Pagination logic
  const totalPages = Math.ceil(news.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = news.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-2">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-white/20 shrink-0">
            <Globe className="h-6 w-6 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
              News Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lastUpdated
                ? `Diperbarui pukul ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                : "Berita pasar finansial global & Indonesia"}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchNews(activeFilter)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-brand-green" : "text-muted-foreground"}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter Pills ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer select-none border ${
              activeFilter === tab.key
                ? "bg-brand-green text-white border-brand-green shadow-md shadow-brand-green/20"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-border/60 w-full" />

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl px-5 py-4 text-sm font-semibold">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      {/* ── Grid Content ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col h-64 items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
          <span className="text-sm font-semibold">Memuat berita...</span>
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-col h-64 items-center justify-center gap-3 text-muted-foreground">
          <Newspaper className="h-10 w-10 opacity-30" />
          <span className="text-sm">Tidak ada berita ditemukan</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
            <AnimatePresence mode="popLayout">
              {currentItems.map((item, i) => (
                <BentoNewsCard 
                  key={item.guid} 
                  item={item} 
                  index={i} 
                  isFeatured={i === 0 && currentPage === 1} // Only feature the first item on the first page
                />
              ))}
            </AnimatePresence>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-border/40">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={`cursor-pointer ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                  
                  {/* Simplistic pagination display for demo */}
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={`cursor-pointer ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

    </div>
  );
}
