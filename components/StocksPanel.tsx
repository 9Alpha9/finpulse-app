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
} from "lucide-react";
import { getLocalWatchlist, saveLocalWatchlist } from "@/app/utils/supabase";
import {
  getStockInfo,
  fetchStockKlinesFromYahoo,
  fetchStockKlinesMock,
  stockTickers,
  StockKline,
  StockInfo,
} from "@/src/lib/stocks";
import { createChart, CandlestickSeries, ColorType } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
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
// Constants — Timeframe Groups (Stocks: tidak ada detik/sub-menit)
// Yahoo Finance mendukung: 1m, 2m, 5m, 15m, 30m, 60m, 90m,
//                          1d, 5d, 1wk, 1mo, 3mo
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

/**
 * Format Unix timestamp (detik) ke string tanggal + jam menggunakan
 * UTC methods — tidak ada offset timezone otomatis ke WIB.
 * Untuk saham IDX (bursa lokal), jam trading 09:00–16:00 WIB = 02:00–09:00 UTC.
 * Tampilkan apa adanya dari data Yahoo (UTC) agar konsisten.
 */
const formatTimestampUTC = (ts: number): string => {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getUTCDate())} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}, ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
};

/**
 * Kembalikan warna chart berdasarkan mode gelap/terang.
 * Sama persis dengan CryptoPanel agar tampilan konsisten.
 */
const getThemeColors = (isDark: boolean) => ({
  backgroundColor: isDark ? "#111827" : "#ffffff",
  textColor: isDark ? "#94a3b8" : "#374151",
  gridColor: isDark ? "#1f2937" : "#f3f4f6",
  borderColor: isDark ? "#374151" : "#e5e7eb",
});

const getStockIconColor = (sym: string): string => {
  const map: Record<string, string> = {
    BBCA: "text-blue-500 bg-blue-500/10",
    BBRI: "text-cyan-500 bg-cyan-500/10",
    TLKM: "text-red-500 bg-red-500/10",
    BMRI: "text-yellow-500 bg-yellow-500/10",
    ASII: "text-purple-500 bg-purple-500/10",
    WBSA: "text-emerald-500 bg-emerald-500/10",
  };
  return map[sym] ?? "text-slate-500 bg-slate-500/10";
};

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance — fetch ALL historical klines dengan paginasi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua data historis dari Yahoo Finance menggunakan paginasi
 * mundur dari sekarang sampai tidak ada data lagi.
 *
 * Yahoo Finance tidak mendukung `startTime=0` langsung, jadi kita pakai
 * `period1` yang sangat jauh ke belakang (tahun 2000) sebagai anchor awal,
 * lalu ambil sebanyak-banyaknya dalam satu request karena Yahoo tidak membatasi
 * jumlah candle per request (berbeda dengan Binance).
 *
 * Fallback ke mock jika Yahoo gagal.
 */
