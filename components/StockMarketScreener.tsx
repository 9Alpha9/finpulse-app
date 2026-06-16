"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Building2, Flame, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Mock data for Top Brokers and Top Stocks since there is no live API for it yet
const mockTopBrokers = [
    { broker: "YP", name: "Mirae Asset Sekuritas", netBuy: "Rp 1.2 T" },
    { broker: "PD", name: "Indo Premier Sekuritas", netBuy: "Rp 850 M" },
    { broker: "CC", name: "Mandiri Sekuritas", netBuy: "Rp 640 M" },
    { broker: "NI", name: "BNI Sekuritas", netBuy: "Rp 520 M" },
    { broker: "KZ", name: "CLSA Sekuritas", netBuy: "Rp 410 M" },
];

const mockTopStocks = [
    { symbol: "BBCA", change: "+2.5%", value: "Rp 2.1 T", isUp: true },
    { symbol: "BMRI", change: "+1.8%", value: "Rp 1.8 T", isUp: true },
    { symbol: "BRIS", change: "+4.2%", value: "Rp 1.2 T", isUp: true },
    { symbol: "GOTO", change: "-3.1%", value: "Rp 950 M", isUp: false },
    { symbol: "TLKM", change: "+0.5%", value: "Rp 880 M", isUp: true },
];

export default function StockMarketScreener() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate network fetch
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-white/20 shrink-0">
                    <Flame className="h-5 w-5 drop-shadow-md" />
                </div>
                <div>
                    <div className="flex items-center gap-2 justify-between w-full">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Market Screener</h3>
                        <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded uppercase text-muted-foreground">Saham (IDX)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Top Broker & Saham Teraktif</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-green mr-2" /> Memuat data pasar...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Top Brokers */}
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-3">
                            <Building2 className="h-3.5 w-3.5" /> Top Broker
                        </h4>
                        <div className="space-y-2">
                            {mockTopBrokers.map((broker, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    key={broker.broker}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-500">
                                            {broker.broker}
                                        </div>
                                        <div className="truncate">
                                            <div className="text-[10px] font-bold text-foreground truncate">{broker.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] font-bold text-brand-green">Net Buy</div>
                                        <div className="text-[11px] font-mono font-semibold text-foreground">{broker.netBuy}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Top Stocks */}
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-3">
                            <TrendingUp className="h-3.5 w-3.5" /> Top Saham
                        </h4>
                        <div className="space-y-2">
                            {mockTopStocks.map((stock, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    key={stock.symbol}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${stock.isUp ? "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10" : "bg-red-500/5 border-red-500/10 hover:bg-red-500/10"}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs font-bold text-foreground">{stock.symbol}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[11px] font-mono font-semibold text-foreground">Vol {stock.value}</div>
                                        <div className={`text-[10px] font-bold ${stock.isUp ? "text-brand-green" : "text-red-500"}`}>{stock.change}</div>
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
