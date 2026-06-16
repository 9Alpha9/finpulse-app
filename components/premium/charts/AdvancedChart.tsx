import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';
import IndicatorToggles, { ChartIndicators } from './IndicatorToggles';
import { Loader2 } from 'lucide-react';
import { fetchAllCryptoKlines } from '@/src/lib/binance';
import { fetchStockKlinesFromYahoo } from '@/src/lib/stocks';
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

interface AdvancedChartProps {
  ticker: string;
  marketType?: 'crypto' | 'stocks';
}

export default function AdvancedChart({ ticker, marketType = 'crypto' }: AdvancedChartProps) {
  const { theme } = useThemeAuth();
  const isDark = theme === "dark";

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [indicators, setIndicators] = useState<ChartIndicators>({
    ma: false,
    rsi: false,
    macd: false,
  });

  const toggleIndicator = (indicator: keyof ChartIndicators) => {
    setIndicators(prev => ({ ...prev, [indicator]: !prev[indicator] }));
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    
    const textColor = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    // Initialize chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
        fontFamily: "var(--font-sans), sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: borderColor,
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      crosshair: {
        mode: 1, // Normal mode
        vertLine: {
          color: textColor,
          style: 3,
        },
        horzLine: {
          color: textColor,
          style: 3,
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    }) as unknown as ISeriesApi<"Candlestick">;
    
    chartInstanceRef.current = chart;
    seriesRef.current = series;

    // Fetch actual data
    setIsLoading(true);
    let isMounted = true;

    if (marketType === 'crypto') {
      fetchAllCryptoKlines(ticker, "1d")
        .then((klines) => {
          if (!isMounted) return;
          
          const data: CandlestickData<Time>[] = klines.map((k) => ({
            time: k.time as Time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }));
          
          series.setData(data);
          chart.timeScale().fitContent();
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch klines:", err);
          if (isMounted) setIsLoading(false);
        });
    } else {
      let stockTicker = ticker;
      if (ticker === "IHSG") stockTicker = "^JKSE";
      else if (!ticker.endsWith(".JK")) stockTicker = `${ticker}.JK`;

      fetchStockKlinesFromYahoo(stockTicker, "1d", 1000)
        .then((klines) => {
          if (!isMounted) return;
          
          const data: CandlestickData<Time>[] = klines.map((k) => ({
            time: Math.floor(k.time) as Time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }));
          
          // Pastikan time unik
          const unique = data.filter((v,i,a)=>a.findIndex(t=>(t.time === v.time))===i).sort((a,b)=> Number(a.time) - Number(b.time));
          series.setData(unique);
          chart.timeScale().fitContent();
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch stock klines:", err);
          if (isMounted) setIsLoading(false);
        });
    }

    // Responsive resizing
    const handleResize = () => {
      if (container && chartInstanceRef.current) {
        chartInstanceRef.current.resize(container.clientWidth, container.clientHeight);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    return () => {
      isMounted = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        seriesRef.current = null;
        maSeriesRef.current = null;
      }
    };
  }, [ticker, isDark]);

  // Handle Indicator Toggles
  useEffect(() => {
    if (!chartInstanceRef.current || !seriesRef.current || isLoading) return;

    if (indicators.ma && !maSeriesRef.current) {
      // Mock Moving Average
      const maSeries = chartInstanceRef.current.addSeries(LineSeries, {
        color: '#6366f1', // Indigo
        lineWidth: 2,
        crosshairMarkerVisible: false,
      }) as unknown as ISeriesApi<"Line">;
      
      const rawData = seriesRef.current.data() as CandlestickData<Time>[];
      const maData: LineData<Time>[] = rawData.map((d) => ({
        time: d.time,
        value: d.close + (Math.random() * 2 - 1), // Mocked MA value slightly offset from close
      }));
      
      maSeries.setData(maData);
      maSeriesRef.current = maSeries;
    } else if (!indicators.ma && maSeriesRef.current) {
      chartInstanceRef.current.removeSeries(maSeriesRef.current);
      maSeriesRef.current = null;
    }
  }, [indicators.ma, isLoading]);

  return (
    <div className="relative flex h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Overlay Toggles */}
      <div className="absolute left-4 top-4 z-10">
        <IndicatorToggles indicators={indicators} onToggle={toggleIndicator} />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/50 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        </div>
      )}

      {/* Chart Container */}
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}
