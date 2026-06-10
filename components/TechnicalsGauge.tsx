"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KlineBasic {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

type Signal = "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";

interface IndicatorResult {
  name: string;
  value: string;
  signal: Signal;
  score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math Helpers (Logika dasar matematika bawaanmu yang sudah akurat)
// ─────────────────────────────────────────────────────────────────────────────

function closes(klines: KlineBasic[]) { return klines.map((k) => k.close); }

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = NaN;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (isNaN(prev)) {
      prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(prev);
      continue;
    }
    prev = data[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, hist: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (isNaN(v) || isNaN(ema26[i]) ? NaN : v - ema26[i]));
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalLine = ema(validMacd, 9);
  const lastMacd = validMacd[validMacd.length - 1] ?? 0;
  const lastSignal = signalLine[signalLine.length - 1] ?? 0;
  return { macd: lastMacd, signal: lastSignal, hist: lastMacd - lastSignal };
}

function calcStochastic(klines: KlineBasic[], kPeriod = 14, dPeriod = 3): { k: number; d: number } {
  if (klines.length < kPeriod) return { k: 50, d: 50 };
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < klines.length; i++) {
    const slice = klines.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((k) => k.high));
    const lowest = Math.min(...slice.map((k) => k.low));
    const kVal = highest === lowest ? 50 : ((klines[i].close - lowest) / (highest - lowest)) * 100;
    kValues.push(kVal);
  }
  const kSmoothed = sma(kValues, 3);
  const dLine = sma(kSmoothed.filter((v) => !isNaN(v)), dPeriod);
  return {
    k: kSmoothed[kSmoothed.length - 1] ?? 50,
    d: dLine[dLine.length - 1] ?? 50,
  };
}

function calcBollingerBands(closes: number[], period = 20, stdDev = 2): { percentB: number; squeeze: boolean } {
  if (closes.length < period) return { percentB: 0.5, squeeze: false };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  const last = closes[closes.length - 1];
  const percentB = upper === lower ? 0.5 : (last - lower) / (upper - lower);
  const bandWidth = (upper - lower) / middle;
  return { percentB, squeeze: bandWidth < 0.03 };
}

