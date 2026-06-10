"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wallet, ArrowUpRight, ArrowDownRight, Trash2, Loader2, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCryptoPrice } from "@/src/lib/binance";
import { fetchStockPriceFromYahoo } from "@/src/lib/stocks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Position {
    id: string;
    symbol: string;
    marketType: "crypto" | "stocks";
    type: "BUY" | "SELL";
    entryPrice: number;
    quantity: number;
    timestamp: number;
}

interface MarketPrices {
    [symbol: string]: number;
}

export default function PaperTrading({
    activeSymbol,
    marketType,
    currentPrice
}: {
    activeSymbol: string;
    marketType: "crypto" | "stocks";
    currentPrice: number;
}) {
    // Saldo Awal Virtual
    const [cryptoBalance, setCryptoBalance] = useState<number>(10000); // $10,000 USD
    const [stockBalance, setStockBalance] = useState<number>(150000000); // Rp 150.000.000 IDR

    const [positions, setPositions] = useState<Position[]>([]);
    const [livePrices, setLivePrices] = useState<MarketPrices>({});
    const [quantityInput, setQuantityInput] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Load data saldo & posisi dari localStorage saat mount
    useEffect(() => {
        const savedPositions = localStorage.getItem("finpulse_paper_positions");
        const savedCryptoBal = localStorage.getItem("finpulse_paper_crypto_bal");
        const savedStockBal = localStorage.getItem("finpulse_paper_stock_bal");

        if (savedPositions) setPositions(JSON.parse(savedPositions));
        if (savedCryptoBal) setCryptoBalance(parseFloat(savedCryptoBal));
        if (savedStockBal) setStockBalance(parseFloat(savedStockBal));
    }, []);

    // 2. Sinkronisasi harga aktif dari panel utama agar instan
    useEffect(() => {
        if (currentPrice > 0) {
            setLivePrices((prev) => ({ ...prev, [activeSymbol]: currentPrice }));
        }
    }, [activeSymbol, currentPrice]);

    // 3. Polling harga live untuk semua posisi yang sedang terbuka (Setiap 5 detik)
    const updateLivePricesOfPositions = useCallback(async () => {
        if (positions.length === 0) return;

        const updatedPrices: MarketPrices = { ...livePrices };
        await Promise.all(
            positions.map(async (pos) => {
                try {
                    if (pos.marketType === "crypto") {
                        const price = await fetchCryptoPrice(pos.symbol);
                        updatedPrices[pos.symbol] = price;
                    } else {
                        const price = await fetchStockPriceFromYahoo(pos.symbol);
                        updatedPrices[pos.symbol] = price;
                    }
                } catch (e) {
                    console.warn(`Gagal memperbarui harga live untuk ${pos.symbol}`);
                }
            })
        );
        setLivePrices(updatedPrices);
    }, [positions, livePrices]);

    useEffect(() => {
        const timer = setInterval(updateLivePricesOfPositions, 5000);
        return () => clearInterval(timer);
    }, [updateLivePricesOfPositions]);

    // 4. Fungsi Eksekusi Transaksi (Order Place)
    const handlePlaceOrder = (orderType: "BUY" | "SELL") => {
        const qty = parseFloat(quantityInput);
        if (isNaN(qty) || qty <= 0 || currentPrice <= 0) return;

        const totalCost = qty * currentPrice;

        if (marketType === "crypto") {
            if (orderType === "BUY" && totalCost > cryptoBalance) {
                alert("Saldo USD virtual tidak mencukupi!");
                return;
            }
            const nextBalance = orderType === "BUY" ? cryptoBalance - totalCost : cryptoBalance + totalCost;
            setCryptoBalance(nextBalance);
            localStorage.setItem("finpulse_paper_crypto_bal", nextBalance.toString());
        } else {
            if (orderType === "BUY" && totalCost > stockBalance) {
                alert("Saldo Rupiah virtual tidak mencukupi!");
                return;
            }
            const nextBalance = orderType === "BUY" ? stockBalance - totalCost : stockBalance + totalCost;
            setStockBalance(nextBalance);
            localStorage.setItem("finpulse_paper_stock_bal", nextBalance.toString());
        }

        const newPosition: Position = {
            id: Math.random().toString(36).substring(2, 9),
            symbol: activeSymbol,
            marketType,
            type: orderType,
            entryPrice: currentPrice,
            quantity: qty,
            timestamp: Date.now(),
        };

        const nextPositions = [newPosition, ...positions];
        setPositions(nextPositions);
        localStorage.setItem("finpulse_paper_positions", JSON.stringify(nextPositions));
        setQuantityInput("");
    };

    // 5. Fungsi Tutup Posisi (Close / Liquidate Position)
    const handleClosePosition = (id: string) => {
        const pos = positions.find((p) => p.id === id);
        if (!pos) return;

        const currentMktPrice = livePrices[pos.symbol] || pos.entryPrice;
        let revenue = pos.quantity * currentMktPrice;

        // Hitung pengembalian dana berdasarkan tipe order
        if (pos.type === "BUY") {
            if (pos.marketType === "crypto") {
                const nextBal = cryptoBalance + revenue;
                setCryptoBalance(nextBal);
                localStorage.setItem("finpulse_paper_crypto_bal", nextBal.toString());
            } else {
                const nextBal = stockBalance + revenue;
                setStockBalance(nextBal);
                localStorage.setItem("finpulse_paper_stock_bal", nextBal.toString());
            }
        } else {
            // Untuk posisi short/sell
            const profitLoss = (pos.entryPrice - currentMktPrice) * pos.quantity;
            const initialCost = pos.quantity * pos.entryPrice;
            if (pos.marketType === "crypto") {
                const nextBal = cryptoBalance + initialCost + profitLoss;
                setCryptoBalance(nextBal);
                localStorage.setItem("finpulse_paper_crypto_bal", nextBal.toString());
            } else {
                const nextBal = stockBalance + initialCost + profitLoss;
                setStockBalance(nextBal);
                localStorage.setItem("finpulse_paper_stock_bal", nextBal.toString());
            }
        }

        const nextPositions = positions.filter((p) => p.id !== id);
        setPositions(nextPositions);
        localStorage.setItem("finpulse_paper_positions", JSON.stringify(nextPositions));
    };

    // Format Mata Uang Helper
    const fmtCurrency = (val: number) => {
        if (marketType === "crypto") return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `Rp ${val.toLocaleString("id-ID")}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">

            {/* KIRI: EKSEKUSI TRADING TERMINAL */}
            <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-4.5 w-4.5 text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Akun Virtual</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded uppercase text-muted-foreground">Simulasi Trading</span>
                </div>

                {/* Info Saldo Kas */}
                <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Sisa Kas Tersedia</span>
                    <p className="text-xl font-black text-foreground mt-1 tracking-tight">
                        {fmtCurrency(marketType === "crypto" ? cryptoBalance : stockBalance)}
                    </p>
                </div>

                {/* Input Form Setup */}
                <div className="space-y-3 pt-2">
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">
                            Jumlah Lembar / Lot / Volume
                        </label>
                        <div className="relative flex items-center">

                            {/* ── INPUT DENGAN KELAS TAILWIND PENGHILANG SPINNER ── */}
                            <input
                                type="number"
                                placeholder="0.00"
                                value={quantityInput}
                                onChange={(e) => setQuantityInput(e.target.value)}
                                className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-green font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <span className="absolute right-4 text-xs font-bold text-muted-foreground uppercase">
                                {activeSymbol.replace("USDT", "")}
                            </span>
                        </div>
                    </div>

                    {/* Estimasi Biaya */}
                    {quantityInput && currentPrice > 0 && (
                        <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
                            <span>Estimasi Total:</span>
                            <span className="font-bold text-foreground">{fmtCurrency(parseFloat(quantityInput) * currentPrice)}</span>
                        </div>
                    )}

                    {/* Tombol Eksekusi Buy / Sell */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => handlePlaceOrder("BUY")}
                            className="w-full bg-[#089981] hover:bg-[#089981]/90 text-white font-bold text-xs py-3 rounded-xl transition shadow-sm shadow-[#089981]/20 cursor-pointer"
                        >
                            LONG (BUY)
                        </button>
                        <button
                            onClick={() => handlePlaceOrder("SELL")}
                            className="w-full bg-[#f23645] hover:bg-[#f23645]/90 text-white font-bold text-xs py-3 rounded-xl transition shadow-sm shadow-[#f23645]/20 cursor-pointer"
                        >
                            SHORT (SELL)
                        </button>
                    </div>
                </div>
            </div>

            {/* KANAN: DAFTAR POSISI AKTIF & FLOATING PNL */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-border pb-3 mb-4">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest">
                        Posisi Berjalan ({positions.filter(p => p.marketType === marketType).length})
                    </h4>
                </div>

                <div className="flex-1 overflow-x-auto min-h-[180px]">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-[10px] text-muted-foreground font-bold uppercase border-b border-border/60 pb-2">
                                <th className="pb-2">Aset</th>
                                <th className="pb-2 text-center">Tipe</th>
                                <th className="pb-2 text-right">Harga Masuk</th>
                                <th className="pb-2 text-right">Harga Live</th>
                                <th className="pb-2 text-right">Profit / Loss</th>
                                <th className="pb-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            <AnimatePresence>
                                {positions
                                    .filter((p) => p.marketType === marketType)
                                    .map((pos) => {
                                        const priceLive = livePrices[pos.symbol] || pos.entryPrice;

                                        // Hitung profit loss floating dinamis
                                        const pnlVal = pos.type === "BUY"
                                            ? (priceLive - pos.entryPrice) * pos.quantity
                                            : (pos.entryPrice - priceLive) * pos.quantity;

                                        const isProfit = pnlVal >= 0;

                                        return (
                                            <motion.tr
                                                key={pos.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                                                className="hover:bg-secondary/20 transition-colors"
                                            >
                                                <td className="py-3 font-bold text-foreground">
                                                    {pos.symbol.replace("USDT", "").replace(".JK", "")}
                                                    <span className="text-[9px] text-muted-foreground block font-mono font-normal">Qty: {pos.quantity}</span>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${pos.type === "BUY" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                                        {pos.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right font-mono font-medium">{pos.entryPrice.toLocaleString()}</td>
                                                <td className="py-3 text-right font-mono font-medium text-foreground">{priceLive.toLocaleString()}</td>
                                                <td className={`py-3 text-right font-mono font-black ${isProfit ? "text-[#089981]" : "text-[#f23645]"}`}>
                                                    {isProfit ? "+" : ""}{pnlVal.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => handleClosePosition(pos.id)}
                                                        className="text-muted-foreground hover:text-red-500 p-1 transition cursor-pointer"
                                                        title="Tutup Posisi"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                            </AnimatePresence>

                            {positions.filter((p) => p.marketType === marketType).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-[11px]">
                                        Belum ada posisi simulasi yang terbuka. Masukkan jumlah lot di kolom kiri untuk bertransaksi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}