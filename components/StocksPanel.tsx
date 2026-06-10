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
} from "lucide-react";
import { getLocalWatchlist, saveLocalWatchlist } from "@/app/utils/supabase";
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
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";

// ─────────────────────────────────────────────────────────────────────────────
// IDX Stock Logo Component
// ─────────────────────────────────────────────────────────────────────────────

interface LogoProps { className?: string; size?: number; }

const BBCA_Logo = ({ size = 40 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#003399" />
    <text x="20" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif">BCA</text>
  </svg>
);
const BBRI_Logo = ({ size = 40 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#0070B8" />
    <text x="20" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif">BRI</text>
  </svg>
);
const TLKM_Logo = ({ size = 40 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#CC0000" />
    <text x="20" y="26" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial,sans-serif">TLKM</text>
  </svg>
);
const BMRI_Logo = ({ size = 40 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#0A3880" />
    <text x="20" y="19" textAnchor="middle" fill="#F5A623" fontSize="7" fontWeight="bold" fontFamily="Arial,sans-serif">BANK</text>
    <text x="20" y="29" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial,sans-serif">MANDIRI</text>
  </svg>
);
const ASII_Logo = ({ size = 40 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#1A1A2E" />
    <text x="20" y="26" textAnchor="middle" fill="#E8C547" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif">ASII</text>
  </svg>
);

const LOGO_MAP: Record<string, React.FC<LogoProps>> = {
  BBCA: BBCA_Logo,
  BBRI: BBRI_Logo,
  TLKM: TLKM_Logo,
  BMRI: BMRI_Logo,
  ASII: ASII_Logo,
};

/** Logo IDX saham dengan fallback ke avatar inisial berwarna */
function IDXStockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const Logo = LOGO_MAP[symbol];
  if (Logo) return <Logo size={size} />;

  // Fallback: avatar bulat dengan inisial + warna
  const colors: Record<string, string> = {
    WBSA: "bg-emerald-600",
    GOTO: "bg-orange-500",
    BYAN: "bg-slate-700",
  };
  const bg = colors[symbol] ?? "bg-slate-500";
  const initials = symbol.slice(0, 2);
  return (
    <div
      className={`${bg} flex items-center justify-center rounded-xl font-bold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.28, borderRadius: size * 0.25 }}
    >
      {initials}
    </div>
  );
}

/** Mini logo untuk dropdown list */
function IDXStockLogoMini({ symbol }: { symbol: string }) {
  return <IDXStockLogo symbol={symbol} size={20} />;
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
      { label: "1m",  value: "1m",  group: "Menit" },
      { label: "2m",  value: "2m",  group: "Menit" },
      { label: "5m",  value: "5m",  group: "Menit" },
      { label: "15m", value: "15m", group: "Menit" },
      { label: "30m", value: "30m", group: "Menit" },
      { label: "60m", value: "60m", group: "Menit" },
      { label: "90m", value: "90m", group: "Menit" },
    ],
  },
  {
    group: "Hari / Minggu",
    items: [
      { label: "1H",    value: "1d",  group: "Hari / Minggu" },
      { label: "5H",    value: "5d",  group: "Hari / Minggu" },
      { label: "1Mgg",  value: "1wk", group: "Hari / Minggu" },
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
  backgroundColor: isDark ? "#111827" : "#ffffff",
  textColor:       isDark ? "#94a3b8" : "#374151",
  gridColor:       isDark ? "#1f2937" : "#f3f4f6",
  borderColor:     isDark ? "#374151" : "#e5e7eb",
});

// ─────────────────────────────────────────────────────────────────────────────
// TimeframeDropdown
// ─────────────────────────────────────────────────────────────────────────────

const TimeframeDropdown = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ALL_TIMEFRAMES.find((t) => t.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none min-w-[88px] justify-between"
      >
        <span className="text-brand-green">{selected?.label ?? value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 mt-1.5 w-56 rounded-xl border border-border bg-card shadow-xl p-2 z-50"
          >
            {TIMEFRAME_GROUPS.map((group) => (
              <div key={group.group} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {group.group}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {group.items.map((item) => {
                    const isActive = item.value === value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => { onChange(item.value); setOpen(false); }}
                        className={`rounded-md py-1.5 text-xs font-semibold transition cursor-pointer select-none text-center ${
                          isActive
                            ? "bg-brand-green text-white shadow-sm shadow-brand-green/30"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StocksPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPanel() {
  const { theme } = useThemeAuth();

  const [selectedStock, setSelectedStock] = useState<string>("BBCA");
  const [isSelectOpen, setIsSelectOpen]   = useState(false);

  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [chartData, setChartData]           = useState<StockKline[]>([]);
  const [stock, setStock]                   = useState<StockInfo | null>(null);
  const [interval, setIntervalState]        = useState<string>("1d");
  const [errorBanner, setErrorBanner]       = useState<string | null>(null);

  const chartContainerRef    = useRef<HTMLDivElement>(null);
  const chartRef             = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const dropdownRef          = useRef<HTMLDivElement>(null);
  // Cache per "BBCA_1d" agar ganti timeframe tidak perlu refetch ulang
  const klineCache           = useRef<Map<string, StockKline[]>>(new Map());
  // Resize handler ref untuk cleanup yang benar
  const resizeHandlerRef     = useRef<(() => void) | null>(null);

  // watchlist V2: disimpan di format yang sama dengan PortfolioWatchlistPanel
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(
    () => typeof window !== "undefined" ? loadWatchlistV2() : []
  );

  // ── Close stock selector on outside click ───────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsSelectOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── 1. Load historical klines — fast 2-phase ─────────────────────────────────

  useEffect(() => {
    let active = true;
    const cacheKey = `${selectedStock}_${interval}`;

    /** Update chart series langsung + React state untuk count display */
    function applyToChart(data: StockKline[]) {
      if (!active) return;
      if (candlestickSeriesRef.current && chartRef.current) {
        // StockKline shape (time, open, high, low, close) sesuai dengan CandlestickData
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candlestickSeriesRef.current.setData(data as any);
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

      // Bersihkan chart dulu
      if (candlestickSeriesRef.current && chartRef.current) {
        candlestickSeriesRef.current.setData([]);
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
      }

      // FASE 0: Cache hit → tampil instan
      const cached = klineCache.current.get(cacheKey);
      if (cached && cached.length > 0) {
        applyToChart(cached);
        setIsLoadingChart(false);
        // Hitung metadata dari cache
        const lastClose = cached[cached.length - 1].close;
        const prevClose = cached.length > 1 ? cached[cached.length - 2].close : lastClose;
        const change = lastClose - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const meta = stockTickers[selectedStock] ?? stockTickers.BBCA;
        if (active) setStock({ ...meta, price: lastClose, change, changePercent, prevClose } as StockInfo);
        return;
      }

      // FASE 1: Fetch cepat
      setIsLoadingChart(true);
      try {
        const klines = await fetchStockKlinesFromYahoo(selectedStock, interval, 5000);

        if (!active) return;

        if (klines && klines.length > 0) {
          applyToChart(klines);
          klineCache.current.set(cacheKey, klines);

          const lastClose = klines[klines.length - 1].close;
          const prevClose = klines.length > 1 ? klines[klines.length - 2].close : lastClose;
          const change = lastClose - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          const meta = stockTickers[selectedStock] ?? stockTickers.BBCA;

          setStock({ ...meta, price: lastClose, change, changePercent, prevClose } as StockInfo);
        } else {
          throw new Error("Data kline kosong.");
        }
      } catch (err: unknown) {
        if (!active) return;
        console.warn(`[StocksPanel] Gagal fetch ${selectedStock}:`, err);
        setErrorBanner("Gagal mengambil data Yahoo Finance. Menggunakan mode simulasi...");

        const mockKlines = fetchStockKlinesMock(selectedStock, interval, 300);
        if (active) {
          klineCache.current.set(cacheKey, mockKlines);
          applyToChart(mockKlines);
          setStock(getStockInfo(selectedStock));
        }
      } finally {
        if (active) setIsLoadingChart(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [selectedStock, interval]);

  // ── 2. Setup / update Lightweight Chart sesuai tema ─────────────────────────

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
      const width = container.clientWidth;
      if (width <= 0) return;

      const chart = createChart(container, { width, height: 300, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      const handleResize = () => chartRef.current?.resize(container.clientWidth, 300);
      resizeHandlerRef.current = handleResize;
      window.addEventListener("resize", handleResize);
    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, selectedStock, interval]);

  // ── Cleanup saat unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  // ── Watchlist toggle (sync ke PortfolioWatchlistPanel via localStorage V2) ──

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
          symbol:  selectedStock,
          market:  "stocks" as const,
          name:    stockMeta?.name ?? selectedStock,
          addedAt: Date.now(),
        },
      ];
    }
    setWatchlist(next);
    saveWatchlistV2(next);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Error Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Stock Header — sama persis dengan CryptoPanel */}
      {stock && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <IDXStockLogo symbol={selectedStock} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{stock.name}</h2>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  IDX: {selectedStock}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{stock.sector}</p>
            </div>
          </div>

          {/* Harga + Perubahan — gaya CryptoPanel */}
          <div className="flex items-baseline gap-6 text-right">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1">Harga Terakhir</div>
              <motion.h3
                animate={{
                  color: stock.change > 0
                    ? "#089981"
                    : stock.change < 0
                    ? "#f23645"
                    : (theme === "dark" ? "#f8fafc" : "#0f172a"),
                }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-extrabold tracking-tight px-1 py-0.5"
              >
                {stock.price === 0
                  ? <span className="text-muted-foreground animate-pulse">···</span>
                  : `Rp ${stock.price.toLocaleString("id-ID")}`}
              </motion.h3>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1">Perubahan Harian</div>
              <div
                className={`flex items-center gap-0.5 text-sm font-extrabold justify-end ${
                  stock.change >= 0 ? "text-[#089981]" : "text-[#f23645]"
                }`}
              >
                {stock.change >= 0
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                <span>
                  {stock.change >= 0 ? "+" : ""}{stock.change.toLocaleString("id-ID")}
                  &nbsp;({stock.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Card */}
      <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 mb-6 z-40 relative">
          <div className="flex items-center gap-3 flex-wrap">

            {/* Stock Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="flex items-center justify-between gap-3 w-52 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <IDXStockLogoMini symbol={selectedStock} />
                  <span>IDX: {selectedStock}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition duration-200 ${isSelectOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isSelectOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-1.5 w-64 rounded-xl border border-border bg-card shadow-lg p-2 z-50 max-h-80 overflow-y-auto"
                  >
                    <div className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                      Pilih Emiten Saham
                    </div>
                    <div className="space-y-0.5">
                      {Object.keys(stockTickers).map((sym) => {
                        const ticker = stockTickers[sym];
                        const isSelected = sym === selectedStock;
                        return (
                          <button
                            key={sym}
                            onClick={() => { setSelectedStock(sym); setIsSelectOpen(false); }}
                            className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${
                              isSelected
                                ? "bg-brand-green/10 text-brand-green font-bold"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <IDXStockLogoMini symbol={sym} />
                              <div>
                                <div className="font-semibold">{sym}</div>
                                <div className="text-[9px] text-muted-foreground truncate max-w-[150px]">
                                  {ticker.name}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-brand-green shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Timeframe Dropdown */}
            <TimeframeDropdown
              value={interval}
              onChange={(v) => setIntervalState(v)}
            />

            {/* Watchlist Toggle */}
            <button
              onClick={toggleWatchlist}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold border transition cursor-pointer select-none ${
                isInWatchlist
                  ? "bg-amber-500/15 border-amber-500/20 text-amber-500"
                  : "bg-background border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-current" : ""}`} />
              <span>{isInWatchlist ? "WATCHLIST" : "TAMBAH WATCHLIST"}</span>
            </button>
          </div>

          {/* Candle count + loading more */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground select-none">
            {!isLoadingChart && chartData.length > 0 && (
              <>
                <History className="h-3 w-3" />
                <span>{chartData.length.toLocaleString("id-ID")} candle</span>
              </>
            )}
            {loadingMore && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-brand-green/70 bg-brand-green/10 px-2 py-0.5 rounded-full animate-pulse">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                memuat histori...
              </span>
            )}
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-[300px] w-full relative z-10">

          {/* Loading Overlay */}
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-card rounded-xl">
              <Loader2 className="h-7 w-7 animate-spin text-brand-green" />
              <p className="text-xs text-muted-foreground font-semibold">Memuat grafik...</p>
            </div>
          )}

          {/* Chart Canvas */}
          <div
            ref={chartContainerRef}
            className={`w-full h-[300px] ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      {/* Stock Stats */}
      {stock && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Statistik Finansial
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            {[
              { label: "Rasio P/E",         value: stock.peRatio },
              { label: "Yield Dividen",      value: stock.dividendYield },
              { label: "Kapitalisasi Pasar", value: stock.marketCap },
              { label: "Volume Transaksi",   value: `${stock.volume} shares` },
              { label: "Harga Kemarin",      value: `Rp ${stock.prevClose.toLocaleString("id-ID")}`, wide: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`border border-border rounded-xl p-3 bg-muted/20 ${
                  (item as any).wide ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <span className="text-muted-foreground font-semibold">{item.label}</span>
                <p className="text-sm font-bold text-foreground mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Tracker & Signal Configurator */}
      {stock && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortfolioTracker
            currentPrice={stock.price}
            activeSymbol={selectedStock}
            isStock={true}
          />
          <SignalConfigurator
            activeSymbol={selectedStock}
            currentPrice={stock.price}
          />
        </div>
      )}

    </div>
  );
}