function calcVolumeTrend(klines: KlineBasic[]): number {
  if (klines.length < 10) return 0;
  const recent = klines.slice(-5).map((k) => k.high - k.low);
  const prev = klines.slice(-10, -5).map((k) => k.high - k.low);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / 5;
  const avgPrev = prev.reduce((a, b) => a + b, 0) / 5;
  if (avgPrev === 0) return 0;
  return (avgRecent - avgPrev) / avgPrev;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADINGVIEW VOTING ENGINE (Bypass status Neutral yang macet)
// ─────────────────────────────────────────────────────────────────────────────

function getSignalFromVoting(buys: number, neutrals: number, sells: number): Signal {
  const total = buys + sells;
  if (total === 0) return "Neutral";

  if (buys > sells) {
    if (buys >= total * 0.7) return "Strong Buy";
    return "Buy";
  } else if (sells > buys) {
    if (sells >= total * 0.7) return "Strong Sell";
    return "Sell";
  }
  return "Neutral";
}

function calculateTechnicalsGrouped(klines: KlineBasic[]) {
  const c = closes(klines);
  const lastClose = c[c.length - 1];

  // 1. KELOMPOK OSCILLATORS
  const oscillators: IndicatorResult[] = [];

  const rsi = calcRSI(c, 14);
  let rsiSig: Signal = "Neutral";
  if (rsi < 30) rsiSig = "Buy"; else if (rsi > 70) rsiSig = "Sell";
  oscillators.push({ name: "RSI (14)", value: rsi.toFixed(2), signal: rsiSig, score: rsiSig === "Buy" ? 1 : rsiSig === "Sell" ? -1 : 0 });

  const { k: stochK } = calcStochastic(klines);
  let stochSig: Signal = "Neutral";
  if (stochK < 20) stochSig = "Buy"; else if (stochK > 80) stochSig = "Sell";
  oscillators.push({ name: "Stochastic %K", value: stochK.toFixed(2), signal: stochSig, score: stochSig === "Buy" ? 1 : stochSig === "Sell" ? -1 : 0 });

  const { macd, hist } = calcMACD(c);
  let macdSig: Signal = "Neutral";
  if (hist > 0 && macd > 0) macdSig = "Buy"; else if (hist < 0 && macd < 0) macdSig = "Sell";
  oscillators.push({ name: "MACD (12,26)", value: hist.toFixed(4), signal: macdSig, score: macdSig === "Buy" ? 1 : macdSig === "Sell" ? -1 : 0 });

  const { percentB } = calcBollingerBands(c);
  let bbSig: Signal = "Neutral";
  if (percentB < 0.2) bbSig = "Buy"; else if (percentB > 0.8) bbSig = "Sell";
  oscillators.push({ name: "Bollinger %B", value: `${(percentB * 100).toFixed(1)}%`, signal: bbSig, score: bbSig === "Buy" ? 1 : bbSig === "Sell" ? -1 : 0 });

  const volTrend = calcVolumeTrend(klines);
  let volSig: Signal = "Neutral";
  if (volTrend > 0.1 && lastClose > (c[c.length - 2] ?? lastClose)) volSig = "Buy";
  else if (volTrend > 0.1 && lastClose < (c[c.length - 2] ?? lastClose)) volSig = "Sell";
  oscillators.push({ name: "Volume Trend", value: `${(volTrend * 100).toFixed(1)}%`, signal: volSig, score: volSig === "Buy" ? 1 : volSig === "Sell" ? -1 : 0 });

  // 2. KELOMPOK MOVING AVERAGES (Diperbanyak agar hasil presisi seperti TradingView asli)
  const movingAverages: IndicatorResult[] = [];
  const maPeriods = [10, 20, 30, 50, 100, 200];

  maPeriods.forEach(p => {
    if (c.length >= p) {
      const vEma = ema(c, p);
      const lastEma = vEma[vEma.length - 1];
      const emaSig = lastClose > lastEma ? "Buy" : "Sell";
      movingAverages.push({ name: `EMA (${p})`, value: lastEma.toFixed(2), signal: emaSig, score: emaSig === "Buy" ? 1 : -1 });

      const vSma = sma(c, p);
      const lastSma = vSma[vSma.length - 1];
      const smaSig = lastClose > lastSma ? "Buy" : "Sell";
      movingAverages.push({ name: `SMA (${p})`, value: lastSma.toFixed(2), signal: smaSig, score: smaSig === "Buy" ? 1 : -1 });
    }
  });

  // TOTAL AGGREGATION VOTING
  const allIndicators = [...oscillators, ...movingAverages];
  const buys = allIndicators.filter(i => i.signal === "Buy").length;
  const sells = allIndicators.filter(i => i.signal === "Sell").length;
  const neutrals = allIndicators.filter(i => i.signal === "Neutral").length;

  // Hitung persentase posisi jarum gauge (-100 ke 100)
  const totalScore = allIndicators.reduce((acc, i) => acc + i.score, 0);
  const aggregate = (totalScore / allIndicators.length) * 100;

  return {
    oscillators,
    movingAverages,
    buys,
    neutrals,
    sells,
    aggregate,
    signal: getSignalFromVoting(buys, neutrals, sells)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI: TradingView Gauge Semicircle Arc
// ─────────────────────────────────────────────────────────────────────────────

function TradingViewGauge({ value, signal }: { value: number; signal: Signal }) {
  const safeValue = Math.max(-100, Math.min(100, value));
  const angle = (safeValue / 100) * 90;
  const rad = ((angle - 90) * Math.PI) / 180;

  const cx = 110, cy = 90, radius = 70;
  const nx = cx + 50 * Math.cos(rad);
  const ny = cy + 50 * Math.sin(rad);

  const colors = {
    "Strong Sell": "#F23645",
    "Sell": "#F7525F",
    "Neutral": "#787B86",
    "Buy": "#22AB94",
    "Strong Buy": "#089981",
  };

  const activeColor = colors[signal];
  const trackGray = "rgba(120, 123, 134, 0.15)";

  function drawSimpleArc(startDeg: number, endDeg: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(toRad(startDeg)), y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg)), y2 = cy + radius * Math.sin(toRad(endDeg));
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  }

  const arcMapping = {
    "Strong Sell": { start: 180, end: 216 },
    "Sell": { start: 216, end: 252 },
    "Neutral": { start: 252, end: 288 },
    "Buy": { start: 288, end: 324 },
    "Strong Buy": { start: 324, end: 360 },
  };

  const activeArc = arcMapping[signal];

  return (
    <div className="relative w-full max-w-[280px] mx-auto select-none">
      <span className="absolute top-10 left-0 text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Strong sell</span>
      <span className="absolute top-2 left-10 text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Sell</span>
      <span className="absolute -top-1 left-[43%] text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Neutral</span>
      <span className="absolute top-2 right-10 text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Buy</span>
      <span className="absolute top-10 right-0 text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Strong buy</span>

      <svg viewBox="0 0 220 110" className="w-full mt-4">
        <path d={drawSimpleArc(180, 360)} stroke={trackGray} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path
          d={drawSimpleArc(activeArc.start, activeArc.end)}
          stroke={activeColor} strokeWidth={8} fill="none" strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500 ease-out" />
        <circle cx={cx} cy={cy} r="4" fill="#94a3b8" />
        <circle cx={cx} cy={cy} r="1.5" fill="#111827" />
      </svg>
    </div>
  );
}

function RowActionBadge({ signal }: { signal: Signal }) {
  const styles: Record<Signal, string> = {
    "Strong Buy": "text-[#089981] bg-[#089981]/10 px-2 py-0.5 rounded font-extrabold text-[10px]",
    "Buy": "text-[#22AB94] bg-[#22AB94]/10 px-2 py-0.5 rounded font-extrabold text-[10px]",
    "Neutral": "text-[#787B86] bg-[#787B86]/10 px-2 py-0.5 rounded font-extrabold text-[10px]",
    "Sell": "text-[#F7525F] bg-[#F7525F]/10 px-2 py-0.5 rounded font-extrabold text-[10px]",
    "Strong Sell": "text-[#F23645] bg-[#F23645]/10 px-2 py-0.5 rounded font-extrabold text-[10px]",
  };
  return <span className={styles[signal]}>{signal.toUpperCase()}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Technicals Component
// ─────────────────────────────────────────────────────────────────────────────

interface TechnicalsGaugeProps {
  klines: KlineBasic[];
  symbol: string;
  interval?: string;
}

export default function TechnicalsGauge({ klines, symbol, interval = "1D" }: TechnicalsGaugeProps) {
  const result = useMemo(() => {
    if (!klines || klines.length < 35) return null; // Butuh data MA200
    return calculateTechnicalsGrouped(klines);
  }, [klines]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-border rounded-2xl bg-card text-muted-foreground text-xs space-y-2">
        <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
        <span>Mengumpulkan data osilator & MA untuk {symbol}...</span>
      </div>
    );
  }

  const { oscillators, movingAverages, buys, neutrals, sells, aggregate, signal } = result;

  const signalTextColor = {
    "Strong Buy": "text-[#089981]",
    "Buy": "text-[#22AB94]",
    "Neutral": "text-[#787B86]",
    "Sell": "text-[#F7525F]",
    "Strong Sell": "text-[#F23645]",
  }[signal];

  return (
    <div className="space-y-6">

      {/* SECTION 1: HEADER & GAUGE SUMMARY CARD */}
      <div className="border border-border bg-card p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-4 bg-secondary/40 px-3 py-1 rounded-full border border-border/30">
          <span className="text-xs font-black text-foreground uppercase tracking-wider">{symbol.replace("USDT", "")}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase">METER TEKNIKAL {interval}</span>
        </div>

        <TradingViewGauge value={aggregate} signal={signal} />

        <div className="text-center mt-2">
          <p className={`text-3xl font-black uppercase tracking-tight ${signalTextColor} drop-shadow-xs animate-pulse`}>
            {signal}
          </p>
        </div>

        {/* Counter Summary Terpadu */}
        <div className="flex items-center justify-between w-full max-w-[280px] pt-5 mt-2 border-t border-border/40 text-center">
          <div>
            <div className="text-xl font-black text-[#F23645]">{sells}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Jual (Sell)</div>
          </div>
          <div className="px-6 border-x border-border/60">
            <div className="text-xl font-black text-[#787B86]">{neutrals}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Netral</div>
          </div>
          <div>
            <div className="text-xl font-black text-[#089981]">{buys}</div>
            <div className="text-[9px] uppercase font-bold text-brand-green tracking-wider">Beli (Buy)</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SEPARATED BREAKDOWN TABLES (Sektor Berbeda Sesuai TradingView) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* KELOMPOK A: OSCILLATORS TABLE */}
        <div className="border border-border bg-card p-5 rounded-2xl shadow-sm flex flex-col">
          <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sektor Osilator (Oscillators)
            </h4>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">Momentum</span>
          </div>

          <div className="flex-1 space-y-0 text-sm">
            <div className="grid grid-cols-3 gap-2 pb-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              <div>Nama Indikator</div>
              <div className="text-right">Nilai Angka</div>
              <div className="text-right">Aksi Pasar</div>
            </div>

            {oscillators.map((ind, idx) => (
              <div
                key={ind.name}
                className={`grid grid-cols-3 gap-2 py-3 items-center hover:bg-secondary/20 rounded-lg transition-colors px-1 ${idx !== oscillators.length - 1 ? 'border-b border-border/30' : ''
                  }`}
              >
                <div className="text-foreground font-bold text-xs truncate">{ind.name}</div>
                <div className="text-right text-foreground font-mono text-xs font-medium">{ind.value}</div>
                <div className="text-right"><RowActionBadge signal={ind.signal} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* KELOMPOK B: MOVING AVERAGES TABLE */}
        <div className="border border-border bg-card p-5 rounded-2xl shadow-sm flex flex-col">
          <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Rata-Rata Bergerak (MA)
            </h4>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">Trend Ride</span>
          </div>

          <div className="flex-1 space-y-0 text-sm max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            <div className="grid grid-cols-3 gap-2 pb-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider sticky top-0 bg-card z-10">
              <div>Sinyal Tren</div>
              <div className="text-right">Nilai Eksekusi</div>
              <div className="text-right">Aksi Pasar</div>
            </div>

            {movingAverages.map((ind, idx) => (
              <div
                key={ind.name}
                className={`grid grid-cols-3 gap-2 py-2.5 items-center hover:bg-secondary/20 rounded-lg transition-colors px-1 ${idx !== movingAverages.length - 1 ? 'border-b border-border/30' : ''
                  }`}
              >
                <div className="text-foreground font-bold text-xs truncate">{ind.name}</div>
                <div className="text-right text-foreground font-mono text-xs font-medium">{ind.value}</div>
                <div className="text-right"><RowActionBadge signal={ind.signal} /></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}