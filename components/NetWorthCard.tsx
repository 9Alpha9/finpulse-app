"use client";

import React, { useState } from "react";
import { Info, MoreVertical, Plus, ChevronUp, ChevronDown, TrendingUp } from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface NetWorthCardProps {
  isMounted: boolean;
}

const netWorthData = [
  { name: "01 Jun", value: 1800 },
  { name: "05 Jun", value: 1850 },
  { name: "10 Jun", value: 1820 },
  { name: "15 Jun", value: 1910 },
  { name: "20 Jun", value: 1890 },
  { name: "25 Jun", value: 1970 },
  { name: "30 Jun", value: 2003.57 },
];

export default function NetWorthCard({ isMounted }: NetWorthCardProps) {
  const [netWorthTab, setNetWorthTab] = useState("1M");
  const [investmentsExpanded, setInvestmentsExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [showTooltipBanner, setShowTooltipBanner] = useState(true);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Worth</span>
          <button 
            onClick={() => setShowTooltipBanner(!showTooltipBanner)}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <button className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Net Worth value & changes */}
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">$2,003.57</h2>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <TrendingUp className="h-3 w-3" />
          <span>+$1,999.99 (61,925.8%)</span>
        </div>
      </div>

      {/* Interactive Tooltip Overlay in center */}
      <AnimatePresence>
        {showTooltipBanner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-4 shadow-xl max-w-[280px] text-center"
          >
            <button 
              onClick={() => setShowTooltipBanner(false)}
              className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              ✕
            </button>
            <p className="text-xs text-popover-foreground leading-normal">
              Building wealth takes time. Your net worth graph takes a week to populate.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graph Tab Options */}
      <div className="mt-6 flex justify-between items-center border-b border-border pb-3">
        <div className="flex gap-1">
          {["1D", "1W", "1M", "3M", "YTD", "ALL"].map((tab) => (
            <button
              key={tab}
              onClick={() => setNetWorthTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                netWorthTab === tab 
                  ? "bg-secondary text-foreground border border-border" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Plus Icon to quick-add */}
        <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background hover:bg-opacity-95 transition shadow-sm">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Sparkline line Chart */}
      <div className="h-48 mt-4 w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthData} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="networthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ 
                  background: "var(--card)", 
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  borderRadius: "12px",
                  fontSize: "12px"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--muted-foreground)" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#networthGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
        )}
      </div>

      {/* Progress bar: Assets vs Liabilities */}
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <div className="flex flex-col text-left">
            <span className="text-muted-foreground uppercase font-semibold text-[10px]">Assets</span>
            <span className="text-foreground text-sm font-extrabold">$2,536</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground uppercase font-semibold text-[10px]">Liabilities</span>
            <span className="text-foreground text-sm font-extrabold">$0</span>
          </div>
        </div>
        
        {/* Visual Progress bar */}
        <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
          <div className="bg-brand-green h-full w-[99%]" />
          <div className="bg-destructive h-full w-[1%]" />
        </div>
      </div>

      {/* Expandable Rows for investments and others */}
      <div className="mt-5 space-y-2.5 border-t border-border pt-4">
        {/* Investments row */}
        <div>
          <button 
            onClick={() => setInvestmentsExpanded(!investmentsExpanded)}
            className="flex w-full items-center justify-between text-xs py-1.5 hover:bg-muted/40 rounded-lg px-2 transition"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
              <span className="font-semibold text-muted-foreground">Investments</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">$34</span>
              {investmentsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>
          {investmentsExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pl-6 pr-2 py-1 text-xs text-muted-foreground flex justify-between"
            >
              <span>Crypto Stocks</span>
              <span className="font-semibold text-foreground">$34.00</span>
            </motion.div>
          )}
        </div>

        {/* Other asset row */}
        <div>
          <button 
            onClick={() => setOtherExpanded(!otherExpanded)}
            className="flex w-full items-center justify-between text-xs py-1.5 hover:bg-muted/40 rounded-lg px-2 transition"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="font-semibold text-muted-foreground">Other</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">$2,453</span>
              {otherExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>
          {otherExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pl-6 pr-2 py-1 text-xs text-muted-foreground flex justify-between"
            >
              <span>Cash & Savings Account</span>
              <span className="font-semibold text-foreground">$2,453.00</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
