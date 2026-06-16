import React from 'react';

import { Settings2, Activity, TrendingUp } from 'lucide-react';

export interface ChartIndicators {
  ma: boolean;
  rsi: boolean;
  macd: boolean;
}

interface IndicatorTogglesProps {
  indicators: ChartIndicators;
  onToggle: (indicator: keyof ChartIndicators) => void;
}

export default function IndicatorToggles({ indicators, onToggle }: IndicatorTogglesProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-1.5 backdrop-blur-md">
      <button
        onClick={() => onToggle('ma')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          indicators.ma
            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <TrendingUp className="h-3.5 w-3.5" /> MA
      </button>

      <button
        onClick={() => onToggle('rsi')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          indicators.rsi
            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Activity className="h-3.5 w-3.5" /> RSI
      </button>

      <button
        onClick={() => onToggle('macd')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          indicators.macd
            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Settings2 className="h-3.5 w-3.5" /> MACD
      </button>
    </div>
  );
}
