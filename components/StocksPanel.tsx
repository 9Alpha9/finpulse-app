"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, Plus, Check, ChevronDown, CheckSquare, Briefcase, TrendingUp, Landmark, ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { getLocalWatchlist, saveLocalWatchlist } from "@/app/utils/supabase";
import { getStockInfo, fetchStockKlinesFromYahoo, fetchStockKlinesMock, stockTickers, StockKline, StockInfo } from "@/src/lib/stocks";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { PortfolioTracker, SignalConfigurator } from "@/components/PortfolioAndSignals";

export default function StocksPanel() {
  const { theme } = useThemeAuth();
  const [selectedStock, setSelectedStock] = useState<string>("BBCA");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  
  // Dynamic Select dropdown state
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chart and loading states
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartData, setChartData] = useState<StockKline[]>([]);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [interval, setIntervalState] = useState<string>("1d");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

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

  // Sync watchlist on mount
  useEffect(() => {
    setWatchlist(getLocalWatchlist());
  }, []);

  // Fetch stock metadata and candlestick history whenever selected stock or interval changes
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setIsLoadingChart(true);
        setErrorBanner(null);
        
        // Attempt to fetch real IDX stock klines from Yahoo
        const klines = await fetchStockKlinesFromYahoo(selectedStock, interval, 200);
        
        if (!active) return;
        
        if (klines && klines.length > 0) {
          setChartData(klines);
          const lastClose = klines[klines.length - 1].close;
          
          // Get metadata and merge
          const meta = stockTickers[selectedStock] || stockTickers.BBCA;
          
          // Compute change relative to the previous kline's close
          const prevClose = klines.length > 1 ? klines[klines.length - 2].close : lastClose;
          const change = lastClose - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          
          setStock({
            ...meta,
            price: lastClose,
            change,
            changePercent,
            prevClose,
            peRatio: meta.peRatio,
            dividendYield: meta.dividendYield,
            marketCap: meta.marketCap,
            volume: meta.volume,
          } as StockInfo);
        } else {
          throw new Error("Data kline kosong.");
        }
      } catch (err: any) {
        console.warn(`Gagal mengambil data dari Yahoo Finance untuk ${selectedStock}:`, err);
        if (!active) return;
        
        setErrorBanner("Gagal mengambil data real-time dari Yahoo Finance. Menggunakan mode simulasi...");
        
        // Fallback to Mock generator
        const mockKlines = fetchStockKlinesMock(selectedStock, interval, 200);
        setChartData(mockKlines);
        
        const info = getStockInfo(selectedStock);
        setStock(info);
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
  }, [selectedStock, interval]);

  // Setup/Sync Lightweight Chart options with theme changes
  useEffect(() => {
    if (!chartContainerRef.current || isLoadingChart) return;

    const isDark = theme === "dark";
    const backgroundColor = isDark ? "#111827" : "#ffffff";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#1f2937" : "#f1f5f9";
    const borderColor = isDark ? "#1f2937" : "#e2e8f0";

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { color: backgroundColor },
          textColor: textColor,
          fontFamily: "Geist, sans-serif",
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
          timeVisible: true,
        },
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
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.resize(
            chartContainerRef.current.clientWidth,
            300
          );
        }
      };
      window.addEventListener("resize", handleResize);
      (chartRef.current as any).handleResize = handleResize;
    } else {
      chartRef.current.applyOptions({
        layout: {
          background: { color: backgroundColor },
          textColor: textColor,
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
        },
      });
    }
  }, [theme, isLoadingChart]);

  // Set historical candle data
  useEffect(() => {
    if (candlestickSeriesRef.current && chartData.length > 0) {
      candlestickSeriesRef.current.setData(chartData);
    }
  }, [chartData, isLoadingChart]);

  // Cleanup chart on unmount
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

  const isInWatchlist = watchlist.includes(selectedStock);

  const toggleWatchlist = () => {
    let nextList;
    if (isInWatchlist) {
      nextList = watchlist.filter((item) => item !== selectedStock);
    } else {
      nextList = [...watchlist, selectedStock];
    }
    setWatchlist(nextList);
    saveLocalWatchlist(nextList);
  };

  const getStockIconColor = (sym: string) => {
    switch (sym) {
      case "BBCA": return "text-blue-500 bg-blue-500/10";
      case "BBRI": return "text-cyan-500 bg-cyan-500/10";
      case "TLKM": return "text-red-500 bg-red-500/10";
      case "BMRI": return "text-yellow-500 bg-yellow-500/10";
      case "ASII": return "text-purple-500 bg-purple-500/10";
      case "WBSA": return "text-emerald-500 bg-emerald-500/10";
      default: return "text-slate-500 bg-slate-500/10";
    }
  };

  // Removed old demo exchange helper

  return (
    <div className="space-y-6">
      
      {/* Selector Controls Bar */}
      <div className="flex justify-between items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm z-40 relative">
        <div className="flex items-center gap-3">
          
          {/* Custom Dropdown Select */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsSelectOpen(!isSelectOpen)}
              className="flex items-center justify-between gap-3 w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:border-brand-green hover:bg-secondary/40 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full font-bold text-[9px] ${getStockIconColor(selectedStock)}`}>
                  {selectedStock.slice(0, 2)}
                </span>
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
                  className="absolute left-0 mt-1.5 w-60 rounded-xl border border-border bg-card shadow-lg p-2 z-50 max-h-80 overflow-y-auto"
                >
                  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    PILIH EMITEN SAHAM
                  </div>
                  <div className="space-y-0.5">
                    {Object.keys(stockTickers).map((symbol) => {
                      const ticker = stockTickers[symbol];
                      const isSelected = symbol === selectedStock;
                      return (
                        <button
                          key={symbol}
                          onClick={() => {
                            setSelectedStock(symbol);
                            setIsSelectOpen(false);
                          }}
                          className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs text-left transition ${
                            isSelected 
                              ? "bg-brand-green/10 text-brand-green font-bold" 
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full font-bold text-[8px] ${getStockIconColor(symbol)}`}>
                              {symbol.slice(0, 2)}
                            </span>
                            <div>
                              <div className="font-semibold">{symbol}</div>
                              <div className="text-[9px] text-muted-foreground truncate max-w-[130px]">{ticker.name}</div>
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
        </div>

        {/* Watchlist Toggle */}
        <button
          onClick={toggleWatchlist}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border transition cursor-pointer select-none ${
            isInWatchlist 
              ? "bg-brand-green/15 border-brand-green/20 text-brand-green" 
              : "bg-background border-border text-foreground hover:bg-muted"
          }`}
        >
          {isInWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{isInWatchlist ? "DIWATCHLIST" : "TAMBAH WATCHLIST"}</span>
        </button>
      </div>

      {/* Dynamic Error Boundary Alert Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-500 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="leading-normal">{errorBanner}</p>
        </div>
      )}

      {/* Stock Details Header */}
      {stock && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-md ${getStockIconColor(selectedStock)}`}>
                {selectedStock}
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-foreground">{stock.name}</h2>
                  <span className="text-xs font-bold text-muted-foreground uppercase bg-secondary px-2.5 py-0.5 rounded-md">IDX: {selectedStock}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stock.sector}</p>
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-2xl font-extrabold text-foreground">Rp {stock.price.toLocaleString("id-ID")}</h3>
              <div className={`flex items-center gap-0.5 text-xs font-extrabold justify-end mt-1 ${stock.change >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {stock.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>
                  {stock.change >= 0 ? "+" : ""}{stock.change.toLocaleString("id-ID")} ({stock.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe Selector Parity */}
          <div className="flex justify-between items-center border-t border-border/60 pt-4 mt-6">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Grafik Historis Candlestick ({interval.toUpperCase()})
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

          {/* Stock Candlestick Chart */}
          <div className="h-[300px] mt-6 w-full relative z-10">
            {isLoadingChart && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-card">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
              </div>
            )}
            <div 
              ref={chartContainerRef} 
              className={`w-full h-[300px] ${isLoadingChart ? "invisible" : ""}`} 
            />
          </div>
        </div>
      )}

      {/* Stock Stats Table */}
      {stock && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Statistik Finansial</h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div className="border border-border rounded-xl p-3 bg-muted/20">
              <span className="text-muted-foreground font-semibold">Rasio P/E</span>
              <p className="text-sm font-bold text-foreground mt-1">{stock.peRatio}</p>
            </div>
            <div className="border border-border rounded-xl p-3 bg-muted/20">
              <span className="text-muted-foreground font-semibold">Yield Dividen</span>
              <p className="text-sm font-bold text-foreground mt-1">{stock.dividendYield}</p>
            </div>
            <div className="border border-border rounded-xl p-3 bg-muted/20">
              <span className="text-muted-foreground font-semibold">Kapitalisasi Pasar</span>
              <p className="text-sm font-bold text-foreground mt-1">{stock.marketCap}</p>
            </div>
            <div className="border border-border rounded-xl p-3 bg-muted/20">
              <span className="text-muted-foreground font-semibold">Volume Transaksi</span>
              <p className="text-sm font-bold text-foreground mt-1">{stock.volume} shares</p>
            </div>
            <div className="border border-border rounded-xl p-3 bg-muted/20 col-span-2 sm:col-span-1">
              <span className="text-muted-foreground font-semibold">Harga Kemarin</span>
              <p className="text-sm font-bold text-foreground mt-1">Rp {stock.prevClose.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Tracker & WhatsApp Alert Configuration */}
      {stock && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortfolioTracker currentPrice={stock.price} activeSymbol={selectedStock} isStock={true} />
          <SignalConfigurator activeSymbol={selectedStock} currentPrice={stock.price} />
        </div>
      )}

    </div>
  );
}
