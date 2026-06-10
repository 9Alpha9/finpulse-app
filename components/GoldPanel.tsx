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
} from "lucide-react";
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { motion } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Instruments
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldInstrument {
  symbol:   string;
  label:    string;
  category: "spot" | "etf" | "miner" | "idx";
  currency: "USD" | "IDR";
  unit:     string;
  color:    string;
}

export const GOLD_INSTRUMENTS: GoldInstrument[] = [
  { symbol: "GC=F",    label: "Gold Futures (COMEX)",  category: "spot",  currency: "USD", unit: "troy oz", color: "bg-amber-500/15 text-amber-500" },
  { symbol: "GLD",     label: "SPDR Gold Shares",      category: "etf",   currency: "USD", unit: "lembar",  color: "bg-yellow-500/15 text-yellow-500" },
  { symbol: "IAU",     label: "iShares Gold Trust",    category: "etf",   currency: "USD", unit: "lembar",  color: "bg-yellow-600/15 text-yellow-600" },
  { symbol: "SGOL",    label: "Aberdeen Gold ETF",     category: "etf",   currency: "USD", unit: "lembar",  color: "bg-amber-400/15 text-amber-400" },
  { symbol: "GLDM",    label: "SPDR Gold MiniShares",  category: "etf",   currency: "USD", unit: "lembar",  color: "bg-amber-600/15 text-amber-600" },
  { symbol: "GDX",     label: "VanEck Gold Miners",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-orange-500/15 text-orange-500" },
  { symbol: "GDXJ",    label: "Junior Gold Miners",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-orange-600/15 text-orange-600" },
  { symbol: "GOLD",    label: "Barrick Gold Corp",     category: "miner", currency: "USD", unit: "lembar",  color: "bg-rose-500/15 text-rose-500" },
  { symbol: "NEM",     label: "Newmont Corporation",   category: "miner", currency: "USD", unit: "lembar",  color: "bg-rose-600/15 text-rose-600" },
  { symbol: "AEM",     label: "Agnico Eagle Mines",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-pink-500/15 text-pink-500" },
  { symbol: "ANTM.JK", label: "Antam (IDX: ANTM)",    category: "idx",   currency: "IDR", unit: "lembar",  color: "bg-blue-500/15 text-blue-500" },
  { symbol: "MDKA.JK", label: "Merdeka Copper Gold",  category: "idx",   currency: "IDR", unit: "lembar",  color: "bg-blue-600/15 text-blue-600" },
];

const CATEGORY_LABELS: Record<string, string> = {
  spot:  "Spot & Futures",
  etf:   "ETF Emas",
  miner: "Saham Tambang",
  idx:   "IDX Emas",
};

const TIMEFRAMES = [
  { label: "1H",   value: "1d"  },
  { label: "1Mgg", value: "1wk" },
  { label: "1Bln", value: "1mo" },
  { label: "3Bln", value: "3mo" },
  { label: "Max",  value: "max" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Kline {
  time:  number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
}

interface GoldQuote {
  symbol:        string;
  price:         number;
  change:        number;
  changePercent: number;
  prevClose:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

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
    textColor:       isDark ? "#94a3b8" : "#374151",
    gridColor:       isDark ? "#1f2937" : "#f3f4f6",
    borderColor:     isDark ? "#374151" : "#e5e7eb",
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
    const last  = klines[klines.length - 1];
    const prev  = klines[klines.length - 2];
    const change = last.close - prev.close;
    const changePercent = prev.close > 0 ? (change / prev.close) * 100 : 0;
    return { symbol, price: last.close, change, changePercent, prevClose: prev.close };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gold Icon
// ─────────────────────────────────────────────────────────────────────────────

function GoldIcon({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const isIDX   = symbol.endsWith(".JK");
  const isMiner = ["GOLD","NEM","AEM"].includes(symbol);

  if (isIDX) {
    const initials = symbol.replace(".JK", "").slice(0, 4);
    return (
      <div
        className="flex items-center justify-center rounded-xl font-bold text-white bg-blue-600"
        style={{ width: size, height: size, fontSize: size * 0.26, borderRadius: size * 0.25 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill={isMiner ? "#92400e" : "#D97706"} />
      <text x="20" y="15" textAnchor="middle" fill="#FEF3C7" fontSize="7" fontWeight="bold" fontFamily="Arial,sans-serif">
        {isMiner ? "⛏" : "Au"}
      </text>
      <text x="20" y="28" textAnchor="middle" fill="#FEF3C7" fontSize={symbol.length > 4 ? "6.5" : "8"} fontWeight="bold" fontFamily="Arial,sans-serif">
        {symbol.replace("=F","").replace(".JK","")}
      </text>
    </svg>
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
// GoldTickerBar — Bloomberg-style horizontal scroll strip
// ─────────────────────────────────────────────────────────────────────────────

function GoldTickerBar({
  quotes,
  selected,
  onSelect,
  loading,
}: {
  quotes:   Record<string, GoldQuote>;
  selected: string;
  onSelect: (s: string) => void;
  loading:  boolean;
}) {
  const categories = ["spot", "etf", "miner", "idx"] as const;
  const scrollRef  = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX     = useRef(0);
  const scrollLeft = useRef(0);

  // Mouse drag-to-scroll
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current     = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
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
    const x    = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-sym="${selected}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div className="relative select-none">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-card to-transparent rounded-l-2xl" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-card to-transparent rounded-r-2xl" />

      {/* Scrollable strip */}
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
              {/* Category group */}
              <div className={`flex shrink-0 ${
                catIdx > 0 ? "border-l border-border/50" : ""
              }`}>
                {/* Category header column */}
                <div className="flex flex-col items-center justify-center w-[64px] shrink-0 px-2 bg-muted/10">
                  <span className="text-[7.5px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 leading-tight text-center">
                    {CATEGORY_LABELS[cat].split(" ").join("\n")}
                  </span>
                </div>

                {/* Items */}
                {items.map((inst) => {
                  const q          = quotes[inst.symbol];
                  const isSelected = inst.symbol === selected;
                  const up         = q && q.change >= 0;

                  return (
                    <button
                      key={inst.symbol}
                      data-sym={inst.symbol}
                      onClick={() => onSelect(inst.symbol)}
                      className={`group shrink-0 flex flex-col justify-center gap-1 px-4 w-[140px] border-b-[2.5px] transition-all duration-150 border-r border-border/20 ${
                        isSelected
                          ? "border-b-amber-400 bg-amber-500/[0.07]"
                          : "border-b-transparent hover:border-b-amber-400/50 hover:bg-amber-500/[0.04]"
                      }`}
                      style={{ height: "72px" }}
                    >
                      {/* Top row: symbol + pulse */}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-extrabold tracking-wide leading-none transition-colors ${
                          isSelected
                            ? "text-amber-400"
                            : "text-foreground/70 group-hover:text-amber-400/90"
                        }`}>
                          {inst.symbol.replace("=F", "").replace(".JK", "")}
                        </span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        )}
                      </div>

                      {/* Price */}
                      {loading && !q ? (
                        <>
                          <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
                          <div className="h-2 w-10 bg-muted/30 rounded animate-pulse" />
                        </>
                      ) : q ? (
                        <>
                          <div className="text-[12px] font-extrabold tabular-nums leading-none text-foreground/90">
                            {fmtPrice(q.price, inst.currency)}
                          </div>
                          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                            up ? "text-[#089981]" : "text-[#f23645]"
                          }`}>
                            {up
                              ? <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                              : <ArrowDownRight className="h-2.5 w-2.5 shrink-0" />}
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

export default function GoldPanel() {
  const { theme } = useThemeAuth();

  const [selected, setSelected]               = useState<string>("GC=F");
  const [chartInterval, setChartInterval]     = useState<string>("1d");
  const [quotes, setQuotes]                   = useState<Record<string, GoldQuote>>({});
  const [isLoadingChart, setIsLoadingChart]   = useState(true);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [errorBanner, setErrorBanner]         = useState<string | null>(null);
  const [chartData, setChartData]             = useState<Kline[]>([]);
  const [lastQuoteRefresh, setLastQuoteRefresh] = useState<Date | null>(null);

  const chartContainerRef    = useRef<HTMLDivElement>(null);
  const chartRef             = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeHandlerRef     = useRef<(() => void) | null>(null);
  const klineCache           = useRef<Map<string, Kline[]>>(new Map());
  const currentChartKey      = useRef<string>("");

  const instrument   = GOLD_INSTRUMENTS.find((i) => i.symbol === selected)!;
  const currentQuote = quotes[selected];

  // ── Realtime price polling (every 15 s, no spinner) ───────────────────────

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

  // ── Chart kline fetch — only fetch if cache miss ───────────────────────────

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
      const iv   = interval === "max" ? "1mo" : interval;
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

  // ── Chart setup / theme update ─────────────────────────────────────────────

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
      const width = container.clientWidth;
      if (width <= 0) return;

      const chart  = createChart(container, { width, height: 320, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor:       "#089981",
        downColor:     "#f23645",
        borderVisible: false,
        wickUpColor:   "#089981",
        wickDownColor: "#f23645",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      const handleResize = () => chartRef.current?.resize(container.clientWidth, 320);
      resizeHandlerRef.current = handleResize;
      window.addEventListener("resize", handleResize);
    } else {
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#D97706" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground">Harga Emas Dunia</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <LiveDot />
              Realtime via Yahoo Finance · diperbarui tiap 15 detik
            </p>
          </div>
        </div>

        {lastQuoteRefresh && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span>
              Terakhir: {lastQuoteRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Ticker Strip */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {isLoadingQuotes && Object.keys(quotes).length === 0 ? (
          <div className="flex items-center justify-center h-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-xs font-semibold">Mengambil harga emas...</span>
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <GoldIcon symbol={selected} size={44} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">{instrument.label}</h2>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${instrument.color}`}>
                  {CATEGORY_LABELS[instrument.category]}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {instrument.symbol} · {instrument.currency} per {instrument.unit}
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-6 text-right">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Harga Terakhir</div>
              <motion.div
                key={currentQuote.price}
                initial={{ scale: 1.04, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-xl font-extrabold tracking-tight tabular-nums"
                style={{
                  color: currentQuote.change > 0
                    ? "#089981"
                    : currentQuote.change < 0
                    ? "#f23645"
                    : undefined,
                }}
              >
                {fmtPrice(currentQuote.price, instrument.currency)}
              </motion.div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Perubahan Harian</div>
              <div className={`flex items-center gap-0.5 text-sm font-extrabold justify-end ${currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]"}`}>
                {currentQuote.change >= 0
                  ? <ArrowUpRight className="h-4 w-4" />
                  : <ArrowDownRight className="h-4 w-4" />}
                <span>
                  {currentQuote.change >= 0 ? "+" : ""}{fmtPrice(Math.abs(currentQuote.change), instrument.currency)}
                  &nbsp;({currentQuote.changePercent >= 0 ? "+" : ""}{currentQuote.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-foreground">{instrument.label}</span>
            <span className="text-xs text-muted-foreground">({instrument.symbol})</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setChartInterval(tf.value)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    chartInterval === tf.value
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {!isLoadingChart && chartData.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                <span>{chartData.length.toLocaleString("id-ID")} candle</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-[320px] w-full relative">
          {isLoadingChart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-card rounded-xl">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              <p className="text-xs text-muted-foreground font-semibold">Memuat grafik emas...</p>
            </div>
          )}
          <div
            ref={chartContainerRef}
            className={`w-full h-[320px] ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      {/* Stats Row */}
      {currentQuote && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Harga Saat Ini", value: fmtPrice(currentQuote.price, instrument.currency),                                                                           color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "Harga Kemarin",  value: fmtPrice(currentQuote.prevClose, instrument.currency),                                                                       color: "text-foreground" },
            { label: "Perubahan",      value: `${currentQuote.change >= 0 ? "+" : ""}${fmtPrice(Math.abs(currentQuote.change), instrument.currency)}`,                    color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "% Harian",       value: `${currentQuote.changePercent >= 0 ? "+" : ""}${currentQuote.changePercent.toFixed(2)}%`,                                   color: currentQuote.changePercent >= 0 ? "text-[#089981]" : "text-[#f23645]" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{stat.label}</div>
              <div className={`text-sm font-extrabold tabular-nums ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gold Market Info */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
          Tentang Instrumen Emas
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { title: "Spot & Futures (GC=F)", desc: "Harga emas kontrak berjangka COMEX, patokan harga emas global dalam USD per troy oz.", icon: "🏦" },
            { title: "ETF Emas (GLD, IAU)",   desc: "Dana investasi yang melacak harga spot emas. GLD adalah ETF emas terbesar di dunia.", icon: "📊" },
            { title: "Saham Tambang (GDX)",   desc: "Perusahaan pertambangan emas global. Pergerakannya biasanya 2–3× lebih volatil dari harga emas.", icon: "⛏️" },
            { title: "IDX Emas (ANTM)",       desc: "Antam adalah BUMN tambang emas terbesar di Indonesia, harga dalam Rupiah (IDR).", icon: "🇮🇩" },
          ].map((item) => (
            <div key={item.title} className="border border-border rounded-xl p-3 bg-muted/20 space-y-1.5">
              <div className="text-lg">{item.icon}</div>
              <div className="font-bold text-foreground text-[11px]">{item.title}</div>
              <p className="text-muted-foreground leading-relaxed text-[10px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
