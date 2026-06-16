"use client";

import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KlineBasic {
  time:  number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
  volume: number;
}

type Signal = "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";

interface IndicatorResult {
  name:   string;
  value:  string;
  signal: Signal;
  score:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math Helpers
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
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, hist: 0 };
  const ema12  = ema(closes, 12);
  const ema26  = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (isNaN(v) || isNaN(ema26[i]) ? NaN : v - ema26[i]));
  const validMacd  = macdLine.filter((v) => !isNaN(v));
  const signalLine = ema(validMacd, 9);
  const lastMacd   = validMacd[validMacd.length - 1] ?? 0;
  const lastSignal = signalLine[signalLine.length - 1] ?? 0;
  return { macd: lastMacd, signal: lastSignal, hist: lastMacd - lastSignal };
}

function calcStochastic(klines: KlineBasic[], kPeriod = 14, dPeriod = 3): { k: number; d: number } {
  if (klines.length < kPeriod) return { k: 50, d: 50 };
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < klines.length; i++) {
    const slice   = klines.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((k) => k.high));
    const lowest  = Math.min(...slice.map((k) => k.low));
    kValues.push(highest === lowest ? 50 : ((klines[i].close - lowest) / (highest - lowest)) * 100);
  }
  const kSmoothed = sma(kValues, 3);
  const dLine     = sma(kSmoothed.filter((v) => !isNaN(v)), dPeriod);
  return {
    k: kSmoothed[kSmoothed.length - 1] ?? 50,
    d: dLine[dLine.length - 1] ?? 50,
  };
}

function calcBollingerBands(closes: number[], period = 20, stdDev = 2): { percentB: number } {
  if (closes.length < period) return { percentB: 0.5 };
  const slice    = closes.slice(-period);
  const middle   = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const std      = Math.sqrt(variance);
  const upper    = middle + stdDev * std;
  const lower    = middle - stdDev * std;
  const last     = closes[closes.length - 1];
  const percentB = upper === lower ? 0.5 : (last - lower) / (upper - lower);
  return { percentB };
}

function calcVolumeTrend(klines: KlineBasic[]): number {
  if (klines.length < 10) return 0;
  const recent    = klines.slice(-5).map((k) => k.volume);
  const prev      = klines.slice(-10, -5).map((k) => k.volume);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / 5;
  const avgPrev   = prev.reduce((a, b) => a + b, 0) / 5;
  return avgPrev === 0 ? 0 : (avgRecent - avgPrev) / avgPrev;
}

function getSignalFromVoting(buys: number, neutrals: number, sells: number): Signal {
  const total = buys + sells;
  if (total === 0) return "Neutral";
  if (buys > sells)  return buys  >= total * 0.7 ? "Strong Buy"  : "Buy";
  if (sells > buys)  return sells >= total * 0.7 ? "Strong Sell" : "Sell";
  return "Neutral";
}

