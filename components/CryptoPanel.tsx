"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  ShieldAlert,
  Loader2,
  Search,
  Check,
  ChevronDown,
  AlertCircle,
  History,
} from "lucide-react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import {
  fetchCryptoPrice,
  fetchAllCryptoKlines,
  connectCryptoWebSocket,
  fetchActiveCryptoPairs,
  KlineData,
} from "@/src/lib/binance";
import { createChart, CandlestickSeries, ColorType } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";

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
    group: "Detik",
    items: [
      { label: "1d", value: "1s", group: "Detik" },
    ],
  },
  {
    group: "Menit",
    items: [
      { label: "1m", value: "1m", group: "Menit" },
      { label: "3m", value: "3m", group: "Menit" },
      { label: "5m", value: "5m", group: "Menit" },
      { label: "15m", value: "15m", group: "Menit" },
      { label: "30m", value: "30m", group: "Menit" },
    ],
  },
  {
    group: "Jam",
    items: [
      { label: "1j", value: "1h", group: "Jam" },
      { label: "2j", value: "2h", group: "Jam" },
      { label: "4j", value: "4h", group: "Jam" },
      { label: "6j", value: "6h", group: "Jam" },
      { label: "8j", value: "8h", group: "Jam" },
      { label: "12j", value: "12h", group: "Jam" },
    ],
  },
  {
    group: "Hari / Minggu",
    items: [
      { label: "1H", value: "1d", group: "Hari / Minggu" },
      { label: "3H", value: "3d", group: "Hari / Minggu" },
      { label: "1M", value: "1w", group: "Hari / Minggu" },
    ],
  },
  {
    group: "Bulan / Tahun",
    items: [
      { label: "1Bln", value: "1M", group: "Bulan / Tahun" },
      { label: "3Bln", value: "3M", group: "Bulan / Tahun" },
      { label: "6Bln", value: "6M", group: "Bulan / Tahun" },
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

/**
 * Format Unix timestamp (detik, UTC) ke string tanggal/jam
 * tanpa offset timezone browser — sesuai standar Binance/TradingView.
 *
 * NOTE: Untuk timeframe 1D ke atas, Binance membuka candle di 00:00 UTC.
 * Ini adalah perilaku BENAR dan sama seperti TradingView untuk crypto.
 * Tidak perlu dikoreksi.
 */
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
  textColor: isDark ? "#94a3b8" : "#374151",
  gridColor: isDark ? "#1f2937" : "#f3f4f6",
  borderColor: isDark ? "#374151" : "#e5e7eb",
});

const getSymbolBase = (sym: string) => sym.replace("USDT", "");

