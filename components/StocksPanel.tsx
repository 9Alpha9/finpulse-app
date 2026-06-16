"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
  History,
  Star,
  Search,
  X,
} from "lucide-react";
import { saveWatchlistV2, loadWatchlistV2, WatchlistItem } from "@/components/PortfolioWatchlistPanel";
import {
  getStockInfo,
  fetchStockKlinesFromYahoo,
  fetchStockKlinesMock,
  stockTickers,
  StockKline,
  StockInfo,
} from "@/src/lib/stocks";
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { useStockPrices } from "@/app/context/StockPriceContext";
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";
import PaperTrading from "./PaperTrading";
import MarketMarquee from "./MarketMarquee";

// ─────────────────────────────────────────────────────────────────────────────
// IDX Stock Logo Component
// ─────────────────────────────────────────────────────────────────────────────

interface LogoProps { className?: string; size?: number; }

const LOGO_MAP: Record<string, React.FC<LogoProps>> = {};

function IDXStockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  const stockMeta = stockTickers[symbol];
  const logoUrl = stockMeta?.logo;

  if (err || !logoUrl) {
    const initials = symbol.slice(0, 3);
    return (
      <div
        className="flex items-center justify-center rounded-xl font-bold text-white bg-slate-500 shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.28, borderRadius: size * 0.25 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      onError={() => setErr(true)}
      alt={symbol}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function IDXStockLogoMini({ symbol }: { symbol: string }) {
  return <IDXStockLogo symbol={symbol} size={20} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Price Component
// ─────────────────────────────────────────────────────────────────────────────

function LiveStockPrice({ symbol, basePrice, mainPrice }: { symbol: string, basePrice?: number, mainPrice?: number }) {
  const [price, setPrice] = useState(() => mainPrice ?? basePrice ?? getStockInfo(symbol).price);
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "neutral">("neutral");

  // Sync with basePrice dynamically once loaded from API
  useEffect(() => {
    if (basePrice && mainPrice === undefined) {
      setPrice(basePrice);
    }
  }, [basePrice, mainPrice]);

  // Sync with mainPrice if it is the selected stock
  useEffect(() => {
    if (mainPrice !== undefined) {
      setPrice(prev => {
        if (mainPrice > prev) setTickDirection("up");
        else if (mainPrice < prev) setTickDirection("down");
        return mainPrice;
      });
      const t = setTimeout(() => setTickDirection("neutral"), 300);
      return () => clearTimeout(t);
    }
  }, [mainPrice]);

  // Jitter simulation for non-selected stocks (Diperbaiki agar tidak memicu double calculation)
  useEffect(() => {
    if (mainPrice !== undefined) return;

    let active = true;
    let timeoutId: NodeJS.Timeout;

    const simulateJitter = () => {
      if (!active) return;
      const newPrice = basePrice ?? getStockInfo(symbol).price;
      const jitter = Math.round((Math.random() - 0.5) * (newPrice * 0.003));
      const finalPrice = newPrice + jitter;

      setPrice(prev => {
        if (finalPrice > prev) setTickDirection("up");
        else if (finalPrice < prev) setTickDirection("down");
        return finalPrice;
      });

      setTimeout(() => { if (active) setTickDirection("neutral"); }, 300);
      timeoutId = setTimeout(simulateJitter, 2000 + Math.random() * 2000);
    };

    timeoutId = setTimeout(simulateJitter, 2000 + Math.random() * 2000);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [symbol, mainPrice, basePrice]);

  return (
    <motion.div
      animate={{
        color: tickDirection === "up" ? "#089981" : tickDirection === "down" ? "#f23645" : undefined,
      }}
      transition={{ duration: 0.1 }}
      className="text-xs font-bold tabular-nums text-right transition-colors whitespace-nowrap pl-2"
    >
      Rp {price.toLocaleString("id-ID")}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TimeframeOption {
  label: string;
  value: string;
  group: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants — Timeframe Groups
// ─────────────────────────────────────────────────────────────────────────────

const TIMEFRAME_GROUPS: { group: string; items: TimeframeOption[] }[] = [
  {
    group: "Menit",
    items: [
      { label: "1m", value: "1m", group: "Menit" },
      { label: "2m", value: "2m", group: "Menit" },
      { label: "5m", value: "5m", group: "Menit" },
      { label: "15m", value: "15m", group: "Menit" },
      { label: "30m", value: "30m", group: "Menit" },
      { label: "60m", value: "60m", group: "Menit" },
      { label: "90m", value: "90m", group: "Menit" },
    ],
  },
  {
    group: "Hari / Minggu",
    items: [
      { label: "1H", value: "1d", group: "Hari / Minggu" },
      { label: "5H", value: "5d", group: "Hari / Minggu" },
      { label: "1Mgg", value: "1wk", group: "Hari / Minggu" },
    ],
  },
  {
    group: "Bulan",
    items: [
      { label: "1Bln", value: "1mo", group: "Bulan" },
      { label: "3Bln", value: "3mo", group: "Bulan" },
    ],
  },
];

const ALL_TIMEFRAMES = TIMEFRAME_GROUPS.flatMap((g) => g.items);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];

const formatTimestampUTC = (ts: number): string => {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getUTCDate())} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}, ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
};

const getThemeColors = (isDark: boolean) => ({
  backgroundColor: "transparent",
  textColor: isDark ? "#a1a1aa" : "#52525b",
  gridColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
});

// ─────────────────────────────────────────────────────────────────────────────
// TimeframeDropdown (Dengan Swipe-to-Close & Auto-Hide BottomNav)
// ─────────────────────────────────────────────────────────────────────────────

const TimeframeDropdown = ({
  value,
  onChange,
  onOpenChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = ALL_TIMEFRAMES.find((t) => t.value === value);

  const toggle = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

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
        <span className="text-brand-green">{selected?.label ?? value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="tf-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 sm:hidden"
            />

            <motion.div
              key="tf-panel"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[9999] p-4 sm:p-3 bg-card rounded-t-3xl sm:rounded-xl border-t sm:border border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:mt-2 sm:w-[300px] pb-8 sm:pb-3"
            >
              <div className="w-12 h-1.5 bg-secondary-foreground/20 rounded-full mx-auto mb-5 sm:hidden cursor-grab active:cursor-grabbing" />

              <div className="max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center justify-between px-1 py-1 mb-2 sm:mb-1.5 border-b border-border/50 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Pilih Rentang Waktu
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer transition p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {TIMEFRAME_GROUPS.map((group) => (
                  <div key={group.group} className="mb-3.5 last:mb-0">
                    <div className="px-1 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
                      {group.group}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => {
                        const isActive = item.value === value;
                        return (
                          <button
                            key={item.value}
                            onClick={() => {
                              onChange(item.value);
                              toggle(false);
                            }}
                            className={`rounded-lg sm:rounded-md px-3 py-2.5 sm:py-1.5 text-xs font-semibold transition cursor-pointer select-none text-center flex-1 min-w-[50px] ${isActive
                              ? "bg-brand-green text-white shadow-md sm:shadow-sm shadow-brand-green/30"
                              : "text-foreground bg-secondary/30 sm:bg-secondary/40 hover:bg-secondary"
                              }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StocksPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPanel({ onOpenChange, hideMarquee, symbol: extSymbol, onSymbolChange }: { onOpenChange?: (open: boolean) => void; hideMarquee?: boolean; symbol?: string; onSymbolChange?: (sym: string) => void }) {
  const { theme } = useThemeAuth();
  // ✅ Sumber harga + change real yang sama dengan MarketMarquee
  const { quotes: contextQuotes } = useStockPrices();

  const [internalSymbol, setInternalSymbol] = useState<string>("IHSG");
  const selectedStock = extSymbol || internalSymbol;
  const setSelectedStock = (sym: string) => {
    setInternalSymbol(sym);
    onSymbolChange?.(sym);
  };
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chartData, setChartData] = useState<StockKline[]>([]);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [interval, setIntervalState] = useState<string>("1d");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [tickDirection, setTickDirection] = useState<"up" | "down" | "neutral">("neutral");
  const prevPriceRef = useRef<number>(0);
  const anchorPriceRef = useRef<number>(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastBarRef = useRef<StockKline | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const klineCache = useRef<Map<string, StockKline[]>>(new Map());

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(
    () => typeof window !== "undefined" ? loadWatchlistV2() : []
  );

  useEffect(() => {
    onOpenChange?.(isSelectOpen);
    if (isSelectOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isSelectOpen, onOpenChange]);

  useEffect(() => {
    if (!stock) return;
    if (stock.price > prevPriceRef.current && prevPriceRef.current !== 0) {
      setTickDirection("up");
    } else if (stock.price < prevPriceRef.current && prevPriceRef.current !== 0) {
      setTickDirection("down");
    }
    if (stock.price > 0) {
      prevPriceRef.current = stock.price;
    }

    const t = setTimeout(() => setTickDirection("neutral"), 300);
    return () => clearTimeout(t);
  }, [stock?.price]);

  useEffect(() => {
    let active = true;
    const cacheKey = `${selectedStock}_${interval}`;

    function applyToChart(data: StockKline[]) {
      if (!active) return;
      if (candlestickSeriesRef.current && chartRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candlestickSeriesRef.current.setData(data as any);
        if (data.length > 0) {
          lastBarRef.current = { ...data[data.length - 1] };
        }
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        chartRef.current.timeScale().fitContent();
        chartRef.current.timeScale().scrollToRealTime();
      }
      setChartData(data);
    }

    async function loadData() {
      setErrorBanner(null);
      setLoadingMore(false);
      setStock(null);
      setTickDirection("neutral");
      prevPriceRef.current = 0;

      if (candlestickSeriesRef.current && chartRef.current) {
        candlestickSeriesRef.current.setData([]);
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
      }

      const cached = klineCache.current.get(cacheKey);
      if (cached && cached.length > 0) {
        applyToChart(cached);
        setIsLoadingChart(false);
        const lastClose = cached[cached.length - 1].close;
        const prevClose = cached.length > 1 ? cached[cached.length - 2].close : lastClose;
        const change = lastClose - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const meta = stockTickers[selectedStock] ?? stockTickers.BBCA;

        anchorPriceRef.current = lastClose;

        if (active) setStock({ ...meta, price: lastClose, change, changePercent, prevClose } as StockInfo);
        return;
      }

      setIsLoadingChart(true);
      try {
        const fetchLimit = (selectedStock === "IHSG" || selectedStock === "^JKSE") ? 100000 : 5000;
        const klines = await fetchStockKlinesFromYahoo(selectedStock, interval, fetchLimit);

        if (!active) return;

        if (klines && klines.length > 0) {
          applyToChart(klines);
          klineCache.current.set(cacheKey, klines);

          const lastClose = klines[klines.length - 1].close;
          const prevClose = klines.length > 1 ? klines[klines.length - 2].close : lastClose;
          const change = lastClose - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          const meta = stockTickers[selectedStock] ?? stockTickers.BBCA;

          anchorPriceRef.current = lastClose;

          setStock({ ...meta, price: lastClose, change, changePercent, prevClose } as StockInfo);
        } else {
          throw new Error("Data kline kosong.");
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorBanner("Gagal mengambil data Yahoo Finance. Menggunakan mode simulasi...");

        const mockLimit = (selectedStock === "IHSG" || selectedStock === "^JKSE") ? 5000 : 300;
        const mockKlines = fetchStockKlinesMock(selectedStock, interval, mockLimit);
        if (active) {
          klineCache.current.set(cacheKey, mockKlines);
          applyToChart(mockKlines);
          const meta = getStockInfo(selectedStock);
          anchorPriceRef.current = meta.price;
          setStock(meta);
        }
      } finally {
        if (active) setIsLoadingChart(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [selectedStock, interval]);

  useEffect(() => {
    if (!stock) return;
    const q = contextQuotes[selectedStock];
    if (!q) return;

    const ctxPrice = q.price;
    if (ctxPrice === stock.price) return;

    if (ctxPrice > prevPriceRef.current && prevPriceRef.current !== 0) setTickDirection("up");
    else if (ctxPrice < prevPriceRef.current && prevPriceRef.current !== 0) setTickDirection("down");
    prevPriceRef.current = ctxPrice;
    const t = setTimeout(() => setTickDirection("neutral"), 350);

    setStock(prev => prev ? {
      ...prev,
      price: ctxPrice,
      change: q.change,
      changePercent: q.changePercent,
    } : prev);

    if (interval === "1d" && candlestickSeriesRef.current && lastBarRef.current) {
      const lb = { ...lastBarRef.current };
      lb.close = ctxPrice;
      lb.high = Math.max(lb.high, ctxPrice);
      lb.low = Math.min(lb.low, ctxPrice);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candlestickSeriesRef.current.update(lb as any);
      lastBarRef.current = lb;
    }
    return () => clearTimeout(t);
  }, [contextQuotes[selectedStock]?.price]);

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
        timeFormatter: (ts: number) => formatTimestampUTC(ts),
      },
    };

    if (!chartRef.current) {
      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        ...chartOptions
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chartRef.current?.applyOptions({ width, height });
        }
      });
      observer.observe(container);
      resizeObserverRef.current = observer;
    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, selectedStock, interval]);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  const stockMeta = stockTickers[selectedStock];
  const isInWatchlist = watchlist.some((w) => w.symbol === selectedStock);

  const toggleWatchlist = () => {
    let next: WatchlistItem[];
    if (isInWatchlist) {
      next = watchlist.filter((w) => w.symbol !== selectedStock);
    } else {
      next = [
        ...watchlist,
        {
          symbol: selectedStock,
          market: "stocks" as const,
          name: stockMeta?.name ?? selectedStock,
          addedAt: Date.now(),
        },
      ];
    }
    setWatchlist(next);
    saveWatchlistV2(next);
  };

  const filteredStocks = Object.keys(stockTickers).filter((sym) =>
    sym.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stockTickers[sym]?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6">

      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {!hideMarquee && (
        <div className="w-full overflow-hidden rounded-t-xl mb-4">
          <MarketMarquee marketType="stocks" />
        </div>
      )}

      {stock && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">

          <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto border-b border-border/40 md:border-none pb-4 md:pb-0">
            <IDXStockLogo symbol={selectedStock} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate max-w-full">
                  {selectedStock}
                </h2>
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Saham (IDX)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate max-w-[280px] sm:max-w-md">
                {stock.name}
              </p>
            </div>
          </div>

          <div className="flex items-baseline justify-between md:justify-end w-full md:w-auto gap-4 md:gap-8 text-left md:text-right pt-2 md:pt-0">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">Harga Terakhir</div>
              <motion.h3
                animate={{
                  color: tickDirection === "up" ? "#089981" : tickDirection === "down" ? "#f23645" : (theme === "dark" ? "#f8fafc" : "#0f172a"),
                }}
                transition={{ duration: 0.2 }}
                className="text-lg sm:text-2xl font-extrabold tracking-tight"
              >
                {stock.price === 0
                  ? <span className="text-muted-foreground animate-pulse">···</span>
                  : `Rp ${stock.price.toLocaleString("id-ID")}`}
              </motion.h3>
            </div>

            <div className="text-right">
              <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">Perubahan</div>
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md mt-1 justify-end ${stock.change >= 0 ? "text-[#089981]" : "text-[#f23645]"}`}
              >
                {stock.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                <span>
                  {stock.change >= 0 ? "+" : ""}{stock.change.toLocaleString("id-ID")}
                  <span className="text-[10px] sm:text-xs ml-1 opacity-90">({stock.changePercent.toFixed(2)}%)</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Chart Card */}
      <div className="relative rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 md:pb-4 mb-4 md:mb-6 z-40 relative">

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            {/* Stock Selector */}
            <div className="relative flex-1 md:flex-none" ref={dropdownRef}>
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="flex items-center justify-between gap-2 w-full md:w-48 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <IDXStockLogoMini symbol={selectedStock} />
                  <span className="truncate">IDX: {selectedStock}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition duration-200 shrink-0 ${isSelectOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isSelectOpen && (
                  <motion.div
                    key="stock-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
                  >
                    <motion.div
                      key="stock-modal-panel"
                      initial={{ opacity: 0, y: "50%" }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="bg-card w-full sm:w-[437px] rounded-t-3xl sm:rounded-2xl border-t sm:border border-border shadow-2xl p-5 pb-8 sm:pb-5 flex flex-col max-h-[80vh] sm:max-h-[70vh] outline-none"
                    >
                      <div className="w-12 h-1.5 bg-secondary-foreground/20 rounded-full mx-auto mb-5 sm:hidden shrink-0 cursor-grab active:cursor-grabbing" />

                      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Pilih Emiten Saham
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSelectOpen(false)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer transition p-1"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="relative flex items-center shrink-0 mb-3">
                        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Cari emiten saham..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-brand-green"
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                        {filteredStocks.length > 0 ? (
                          filteredStocks.map((sym) => {
                            const ticker = stockTickers[sym];
                            const isSelected = sym === selectedStock;
                            return (
                              <button
                                key={sym}
                                onClick={() => { setSelectedStock(sym); setIsSelectOpen(false); setSearchQuery(""); }}
                                className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${isSelected
                                  ? "bg-brand-green/10 text-brand-green font-bold"
                                  : "text-foreground hover:bg-secondary"
                                  }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2.5 truncate pr-2">
                                    <IDXStockLogoMini symbol={sym} />
                                    <div className="truncate">
                                      <div className="font-semibold">{sym}</div>
                                      <div className="text-[9px] text-muted-foreground truncate w-full max-w-[150px]">
                                        {ticker.name}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <LiveStockPrice symbol={sym} basePrice={contextQuotes[sym]?.price} mainPrice={isSelected ? stock?.price : undefined} />
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-brand-green shrink-0" />
                                    ) : (
                                      <div className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-10 text-center text-xs text-muted-foreground">
                            Emiten tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <TimeframeDropdown value={interval}
              onChange={(v) => setIntervalState(v)}
              onOpenChange={onOpenChange} />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end mt-1 md:mt-0">
            <button
              onClick={toggleWatchlist}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold border transition cursor-pointer select-none ${isInWatchlist
                ? "bg-amber-500/15 border-amber-500/20 text-amber-500"
                : "bg-background border-border text-foreground hover:bg-secondary"
                }`}
            >
              <Star className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isInWatchlist ? "fill-current" : ""}`} />
              <span className="whitespace-nowrap">{isInWatchlist ? "WATCHLIST" : "TAMBAH WATCHLIST"}</span>
            </button>

            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground select-none">
              {!isLoadingChart && chartData.length > 0 && (
                <>
                  <History className="h-3 w-3 hidden sm:block" />
                  <span className="whitespace-nowrap">{chartData.length.toLocaleString("id-ID")} candle</span>
                </>
              )}
              {loadingMore && (
                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-brand-green/70 bg-brand-green/10 px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> memuat...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-[250px] sm:h-[300px] w-full relative z-10">
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-card/80 backdrop-blur-xs rounded-xl">
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-brand-green" />
            </div>
          )}
          <div ref={chartContainerRef} className={`w-full h-[250px] sm:h-[300px] ${isLoadingChart ? "invisible" : ""}`} />
        </div>
      </div>

      {stock && (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">
            Statistik Finansial
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 text-xs">
            {[
              { label: "Rasio P/E", value: stock.peRatio },
              { label: "Yield Dividen", value: stock.dividendYield },
              { label: "Kapitalisasi Pasar", value: stock.marketCap },
              { label: "Volume Transaksi", value: `${stock.volume} shares` },
              { label: "Harga Kemarin", value: `Rp ${stock.prevClose.toLocaleString("id-ID")}` },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`border border-border rounded-xl p-2.5 sm:p-3 bg-muted/20 flex flex-col justify-center ${i === 4 ? "col-span-2 md:col-span-1" : "col-span-1"
                  }`}
              >
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold line-clamp-1">{item.label}</span>
                <p className="text-[11px] sm:text-sm font-bold text-foreground mt-1 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <PortfolioTracker currentPrice={stock.price} activeSymbol={selectedStock} isStock={true} />
          <SignalConfigurator activeSymbol={selectedStock} currentPrice={stock.price} />
        </div>
      )}

      <div>
        <PaperTrading
          activeSymbol={selectedStock}
          marketType="stocks"
          currentPrice={stock?.price || 0}
        />
      </div>
    </div>
  );
}