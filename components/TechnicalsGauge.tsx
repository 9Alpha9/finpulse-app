"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  name:   string;
  value:  string;
  signal: Signal;
  score:  number; // -2 to +2
}

// ─────────────────────────────────────────────────────────────────────────────
// Technical Calculations
// ─────────────────────────────────────────────────────────────────────────────

function closes(klines: KlineBasic[]) {
  return klines.map((k) => k.close);
}

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

/** RSI(period) */
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

/** MACD(12,26,9) → {macd, signal, hist} at last candle */
function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, hist: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (isNaN(v) || isNaN(ema26[i]) ? NaN : v - ema26[i]));
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalLine = ema(validMacd, 9);
  const lastMacd   = validMacd[validMacd.length - 1] ?? 0;
  const lastSignal = signalLine[signalLine.length - 1] ?? 0;
  return { macd: lastMacd, signal: lastSignal, hist: lastMacd - lastSignal };
}

/** Stochastic %K(14,3) → {k, d} at last candle */
function calcStochastic(klines: KlineBasic[], kPeriod = 14, dPeriod = 3): { k: number; d: number } {
  if (klines.length < kPeriod) return { k: 50, d: 50 };
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < klines.length; i++) {
    const slice = klines.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((k) => k.high));
    const lowest  = Math.min(...slice.map((k) => k.low));
    const kVal = highest === lowest ? 50 : ((klines[i].close - lowest) / (highest - lowest)) * 100;
    kValues.push(kVal);
  }
  const kSmoothed = sma(kValues, 3);
  const dLine     = sma(kSmoothed.filter((v) => !isNaN(v)), dPeriod);
  return {
    k: kSmoothed[kSmoothed.length - 1] ?? 50,
    d: dLine[dLine.length - 1] ?? 50,
  };
}

/** Bollinger Bands(20,2) → {upper, middle, lower, percentB} */
function calcBollingerBands(closes: number[], period = 20, stdDev = 2): { percentB: number; squeeze: boolean } {
  if (closes.length < period) return { percentB: 0.5, squeeze: false };
  const slice  = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const std    = Math.sqrt(variance);
  const upper  = middle + stdDev * std;
  const lower  = middle - stdDev * std;
  const last   = closes[closes.length - 1];
  const percentB = upper === lower ? 0.5 : (last - lower) / (upper - lower);
  const bandWidth = (upper - lower) / middle;
  return { percentB, squeeze: bandWidth < 0.03 };
}

/** Volume trend: avg volume last 5 vs prev 5 */
function calcVolumeTrend(klines: KlineBasic[]): number {
  if (klines.length < 10) return 0;
  const recent = klines.slice(-5).map((k) => k.high - k.low); // proxy for volume activity
  const prev   = klines.slice(-10, -5).map((k) => k.high - k.low);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / 5;
  const avgPrev   = prev.reduce((a, b) => a + b, 0) / 5;
  if (avgPrev === 0) return 0;
  return (avgRecent - avgPrev) / avgPrev; // positive = increasing volume
}