const getIntervalStartTimestamp = (intervalStr: string): number => {
  const now = Date.now();
  const floorMs = (ms: number) => Math.floor(now / ms) * ms / 1000;
  if (intervalStr.endsWith("s")) return floorMs(parseInt(intervalStr) * 1000);
  if (intervalStr.endsWith("m")) return floorMs(parseInt(intervalStr) * 60 * 1000);
  if (intervalStr.endsWith("h")) return floorMs(parseInt(intervalStr) * 3600 * 1000);
  if (intervalStr.endsWith("d")) return floorMs(parseInt(intervalStr) * 86400 * 1000);
  if (intervalStr.endsWith("w")) return floorMs(parseInt(intervalStr) * 7 * 86400 * 1000);
  if (intervalStr.endsWith("M")) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(1);
    return Math.floor(d.getTime() / 1000);
  }
  return Math.floor(now / 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
// Binance API — gunakan fetchAllCryptoKlines dari @/src/lib/binance
// (menggunakan api.binance.info agar tidak diblokir ISP Indonesia)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CoinIcon
// ─────────────────────────────────────────────────────────────────────────────

const CoinIcon = ({
  base,
  className = "h-6 w-6",
}: {
  base: string;
  className?: string;
}) => {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [base]);

  if (err || !base) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-secondary font-extrabold text-[10px] text-muted-foreground border border-border uppercase shrink-0 ${className}`}
      >
        {base ? base.slice(0, 2) : "?"}
      </div>
    );
  }
  return (
    <img
      src={`https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`}
      onError={() => setErr(true)}
      alt={base}
      className={`rounded-full object-cover border border-border/30 shrink-0 bg-secondary ${className}`}
    />
  );
};

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
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 mt-1.5 w-64 rounded-xl border border-border bg-card shadow-xl p-2 z-50"
          >
            {TIMEFRAME_GROUPS.map((group) => (
              <div key={group.group} className="mb-2 last:mb-0">
                {/* Group header */}
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {group.group}
                </div>
                {/* Grid of buttons */}
                <div className="grid grid-cols-4 gap-1">
                  {group.items.map((item) => {
                    const isActive = item.value === value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        className={`rounded-md py-1.5 text-xs font-semibold transition cursor-pointer select-none text-center ${isActive
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
// CryptoPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function CryptoPanel() {
  const { subscriptionTier, setSubscriptionTier, theme } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setIntervalState] = useState("1d");
  const [currentPrice, setCurrentPrice] = useState(68000.0);
  const [priceChange, setPriceChange] = useState(0.0);
  const [chartData, setChartData] = useState<KlineData[]>([]);

  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const lastBarRef = useRef<KlineData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Format helpers ──────────────────────────────────────────────────────────

  const formatPrice = (price: number) =>
    price < 0.01
      ? price.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 })
      : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Close coin dropdown on outside click ────────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsSelectOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch available pairs on mount ───────────────────────────────────────────

  useEffect(() => {
    fetchActiveCryptoPairs()
      .then(setAvailablePairs)
      .catch(() =>
        setAvailablePairs([
          "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT",
          "ADAUSDT", "XRPUSDT", "PEPEUSDT",
        ])
      );
  }, []);

  // ── Update last candle with latest price tick ────────────────────────────────

  const updateCandle = useCallback((price: number) => {
    if (!candlestickSeriesRef.current || !lastBarRef.current) return;
    const barTime = getIntervalStartTimestamp(interval);
    let updatedBar: KlineData;

    if (barTime === Number(lastBarRef.current.time)) {
      updatedBar = {
        time: lastBarRef.current.time,
        open: lastBarRef.current.open,
        high: Math.max(lastBarRef.current.high, price),
        low: Math.min(lastBarRef.current.low, price),
        close: price,
      };
    } else {
      if (barTime < Number(lastBarRef.current.time)) return;
      updatedBar = { time: barTime, open: price, high: price, low: price, close: price };
    }

    try {
      candlestickSeriesRef.current.update(updatedBar);
      lastBarRef.current = updatedBar;
    } catch {
      /* sinkronisasi tertunda */
    }
  }, [interval]);

  // ── 1. Load ALL historical klines via paginated Binance API ─────────────────

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoadingChart(true);
      setLoadingProgress(0);
      setErrorBanner(null);

      try {
        // Fetch harga saat ini secara paralel
        const [price, klines] = await Promise.all([
          fetchCryptoPrice(symbol),
          fetchAllCryptoKlines(symbol, interval, (count) => {
            if (active) setLoadingProgress(count);
          }),
        ]);

        if (!active) return;
        setCurrentPrice(price);
        setChartData(klines);
        if (klines.length > 0) lastBarRef.current = klines[klines.length - 1];

      } catch (err) {
        if (!active) return;
        console.error("Error loading data from Binance:", err);
        setErrorBanner("Gagal mengambil data Binance. Menggunakan mode simulasi...");

        // Fallback data
        const fakeTime = Math.floor(Date.now() / 1000);
        let base = 68000.0;
        if (symbol.includes("ETH")) base = 3500.0;
        if (symbol.includes("SOL")) base = 150.0;
        if (symbol.includes("PEPE")) base = 0.000012;

        const fakeKlines: KlineData[] = Array.from({ length: 300 }, (_, i) => ({
          time: fakeTime - (299 - i) * 86400,
          open: base * (1 + (Math.random() - 0.5) * 0.05),
          high: base * (1 + Math.random() * 0.05),
          low: base * (1 - Math.random() * 0.05),
          close: base,
        }));
        setChartData(fakeKlines);
        lastBarRef.current = fakeKlines[fakeKlines.length - 1];
      } finally {
        if (active) {
          setIsLoadingChart(false);
          setLoadingProgress(0);
        }
      }
    }

    loadData();
    return () => { active = false; };
  }, [symbol, interval]);

  // ── 2. Setup / update Lightweight Chart sesuai tema ─────────────────────────

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // FIX: deteksi tema yang benar
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
        secondsVisible: interval === "1s",
        // Tidak menggunakan tickMarkFormatter — library sudah handle dengan benar.
        // Candle 1D di 00:00 UTC adalah BENAR sesuai standar Binance & TradingView.
      },
      localization: {
        // FIX: gunakan UTC methods untuk hindari offset WIB
        timeFormatter: (ts: number) => formatTimestampUTC(ts),
      },
    };

    if (!chartRef.current) {
      const width = container.clientWidth;
      if (width <= 0) return;

      const chart = createChart(container, { width, height: 320, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      const handleResize = () => {
        chartRef.current?.resize(container.clientWidth, 320);
      };
      window.addEventListener("resize", handleResize);
      (chartRef.current as any).__handleResize = handleResize;

    } else {
      // Chart sudah ada → hanya update opsi (warna tema, secondsVisible, dll)
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, symbol, interval]);

  // ── 3. Set chart data setelah klines dimuat ──────────────────────────────────

  useEffect(() => {
    if (candlestickSeriesRef.current && chartData.length > 0) {
      candlestickSeriesRef.current.setData(chartData);
      // Scroll ke candle terbaru
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [chartData]);

  // ── Cleanup saat unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        const h = (chartRef.current as any).__handleResize;
        if (h) window.removeEventListener("resize", h);
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  // ── 4. Real-time WebSocket (Premium only) ────────────────────────────────────

  useEffect(() => {
    if (!isPremium || isLoadingChart) return;

    let ws: WebSocket | null = null;
    let fallback: NodeJS.Timeout | null = null;
    let gotWs = false;

    const startFallback = () => {
      if (fallback) return;
      fallback = setInterval(async () => {
        try {
          const p = await fetchCryptoPrice(symbol);
          setCurrentPrice(p);
          updateCandle(p);
        } catch {
          const drift = (Math.random() - 0.5) * priceRef.current * 0.0005;
          const dec = symbol.includes("PEPE") ? 8 : 2;
          const p = parseFloat((priceRef.current + drift).toFixed(dec));
          setCurrentPrice(p);
          updateCandle(p);
        }
      }, 3000);
    };

    try {
      ws = connectCryptoWebSocket(
        symbol,
        ({ price, changePercent }) => {
          gotWs = true;
          setCurrentPrice(price);
          setPriceChange(changePercent);
          updateCandle(price);
        },
        startFallback
      );
      ws.onclose = startFallback;

      const timer = setTimeout(() => { if (!gotWs) startFallback(); }, 4000);
      return () => {
        clearTimeout(timer);
        ws?.close();
        if (fallback) clearInterval(fallback);
      };
    } catch {
      startFallback();
      return () => { if (fallback) clearInterval(fallback); };
    }
  }, [isPremium, symbol, interval, isLoadingChart, updateCandle]);

  // ── Filtered pairs ───────────────────────────────────────────────────────────

  const filteredPairs = availablePairs.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <CoinIcon base={getSymbolBase(symbol)} className="h-12 w-12" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {getSymbolBase(symbol)} / USDT
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                Crypto
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Binance REST + Live WebSocket Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">Harga Live</div>
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
              ${formatPrice(currentPrice)}
            </h3>
          </div>
          <div>
            <div className="text-sm font-semibold text-muted-foreground">Perubahan 24j</div>
            <div
              className={`flex items-center gap-0.5 text-sm font-extrabold justify-end ${priceChange >= 0 ? "text-emerald-500" : "text-destructive"
                }`}
            >
              {priceChange >= 0
                ? <ArrowUpRight className="h-4 w-4" />
                : <ArrowDownRight className="h-4 w-4" />}
              <span>{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 mb-6 z-40 relative">
          <div className="flex items-center gap-3 flex-wrap">

            {/* Coin Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="flex items-center justify-between gap-3 w-44 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <CoinIcon base={getSymbolBase(symbol)} className="h-5 w-5" />
                  <span>{getSymbolBase(symbol)}/USDT</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition duration-200 ${isSelectOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {isSelectOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-1.5 w-60 rounded-xl border border-border bg-card shadow-lg p-2.5 z-50 space-y-2 max-h-80 overflow-hidden flex flex-col"
                  >
                    <div className="relative flex items-center shrink-0">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Cari crypto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-brand-green"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                      {filteredPairs.length > 0 ? (
                        filteredPairs.map((pair) => {
                          const base = getSymbolBase(pair);
                          const isSelected = pair === symbol;
                          return (
                            <button
                              key={pair}
                              onClick={() => {
                                setSymbol(pair);
                                setIsSelectOpen(false);
                                setSearchQuery("");
                              }}
                              className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${isSelected
                                  ? "bg-brand-green/10 text-brand-green font-bold"
                                  : "text-foreground hover:bg-secondary"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <CoinIcon base={base} className="h-4 w-4" />
                                <span>{base} / USDT</span>
                              </div>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-brand-green shrink-0" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-[10px] text-muted-foreground text-center py-4">
                          Koin tidak ditemukan
                        </div>
                      )}
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

            {/* Live / Delayed badge */}
            {isPremium ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full select-none">
                <Zap className="h-3 w-3 fill-current animate-pulse" /> LIVE STREAMING
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full select-none">
                <Clock className="h-3 w-3" /> DELAYED FEED
              </span>
            )}
          </div>

          {/* Candle count info */}
          {!isLoadingChart && chartData.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none">
              <History className="h-3 w-3" />
              <span>{chartData.length.toLocaleString("id-ID")} candle</span>
            </div>
          )}
        </div>

        {/* Chart Container */}
        <div className="h-80 w-full relative z-10">

          {/* Free Tier Overlay */}
          {!isPremium && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/75 backdrop-blur-xs p-6 text-center select-none animate-in fade-in duration-200">
              <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
              <h4 className="text-md font-bold text-foreground">
                Grafik Real-Time Terkunci
              </h4>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
                Anda menggunakan akun <strong>Free</strong>. Tingkatkan ke{" "}
                <strong>Premium</strong> untuk membuka grafik kripto real-time
                WebSocket dan signal WhatsApp.
              </p>
              <button
                onClick={() => setSubscriptionTier("premium")}
                className="mt-4 rounded-full bg-brand-green py-2 px-6 text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer"
              >
                UPGRADE KE PREMIUM
              </button>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-card rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              {loadingProgress > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    Memuat data historis...
                  </p>
                  <p className="text-xs font-bold text-brand-green">
                    {loadingProgress.toLocaleString("id-ID")} candle
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart Canvas */}
          <div
            ref={chartContainerRef}
            className={`w-full h-80 ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      {/* Portfolio Tracker & Signal Configurator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PortfolioTracker
          currentPrice={currentPrice}
          activeSymbol={symbol}
          isStock={false}
        />
        <SignalConfigurator
          activeSymbol={symbol}
          currentPrice={currentPrice}
        />
      </div>

    </div>
  );
}