"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchStockKlinesFromYahoo, StockKline } from "@/src/lib/stocks";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from "lightweight-charts";
import { DollarSign, TrendingUp, TrendingDown, Loader2, AlertCircle, Activity } from "lucide-react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { motion } from "framer-motion";

const formatTimestampUTC = (ts: number): string => {
  const d = new Date(ts * 1000);
  const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const getThemeColors = (isDark: boolean) => ({
  backgroundColor: isDark ? "#111827" : "#ffffff",
  textColor: isDark ? "#94a3b8" : "#374151",
  gridColor: isDark ? "#1f2937" : "#f3f4f6",
  borderColor: isDark ? "#374151" : "#e5e7eb",
});

export default function ForexPanel() {
  const { theme } = useThemeAuth();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockKline[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const klines = await fetchStockKlinesFromYahoo("USDIDR=X", "1d", 100000);
        if (!active) return;

        if (klines && klines.length > 0) {
          setData(klines);
          const last = klines[klines.length - 1].close;
          const prev = klines.length > 1 ? klines[klines.length - 2].close : last;
          setCurrentPrice(last);
          setChange(last - prev);
          setChangePercent(prev > 0 ? ((last - prev) / prev) * 100 : 0);
          
          if (seriesRef.current && chartRef.current) {
            // Convert to Line/Area data format
            const areaData = klines.map(k => ({ time: k.time, value: k.close }));
            seriesRef.current.setData(areaData as any);
            chartRef.current.timeScale().fitContent();
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError("Gagal memuat data kurs USD/IDR.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    // Auto-refresh every 1 minute
    const interval = setInterval(loadData, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
        vertLines: { visible: false },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor },
      timeScale: {
        borderColor,
        timeVisible: false,
      },
      localization: {
        timeFormatter: (ts: number) => formatTimestampUTC(ts),
      },
    };

    if (!chartRef.current) {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      const chart = createChart(container, { width, height, ...chartOptions });
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#10b981",
        topColor: "rgba(16, 185, 129, 0.4)",
        bottomColor: "rgba(16, 185, 129, 0.0)",
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      if (data.length > 0) {
        const areaData = data.map(k => ({ time: k.time, value: k.close }));
        series.setData(areaData as any);
        chart.timeScale().fitContent();
      }

      const handleResize = () => {
        chartRef.current?.resize(container.clientWidth, container.clientHeight);
      };
      resizeHandlerRef.current = handleResize;
      window.addEventListener("resize", handleResize);
    } else {
      chartRef.current.applyOptions(chartOptions);
      if (seriesRef.current) {
        const isUp = change >= 0;
        seriesRef.current.applyOptions({
          lineColor: isUp ? "#10b981" : "#ef4444",
          topColor: isUp ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
          bottomColor: isUp ? "rgba(16, 185, 129, 0.0)" : "rgba(239, 68, 68, 0.0)",
        });
      }
    }
  }, [theme, data, change]);

  useEffect(() => {
    return () => {
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  const isUp = change >= 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              US Dollar <span className="text-muted-foreground text-xs font-semibold">vs</span> Rupiah
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Kurs Real-Time Bank Indonesia / Pasar Global</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-border/50">
          <Activity className="h-3 w-3 text-brand-green animate-pulse" /> Live
        </div>
      </div>

      {/* Main Stats */}
      {error ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-500 text-xs">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-black tracking-tight text-foreground flex items-baseline gap-2">
            <span className="text-lg text-muted-foreground font-semibold">Rp</span>
            {isLoading && currentPrice === 0 ? "..." : currentPrice.toLocaleString("id-ID")}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isUp ? "+" : ""}
            Rp {Math.abs(change).toLocaleString("id-ID")} ({changePercent.toFixed(2)}%)
            <span className="text-muted-foreground font-semibold text-[10px] ml-1">HARI INI</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative h-[120px] w-full rounded-xl overflow-hidden mt-2 bg-background/50 border border-border/30">
        {isLoading && currentPrice === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
      
      {/* Footer Info */}
      <div className="flex justify-between items-center text-[9px] text-muted-foreground font-medium pt-1 border-t border-border/50">
        <span>Sumber: Yahoo Finance (USDIDR=X)</span>
        <span>1 USD = {currentPrice.toLocaleString("id-ID")} IDR</span>
      </div>
    </div>
  );
}
