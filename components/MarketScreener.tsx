"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Flame, Loader2 } from "lucide-react";
import { fetchTopGainersLosers, MarketTicker } from "@/src/lib/binance";
import { motion } from "framer-motion";

export default function MarketScreener() {
    const [gainers, setGainers] = useState<MarketTicker[]>([]);
    const [losers, setLosers] = useState<MarketTicker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadData = async () => {
            setLoading(true);
            const data = await fetchTopGainersLosers();
            if (active) {
                setGainers(data.gainers);
                setLosers(data.losers);
                setLoading(false);
            }
        };
        loadData();
        // Auto-refresh setiap 60 detik
        const interval = setInterval(loadData, 60000);
        return () => { active = false; clearInterval(interval); };
    }, []);

    const formatPrice = (p: string) => {
        const val = parseFloat(p);
        return val < 0.01 ? val.toFixed(6) : val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_4px_10px_rgba(249,115,22,0.3)] border border-white/20 shrink-0">
                    <Flame className="h-5 w-5 drop-shadow-md" />
                </div>
                <div>
                    <div className="flex items-center gap-2 justify-between w-full">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Market Screener</h3>
                        <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded uppercase text-muted-foreground">Crypto</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Top Gainers & Losers 24 Jam</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-green mr-2" /> Memuat data pasar...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Top Gainers */}
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-3">
                            <TrendingUp className="h-3.5 w-3.5" /> Top Gainers
                        </h4>
                        <div className="space-y-2">
                            {gainers.map((coin, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    key={coin.symbol}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-bold text-foreground">{coin.symbol.replace("USDT", "")}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono font-semibold">${formatPrice(coin.lastPrice)}</div>
                                        <div className="text-[10px] font-bold text-emerald-500">+{parseFloat(coin.priceChangePercent).toFixed(2)}%</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Top Losers */}
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 uppercase tracking-widest mb-3">
                            <TrendingDown className="h-3.5 w-3.5" /> Top Losers
                        </h4>
                        <div className="space-y-2">
                            {losers.map((coin, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    key={coin.symbol}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-bold text-foreground">{coin.symbol.replace("USDT", "")}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono font-semibold">${formatPrice(coin.lastPrice)}</div>
                                        <div className="text-[10px] font-bold text-red-500">{parseFloat(coin.priceChangePercent).toFixed(2)}%</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}