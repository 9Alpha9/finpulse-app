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
  X,
} from "lucide-react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import {
  fetchCryptoPrice,
  fetchAllCryptoKlines,
  connectCryptoWebSocket,
  fetchActiveCryptoPairs,
  KlineData,
} from "@/src/lib/binance";
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";
import PaperTrading from "./PaperTrading";
import MarketMarquee from "./MarketMarquee";

// ─────────────────────────────────────────────────────────────────────────────
// Live Price Component untuk Modal
// ─────────────────────────────────────────────────────────────────────────────
function LiveCryptoPrice({ symbol, basePrice, mainPrice }: { symbol: string; basePrice: number | null; mainPrice?: number }) {
  const [price, setPrice] = useState(mainPrice || basePrice || 0);
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "neutral">("neutral");

  // Sync with mainPrice if it is the selected crypto
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

  // Jitter simulation for non-selected cryptos
  useEffect(() => {
    if (mainPrice !== undefined) return; // Jangan lakukan simulasi jika tersinkronisasi
    if (!basePrice) return;
    setPrice(basePrice);

    let active = true;
    const interval = setInterval(() => {
      if (!active) return;
      const jitter = (Math.random() - 0.5) * (basePrice * 0.002);
      const newPrice = basePrice + jitter;
      setPrice(prev => {
        if (newPrice > prev) setTickDirection("up");
        else if (newPrice < prev) setTickDirection("down");
        return newPrice;
      });
      setTimeout(() => { if (active) setTickDirection("neutral"); }, 300);
    }, 2000 + Math.random() * 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [basePrice, mainPrice]);

  if (price === 0) return <span className="text-muted-foreground animate-pulse">...</span>;

  return (
    <motion.div
      animate={{ color: tickDirection === "up" ? "#089981" : tickDirection === "down" ? "#f23645" : undefined }}
      transition={{ duration: 0.1 }}
      className="text-xs font-bold tabular-nums text-right transition-colors whitespace-nowrap pl-2"
    >
      ${price < 0.01 ? price.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
// TimeframeDropdown (Crypto - Dengan Swipe-to-Close & Auto-Hide BottomNav)
// ─────────────────────────────────────────────────────────────────────────────

const TimeframeDropdown = ({
  value,
  onChange,
  onOpenChange, // <--- Prop untuk menyembunyikan BottomNav
}: {
  value: string;
  onChange: (v: string) => void;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = ALL_TIMEFRAMES.find((t) => t.value === value);

  // Fungsi toggle tersentralisasi
  const toggle = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen); // Kirim sinyal ke parent
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
            {/* Backdrop Gelap Khusus Mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 sm:hidden"
            />

            {/* Panel Pilihan Waktu (DENGAN DRAG TO CLOSE) */}
            <motion.div
              initial={{ opacity: 0, y: "10%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "10%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[9999] p-4 sm:p-3 bg-card rounded-t-3xl sm:rounded-xl border-t sm:border border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:mt-2 sm:w-[300px] pb-8 sm:pb-3"
            >
              {/* Grabber Handle */}
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
                              toggle(false); // Tutup menu
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
// CryptoPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function CryptoPanel({ onOpenChange, hideMarquee, symbol: extSymbol, onSymbolChange }: { onOpenChange?: (open: boolean) => void; hideMarquee?: boolean; symbol?: string; onSymbolChange?: (sym: string) => void }) {
  const { subscriptionTier, setSubscriptionTier, theme } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [internalSymbol, setInternalSymbol] = useState("BTCUSDT");
  const symbol = extSymbol || internalSymbol;
  const setSymbol = (sym: string) => {
    setInternalSymbol(sym);
    onSymbolChange?.(sym);
  };
  const [interval, setIntervalState] = useState("1d");
  const [currentPrice, setCurrentPrice] = useState(68000.0);
  const [priceChange, setPriceChange] = useState(0.0);
  const [chartData, setChartData] = useState<KlineData[]>([]);

  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [allPrices, setAllPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isSelectOpen) {
      fetch("/api/crypto/price")
        .then(r => r.json())
        .then(data => {
          const map: Record<string, number> = {};
          data.forEach((item: any) => map[item.symbol] = parseFloat(item.price));
          setAllPrices(map);
        })
        .catch(console.error);
    }
  }, [isSelectOpen]);

  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const lastBarRef = useRef<KlineData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const klineCache = useRef<Map<string, KlineData[]>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollListenerRef = useRef<any>(null);

  // Menyimpan arah tick transaksi *terakhir*.
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "neutral">("neutral");
  const prevPriceRef = useRef<number>(currentPrice);

  useEffect(() => {
    if (currentPrice > prevPriceRef.current && prevPriceRef.current !== 0) {
      setTickDirection("up");
    } else if (currentPrice < prevPriceRef.current && prevPriceRef.current !== 0) {
      setTickDirection("down");
    }
    if (currentPrice > 0) {
      prevPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  const formatPrice = (price: number) =>
    price < 0.01
      ? price.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 })
      : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    onOpenChange?.(isSelectOpen);
  }, [isSelectOpen, onOpenChange]);

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
    } catch { }
  }, [interval]);

  useEffect(() => {
    let active = true;
    const cacheKey = `${symbol}_${interval}`;

    function applyToChart(data: KlineData[]) {
      if (!active) return;
      if (candlestickSeriesRef.current && chartRef.current) {
        candlestickSeriesRef.current.setData(data);
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        chartRef.current.timeScale().fitContent();
        chartRef.current.timeScale().scrollToRealTime();
      }
      setChartData(data);
      if (data.length > 0) lastBarRef.current = data[data.length - 1];
    }

    async function loadData() {
      setErrorBanner(null);
      setLoadingMore(false);
      setCurrentPrice(0);
      setPriceChange(0);
      setTickDirection("neutral");

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData([]);
        chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      }

      const cached = klineCache.current.get(cacheKey);
      if (cached && cached.length > 0) {
        applyToChart(cached);
        setIsLoadingChart(false);
        fetchCryptoPrice(symbol)
          .then((p) => { if (active) setCurrentPrice(p); })
          .catch(() => { });
        return;
      }

      setIsLoadingChart(true);
      try {
        const [price, allKlines] = await Promise.all([
          fetchCryptoPrice(symbol),
          fetchAllCryptoKlines(symbol, interval),
        ]);

        if (!active) return;
        setCurrentPrice(price);
        applyToChart(allKlines);
        setIsLoadingChart(false);
        klineCache.current.set(cacheKey, allKlines);

      } catch (err) {
        if (!active) return;
        setIsLoadingChart(false);
        setLoadingMore(false);
        setErrorBanner("Gagal mengambil data Binance. Menggunakan mode simulasi...");

        const fakeTime = Math.floor(Date.now() / 1000);
        let base = 68000.0;
        if (symbol.includes("ETH")) base = 3500.0;
        if (symbol.includes("BNB")) base = 600.0;
        if (symbol.includes("SOL")) base = 150.0;
        if (symbol.includes("XRP")) base = 0.5;
        if (symbol.includes("ADA")) base = 0.45;
        if (symbol.includes("PEPE") || symbol.includes("SHIB")) base = 0.000012;

        const fakeKlines: KlineData[] = Array.from({ length: 300 }, (_, i) => {
          const noise = (Math.random() - 0.5) * 0.04;
          const o = base * (1 + noise);
          const c = base * (1 + (Math.random() - 0.5) * 0.04);
          return {
            time: fakeTime - (299 - i) * 86400,
            open: o,
            high: Math.max(o, c) * (1 + Math.random() * 0.02),
            low: Math.min(o, c) * (1 - Math.random() * 0.02),
            close: c,
          };
        });
        applyToChart(fakeKlines);
      }
    }

    loadData();
    return () => { 
      active = false; 
      if (chartRef.current && scrollListenerRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(scrollListenerRef.current);
        scrollListenerRef.current = null;
      }
    };
  }, [symbol, interval]);

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
        secondsVisible: interval === "1s",
      },
      localization: {
        timeFormatter: (ts: number) => formatTimestampUTC(ts),
      },
    };

    if (!chartRef.current) {
      // 1. Ambil lebar dan tinggi dinamis CSS
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      const chart = createChart(container, { width, height, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#089981", // Warna Hijau TradingView
        downColor: "#f23645", // Warna Merah TradingView
        borderVisible: false,
        wickUpColor: "#089981",
        wickDownColor: "#f23645",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      // 2. Gunakan handleResize dinamis dengan ResizeObserver
      const handleResize = () => {
        if (container) chartRef.current?.resize(container.clientWidth, container.clientHeight);
      };
      const observer = new ResizeObserver(handleResize);
      observer.observe(container);
      resizeObserverRef.current = observer;

      // Hilangkan watermark logo TV menggunakan DOM API jika ada
      const style = document.createElement("style");
      style.innerHTML = `
        .tv-lightweight-charts table tr td:nth-child(2) div[style*="z-index: 2"] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, symbol, interval]);

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

  // ── 4. Real-time price update (WebSocket) ─────────────

  useEffect(() => {
    if (!isPremium) return;

    let ws: WebSocket | null = null;
    let fallback: NodeJS.Timeout | null = null;
    let active = true;
    let gotWs = false;

    const startFallback = () => {
      if (fallback || !active) return;
      fallback = setInterval(async () => {
        if (!active) return;
        try {
          const p = await fetchCryptoPrice(symbol);
          if (active) {
            setCurrentPrice(p);
            updateCandle(p);
          }
        } catch {
          if (active && priceRef.current > 0) {
            const drift = (Math.random() - 0.5) * priceRef.current * 0.0005;
            const dec = symbol.includes("PEPE") || symbol.includes("SHIB") ? 8 : 2;
            const p = parseFloat((priceRef.current + drift).toFixed(dec));
            setCurrentPrice(p);
            updateCandle(p);
          }
        }
      }, 3000);
    };

    try {
      ws = connectCryptoWebSocket(
        symbol,
        ({ price, changePercent }) => {
          if (!active) return;
          gotWs = true;
          setCurrentPrice(price);
          setPriceChange(changePercent);
          updateCandle(price);
        },
        startFallback
      );
      ws.onclose = () => { if (active) startFallback(); };

      const timer = setTimeout(() => { if (!gotWs && active) startFallback(); }, 4000);
      return () => {
        active = false;
        clearTimeout(timer);
        ws?.close();
        if (fallback) clearInterval(fallback);
      };
    } catch {
      startFallback();
      return () => {
        active = false;
        if (fallback) clearInterval(fallback);
      };
    }
  }, [isPremium, symbol, updateCandle]);

  const filteredPairs = availablePairs.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {!hideMarquee && (
        <div className="w-full overflow-hidden rounded-t-xl mb-4">
          <MarketMarquee marketType="crypto" />
        </div>
      )}

      {/* Header Info - Responsif Mobile Sama dengan StocksPanel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">

        <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto border-b border-border/40 md:border-none pb-4 md:pb-0">
          <CoinIcon base={getSymbolBase(symbol)} className="h-10 w-10 md:h-12 md:w-12 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate max-w-full">
                {getSymbolBase(symbol)} / USDT
              </h2>
              <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Crypto
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              Binance REST + Live WebSocket Stream
            </p>
          </div>
        </div>

        <div className="flex items-baseline justify-between md:justify-end w-full md:w-auto gap-4 md:gap-8 text-left md:text-right pt-2 md:pt-0">
          <div>
            <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">Harga Realtime</div>
            <motion.h3
              animate={{
                color: tickDirection === "up" ? "#089981" : tickDirection === "down" ? "#f23645" : (theme === "dark" ? "#f8fafc" : "#0f172a"),
              }}
              transition={{ duration: 0.1 }}
              className="text-lg sm:text-2xl font-extrabold tracking-tight px-1 py-0.5"
            >
              {currentPrice === 0
                ? <span className="text-muted-foreground animate-pulse">···</span>
                : `$${formatPrice(currentPrice)}`}
            </motion.h3>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">Perubahan 24j</div>
            <motion.div
              className={`flex items-center gap-0.5 text-xs sm:text-sm font-extrabold justify-end ${priceChange >= 0 ? "text-[#089981]" : "text-[#f23645]"}`}
            >
              {priceChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              <span>{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
            </motion.div>
          </div>
        </div>

      </div>

      {/* Chart Card */}
      <div className="relative rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">

        {/* Controls Bar - Responsif Mobile */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 md:pb-4 mb-4 md:mb-6 z-40 relative">

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            {/* Coin Selector */}
            <div className="relative flex-1 md:flex-none" ref={dropdownRef}>
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="flex items-center justify-between gap-2 w-full md:w-48 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs sm:text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <CoinIcon base={getSymbolBase(symbol)} className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                  <span className="truncate">{getSymbolBase(symbol)}/USDT</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition duration-200 shrink-0 ${isSelectOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isSelectOpen && (
                  <>
                    {/* Backdrop Gelap Statis */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    >
                      {/* Modal Container */}
                      <motion.div
                        initial={{ opacity: 0, y: "50%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="bg-card w-full sm:w-[437px] rounded-t-3xl sm:rounded-2xl border-t sm:border border-border shadow-2xl p-5 pb-8 sm:pb-5 flex flex-col max-h-[80vh] sm:max-h-[70vh] outline-none"
                      >
                        {/* Grabber Handle (Mobile Only) */}
                        <div className="w-12 h-1.5 bg-secondary-foreground/20 rounded-full mx-auto mb-5 sm:hidden shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3 shrink-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Pilih Aset Crypto
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSelectOpen(false)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer transition p-1"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex items-center shrink-0 mb-3">
                          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Cari crypto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                          {filteredPairs.length > 0 ? (
                            filteredPairs.map((pair) => {
                              const base = getSymbolBase(pair);
                              const isSelected = pair === symbol;
                              return (
                                <button
                                  key={pair}
                                  onClick={() => { setSymbol(pair); setIsSelectOpen(false); setSearchQuery(""); }}
                                  className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${isSelected
                                    ? "bg-brand-green/10 text-brand-green font-bold"
                                    : "text-foreground hover:bg-secondary"
                                    }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <CoinIcon base={base} className="h-4 w-4 shrink-0" />
                                      <span className="truncate">{base} / USDT</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <LiveCryptoPrice symbol={pair} basePrice={allPrices[pair] || null} mainPrice={isSelected ? currentPrice : undefined} />
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
                            <div className="text-[10px] text-muted-foreground text-center py-4">Koin tidak ditemukan</div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <TimeframeDropdown value={interval}
              onChange={(v) => setIntervalState(v)}
              onOpenChange={onOpenChange} />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end mt-1 md:mt-0">
            {isPremium ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 sm:py-0.5 rounded-full select-none whitespace-nowrap">
                <Zap className="h-3 w-3 fill-current animate-pulse" /> Data Realtime
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 sm:py-0.5 rounded-full select-none whitespace-nowrap">
                <Clock className="h-3 w-3" /> DELAYED FEED
              </span>
            )}

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

        {/* Chart Container - Tinggi diatur statis di CSS, canvas mengikuti dari Javascript clientHeight */}
        <div className="h-[250px] sm:h-[300px] w-full relative z-10">

          {!isPremium && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/80 backdrop-blur-xs p-4 sm:p-6 text-center select-none animate-in fade-in duration-200 rounded-xl">
              <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 mb-2 sm:mb-3" />
              <h4 className="text-sm sm:text-md font-bold text-foreground">Grafik Real-Time Terkunci</h4>
              <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-muted-foreground max-w-xs sm:max-w-sm leading-relaxed">
                Anda menggunakan akun <strong>Free</strong>. Tingkatkan ke <strong>Premium</strong> untuk membuka grafik kripto real-time WebSocket.
              </p>
              <button
                onClick={() => setSubscriptionTier("premium")}
                className="mt-3 sm:mt-4 rounded-full bg-brand-green py-1.5 sm:py-2 px-4 sm:px-6 text-[10px] sm:text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer"
              >
                UPGRADE KE PREMIUM
              </button>
            </div>
          )}

          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-card/80 backdrop-blur-xs rounded-xl">
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-brand-green" />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Memuat grafik...</p>
            </div>
          )}

          <div
            ref={chartContainerRef}
            className={`w-full h-[250px] sm:h-[300px] ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <PortfolioTracker currentPrice={currentPrice} activeSymbol={symbol} isStock={false} />
        <SignalConfigurator activeSymbol={symbol} currentPrice={currentPrice} />
      </div>
      {/* Letakkan di baris paling bawah, sebelum penutup tag div utama */}
      <div>
        <PaperTrading
          activeSymbol={symbol}
          marketType="crypto"
          currentPrice={currentPrice}
        />
      </div>
    </div>
  );
}