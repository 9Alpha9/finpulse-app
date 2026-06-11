"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  History,
  Activity,
  ChevronDown,
} from "lucide-react";
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Instruments
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldInstrument {
  symbol: string;
  label: string;
  category: "spot" | "etf" | "miner" | "idx";
  currency: "USD" | "IDR";
  unit: string;
  color: string;
}

export const GOLD_INSTRUMENTS: GoldInstrument[] = [
  { symbol: "GC=F", label: "Gold Futures (COMEX)", category: "spot", currency: "USD", unit: "troy oz", color: "bg-amber-500/15 text-amber-500" },
  { symbol: "GLD", label: "SPDR Gold Shares", category: "etf", currency: "USD", unit: "lembar", color: "bg-yellow-500/15 text-yellow-500" },
  { symbol: "IAU", label: "iShares Gold Trust", category: "etf", currency: "USD", unit: "lembar", color: "bg-yellow-600/15 text-yellow-600" },
  { symbol: "SGOL", label: "Aberdeen Gold ETF", category: "etf", currency: "USD", unit: "lembar", color: "bg-amber-400/15 text-amber-400" },
  { symbol: "GLDM", label: "SPDR Gold MiniShares", category: "etf", currency: "USD", unit: "lembar", color: "bg-amber-600/15 text-amber-600" },
  { symbol: "GDX", label: "VanEck Gold Miners", category: "miner", currency: "USD", unit: "lembar", color: "bg-orange-500/15 text-orange-500" },
  { symbol: "GDXJ", label: "Junior Gold Miners", category: "miner", currency: "USD", unit: "lembar", color: "bg-orange-600/15 text-orange-600" },
  { symbol: "GOLD", label: "Barrick Gold Corp", category: "miner", currency: "USD", unit: "lembar", color: "bg-rose-500/15 text-rose-500" },
  { symbol: "NEM", label: "Newmont Corporation", category: "miner", currency: "USD", unit: "lembar", color: "bg-rose-600/15 text-rose-600" },
  { symbol: "AEM", label: "Agnico Eagle Mines", category: "miner", currency: "USD", unit: "lembar", color: "bg-pink-500/15 text-pink-500" },
  { symbol: "ANTM.JK", label: "Antam (IDX: ANTM)", category: "idx", currency: "IDR", unit: "lembar", color: "bg-blue-500/15 text-blue-500" },
  { symbol: "MDKA.JK", label: "Merdeka Copper Gold", category: "idx", currency: "IDR", unit: "lembar", color: "bg-blue-600/15 text-blue-600" },
];

const CATEGORY_LABELS: Record<string, string> = {
  spot: "Spot & Futures",
  etf: "ETF Emas",
  miner: "Saham Tambang",
  idx: "IDX Emas",
};

