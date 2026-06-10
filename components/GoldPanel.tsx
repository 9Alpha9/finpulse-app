"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  RefreshCw,
  History,
} from "lucide-react";
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { motion } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Daftar instrumen emas lengkap
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldInstrument {
  symbol:   string;  // Yahoo Finance ticker
  label:    string;  // nama tampilan
  category: "spot" | "etf" | "miner" | "idx";
  currency: "USD" | "IDR";
  unit:     string;  // "troy oz" | "gram" | "lembar"
  color:    string;  // warna badge
}

export const GOLD_INSTRUMENTS: GoldInstrument[] = [
  // ── Spot & Futures ──────────────────────────────────────────────────────────
  { symbol: "GC=F",  label: "Gold Futures (COMEX)",  category: "spot",  currency: "USD", unit: "troy oz", color: "bg-amber-500/15 text-amber-500" },
  { symbol: "GLD",   label: "SPDR Gold Shares",      category: "etf",   currency: "USD", unit: "lembar",  color: "bg-yellow-500/15 text-yellow-500" },
  { symbol: "IAU",   label: "iShares Gold Trust",    category: "etf",   currency: "USD", unit: "lembar",  color: "bg-yellow-600/15 text-yellow-600" },
  { symbol: "SGOL",  label: "Aberdeen Gold ETF",     category: "etf",   currency: "USD", unit: "lembar",  color: "bg-amber-400/15 text-amber-400" },
  { symbol: "GLDM",  label: "SPDR Gold MiniShares",  category: "etf",   currency: "USD", unit: "lembar",  color: "bg-amber-600/15 text-amber-600" },
  { symbol: "GDX",   label: "VanEck Gold Miners",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-orange-500/15 text-orange-500" },
  { symbol: "GDXJ",  label: "Junior Gold Miners",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-orange-600/15 text-orange-600" },
  // ── Gold Mining Stocks ───────────────────────────────────────────────────────
  { symbol: "GOLD",  label: "Barrick Gold Corp",     category: "miner", currency: "USD", unit: "lembar",  color: "bg-rose-500/15 text-rose-500" },
  { symbol: "NEM",   label: "Newmont Corporation",   category: "miner", currency: "USD", unit: "lembar",  color: "bg-rose-600/15 text-rose-600" },
  { symbol: "AEM",   label: "Agnico Eagle Mines",    category: "miner", currency: "USD", unit: "lembar",  color: "bg-pink-500/15 text-pink-500" },
  // ── IDX ─────────────────────────────────────────────────────────────────────
  { symbol: "ANTM.JK", label: "Antam (IDX: ANTM)",  category: "idx",   currency: "IDR", unit: "lembar",  color: "bg-blue-500/15 text-blue-500" },
  { symbol: "MDKA.JK", label: "Merdeka Copper Gold", category: "idx",  currency: "IDR", unit: "lembar",  color: "bg-blue-600/15 text-blue-600" },
];

const CATEGORY_LABELS: Record<string, string> = {
  spot:  "Spot & Futures",
  etf:   "ETF Emas",
  miner: "Saham Tambang",
  idx:   "IDX Emas",
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeframe
// ─────────────────────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { label: "1H",  value: "1d"  },
  { label: "1Mgg",value: "1wk" },
  { label: "1Bln",value: "1mo" },
  { label: "3Bln",value: "3mo" },
  { label: "Max", value: "max" },
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

// ─────────────────────────────────────────────────────────────────────────────
// Fetch klines dari /api/stocks (reuse route yang sudah ada)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchGoldKlines(symbol: string, interval: string): Promise<Kline[]> {
  const encoded = encodeURIComponent(symbol);
  const res = await fetch(`/api/stocks?symbol=${encoded}&interval=${interval}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.klines ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Live quote ticker bar — fetch semua instrumen sekaligus
// ─────────────────────────────────────────────────────────────────────────────

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
// Gold Icon Component
// ─────────────────────────────────────────────────────────────────────────────

function GoldIcon({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const isIDX = symbol.endsWith(".JK");
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

  // Gold SVG icon
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
// Ticker Bar — menampilkan semua harga di atas
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

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const items = GOLD_INSTRUMENTS.filter((i) => i.category === cat);
        return (
          <div key={cat}>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {items.map((inst) => {
                const q = quotes[inst.symbol];
                const isSelected = inst.symbol === selected;
                const up = q && q.change >= 0;
                return (
                  <button
                    key={inst.symbol}
                    onClick={() => onSelect(inst.symbol)}
                    className={`text-left rounded-xl border p-3 transition cursor-pointer group ${
                      isSelected
                        ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                        : "border-border bg-card hover:border-amber-500/30 hover:bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${inst.color}`}>
                        {inst.symbol.replace("=F","").replace(".JK","")}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-snug truncate mb-1.5">
                      {inst.label}
                    </div>
                    {loading && !q ? (
                      <div className="h-4 w-16 bg-muted/50 rounded animate-pulse" />
                    ) : q ? (
                      <>
                        <div className="text-xs font-extrabold text-foreground">
                          {fmtPrice(q.price, inst.currency)}
                        </div>
                        <div className={`flex items-center gap-0.5 text-[10px] font-bold mt-0.5 ${up ? "text-[#089981]" : "text-[#f23645]"}`}>
                          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {up ? "+" : ""}{q.changePercent.toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/50">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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

  const chartContainerRef    = useRef<HTMLDivElement>(null);
  const chartRef             = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeHandlerRef     = useRef<(() => void) | null>(null);
  const klineCache           = useRef<Map<string, Kline[]>>(new Map());

  const instrument = GOLD_INSTRUMENTS.find((i) => i.symbol === selected)!;
  const currentQuote = quotes[selected];

  // ── Fetch all quotes (ticker bar) ──────────────────────────────────────────

  const refreshQuotes = useCallback(async () => {
    setIsLoadingQuotes(true);
    const results: Record<string, GoldQuote> = {};
    await Promise.all(
      GOLD_INSTRUMENTS.map(async (inst) => {
        const q = await fetchGoldQuote(inst.symbol);
        if (q) results[inst.symbol] = q;
      })
    );
    setQuotes(results);
    setIsLoadingQuotes(false);
  }, []);

  useEffect(() => {
    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshQuotes]);

  // ── Fetch klines for chart ─────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    const cacheKey = `${selected}_${chartInterval}`;

    function applyToChart(data: Kline[]) {
      if (!active) return;
      if (candlestickSeriesRef.current && chartRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candlestickSeriesRef.current.setData(data as any);
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        chartRef.current.timeScale().fitContent();
      }
      setChartData(data);
    }

    async function loadKlines() {
      setErrorBanner(null);

      if (candlestickSeriesRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candlestickSeriesRef.current.setData([] as any);
      }

      const cached = klineCache.current.get(cacheKey);
      if (cached && cached.length > 0) {
        applyToChart(cached);
        setIsLoadingChart(false);
        return;
      }

      setIsLoadingChart(true);
      try {
        const iv = chartInterval === "max" ? "1mo" : chartInterval;
        const data = await fetchGoldKlines(selected, iv);
        if (!active) return;
        if (data.length > 0) {
          klineCache.current.set(cacheKey, data);
          applyToChart(data);
        } else {
          throw new Error("Data kline kosong");
        }
      } catch (err) {
        if (!active) return;
        console.warn("[GoldPanel] fetch error:", err);
        setErrorBanner("Gagal mengambil data dari Yahoo Finance. Coba lagi nanti.");
      } finally {
        if (active) setIsLoadingChart(false);
      }
    }

    loadKlines();
    return () => { active = false; };
  }, [selected, chartInterval]);

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

      const chart = createChart(container, { width, height: 320, ...chartOptions });
      const series = chart.addSeries(CandlestickSeries, {
        upColor:      "#089981",
        downColor:    "#f23645",
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
  }, [theme, selected, chartInterval]);

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
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#D97706" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground">Harga Emas Dunia</h1>
            <p className="text-xs text-muted-foreground">Spot · ETF · Miner · IDX — realtime via Yahoo Finance</p>
          </div>
        </div>
        <button
          onClick={refreshQuotes}
          disabled={isLoadingQuotes}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingQuotes ? "animate-spin" : ""}`} />
          {isLoadingQuotes ? "Memperbarui..." : "Refresh Harga"}
        </button>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Ticker Bar — semua instrumen */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <GoldTickerBar
          quotes={quotes}
          selected={selected}
          onSelect={setSelected}
          loading={isLoadingQuotes}
        />
      </div>

      {/* Selected Instrument Header */}
      {currentQuote && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <GoldIcon symbol={selected} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{instrument.label}</h2>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${instrument.color}`}>
                  {CATEGORY_LABELS[instrument.category]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {instrument.symbol} · {instrument.currency} per {instrument.unit}
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-6 text-right">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1">Harga Terakhir</div>
              <motion.h3
                animate={{
                  color: currentQuote.change > 0
                    ? "#089981"
                    : currentQuote.change < 0
                    ? "#f23645"
                    : (theme === "dark" ? "#f8fafc" : "#0f172a"),
                }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-extrabold tracking-tight px-1 py-0.5"
              >
                {fmtPrice(currentQuote.price, instrument.currency)}
              </motion.h3>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1">Perubahan Harian</div>
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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-foreground">
              {instrument.label}
            </span>
            <span className="text-xs text-muted-foreground">({instrument.symbol})</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe pills */}
            <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
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

        {/* Chart */}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Harga Saat Ini", value: fmtPrice(currentQuote.price, instrument.currency), color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "Harga Kemarin",  value: fmtPrice(currentQuote.prevClose, instrument.currency), color: "text-foreground" },
            { label: "Perubahan",      value: `${currentQuote.change >= 0 ? "+" : ""}${fmtPrice(Math.abs(currentQuote.change), instrument.currency)}`, color: currentQuote.change >= 0 ? "text-[#089981]" : "text-[#f23645]" },
            { label: "% Harian",       value: `${currentQuote.changePercent >= 0 ? "+" : ""}${currentQuote.changePercent.toFixed(2)}%`, color: currentQuote.changePercent >= 0 ? "text-[#089981]" : "text-[#f23645]" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</div>
              <div className={`text-base font-extrabold ${stat.color}`}>{stat.value}</div>
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
            { title: "ETF Emas (GLD, IAU)", desc: "Dana investasi yang melacak harga spot emas. GLD adalah ETF emas terbesar di dunia.", icon: "📊" },
            { title: "Saham Tambang (GDX)", desc: "Perusahaan pertambangan emas global. Pergerakannya biasanya 2-3x lebih volatil dari harga emas.", icon: "⛏️" },
            { title: "IDX Emas (ANTM)", desc: "Antam adalah BUMN tambang emas terbesar di Indonesia, harga dalam Rupiah (IDR).", icon: "🇮🇩" },
          ].map((item) => (
            <div key={item.title} className="border border-border rounded-xl p-3 bg-muted/20 space-y-1">
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
