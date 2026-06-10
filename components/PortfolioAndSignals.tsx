"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Bell, Briefcase, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { fetchCryptoPrice } from "@/src/lib/binance";
import { fetchStockPriceFromYahoo } from "@/src/lib/stocks";

export interface PortfolioItem {
  id: string;
  type: "crypto" | "stock";
  symbol: string;
  amount: number;
  avgBuyPrice: number;
}

export interface SignalSettings {
  tp: string;
  sl: string;
  dca: string;
}

interface PortfolioTrackerProps {
  currentPrice: number;
  activeSymbol: string;
  isStock: boolean;
}

export function PortfolioTracker({ currentPrice, activeSymbol, isStock }: PortfolioTrackerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [assetType, setAssetType] = useState<"crypto" | "stock">("crypto");
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");

  // Background live prices for all portfolio items
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Load portfolio from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("finpulse_signals");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading portfolio from local storage:", e);
      }
    }
  }, []);

  // Sync active symbol price directly
  useEffect(() => {
    if (activeSymbol) {
      setLivePrices((prev) => ({
        ...prev,
        [activeSymbol]: currentPrice,
      }));
    }
  }, [activeSymbol, currentPrice]);

  // Fetch prices for other portfolio assets in the background
  useEffect(() => {
    async function fetchBackgroundPrices() {
      const prices: Record<string, number> = { ...livePrices };
      let updated = false;

      for (const item of items) {
        if (item.symbol === activeSymbol) continue;
        if (prices[item.symbol] !== undefined) continue; // skip if already loaded

        try {
          if (item.type === "crypto") {
            const p = await fetchCryptoPrice(item.symbol);
            prices[item.symbol] = p;
            updated = true;
          } else {
            const p = await fetchStockPriceFromYahoo(item.symbol);
            prices[item.symbol] = p;
            updated = true;
          }
        } catch (e) {
          console.warn(`Could not load background price for ${item.symbol}:`, e);
        }
      }

      if (updated) {
        setLivePrices(prices);
      }
    }

    if (items.length > 0) {
      fetchBackgroundPrices();
    }
  }, [items, activeSymbol]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!symbol || !amount || !avgBuyPrice) {
      setFormError("Semua kolom wajib diisi.");
      return;
    }

    const amtNum = parseFloat(amount);
    const priceNum = parseFloat(avgBuyPrice);

    if (isNaN(amtNum) || amtNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
      setFormError("Jumlah dan Harga Beli rata-rata harus berupa angka positif.");
      return;
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      type: assetType,
      symbol: cleanSymbol,
      amount: amtNum,
      avgBuyPrice: priceNum,
    };

    const updated = [...items, newItem];
    setItems(updated);
    localStorage.setItem("finpulse_signals", JSON.stringify(updated));

    // Clear form inputs
    setSymbol("");
    setAmount("");
    setAvgBuyPrice("");
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem("finpulse_signals", JSON.stringify(updated));
  };

  const formatCurrency = (val: number, type: "crypto" | "stock") => {
    if (type === "crypto") {
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `Rp ${val.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-brand-green" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Portofolio Saya</h4>
      </div>

      {/* Add Asset Form */}
      <form onSubmit={handleAddItem} className="space-y-3 p-4 rounded-xl border border-border bg-background">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Tambah Aset Manual
        </div>

        {formError && (
          <div className="text-[10px] text-red-500 font-semibold mb-2">
            ⚠️ {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Tipe Aset</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as "crypto" | "stock")}
              className="w-full rounded-lg border border-border bg-card py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-brand-green cursor-pointer"
            >
              <option value="crypto">Crypto</option>
              <option value="stock">Stock (Saham)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Simbol/Ticker</label>
            <input
              type="text"
              placeholder={assetType === "crypto" ? "BTCUSDT" : "BBCA"}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-brand-green uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Jumlah Dimiliki</label>
            <input
              type="number"
              step="any"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-brand-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Harga Beli Rata-Rata</label>
            <input
              type="number"
              step="any"
              placeholder={assetType === "crypto" ? "64000" : "10100"}
              value={avgBuyPrice}
              onChange={(e) => setAvgBuyPrice(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-brand-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-2 rounded-lg bg-brand-green py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>TAMBAH KE PORTOFOLIO</span>
        </button>
      </form>

      {/* Assets List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-semibold">
              <th className="pb-2">Simbol</th>
              <th className="pb-2">Jumlah</th>
              <th className="pb-2">Harga Beli</th>
              <th className="pb-2">Harga Live</th>
              <th className="pb-2 text-right">PnL</th>
              <th className="pb-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {items.length > 0 ? (
              items.map((item) => {
                const livePrice = livePrices[item.symbol] !== undefined ? livePrices[item.symbol] : null;

                let pnlAbs = 0;
                let pnlPercent = 0;

                if (livePrice !== null) {
                  pnlAbs = (livePrice - item.avgBuyPrice) * item.amount;
                  pnlPercent = ((livePrice - item.avgBuyPrice) / item.avgBuyPrice) * 100;
                }

                const isProfit = pnlAbs >= 0;

                return (
                  <tr key={item.id} className="hover:bg-muted/10 transition">
                    <td className="py-2.5 font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase select-none ${item.type === "crypto" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                          }`}>
                          {item.type === "crypto" ? "C" : "S"}
                        </span>
                        <span>{item.symbol}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground font-medium">{item.amount}</td>
                    <td className="py-2.5 text-muted-foreground font-medium">{formatCurrency(item.avgBuyPrice, item.type)}</td>
                    <td className="py-2.5 text-foreground font-semibold">
                      {livePrice !== null ? formatCurrency(livePrice, item.type) : <span className="text-[10px] text-muted-foreground italic">Memuat...</span>}
                    </td>
                    <td className={`py-2.5 text-right font-extrabold ${livePrice === null ? "text-muted-foreground" : isProfit ? "text-emerald-500" : "text-destructive"}`}>
                      {livePrice !== null ? (
                        <div className="flex flex-col text-right">
                          <span>{isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%</span>
                          <span className="text-[9px] font-medium opacity-80">{formatCurrency(pnlAbs, item.type)}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground italic text-[11px]">
                  Belum ada aset di portofolio Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SignalConfiguratorProps {
  activeSymbol: string;
  currentPrice: number;
}

export function SignalConfigurator({ activeSymbol, currentPrice }: SignalConfiguratorProps) {
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [dcaPrice, setDcaPrice] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load signal config for the active symbol on change
  useEffect(() => {
    setSaveSuccess(false);
    const savedSignals = localStorage.getItem("finpulse_signals");
    if (savedSignals) {
      try {
        const parsed = JSON.parse(savedSignals);
        const config = parsed[activeSymbol] as SignalSettings;
        if (config) {
          setTpPrice(config.tp || "");
          setSlPrice(config.sl || "");
          setDcaPrice(config.dca || "");
          return;
        }
      } catch (e) {
        console.error("Error parsing signal settings:", e);
      }
    }
    // Default values if no config saved
    setTpPrice("");
    setSlPrice("");
    setDcaPrice("");
  }, [activeSymbol]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const savedSignals = localStorage.getItem("finpulse_signals") || "{}";
    let parsed: Record<string, SignalSettings> = {};

    try {
      parsed = JSON.parse(savedSignals);
    } catch (e) {
      parsed = {};
    }

    parsed[activeSymbol] = {
      tp: tpPrice.trim(),
      sl: slPrice.trim(),
      dca: dcaPrice.trim(),
    };

    localStorage.setItem("finpulse_signals", JSON.stringify(parsed));
    setSaveSuccess(true);

    // Auto fade alert toast
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getCleanBase = () => {
    return activeSymbol.replace("USDT", "");
  };

  const isStock = activeSymbol.endsWith(".JK") || !activeSymbol.includes("USDT");
  const currencySymbol = isStock ? "Rp" : "$";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-green" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">Sinyal WhatsApp</h4>
          </div>
          <span className="text-[9px] font-bold bg-brand-green/15 text-brand-green px-2 py-0.5 rounded-full select-none uppercase">
            {getCleanBase()} Alerts
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-normal">
          Konfigurasikan notifikasi alert sinyal trading ke nomor WhatsApp terdaftar untuk aset <strong>{getCleanBase()}</strong>.
        </p>

        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl p-3 text-xs leading-relaxed font-semibold">
            ✓ Konfigurasi sinyal alert berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
              Target Take Profit (TP) Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="Target TP..."
                value={tpPrice}
                onChange={(e) => setTpPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:border-brand-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-2 text-[10px] font-bold text-muted-foreground uppercase select-none">
                {currencySymbol}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
              Stop Loss (SL) Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="Batas Stop Loss..."
                value={slPrice}
                onChange={(e) => setSlPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:border-brand-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-2 text-[10px] font-bold text-muted-foreground uppercase select-none">
                {currencySymbol}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
              DCA (Target Harga Cicil) Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="Target Harga Beli DCA..."
                value={dcaPrice}
                onChange={(e) => setDcaPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:border-brand-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-2 text-[10px] font-bold text-muted-foreground uppercase select-none">
                {currencySymbol}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-lg bg-brand-green py-2.5 text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer select-none"
          >
            SIMPAN KONFIGURASI ALERTS
          </button>
        </form>
      </div>
    </div>
  );
}