const TIMEFRAMES = [
  { label: "1H", value: "1d" },
  { label: "1Mgg", value: "1wk" },
  { label: "1Bln", value: "1mo" },
  { label: "3Bln", value: "3mo" },
  { label: "Max", value: "max" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface GoldQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtPrice(price: number, currency: "USD" | "IDR"): string {
  if (currency === "IDR") return `Rp ${price.toLocaleString("id-ID")}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: price < 10 ? 4 : 2 })}`;
}

function getThemeColors(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#111827" : "#ffffff",
    textColor: isDark ? "#94a3b8" : "#374151",
    gridColor: isDark ? "#1f2937" : "#f3f4f6",
    borderColor: isDark ? "#374151" : "#e5e7eb",
  };
}

async function fetchGoldKlines(symbol: string, interval: string): Promise<Kline[]> {
  const encoded = encodeURIComponent(symbol);
  const res = await fetch(`/api/stocks?symbol=${encoded}&interval=${interval}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.klines ?? [];
}

async function fetchGoldQuote(symbol: string): Promise<GoldQuote | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const res = await fetch(`/api/stocks?symbol=${encoded}&interval=1d`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const klines: Kline[] = data.klines ?? [];
    if (klines.length < 2) return null;
    const last = klines[klines.length - 1];
    const prev = klines[klines.length - 2];
    const change = last.close - prev.close;
    const changePercent = prev.close > 0 ? (change / prev.close) * 100 : 0;
    return { symbol, price: last.close, change, changePercent, prevClose: prev.close };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const GOLD_LOGOS: Record<string, string> = {
  "GLD": "https://logo.clearbit.com/ssga.com",
  "IAU": "https://logo.clearbit.com/ishares.com",
  "SGOL": "https://logo.clearbit.com/abrdn.com",
  "GLDM": "https://logo.clearbit.com/ssga.com",
  "GDX": "https://logo.clearbit.com/vaneck.com",
  "GDXJ": "https://logo.clearbit.com/vaneck.com",
  "GOLD": "https://logo.clearbit.com/barrick.com",
  "NEM": "https://logo.clearbit.com/newmont.com",
  "AEM": "https://logo.clearbit.com/agnicoeagle.com",
  "ANTM.JK": "https://logo.clearbit.com/antam.com",
  "MDKA.JK": "https://logo.clearbit.com/merdekacoppergold.com",
};

function GoldIcon({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  const logoUrl = GOLD_LOGOS[symbol];

  if (err || !logoUrl) {
    const cleanSym = symbol.replace("=F", "").replace(".JK", "").slice(0, 3);
    return (
      <div
        className="flex items-center justify-center rounded-xl font-bold text-white bg-slate-500 shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.28, borderRadius: size * 0.25 }}
      >
        {cleanSym}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      onError={() => setErr(true)}
      alt={symbol}
      className="rounded-xl object-contain bg-white p-1 border border-border shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live dot indicator
// ─────────────────────────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeframeDropdown (Mobile Bottom Sheet & Desktop Dropdown)
// ─────────────────────────────────────────────────────────────────────────────

const TimeframeDropdown = ({
  value,
  onChange,
  onOpenChange, // <--- 1. Terima prop ini
}: {
  value: string;
  onChange: (v: string) => void;
  onOpenChange?: (open: boolean) => void; // <--- 2. Definisikan tipe
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = TIMEFRAMES.find((t) => t.value === value);

  // 3. Buat fungsi toggle tersentralisasi
  const toggle = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen); // Kirim sinyal agar BottomNav menghilang
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) toggle(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => toggle(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs sm:text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none min-w-[70px] justify-between"
      >
        <span className="text-amber-500">{selected?.label ?? value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 sm:hidden"
              onClick={() => toggle(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: "100%" }} // 4. Ubah jadi 100% untuk efek slide dari bawah layar
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              // 5. TAMBAHKAN GESTURE SWIPE/DRAG
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 80 || velocity.y > 300) toggle(false);
              }}
              // 6. Z-Index naik jadi 9999
              className="fixed inset-x-0 bottom-0 z-[9999] p-4 sm:p-2 bg-card rounded-t-3xl sm:rounded-xl border-t sm:border border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:mt-1.5 sm:w-60 pb-8 sm:pb-2"
            >
              {/* 7. Grabber Handle untuk visual ditarik */}
              <div className="w-12 h-1.5 bg-secondary-foreground/20 rounded-full mx-auto mb-5 sm:hidden cursor-grab active:cursor-grabbing" />

              {/* 8. Tambahkan pb-16 dan max-h agar lega saat discroll */}
              <div className="mb-2 max-h-[60vh] overflow-y-auto pb-16 scrollbar-thin">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 sm:mb-1">
                  Pilih Rentang Waktu
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-1">
                  {TIMEFRAMES.map((item) => {
                    const isActive = item.value === value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => { onChange(item.value); toggle(false); }}
                        className={`rounded-lg sm:rounded-md py-2.5 sm:py-1.5 text-xs font-semibold transition cursor-pointer select-none text-center ${isActive
                          ? "bg-amber-500 text-white shadow-md sm:shadow-sm shadow-amber-500/30"
                          : "text-foreground bg-secondary/30 sm:bg-transparent hover:bg-secondary"
                          }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GoldTickerBar — Bloomberg-style horizontal scroll strip
// ─────────────────────────────────────────────────────────────────────────────

function GoldTickerBar({
  quotes,
  selected,
  onSelect,
  loading,
}: {
  quotes: Record<string, GoldQuote>;
  selected: string;
  onSelect: (s: string) => void;
  loading: boolean;
}) {
  const categories = ["spot", "etf", "miner", "idx"] as const;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-sym="${selected}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div className="relative select-none ">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 md:w-12 z-10 bg-gradient-to-r from-card to-transparent rounded-l-2xl" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 md:w-12 z-10 bg-gradient-to-l from-card to-transparent rounded-r-2xl" />

      <div
        ref={scrollRef}
        className="flex items-stretch overflow-x-auto"
        style={{ scrollbarWidth: "none", cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {categories.map((cat, catIdx) => {
          const items = GOLD_INSTRUMENTS.filter((i) => i.category === cat);
          return (
            <React.Fragment key={cat}>
              <div className={`flex shrink-0 ${catIdx > 0 ? "border-l border-border/50" : ""}`}>
                <div className="flex flex-col items-center justify-center w-[50px] md:w-[64px] shrink-0 px-1 md:px-2 bg-muted/10">
                  <span className="text-[6px] md:text-[7.5px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 leading-tight text-center">
                    {CATEGORY_LABELS[cat].split(" ").join("\n")}
                  </span>
                </div>

                {items.map((inst) => {
                  const q = quotes[inst.symbol];
                  const isSelected = inst.symbol === selected;
                  const up = q && q.change >= 0;

                  return (
                    <button
                      key={inst.symbol}
                      data-sym={inst.symbol}
                      onClick={() => onSelect(inst.symbol)}
                      className={`group shrink-0 flex flex-col justify-center gap-1 px-3 md:px-4 w-[120px] md:w-[140px] transition-all duration-150 border-r border-border/20 last:border-r-0 first:rounded-l-xl last:rounded-r-xl ${isSelected
                        ? "border-b-amber-400 bg-amber-500/[0.07]"
                        : "border-b-transparent hover:border-b-amber-400/50 hover:bg-amber-500/[0.04]"
                        }`}
                      style={{ height: "64px" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] md:text-[11px] font-extrabold tracking-wide leading-none transition-colors ${isSelected ? "text-amber-400" : "text-foreground/70 group-hover:text-amber-400/90"
                          }`}>
                          {inst.symbol.replace("=F", "").replace(".JK", "")}
                        </span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        )}
                      </div>

                      {loading && !q ? (
                        <>
                          <div className="h-3 w-14 md:w-16 bg-muted/50 rounded animate-pulse" />
                          <div className="h-2 w-8 md:w-10 bg-muted/30 rounded animate-pulse" />
                        </>
                      ) : q ? (
                        <>
                          <div className="text-[11px] md:text-[12px] font-extrabold tabular-nums leading-none text-foreground/90">
                            {fmtPrice(q.price, inst.currency)}
                          </div>
                          <div className={`flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold ${up ? "text-[#089981]" : "text-[#f23645]"
                            }`}>
                            {up ? <ArrowUpRight className="h-2.5 w-2.5 shrink-0" /> : <ArrowDownRight className="h-2.5 w-2.5 shrink-0" />}
                            {up ? "+" : ""}{q.changePercent.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-muted-foreground/30">—</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GoldPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function GoldPanel({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { theme } = useThemeAuth();

  const [selected, setSelected] = useState<string>("GC=F");
  const [chartInterval, setChartInterval] = useState<string>("1d");
  const [quotes, setQuotes] = useState<Record<string, GoldQuote>>({});
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Kline[]>([]);
  const [lastQuoteRefresh, setLastQuoteRefresh] = useState<Date | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const klineCache = useRef<Map<string, Kline[]>>(new Map());
  const currentChartKey = useRef<string>("");

  const instrument = GOLD_INSTRUMENTS.find((i) => i.symbol === selected)!;
  const currentQuote = quotes[selected];

  const refreshQuotes = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoadingQuotes(true);
    const results: Record<string, GoldQuote> = {};
    await Promise.all(
      GOLD_INSTRUMENTS.map(async (inst) => {
        const q = await fetchGoldQuote(inst.symbol);
        if (q) results[inst.symbol] = q;
      })
    );
    setQuotes(results);
    setLastQuoteRefresh(new Date());
    if (showLoading) setIsLoadingQuotes(false);
  }, []);

  useEffect(() => {
    refreshQuotes(true);
    const timer = window.setInterval(() => refreshQuotes(false), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshQuotes]);

  const loadKlines = useCallback(async (sym: string, interval: string) => {
    const cacheKey = `${sym}_${interval}`;
    if (currentChartKey.current === cacheKey && chartData.length > 0) return;

    function applyToChart(data: Kline[]) {
      if (candlestickSeriesRef.current && chartRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candlestickSeriesRef.current.setData(data as any);
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        chartRef.current.timeScale().fitContent();
      }
      setChartData(data);
      currentChartKey.current = cacheKey;
    }

    setErrorBanner(null);

    const cached = klineCache.current.get(cacheKey);
    if (cached && cached.length > 0) {
      applyToChart(cached);
      setIsLoadingChart(false);
      return;
    }

    if (candlestickSeriesRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candlestickSeriesRef.current.setData([] as any);
    }
    setIsLoadingChart(true);
    try {
      const iv = interval === "max" ? "1mo" : interval;
      const data = await fetchGoldKlines(sym, iv);
      if (data.length > 0) {
        klineCache.current.set(cacheKey, data);
        applyToChart(data);
      } else {
        throw new Error("Data kline kosong");
      }
    } catch (err) {
      console.warn("[GoldPanel] fetch error:", err);
      setErrorBanner("Gagal mengambil data dari Yahoo Finance. Coba lagi nanti.");
    } finally {
      setIsLoadingChart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadKlines(selected, chartInterval);
  }, [selected, chartInterval, loadKlines]);

  // ── Chart setup / theme update (Fix Hook Error & Bleeding) ──

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const isDark = theme === "dark";
    const { backgroundColor, textColor, gridColor, borderColor } = getThemeColors(isDark);

    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontFamily: "Geist, Inter, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (ts: number) => formatTimestamp(ts),
      },
    };

    if (!chartRef.current) {
      // 1. Dapatkan tinggi dinamis yang sebenarnya setelah dirender
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      const chart = createChart(container, { width, height, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#089981", // TV Green
        downColor: "#f23645", // TV Red
        borderVisible: false,
        wickUpColor: "#089981",
        wickDownColor: "#f23645",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      // 2. Resize dinamis (Menghindari Bleeding saat ukuran layar berubah)
      const handleResize = () => chartRef.current?.resize(container.clientWidth, container.clientHeight);
      resizeHandlerRef.current = handleResize;
      window.addEventListener("resize", handleResize);

      // 3. Sembunyikan Logo TradingView Watermark (Inject CSS)
      const style = document.createElement("style");
      style.innerHTML = `#tv-attr-logo { display: none !important; }`;
      document.head.appendChild(style);

    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme]); // <-- PENTING: Hanya panggil setup chart saat 'theme' berubah. Ini yang mencegah error Hooks!

  useEffect(() => {
    return () => {
      if (resizeHandlerRef.current) window.removeEventListener("resize", resizeHandlerRef.current);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4 md:space-y-5">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 md:px-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-[22px] md:h-[22px]">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#D97706" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-foreground">Harga Emas Dunia</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <LiveDot />
              Realtime via Yahoo Finance
            </p>
          </div>
        </div>

        {lastQuoteRefresh && (
          <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3 text-emerald-500 hidden sm:block" />
            <span>
              Update: {lastQuoteRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 md:p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Ticker Strip */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {isLoadingQuotes && Object.keys(quotes).length === 0 ? (
          <div className="flex items-center justify-center h-[64px] gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-[11px] md:text-xs font-semibold">Mengambil harga emas...</span>
          </div>
        ) : (
          <GoldTickerBar
            quotes={quotes}
            selected={selected}
            onSelect={setSelected}
            loading={isLoadingQuotes && Object.keys(quotes).length === 0}
          />
        )}
      </div>

      {/* Selected Instrument Header */}
      {currentQuote && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
          <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto border-b border-border/40 md:border-none pb-4 md:pb-0">
            <GoldIcon symbol={selected} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-foreground truncate max-w-full">{instrument.label}</h2>
                <span className={`rounded-md px-2 py-0.5 text-[9px] md:text-[10px] font-semibold whitespace-nowrap ${instrument.color}`}>
                  {CATEGORY_LABELS[instrument.category]}
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1 truncate">
                {instrument.symbol} · {instrument.currency} per {instrument.unit}
              </p>
            </div>
          </div>

          <div className="flex items-baseline justify-between md:justify-end w-full md:w-auto gap-4 md:gap-6 text-left md:text-right pt-1 md:pt-0">
            <div>
              <div className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Harga Terakhir</div>
              <motion.div
                key={currentQuote.price}
                initial={{ scale: 1.04, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-lg md:text-xl font-extrabold tracking-tight tabular-nums"
                style={{ color: currentQuote.change > 0 ? "#089981" : currentQuote.change < 0 ? "#f23645" : undefined }}
              >
                {fmtPrice(currentQuote.price, instrument.currency)}
              </motion.div>
            </div>
            <div className="text-right">
              <div className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Perubahan</div>
              <div className={`flex items-center gap-0.5 text-xs md:text-sm font-extrabold justify-end ${currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]"}`}>
                {currentQuote.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>
                  {currentQuote.change >= 0 ? "+" : ""}{fmtPrice(Math.abs(currentQuote.change), instrument.currency)}
                  <span className="text-[10px] ml-1 opacity-90 hidden sm:inline-block">({currentQuote.changePercent >= 0 ? "+" : ""}{currentQuote.changePercent.toFixed(2)}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Card */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 md:pb-4 mb-4 z-40 relative">

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <div className="flex items-center gap-2 mr-2">
              <TrendingUp className="h-4 w-4 text-amber-500 hidden sm:block" />
              <span className="text-xs md:text-sm font-bold text-foreground truncate max-w-[100px] sm:max-w-[200px]">{instrument.label}</span>
            </div>

            <TimeframeDropdown value={chartInterval}
              onChange={setChartInterval}
              onOpenChange={onOpenChange} />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-1 sm:mt-0">
            {!isLoadingChart && chartData.length > 0 && (
              <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                <span className="whitespace-nowrap">{chartData.length.toLocaleString("id-ID")} candle</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Canvas: overflow-hidden & absolute ditambahkan untuk Anti-Bleeding */}
        <div className="h-[250px] sm:h-[320px] w-full relative z-10 overflow-hidden rounded-b-xl">
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-card/80 backdrop-blur-xs rounded-xl">
              <Loader2 className="h-6 w-6 sm:h-7 w-7 animate-spin text-amber-500" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Memuat grafik emas...</p>
            </div>
          )}
          <div
            ref={chartContainerRef}
            className={`absolute inset-0 w-full h-full ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      {/* Stats Row */}
      {currentQuote && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: "Harga Saat Ini", value: fmtPrice(currentQuote.price, instrument.currency), color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "Harga Kemarin", value: fmtPrice(currentQuote.prevClose, instrument.currency), color: "text-foreground" },
            { label: "Perubahan", value: `${currentQuote.change >= 0 ? "+" : ""}${fmtPrice(Math.abs(currentQuote.change), instrument.currency)}`, color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "% Harian", value: `${currentQuote.changePercent >= 0 ? "+" : ""}${currentQuote.changePercent.toFixed(2)}%`, color: currentQuote.changePercent >= 0 ? "text-[#089981]" : "text-[#f23645]" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 md:p-4">
              <div className="text-[8px] md:text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 md:mb-1.5">{stat.label}</div>
              <div className={`text-xs md:text-sm font-extrabold tabular-nums truncate ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gold Market Info */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
        <h4 className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 md:mb-4">
          Tentang Instrumen Emas
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 text-xs">
          {[
            { title: "Spot & Futures (GC=F)", desc: "Harga emas kontrak berjangka COMEX, patokan harga emas global dalam USD.", icon: "🏦" },
            { title: "ETF Emas (GLD, IAU)", desc: "Dana investasi yang melacak harga spot emas. GLD adalah ETF emas terbesar.", icon: "📊" },
            { title: "Saham Tambang (GDX)", desc: "Perusahaan pertambangan emas global. Pergerakannya 2–3× lebih volatil.", icon: "⛏️" },
            { title: "IDX Emas (ANTM)", desc: "Antam adalah BUMN tambang emas terbesar di Indonesia, harga dalam IDR.", icon: "🇮🇩" },
          ].map((item) => (
            <div key={item.title} className="border border-border rounded-xl p-3 bg-muted/20 space-y-1.5">
              <div className="text-base md:text-lg">{item.icon}</div>
              <div className="font-bold text-foreground text-[10px] md:text-[11px]">{item.title}</div>
              <p className="text-muted-foreground leading-relaxed text-[9px] md:text-[10px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}