function calculateTechnicalsGrouped(klines: KlineBasic[]) {
  const c         = closes(klines);
  const lastClose = c[c.length - 1];

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

  const movingAverages: IndicatorResult[] = [];
  const maPeriods = [10, 20, 30, 50, 100, 200];
  maPeriods.forEach((p) => {
    if (c.length >= p) {
      const vEma   = ema(c, p);
      const lastEma = vEma[vEma.length - 1];
      const emaSig  = lastClose > lastEma ? "Buy" : "Sell";
      movingAverages.push({ name: `EMA (${p})`, value: lastEma.toFixed(2), signal: emaSig, score: emaSig === "Buy" ? 1 : -1 });

      const vSma    = sma(c, p);
      const lastSma = vSma[vSma.length - 1];
      const smaSig  = lastClose > lastSma ? "Buy" : "Sell";
      movingAverages.push({ name: `SMA (${p})`, value: lastSma.toFixed(2), signal: smaSig, score: smaSig === "Buy" ? 1 : -1 });
    }
  });

  const allIndicators = [...oscillators, ...movingAverages];
  const buys     = allIndicators.filter((i) => i.signal === "Buy" || i.signal === "Strong Buy").length;
  const sells    = allIndicators.filter((i) => i.signal === "Sell" || i.signal === "Strong Sell").length;
  const neutrals = allIndicators.filter((i) => i.signal === "Neutral").length;
  const totalScore = allIndicators.reduce((acc, i) => acc + i.score, 0);
  const aggregate  = (totalScore / allIndicators.length) * 100;

  return { oscillators, movingAverages, buys, neutrals, sells, aggregate, signal: getSignalFromVoting(buys, neutrals, sells) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauge SVG — clean semicircle meter
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
  "Strong Sell": { color: "#F23645", hex: "#F23645" },
  "Sell":        { color: "#F7525F", hex: "#F7525F" },
  "Neutral":     { color: "#787B86", hex: "#787B86" },
  "Buy":         { color: "#22AB94", hex: "#22AB94" },
  "Strong Buy":  { color: "#089981", hex: "#089981" },
} as const;

function GaugeMeter({ value, signal }: { value: number; signal: Signal }) {
  // value: -100 (strong sell) to +100 (strong buy)
  // Map to angle: -100 → 180°, 0 → 270°, +100 → 360° (right side)
  // Semicircle from 180° to 360° (left to right, top arc)

  const clampedValue = Math.max(-100, Math.min(100, value));
  // Map -100..100 to 0..180 (degrees within the semicircle)
  const fraction  = (clampedValue + 100) / 200; // 0 to 1
  const angleDeg  = 180 + fraction * 180;        // 180° to 360°
  const angleRad  = (angleDeg * Math.PI) / 180;

  const cx = 120, cy = 110, R = 80;
  const needleLen = 65;

  const nx = cx + needleLen * Math.cos(angleRad);
  const ny = cy + needleLen * Math.sin(angleRad);

  const { color } = SIGNAL_CONFIG[signal];

  // Zone arc segments (each 36°): Strong Sell, Sell, Neutral, Buy, Strong Buy
  const zones = [
    { from: 180, to: 216, color: "#F23645" },
    { from: 216, to: 252, color: "#F7525F" },
    { from: 252, to: 288, color: "#787B86" },
    { from: 288, to: 324, color: "#22AB94" },
    { from: 324, to: 360, color: "#089981" },
  ];

  function arcPath(fromDeg: number, toDeg: number, r: number) {
    const f  = (fromDeg * Math.PI) / 180;
    const t  = (toDeg   * Math.PI) / 180;
    const x1 = cx + r * Math.cos(f);
    const y1 = cy + r * Math.sin(f);
    const x2 = cx + r * Math.cos(t);
    const y2 = cy + r * Math.sin(t);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  return (
    <svg viewBox="0 0 240 130" className="w-full max-w-[300px] mx-auto" style={{ overflow: "visible" }}>
      {/* Zone arcs — background (dim) */}
      {zones.map((z) => (
        <path
          key={z.from}
          d={arcPath(z.from, z.to, R)}
          stroke={z.color}
          strokeWidth={10}
          fill="none"
          strokeLinecap="butt"
          opacity={0.18}
        />
      ))}

      {/* Active zone arc — bright */}
      {zones.map((z) => {
        const midDeg    = (z.from + z.to) / 2;
        const zoneMid   = ((midDeg - 180) / 180) * 2 - 1; // -1 to 1
        const zoneVal   = clampedValue / 100;              // -1 to 1
        const isActive  = (
          (signal === "Strong Sell" && z.color === "#F23645") ||
          (signal === "Sell"        && z.color === "#F7525F") ||
          (signal === "Neutral"     && z.color === "#787B86") ||
          (signal === "Buy"         && z.color === "#22AB94") ||
          (signal === "Strong Buy"  && z.color === "#089981")
        );
        return isActive ? (
          <path
            key={`active-${z.from}`}
            d={arcPath(z.from, z.to, R)}
            stroke={z.color}
            strokeWidth={11}
            fill="none"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        ) : null;
      })}

      {/* Tick marks at zone boundaries */}
      {[180, 216, 252, 288, 324, 360].map((deg) => {
        const r   = (deg * Math.PI) / 180;
        const x1  = cx + (R - 8) * Math.cos(r);
        const y1  = cy + (R - 8) * Math.sin(r);
        const x2  = cx + (R + 8) * Math.cos(r);
        const y2  = cy + (R + 8) * Math.sin(r);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.5} className="text-border" />;
      })}

      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />

      {/* Pivot dot */}
      <circle cx={cx} cy={cy} r={6}  fill={color}     className="transition-colors duration-500" style={{ filter: `drop-shadow(0 0 3px ${color}60)` }} />
      <circle cx={cx} cy={cy} r={2.5} fill="var(--color-card)" />

      {/* Zone labels */}
      <text x={12}  y={112} textAnchor="middle" fontSize="8" fontWeight="700" fill="#F23645" opacity={0.9} fontFamily="inherit">SELL</text>
      <text x={240} y={112} textAnchor="middle" fontSize="8" fontWeight="700" fill="#089981" opacity={0.9} fontFamily="inherit">BUY</text>
      <text x={120} y={20}  textAnchor="middle" fontSize="8" fontWeight="700" fill="#787B86" opacity={0.9} fontFamily="inherit">NEUTRAL</text>
    </svg>
  );
}

function SignalBadge({ signal }: { signal: Signal }) {
  const { color } = SIGNAL_CONFIG[signal];
  return (
    <span
      className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {signal.toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TechnicalsGauge
// ─────────────────────────────────────────────────────────────────────────────

interface TechnicalsGaugeProps {
  klines:    KlineBasic[];
  symbol:    string;
  interval?: string;
  market?:   "crypto" | "stocks";
}

export default function TechnicalsGauge({ klines, symbol, interval = "1D" }: TechnicalsGaugeProps) {
  const result = useMemo(() => {
    if (!klines || klines.length < 35) return null;
    return calculateTechnicalsGrouped(klines);
  }, [klines]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-border rounded-2xl bg-card text-muted-foreground text-xs gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
        <span>Mengumpulkan data indikator untuk {symbol}...</span>
      </div>
    );
  }

  const { oscillators, movingAverages, buys, neutrals, sells, aggregate, signal } = result;
  const { color } = SIGNAL_CONFIG[signal];

  return (
    <div className="space-y-5">

      {/* ── Gauge Summary Card ─────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-2xl shadow-sm p-6">
        {/* Header pill */}
        <div className="flex items-center justify-center mb-5">
          <div className="flex items-center gap-2 bg-secondary/50 border border-border/40 px-4 py-1.5 rounded-full">
            <span className="text-xs font-black text-foreground uppercase tracking-wider">
              {symbol.replace("USDT", "")}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Meter Teknikal {interval}
            </span>
          </div>
        </div>

        {/* Gauge SVG */}
        <GaugeMeter value={aggregate} signal={signal} />

        {/* Signal label */}
        <div className="text-center mt-3">
          <p
            className="text-2xl font-black uppercase tracking-tight transition-colors duration-500"
            style={{ color, textShadow: `0 0 20px ${color}30` }}
          >
            {signal}
          </p>
        </div>

        {/* Counter row */}
        <div className="grid grid-cols-3 gap-0 mt-5 pt-4 border-t border-border/40">
          <div className="text-center border-r border-border/40">
            <div className="text-xl font-black text-[#F23645] tabular-nums">{sells}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Jual (Sell)</div>
          </div>
          <div className="text-center border-r border-border/40">
            <div className="text-xl font-black text-[#787B86] tabular-nums">{neutrals}</div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Netral</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-[#089981] tabular-nums">{buys}</div>
            <div className="text-[9px] uppercase font-bold text-[#089981] tracking-wider mt-0.5">Beli (Buy)</div>
          </div>
        </div>
      </div>

      {/* ── Indicator Tables ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Oscillators */}
        <div className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Osilator</h4>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">Momentum</span>
          </div>

          <div className="divide-y divide-border/40">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted/10">
              <div>Indikator</div>
              <div className="text-right">Nilai</div>
              <div className="text-right">Aksi</div>
            </div>
            {oscillators.map((ind) => (
              <div key={ind.name} className="grid grid-cols-3 gap-2 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors">
                <div className="text-xs font-semibold text-foreground truncate">{ind.name}</div>
                <div className="text-right text-xs font-mono text-muted-foreground">{ind.value}</div>
                <div className="text-right"><SignalBadge signal={ind.signal} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Moving Averages */}
        <div className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Moving Average</h4>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">Trend Ride</span>
          </div>

          <div className="divide-y divide-border/40 max-h-[320px] overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted/10 sticky top-0 z-10">
              <div>Sinyal</div>
              <div className="text-right">Nilai</div>
              <div className="text-right">Aksi</div>
            </div>
            {movingAverages.map((ind) => (
              <div key={ind.name} className="grid grid-cols-3 gap-2 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors">
                <div className="text-xs font-semibold text-foreground truncate">{ind.name}</div>
                <div className="text-right text-xs font-mono text-muted-foreground">{ind.value}</div>
                <div className="text-right"><SignalBadge signal={ind.signal} /></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}