function signalFromScore(score: number): Signal {
  if (score >= 1.5) return "Strong Buy";
  if (score >= 0.5) return "Buy";
  if (score <= -1.5) return "Strong Sell";
  if (score <= -0.5) return "Sell";
  return "Neutral";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calculation: aggregates all indicators
// ─────────────────────────────────────────────────────────────────────────────

function calculateTechnicals(klines: KlineBasic[]): {
  indicators: IndicatorResult[];
  aggregate:  number; // -100 to +100
  signal:     Signal;
  buys:       number;
  neutrals:   number;
  sells:      number;
} {
  const c = closes(klines);
  const indicators: IndicatorResult[] = [];

  // ── RSI(14) ──
  const rsi = calcRSI(c, 14);
  let rsiScore = 0;
  let rsiSig: Signal = "Neutral";
  if (rsi < 30) { rsiScore = 2; rsiSig = "Strong Buy"; }
  else if (rsi < 45) { rsiScore = 1; rsiSig = "Buy"; }
  else if (rsi > 70) { rsiScore = -2; rsiSig = "Strong Sell"; }
  else if (rsi > 55) { rsiScore = -1; rsiSig = "Sell"; }
  indicators.push({ name: "RSI(14)", value: rsi.toFixed(1), signal: rsiSig, score: rsiScore });

  // ── MACD(12,26,9) ──
  const { macd, signal: macdSignal, hist } = calcMACD(c);
  let macdScore = 0;
  let macdSig: Signal = "Neutral";
  if (hist > 0 && macd > 0) { macdScore = 2; macdSig = "Strong Buy"; }
  else if (hist > 0) { macdScore = 1; macdSig = "Buy"; }
  else if (hist < 0 && macd < 0) { macdScore = -2; macdSig = "Strong Sell"; }
  else if (hist < 0) { macdScore = -1; macdSig = "Sell"; }
  indicators.push({
    name: "MACD(12,26,9)",
    value: `${hist >= 0 ? "+" : ""}${hist.toFixed(4)}`,
    signal: macdSig,
    score: macdScore,
  });

  // ── MA Cross: MA20 vs MA50 ──
  const ma20 = sma(c, 20);
  const ma50 = sma(c, 50);
  const lastMa20 = ma20[ma20.length - 1];
  const lastMa50 = ma50[ma50.length - 1];
  let maSig: Signal = "Neutral";
  let maScore = 0;
  if (!isNaN(lastMa20) && !isNaN(lastMa50)) {
    const pct = (lastMa20 - lastMa50) / lastMa50 * 100;
    if (pct > 2) { maScore = 2; maSig = "Strong Buy"; }
    else if (pct > 0) { maScore = 1; maSig = "Buy"; }
    else if (pct < -2) { maScore = -2; maSig = "Strong Sell"; }
    else if (pct < 0) { maScore = -1; maSig = "Sell"; }
  }
  indicators.push({
    name: "MA Cross (20/50)",
    value: !isNaN(lastMa20) ? lastMa20.toFixed(2) : "N/A",
    signal: maSig,
    score: maScore,
  });

  // ── Stochastic(14,3) ──
  const { k: stochK, d: stochD } = calcStochastic(klines);
  let stochScore = 0;
  let stochSig: Signal = "Neutral";
  if (stochK < 20 && stochK > stochD) { stochScore = 2; stochSig = "Strong Buy"; }
  else if (stochK < 40) { stochScore = 1; stochSig = "Buy"; }
  else if (stochK > 80 && stochK < stochD) { stochScore = -2; stochSig = "Strong Sell"; }
  else if (stochK > 60) { stochScore = -1; stochSig = "Sell"; }
  indicators.push({
    name: "Stochastic(14,3)",
    value: `${stochK.toFixed(1)} / ${stochD.toFixed(1)}`,
    signal: stochSig,
    score: stochScore,
  });

  // ── Bollinger Bands(20,2) ──
  const { percentB, squeeze } = calcBollingerBands(c);
  let bbScore = 0;
  let bbSig: Signal = "Neutral";
  if (percentB < 0.1) { bbScore = 2; bbSig = "Strong Buy"; }
  else if (percentB < 0.35) { bbScore = 1; bbSig = "Buy"; }
  else if (percentB > 0.9) { bbScore = -2; bbSig = "Strong Sell"; }
  else if (percentB > 0.65) { bbScore = -1; bbSig = "Sell"; }
  indicators.push({
    name: "Bollinger Bands(20)",
    value: squeeze ? "%B squeeze" : `%B ${(percentB * 100).toFixed(1)}`,
    signal: bbSig,
    score: bbScore,
  });

  // ── Volume Trend ──
  const volTrend = calcVolumeTrend(klines);
  const lastClose = c[c.length - 1];
  const prevClose = c[c.length - 2] ?? lastClose;
  const priceUp = lastClose > prevClose;
  let volScore = 0;
  let volSig: Signal = "Neutral";
  if (volTrend > 0.1 && priceUp) { volScore = 2; volSig = "Strong Buy"; }
  else if (volTrend > 0 && priceUp) { volScore = 1; volSig = "Buy"; }
  else if (volTrend > 0.1 && !priceUp) { volScore = -2; volSig = "Strong Sell"; }
  else if (volTrend > 0 && !priceUp) { volScore = -1; volSig = "Sell"; }
  indicators.push({
    name: "Volume Trend",
    value: `${volTrend >= 0 ? "+" : ""}${(volTrend * 100).toFixed(1)}%`,
    signal: volSig,
    score: volScore,
  });

  // ── Aggregate ──
  const totalScore = indicators.reduce((a, b) => a + b.score, 0);
  const maxScore   = indicators.length * 2;
  const aggregate  = (totalScore / maxScore) * 100; // -100 to +100

  const buys     = indicators.filter((i) => i.signal === "Buy" || i.signal === "Strong Buy").length;
  const sells    = indicators.filter((i) => i.signal === "Sell" || i.signal === "Strong Sell").length;
  const neutrals = indicators.filter((i) => i.signal === "Neutral").length;

  return {
    indicators,
    aggregate,
    signal: signalFromScore(totalScore / indicators.length),
    buys,
    neutrals,
    sells,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauge SVG Component
// ─────────────────────────────────────────────────────────────────────────────

function GaugeSVG({ value }: { value: number }) {
  // value: -100 to +100, maps to -90° to +90° (left to right arc)
  const angle = (value / 100) * 90; // degrees, 0 = center
  const rad   = ((angle - 90) * Math.PI) / 180;
  const cx = 110, cy = 100, r = 70;
  const needleLen = 58;
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy + needleLen * Math.sin(rad);

  // Arc: semicircle from 180° to 0° (left to right)
  // Colored segments
  const segments = [
    { start: 180, end: 216, color: "#ef4444" }, // Strong Sell
    { start: 216, end: 252, color: "#f97316" }, // Sell
    { start: 252, end: 288, color: "#94a3b8" }, // Neutral
    { start: 288, end: 324, color: "#22c55e" }, // Buy
    { start: 324, end: 360, color: "#10b981" }, // Strong Buy
  ];

  function arcPath(startDeg: number, endDeg: number, outerR: number, innerR: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const s  = toRad(startDeg);
    const e  = toRad(endDeg);
    const x1 = cx + outerR * Math.cos(s), y1 = cy + outerR * Math.sin(s);
    const x2 = cx + outerR * Math.cos(e), y2 = cy + outerR * Math.sin(e);
    const x3 = cx + innerR * Math.cos(e), y3 = cy + innerR * Math.sin(e);
    const x4 = cx + innerR * Math.cos(s), y4 = cy + innerR * Math.sin(s);
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;
  }

  return (
    <svg viewBox="0 0 220 120" className="w-full max-w-[280px] mx-auto">
      {/* Colored arc segments */}
      {segments.map((seg, i) => (
        <path key={i} d={arcPath(seg.start, seg.end, r + 12, r - 2)} fill={seg.color} opacity={0.85} />
      ))}

      {/* Background track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="transparent"
        strokeWidth="2"
      />

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke="#f8fafc"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="5" fill="#f8fafc" />

      {/* Labels */}
      <text x={cx - r - 14} y={cy + 16} textAnchor="middle" fontSize="8" fill="#94a3b8">Strong sell</text>
      <text x={cx - r + 24}  y={cy - 14} textAnchor="middle" fontSize="8" fill="#94a3b8">Sell</text>
      <text x={cx}            y={cy - 78} textAnchor="middle" fontSize="8" fill="#94a3b8">Neutral</text>
      <text x={cx + r - 22}  y={cy - 14} textAnchor="middle" fontSize="8" fill="#94a3b8">Buy</text>
      <text x={cx + r + 14}  y={cy + 16} textAnchor="middle" fontSize="8" fill="#94a3b8">Strong buy</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Badge
// ─────────────────────────────────────────────────────────────────────────────

function SignalBadge({ signal, score }: { signal: Signal; score: number }) {
  const config: Record<Signal, { color: string; icon: React.ReactNode }> = {
    "Strong Buy":  { color: "text-emerald-500 bg-emerald-500/10", icon: <TrendingUp className="h-3 w-3" /> },
    "Buy":         { color: "text-green-500 bg-green-500/10",     icon: <TrendingUp className="h-3 w-3" /> },
    "Neutral":     { color: "text-slate-400 bg-slate-500/10",     icon: <Minus className="h-3 w-3" /> },
    "Sell":        { color: "text-orange-500 bg-orange-500/10",   icon: <TrendingDown className="h-3 w-3" /> },
    "Strong Sell": { color: "text-red-500 bg-red-500/10",         icon: <TrendingDown className="h-3 w-3" /> },
  };
  const { color, icon } = config[signal];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {icon}{signal}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface TechnicalsGaugeProps {
  klines:  KlineBasic[];
  symbol:  string;
  market:  "crypto" | "stocks";
}

export default function TechnicalsGauge({ klines, symbol, market }: TechnicalsGaugeProps) {
  const result = useMemo(() => {
    if (!klines || klines.length < 15) return null;
    return calculateTechnicals(klines);
  }, [klines]);

  if (!result) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
        Butuh minimal 15 candle untuk kalkulasi teknikal...
      </div>
    );
  }

  const { indicators, aggregate, signal, buys, neutrals, sells } = result;

  // Signal label color
  const signalColor = {
    "Strong Buy":  "text-emerald-500",
    "Buy":         "text-green-400",
    "Neutral":     "text-slate-400",
    "Sell":        "text-orange-500",
    "Strong Sell": "text-red-500",
  }[signal];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

      {/* Left: Gauge */}
      <div className="flex flex-col items-center">
        <GaugeSVG value={aggregate} />
        <p className={`text-xl font-extrabold mt-1 ${signalColor}`}>{signal}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {symbol} · {market === "crypto" ? "Kripto" : "IDX Saham"}
        </p>

        {/* Buy/Neutral/Sell counts */}
        <div className="flex gap-4 mt-4 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-500">{buys}</div>
            <div className="text-muted-foreground font-semibold">Beli</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-400">{neutrals}</div>
            <div className="text-muted-foreground font-semibold">Netral</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">{sells}</div>
            <div className="text-muted-foreground font-semibold">Jual</div>
          </div>
        </div>
      </div>

      {/* Right: Indicator breakdown */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Rincian Indikator
        </h4>
        {indicators.map((ind) => (
          <div key={ind.name} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block">{ind.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{ind.value}</span>
            </div>
            <SignalBadge signal={ind.signal} score={ind.score} />
          </div>
        ))}
      </div>
    </div>
  );
}