async function fetchAllStockKlines(
  symbol: string,
  interval: string,
  onProgress?: (count: number) => void
): Promise<StockKline[]> {
  // Untuk interval menit, Yahoo membatasi rentang maksimal:
  // 1m = 7 hari, 2m/5m/15m/30m/60m/90m = 60 hari
  // Untuk interval harian ke atas: ambil sejak 2000-01-01
  const isIntraday = ["1m", "2m", "5m", "15m", "30m", "60m", "90m"].includes(interval);
  const intradayDays: Record<string, number> = {
    "1m": 7, "2m": 60, "5m": 60,
    "15m": 60, "30m": 60, "60m": 60, "90m": 60,
  };

  const now = Math.floor(Date.now() / 1000);
  const period2 = now;
  const period1 = isIntraday
    ? now - (intradayDays[interval] ?? 60) * 86400
    : Math.floor(new Date("2000-01-01").getTime() / 1000);

  // Konversi interval ke format Yahoo Finance
  const yahooInterval = interval; // Yahoo pakai format yang sama

  try {
    const klines = await fetchStockKlinesFromYahoo(symbol, interval, 5000);
    if (klines && klines.length > 0) {
      onProgress?.(klines.length);
      return klines;
    }
    throw new Error("Data kosong dari Yahoo");
  } catch (err) {
    // Jika Yahoo gagal, gunakan mock
    const mock = fetchStockKlinesMock(symbol, interval, 300);
    onProgress?.(mock.length);
    return mock;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeframeDropdown — identik dengan CryptoPanel
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
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
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
// StocksPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPanel() {
  const { theme } = useThemeAuth();

  const [selectedStock, setSelectedStock] = useState<string>("BBCA");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [chartData, setChartData] = useState<StockKline[]>([]);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [interval, setIntervalState] = useState<string>("1d");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Sync watchlist on mount ──────────────────────────────────────────────────

  useEffect(() => {
    setWatchlist(getLocalWatchlist());
  }, []);

  // ── Close stock selector on outside click ───────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsSelectOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── 1. Load historical klines + stock metadata ───────────────────────────────

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoadingChart(true);
      setLoadingProgress(0);
      setErrorBanner(null);

      try {
        const klines = await fetchAllStockKlines(
          selectedStock,
          interval,
          (count) => { if (active) setLoadingProgress(count); }
        );

        if (!active) return;

        if (klines && klines.length > 0) {
          setChartData(klines);

          const lastClose = klines[klines.length - 1].close;
          const prevClose = klines.length > 1 ? klines[klines.length - 2].close : lastClose;
          const change = lastClose - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          const meta = stockTickers[selectedStock] ?? stockTickers.BBCA;

          setStock({
            ...meta,
            price: lastClose,
            change,
            changePercent,
            prevClose,
          } as StockInfo);
        } else {
          throw new Error("Data kline kosong.");
        }
      } catch (err: any) {
        if (!active) return;

        console.warn(`Gagal mengambil data ${selectedStock}:`, err);
        setErrorBanner(
          "Gagal mengambil data real-time dari Yahoo Finance. Menggunakan mode simulasi..."
        );

        const mockKlines = fetchStockKlinesMock(selectedStock, interval, 300);
        setChartData(mockKlines);
        setStock(getStockInfo(selectedStock));
      } finally {
        if (active) {
          setIsLoadingChart(false);
          setLoadingProgress(0);
        }
      }
    }

    loadData();
    return () => { active = false; };
  }, [selectedStock, interval]);

  // ── 2. Setup / update Lightweight Chart sesuai tema ─────────────────────────
  //
  // Sama persis dengan pola CryptoPanel:
  // - isDark = theme === "dark" (bukan || "light")
  // - getThemeColors() sebagai satu sumber kebenaran warna
  // - applyOptions() jika chart sudah ada, createChart() jika belum

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
        // Gunakan UTC agar tidak ada offset WIB otomatis
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

      const handleResize = () => {
        chartRef.current?.resize(container.clientWidth, 300);
      };
      window.addEventListener("resize", handleResize);
      (chartRef.current as any).__handleResize = handleResize;

    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, selectedStock, interval]);

  // ── 3. Set chart data setelah klines dimuat ──────────────────────────────────

  useEffect(() => {
    if (candlestickSeriesRef.current && chartData.length > 0) {
      candlestickSeriesRef.current.setData(chartData);
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

  // ── Watchlist toggle ─────────────────────────────────────────────────────────

  const isInWatchlist = watchlist.includes(selectedStock);

  const toggleWatchlist = () => {
    const next = isInWatchlist
      ? watchlist.filter((s) => s !== selectedStock)
      : [...watchlist, selectedStock];
    setWatchlist(next);
    saveLocalWatchlist(next);
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

      {/* Stock Header */}
      {stock && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-xs ${getStockIconColor(selectedStock)}`}
            >
              {selectedStock}
            </span>
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

          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Harga Terakhir</div>
              <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                Rp {stock.price.toLocaleString("id-ID")}
              </h3>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Perubahan</div>
              <div
                className={`flex items-center gap-0.5 text-sm font-extrabold justify-end ${stock.change >= 0 ? "text-emerald-500" : "text-destructive"
                  }`}
              >
                {stock.change >= 0
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                <span>
                  {stock.change >= 0 ? "+" : ""}
                  {stock.change.toLocaleString("id-ID")} ({stock.changePercent.toFixed(2)}%)
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
                className="flex items-center justify-between gap-3 w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full font-bold text-[9px] ${getStockIconColor(selectedStock)}`}
                  >
                    {selectedStock.slice(0, 2)}
                  </span>
                  <span>IDX: {selectedStock}</span>
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
                    className="absolute left-0 mt-1.5 w-60 rounded-xl border border-border bg-card shadow-lg p-2 z-50 max-h-80 overflow-y-auto"
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
                            onClick={() => {
                              setSelectedStock(sym);
                              setIsSelectOpen(false);
                            }}
                            className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${isSelected
                                ? "bg-brand-green/10 text-brand-green font-bold"
                                : "text-foreground hover:bg-secondary"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full font-bold text-[8px] ${getStockIconColor(sym)}`}
                              >
                                {sym.slice(0, 2)}
                              </span>
                              <div>
                                <div className="font-semibold">{sym}</div>
                                <div className="text-[9px] text-muted-foreground truncate max-w-[130px]">
                                  {ticker.name}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-brand-green shrink-0" />
                            )}
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
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold border transition cursor-pointer select-none ${isInWatchlist
                  ? "bg-brand-green/15 border-brand-green/20 text-brand-green"
                  : "bg-background border-border text-foreground hover:bg-secondary"
                }`}
            >
              {isInWatchlist
                ? <Check className="h-3.5 w-3.5" />
                : <Plus className="h-3.5 w-3.5" />}
              <span>{isInWatchlist ? "DIWATCHLIST" : "TAMBAH WATCHLIST"}</span>
            </button>
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
        <div className="h-[300px] w-full relative z-10">

          {/* Loading Overlay */}
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-card rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              {loadingProgress > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-muted-foreground">Memuat data historis...</p>
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
              { label: "Rasio P/E", value: stock.peRatio },
              { label: "Yield Dividen", value: stock.dividendYield },
              { label: "Kapitalisasi Pasar", value: stock.marketCap },
              { label: "Volume Transaksi", value: `${stock.volume} shares` },
              {
                label: "Harga Kemarin",
                value: `Rp ${stock.prevClose.toLocaleString("id-ID")}`,
                wide: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`border border-border rounded-xl p-3 bg-muted/20 ${item.wide ? "col-span-2 sm:col-span-1" : ""
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