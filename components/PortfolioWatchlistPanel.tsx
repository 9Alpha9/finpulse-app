"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, X, TrendingUp, TrendingDown, Wallet,
  Star, RefreshCw, BookOpen, ArrowUpRight, ArrowDownRight,
  Search, ChevronDown, PieChart, DollarSign
} from "lucide-react";
import { stockTickers } from "@/src/lib/stocks";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioPosition {
  id:         string;
  symbol:     string;
  market:     "crypto" | "stocks";
  name:       string;
  units:      number;
  buyPrice:   number;    // per unit (Rp untuk IDX, USD untuk crypto)
  currency:   "IDR" | "USD";
  addedAt:    number;    // Unix ms
}

export interface WatchlistItem {
  symbol:     string;
  market:     "crypto" | "stocks";
  name:       string;
  addedAt:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

const PORTFOLIO_KEY = "finpulse_portfolio_v2";
const WATCHLIST_KEY = "finpulse_watchlist_v2";

export function loadPortfolio(): PortfolioPosition[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PORTFOLIO_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function savePortfolio(positions: PortfolioPosition[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(positions));
}

export function loadWatchlistV2(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(WATCHLIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveWatchlistV2(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

// ─────────────────────────────────────────────────────────────────────────────
// Known assets catalog
// ─────────────────────────────────────────────────────────────────────────────

const CRYPTO_ASSETS = [
  { symbol: "BTCUSDT",  name: "Bitcoin",       short: "BTC" },
  { symbol: "ETHUSDT",  name: "Ethereum",      short: "ETH" },
  { symbol: "BNBUSDT",  name: "BNB",           short: "BNB" },
  { symbol: "SOLUSDT",  name: "Solana",         short: "SOL" },
  { symbol: "XRPUSDT",  name: "XRP",           short: "XRP" },
  { symbol: "ADAUSDT",  name: "Cardano",        short: "ADA" },
  { symbol: "DOGEUSDT", name: "Dogecoin",       short: "DOGE" },
  { symbol: "PEPEUSDT", name: "Pepe",           short: "PEPE" },
];

const IDX_ASSETS = Object.entries(stockTickers).map(([sym, info]) => ({
  symbol: sym,
  name: info.name,
  short: sym,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Live price fetcher
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLivePrice(symbol: string, market: "crypto" | "stocks"): Promise<number | null> {
  try {
    if (market === "crypto") {
      const res = await fetch(`/api/crypto/price?symbol=${symbol}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return parseFloat(data.price) || null;
    } else {
      const ticker = symbol.endsWith(".JK") ? symbol : `${symbol}.JK`;
      const res = await fetch(`/api/stocks?symbol=${ticker}&interval=1d`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const klines = data.klines ?? [];
      if (klines.length === 0) return null;
      return klines[klines.length - 1].close;
    }
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(val: number, currency: "IDR" | "USD"): string {
  if (currency === "IDR") return `Rp ${val.toLocaleString("id-ID")}`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: val < 1 ? 6 : 2 })}`;
}

function PnLBadge({ pnlPct }: { pnlPct: number }) {
  const pos = pnlPct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${pos ? "text-emerald-500" : "text-red-500"}`}>
      {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pos ? "+" : ""}{pnlPct.toFixed(2)}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Position Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddPositionModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd:   (pos: Omit<PortfolioPosition, "id" | "addedAt">) => void;
}) {
  const [market, setMarket]   = useState<"crypto" | "stocks">("crypto");
  const [symbol, setSymbol]   = useState("BTCUSDT");
  const [units, setUnits]     = useState("");
  const [price, setPrice]     = useState("");
  const [search, setSearch]   = useState("");

  const assets = market === "crypto" ? CRYPTO_ASSETS : IDX_ASSETS;
  const filtered = assets.filter(a =>
    a.symbol.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = assets.find(a => a.symbol === symbol) ?? assets[0];

  const handleSubmit = () => {
    const u = parseFloat(units);
    const p = parseFloat(price);
    if (!u || !p || u <= 0 || p <= 0) return;
    onAdd({
      symbol: selected.symbol,
      market,
      name: selected.name,
      units: u,
      buyPrice: p,
      currency: market === "stocks" ? "IDR" : "USD",
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Tambah Posisi</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Market toggle */}
        <div className="flex rounded-lg border border-border bg-background p-1 text-xs font-bold">
          <button
            onClick={() => { setMarket("crypto"); setSymbol("BTCUSDT"); setSearch(""); }}
            className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${market === "crypto" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
          >Kripto</button>
          <button
            onClick={() => { setMarket("stocks"); setSymbol("IHSG"); setSearch(""); }}
            className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${market === "stocks" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
          >IDX Saham</button>
        </div>

        {/* Asset search */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Aset</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aset..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-0.5 rounded-lg border border-border bg-background p-1">
            {filtered.map((a) => (
              <button
                key={a.symbol}
                onClick={() => setSymbol(a.symbol)}
                className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left transition cursor-pointer ${
                  symbol === a.symbol ? "bg-brand-green/10 text-brand-green font-bold" : "text-foreground hover:bg-secondary"
                }`}
              >
                <span className="font-mono font-bold w-16">{a.short}</span>
                <span className="text-muted-foreground truncate">{a.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Units & price */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Jumlah Unit</label>
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="mis. 0.5"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Harga Beli ({market === "stocks" ? "Rp" : "$"})
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={market === "stocks" ? "mis. 10000" : "mis. 65000"}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green/90 transition cursor-pointer"
        >
          Tambahkan ke Portfolio
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add to Watchlist Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddWatchlistModal({ onClose, onAdd, existing }: {
  onClose:  () => void;
  onAdd:    (item: Omit<WatchlistItem, "addedAt">) => void;
  existing: string[];
}) {
  const [market, setMarket] = useState<"crypto" | "stocks">("crypto");
  const [search, setSearch] = useState("");

  const assets = market === "crypto" ? CRYPTO_ASSETS : IDX_ASSETS;
  const filtered = assets.filter(a =>
    !existing.includes(a.symbol) &&
    (a.symbol.toLowerCase().includes(search.toLowerCase()) ||
     a.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Tambah ke Watchlist</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-lg border border-border bg-background p-1 text-xs font-bold">
          <button onClick={() => { setMarket("crypto"); setSearch(""); }}
            className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${market === "crypto" ? "bg-brand-green text-white" : "text-muted-foreground"}`}>
            Kripto</button>
          <button onClick={() => { setMarket("stocks"); setSearch(""); }}
            className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${market === "stocks" ? "bg-brand-green text-white" : "text-muted-foreground"}`}>
            IDX</button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aset..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-green" />
        </div>

        <div className="max-h-56 overflow-y-auto space-y-0.5 rounded-lg border border-border bg-background p-1">
          {filtered.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">Semua aset sudah di watchlist</p>
          )}
          {filtered.map((a) => (
            <button key={a.symbol}
              onClick={() => { onAdd({ symbol: a.symbol, market, name: a.name }); onClose(); }}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left hover:bg-secondary transition cursor-pointer"
            >
              <span className="font-mono font-bold w-16 text-foreground">{a.short}</span>
              <span className="text-muted-foreground truncate">{a.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PortfolioWatchlistPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function PortfolioWatchlistPanel() {
  const [tab, setTab] = useState<"portfolio" | "watchlist">("portfolio");
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPos, setShowAddPos] = useState(false);
  const [showAddWatch, setShowAddWatch] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setPositions(loadPortfolio());
    setWatchlist(loadWatchlistV2());
  }, []);

  // Fetch live prices for all assets
  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    const all = [
      ...positions.map(p => ({ symbol: p.symbol, market: p.market })),
      ...watchlist.map(w => ({ symbol: w.symbol, market: w.market })),
    ];
    const unique = all.filter((a, i, arr) => arr.findIndex(b => b.symbol === a.symbol) === i);

    const results: Record<string, number> = {};
    await Promise.all(unique.map(async ({ symbol, market }) => {
      const price = await fetchLivePrice(symbol, market);
      if (price !== null) results[symbol] = price;
    }));

    setLivePrices((prev) => ({ ...prev, ...results }));
    setRefreshing(false);
  }, [positions, watchlist]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, 30_000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  // Portfolio calculations
  const portfolioStats = (() => {
    let totalValue = 0, totalCost = 0;
    const enriched = positions.map(pos => {
      const livePrice = livePrices[pos.symbol] ?? pos.buyPrice;
      const cost = pos.units * pos.buyPrice;
      const value = pos.units * livePrice;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      totalValue += value;
      totalCost  += cost;
      return { ...pos, livePrice, cost, value, pnl, pnlPct };
    });
    const totalPnl    = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { enriched, totalValue, totalCost, totalPnl, totalPnlPct };
  })();

  // Handlers
  const addPosition = (pos: Omit<PortfolioPosition, "id" | "addedAt">) => {
    const newPos: PortfolioPosition = { ...pos, id: crypto.randomUUID(), addedAt: Date.now() };
    const updated = [...positions, newPos];
    setPositions(updated);
    savePortfolio(updated);
  };

  const removePosition = (id: string) => {
    const updated = positions.filter(p => p.id !== id);
    setPositions(updated);
    savePortfolio(updated);
  };

  const addWatchlistItem = (item: Omit<WatchlistItem, "addedAt">) => {
    if (watchlist.some(w => w.symbol === item.symbol)) return;
    const updated = [...watchlist, { ...item, addedAt: Date.now() }];
    setWatchlist(updated);
    saveWatchlistV2(updated);
  };

  const removeWatchlistItem = (symbol: string) => {
    const updated = watchlist.filter(w => w.symbol !== symbol);
    setWatchlist(updated);
    saveWatchlistV2(updated);
  };

  // Allocation breakdown for donut chart substitute
  const allocationData = (() => {
    const cryptoVal  = portfolioStats.enriched.filter(p => p.market === "crypto").reduce((a, p) => a + p.value, 0);
    const stocksVal  = portfolioStats.enriched.filter(p => p.market === "stocks").reduce((a, p) => a + p.value, 0);
    const total      = cryptoVal + stocksVal;
    return { cryptoVal, stocksVal, total, cryptoPct: total > 0 ? (cryptoVal / total * 100) : 50, stocksPct: total > 0 ? (stocksVal / total * 100) : 50 };
  })();

  return (
    <div className="space-y-6">

      {/* Tab Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-xl border border-border bg-background p-1 gap-1">
          <button
            onClick={() => setTab("portfolio")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "portfolio" ? "bg-brand-green text-white shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Portfolio
          </button>
          <button
            onClick={() => setTab("watchlist")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === "watchlist" ? "bg-brand-green text-white shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Watchlist
            {watchlist.length > 0 && (
              <span className="ml-1 rounded-full bg-current/20 px-1.5 py-0.5 text-[9px]">{watchlist.length}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshPrices}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memperbarui..." : "Refresh Harga"}
          </button>

          {tab === "portfolio" ? (
            <button
              onClick={() => setShowAddPos(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white hover:bg-brand-green/90 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Posisi
            </button>
          ) : (
            <button
              onClick={() => setShowAddWatch(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white hover:bg-brand-green/90 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Watchlist
            </button>
          )}
        </div>
      </div>

      {/* ── PORTFOLIO TAB ── */}
      {tab === "portfolio" && (
        <div className="space-y-6">

          {/* Summary Cards */}
          {positions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Nilai Portfolio",
                  value: Object.keys(livePrices).length > 0
                    ? `≈ ${portfolioStats.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "···",
                  sub: "nilai sekarang",
                  icon: <DollarSign className="h-4 w-4" />,
                  color: "text-emerald-500 bg-emerald-500/10",
                },
                {
                  label: "Total Modal",
                  value: portfolioStats.totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 }),
                  sub: "harga beli",
                  icon: <BookOpen className="h-4 w-4" />,
                  color: "text-blue-500 bg-blue-500/10",
                },
                {
                  label: "Unrealized P&L",
                  value: `${portfolioStats.totalPnl >= 0 ? "+" : ""}${portfolioStats.totalPnl.toFixed(0)}`,
                  sub: `${portfolioStats.totalPnlPct >= 0 ? "+" : ""}${portfolioStats.totalPnlPct.toFixed(2)}%`,
                  icon: portfolioStats.totalPnl >= 0
                    ? <TrendingUp className="h-4 w-4" />
                    : <TrendingDown className="h-4 w-4" />,
                  color: portfolioStats.totalPnl >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10",
                },
                {
                  label: "Posisi Aktif",
                  value: `${positions.length}`,
                  sub: `${positions.filter(p => p.market === "crypto").length} Kripto · ${positions.filter(p => p.market === "stocks").length} IDX`,
                  icon: <PieChart className="h-4 w-4" />,
                  color: "text-purple-500 bg-purple-500/10",
                },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-border bg-card p-4 space-y-1">
                  <div className={`inline-flex p-1.5 rounded-lg ${card.color}`}>{card.icon}</div>
                  <div className="text-xs text-muted-foreground font-semibold">{card.label}</div>
                  <div className={`text-lg font-extrabold ${card.color.split(" ")[0]}`}>{card.value}</div>
                  <div className="text-[10px] text-muted-foreground">{card.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Allocation Bar */}
          {positions.length > 0 && allocationData.total > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2 text-xs font-semibold text-muted-foreground">
                <span>Alokasi Aset</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />Kripto {allocationData.cryptoPct.toFixed(1)}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />IDX {allocationData.stocksPct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${allocationData.cryptoPct}%` }} />
                <div className="bg-blue-500 h-full transition-all flex-1" />
              </div>
            </div>
          )}

          {/* Positions Table */}
          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
              <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">Portfolio masih kosong</p>
              <p className="text-xs text-muted-foreground/60">Tambahkan posisi untuk melacak investasi kamu</p>
              <button
                onClick={() => setShowAddPos(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-4 py-2 text-xs font-bold text-white hover:bg-brand-green/90 transition cursor-pointer mt-2"
              >
                <Plus className="h-3.5 w-3.5" />Tambah Posisi Pertama
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">Aset</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">Unit</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">Harga Beli</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">Harga Kini</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">Nilai Total</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider">P&L</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioStats.enriched.map((pos) => (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                              pos.market === "crypto" ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"
                            }`}>{pos.market === "crypto" ? "CRYPTO" : "IDX"}</span>
                            <div>
                              <div className="font-bold text-foreground">{pos.symbol.replace("USDT", "")}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{pos.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                          {pos.units.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {formatCurrency(pos.buyPrice, pos.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {livePrices[pos.symbol]
                            ? formatCurrency(livePrices[pos.symbol], pos.currency)
                            : <span className="text-muted-foreground animate-pulse text-[10px]">loading...</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {formatCurrency(pos.value, pos.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <div className={`font-bold ${pos.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl, pos.currency)}
                            </div>
                            <PnLBadge pnlPct={pos.pnlPct} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removePosition(pos.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WATCHLIST TAB ── */}
      {tab === "watchlist" && (
        <div className="space-y-4">
          {watchlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
              <Star className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">Watchlist masih kosong</p>
              <p className="text-xs text-muted-foreground/60">Pantau harga aset favorit kamu dari satu tempat</p>
              <button
                onClick={() => setShowAddWatch(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-4 py-2 text-xs font-bold text-white hover:bg-brand-green/90 transition cursor-pointer mt-2"
              >
                <Plus className="h-3.5 w-3.5" />Tambah Aset ke Watchlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => {
                const livePrice = livePrices[item.symbol];
                const currency = item.market === "stocks" ? "IDR" : "USD";
                return (
                  <div key={item.symbol} className="rounded-2xl border border-border bg-card p-4 hover:border-brand-green/30 transition group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.market === "crypto" ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"
                          }`}>{item.market === "crypto" ? "CRYPTO" : "IDX"}</span>
                          <span className="font-bold text-xs text-foreground">{item.symbol.replace("USDT", "")}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{item.name}</p>
                      </div>
                      <button
                        onClick={() => removeWatchlistItem(item.symbol)}
                        className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="mt-3">
                      {livePrice ? (
                        <div className="text-xl font-extrabold text-foreground">
                          {formatCurrency(livePrice, currency)}
                        </div>
                      ) : (
                        <div className="text-xl font-extrabold text-muted-foreground animate-pulse">···</div>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Ditambahkan {new Date(item.addedAt).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddPos && <AddPositionModal onClose={() => setShowAddPos(false)} onAdd={addPosition} />}
        {showAddWatch && (
          <AddWatchlistModal
            onClose={() => setShowAddWatch(false)}
            onAdd={addWatchlistItem}
            existing={watchlist.map(w => w.symbol)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
