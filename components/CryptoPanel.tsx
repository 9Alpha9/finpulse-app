"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, Zap, Clock, ShieldAlert, Loader2, Search, Check, ChevronDown, AlertCircle } from "lucide-react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { fetchCryptoPrice, fetchCryptoKlines, connectCryptoWebSocket, fetchActiveCryptoPairs, KlineData } from "@/src/lib/binance";
// PERBAIKAN 1: Tambahkan ColorType pada import di bawah ini
import { createChart, CandlestickSeries, ColorType } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";

const getIntervalStartTimestamp = (intervalStr: string): number => {
  const now = Date.now();
  if (intervalStr.endsWith("m")) {
    const minutes = parseInt(intervalStr);
    const ms = minutes * 60 * 1000;
    return Math.floor(now / ms) * ms / 1000;
  } else if (intervalStr.endsWith("h")) {
    const hours = parseInt(intervalStr);
    const ms = hours * 60 * 60 * 1000;
    return Math.floor(now / ms) * ms / 1000;
  } else if (intervalStr.endsWith("d")) {
    const days = parseInt(intervalStr);
    const ms = days * 24 * 60 * 60 * 1000;
    return Math.floor(now / ms) * ms / 1000;
  } else if (intervalStr.endsWith("w")) {
    const weeks = parseInt(intervalStr);
    const ms = weeks * 7 * 24 * 60 * 60 * 1000;
    return Math.floor(now / ms) * ms / 1000;
  } else if (intervalStr.endsWith("M")) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(1);
    return Math.floor(d.getTime() / 1000);
  }
  return Math.floor(now / 1000);
};

const getSymbolBase = (sym: string) => {
  return sym.replace("USDT", "");
};

// Coin Icon Component with dynamic fallback
const CoinIcon = ({ base, className = "h-6 w-6" }: { base: string; className?: string }) => {
  const [err, setErr] = useState(false);

  useEffect(() => {
    // Reset error on coin change
    setErr(false);
  }, [base]);

  if (err || !base) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-secondary font-extrabold text-[10px] text-muted-foreground border border-border uppercase shrink-0 ${className}`}>
        {base ? base.slice(0, 2) : "?"}
      </div>
    );
  }

  const iconUrl = `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;
  return (
    <img
      src={iconUrl}
      onError={() => setErr(true)}
      alt={base}
      className={`rounded-full object-cover border border-border/30 shrink-0 bg-secondary ${className}`}
    />
  );
};

export default function CryptoPanel() {
  const { subscriptionTier, setSubscriptionTier, theme } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setIntervalState] = useState("1d");
  const [currentPrice, setCurrentPrice] = useState(68000.00);
  const [priceChange, setPriceChange] = useState(0.00);
  const [chartData, setChartData] = useState<KlineData[]>([]);

  // Dynamic coin select states
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading & Error boundary states
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const lastBarRef = useRef<KlineData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to format prices dynamically
  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return price.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 });
    }
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000) {
      return vol.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return vol.toFixed(4);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all active pairs on mount
  useEffect(() => {
    async function loadPairs() {
      try {
        const pairs = await fetchActiveCryptoPairs();
        setAvailablePairs(pairs);
      } catch (e) {
        console.error("Gagal memuat daftar koin dari Binance:", e);
        setAvailablePairs(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "PEPEUSDT"]);
      }
    }
    loadPairs();
  }, []);

  // Helper to update the last bar with a new price tick
  const updateCandle = (price: number) => {
    if (!candlestickSeriesRef.current || !lastBarRef.current) return;

    const barTime = getIntervalStartTimestamp(interval);
    let updatedBar: KlineData;

    if (barTime === lastBarRef.current.time) {
      updatedBar = {
        time: lastBarRef.current.time, // Mempertahankan format waktu aslinya
        open: lastBarRef.current.open,
        high: Math.max(lastBarRef.current.high, price),
        low: Math.min(lastBarRef.current.low, price),
        close: price,
      };
    } else {
      if (barTime < Number(lastBarRef.current.time)) return;

      updatedBar = {
        time: barTime,
        open: price,
        high: price,
        low: price,
        close: price,
      };
    }

    try {
      candlestickSeriesRef.current.update(updatedBar);
      lastBarRef.current = updatedBar;
    } catch (error) {
      console.warn("Sinkronisasi chart tertunda (menunggu data interval baru).");
    }
  };

  // 1. Initial load of historical klines & current price via REST API
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setIsLoadingChart(true);
        setErrorBanner(null);
        const [price, klines] = await Promise.all([
          fetchCryptoPrice(symbol),
          fetchCryptoKlines(symbol, interval, 400) // fetch dynamic historical klines
        ]);

        if (!active) return;
        setCurrentPrice(price);
        setChartData(klines);
        if (klines.length > 0) {
          lastBarRef.current = klines[klines.length - 1];
        }
      } catch (err: any) {
        console.error("Error loading data from Binance:", err);
        if (active) {
          setErrorBanner("Gagal mengambil data pasar dari Binance. Menggunakan mode simulasi...");
          // Fallback static data to avoid empty screen
          const fakeTime = Math.floor(Date.now() / 1000);
          const fakeKlines: KlineData[] = [];
          let currentPriceFallback = 68000.00;
          if (symbol.includes("ETH")) currentPriceFallback = 3500.00;
          if (symbol.includes("SOL")) currentPriceFallback = 150.00;
          if (symbol.includes("PEPE")) currentPriceFallback = 0.000012;

          for (let i = 100; i >= 0; i--) {
            fakeKlines.push({
              time: fakeTime - i * 86400,
              open: currentPriceFallback * (1 + (Math.random() - 0.5) * 0.05),
              high: currentPriceFallback * (1 + Math.random() * 0.05),
              low: currentPriceFallback * (1 - Math.random() * 0.05),
              close: currentPriceFallback,
            });
          }
          setChartData(fakeKlines);
          lastBarRef.current = fakeKlines[fakeKlines.length - 1];
        }
      } finally {
        if (active) {
          setIsLoadingChart(false);
        }
      }
    }
    loadData();

    return () => {
      active = false;
    };
  }, [symbol, interval]);

  // 2. Setup/Destroy Lightweight Chart and sync options with Theme Changes
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // Deteksi tema yang sedang aktif
    const isDark = theme === "dark" || theme === "light"; // Sesuaikan jika menggunakan next-themes
    const backgroundColor = isDark ? "#111827" : "#ffffff";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#1f2937" : "#f1f5f9";
    const borderColor = isDark ? "#1f2937" : "#e2e8f0";

    // Opsi konfigurasi yang akan dipakai saat render pertama & saat ganti tema
    const chartOptions = {
      layout: {
        // PERBAIKAN 2: Menggunakan ColorType.Solid agar tidak terjadi error TypeScript
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: textColor,
        fontFamily: "Geist, Inter, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true, // INI KUNCI AGAR JAM MUNCUL
        secondsVisible: false,
        tickMarkFormatter: (time: number, tickMarkType: any, locale: string) => {
          // Memastikan format yang muncul selalu konsisten (Tanggal + Jam)
          const date = new Date(time * 1000);
          return date.toLocaleString('id-ID', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        },
      },
      localization: {
        locale: 'id-ID', // Format bahasa Indonesia (HH:MM)
        timeFormatter: (businessDayOrTimestamp: number) => {
          return new Date(businessDayOrTimestamp * 1000).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        }
      }
    };

    if (!chartRef.current) {
      // JIKA CHART BELUM ADA: Buat dari awal
      const width = container.clientWidth;
      if (width <= 0) {
        setTimeout(() => { }, 100);
        return;
      }

      const chart = createChart(container, {
        width,
        height: 320,
        ...chartOptions, // Masukkan opsi ke sini
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartRef.current && container) {
          chartRef.current.resize(container.clientWidth, 320);
        }
      };
      window.addEventListener("resize", handleResize);
      (chartRef.current as any).handleResize = handleResize;

    } else {
      // JIKA CHART SUDAH ADA & HANYA GANTI TEMA: Terapkan opsi baru tanpa me-reset data
      chartRef.current.applyOptions(chartOptions);
    }
  }, [theme, symbol, interval]); // Dependency ini yang memastikan fungsi dipanggil ulang tiap kali toggle di-klik

  // 3. Set Chart data when it loads
  useEffect(() => {
    if (candlestickSeriesRef.current && chartData.length > 0) {
      candlestickSeriesRef.current.setData(chartData);
    }
  }, [chartData]);

  // Cleanup chart on component unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        const handleResize = (chartRef.current as any).handleResize;
        if (handleResize) {
          window.removeEventListener("resize", handleResize);
        }
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  // 4. Real-time stream via WebSockets (Gated for Premium tier, with REST polling fallback)
  useEffect(() => {
    if (!isPremium || isLoadingChart) return;

    let ws: WebSocket | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let receivedWsMessage = false;

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      console.warn(`Binance WebSocket stream unavailable for ${symbol}. Activating REST polling fallback...`);
      fallbackInterval = setInterval(async () => {
        try {
          const price = await fetchCryptoPrice(symbol);
          setCurrentPrice(price);
          updateCandle(price);
        } catch (err) {
          // Double fallback: apply minor drift if REST fails
          const drift = (Math.random() - 0.5) * (priceRef.current * 0.0005);
          const nextPrice = parseFloat((priceRef.current + drift).toFixed(symbol.includes("PEPE") ? 8 : 2));
          setCurrentPrice(nextPrice);
          updateCandle(nextPrice);
        }
      }, 3000);
    };

    try {
      ws = connectCryptoWebSocket(
        symbol,
        ({ price, changePercent }) => {
          receivedWsMessage = true;
          setCurrentPrice(price);
          setPriceChange(changePercent);
          updateCandle(price);
        },
        () => {
          startFallbackPolling();
        }
      );

      ws.onclose = () => {
        startFallbackPolling();
      };

      const timer = setTimeout(() => {
        if (!receivedWsMessage) {
          startFallbackPolling();
        }
      }, 4000);

      return () => {
        clearTimeout(timer);
        if (ws) ws.close();
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    } catch (err) {
      startFallbackPolling();
      return () => {
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    }
  }, [isPremium, symbol, interval, isLoadingChart]);

  // Removed old demo exchange functions

  const filteredPairs = availablePairs.filter(p =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Dynamic Error Boundary Alert Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <CoinIcon base={getSymbolBase(symbol)} className="h-12 w-12" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{getSymbolBase(symbol)} / USDT</h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">Crypto</span>
            </div>
            <p className="text-xs text-muted-foreground">Binance REST + Live WebSocket Stream</p>
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
            <div className={`flex items-center gap-0.5 text-sm font-extrabold justify-end ${priceChange >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {priceChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">

        {/* Dynamic Controls Bar with custom shadcn-like Select Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 mb-6 z-40 relative">
          <div className="flex items-center gap-3">

            {/* Custom Popover Select */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="flex items-center justify-between gap-3 w-44 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:border-brand-green hover:bg-secondary/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <CoinIcon base={getSymbolBase(symbol)} className="h-5 w-5" />
                  <span>{getSymbolBase(symbol)}/USDT</span>
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
                    className="absolute left-0 mt-1.5 w-60 rounded-xl border border-border bg-card shadow-lg p-2.5 z-50 space-y-2 max-h-80 overflow-hidden flex flex-col"
                  >
                    {/* Search Field */}
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

                    {/* Scrollable list */}
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
                                <CoinIcon base={base} className="h-4.5 w-4.5" />
                                <span>{base} / USDT</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-brand-green shrink-0" />}
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

          <div className="flex flex-wrap gap-1 text-xs font-semibold">
            {[
              { label: "15m", value: "15m" },
              { label: "1H", value: "1h" },
              { label: "4H", value: "4h" },
              { label: "1D", value: "1d" },
              { label: "1W", value: "1w" },
              { label: "1M", value: "1M" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setIntervalState(t.value)}
                className={`px-3 py-1 rounded-md transition cursor-pointer select-none ${interval === t.value
                  ? "bg-brand-green text-white font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-80 w-full relative z-10">

          {/* FREE TIER OVERLAY BANNER */}
          {!isPremium && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/75 backdrop-blur-xs p-6 text-center select-none animate-in fade-in duration-200">
              <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
              <h4 className="text-md font-bold text-foreground">Grafik Real-Time Terkunci</h4>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
                Anda menggunakan akun **Free**. Tingkatkan ke **Premium** untuk membuka grafik kripto real-time WebSocket dan signal WhatsApp.
              </p>
              <button
                onClick={() => setSubscriptionTier("premium")}
                className="mt-4 rounded-full bg-brand-green py-2 px-6 text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer"
              >
                UPGRADE KE PREMIUM
              </button>
            </div>
          )}

          {isLoadingChart && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>
          )}

          <div
            ref={chartContainerRef}
            className={`w-full h-80 ${isLoadingChart ? "invisible" : ""}`}
          />
        </div>
      </div>

      {/* Portfolio Tracker & WhatsApp Alert Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PortfolioTracker currentPrice={currentPrice} activeSymbol={symbol} isStock={false} />
        <SignalConfigurator activeSymbol={symbol} currentPrice={currentPrice} />
      </div>

    </div>
  );
}