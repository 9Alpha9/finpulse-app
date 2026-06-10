"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, Bell, Briefcase, Lock, Crown,
  ChevronDown, ChevronUp, Search, Check, Loader2,
} from "lucide-react";
import { fetchCryptoPrice, fetchActiveCryptoPairs } from "@/src/lib/binance";
import { fetchStockPriceFromYahoo, stockTickers } from "@/src/lib/stocks";
import { GOLD_INSTRUMENTS } from "@/components/GoldPanel";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

interface AssetOption {
  symbol: string;
  label: string;
  type: "crypto" | "stock" | "gold";
  sub?: string;
}

type PickerTab = "crypto" | "idx" | "gold";

// ─────────────────────────────────────────────────────────────────────────────
// Static option lists (crypto loaded dynamically)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_CRYPTO: AssetOption[] = [
  { symbol: "BTCUSDT", label: "Bitcoin", type: "crypto", sub: "BTC" },
  { symbol: "ETHUSDT", label: "Ethereum", type: "crypto", sub: "ETH" },
  { symbol: "BNBUSDT", label: "BNB", type: "crypto", sub: "BNB" },
  { symbol: "SOLUSDT", label: "Solana", type: "crypto", sub: "SOL" },
  { symbol: "XRPUSDT", label: "XRP", type: "crypto", sub: "XRP" },
  { symbol: "ADAUSDT", label: "Cardano", type: "crypto", sub: "ADA" },
  { symbol: "DOGEUSDT", label: "Dogecoin", type: "crypto", sub: "DOGE" },
  { symbol: "PEPEUSDT", label: "Pepe", type: "crypto", sub: "PEPE" },
  { symbol: "AVAXUSDT", label: "Avalanche", type: "crypto", sub: "AVAX" },
  { symbol: "LINKUSDT", label: "Chainlink", type: "crypto", sub: "LINK" },
];

const IDX_OPTIONS: AssetOption[] = Object.entries(stockTickers).map(([sym, info]) => ({
  symbol: sym,
  label: info.name,
  type: "stock" as const,
  sub: info.sector,
}));

const GOLD_OPTIONS: AssetOption[] = GOLD_INSTRUMENTS.map((g) => ({
  symbol: g.symbol,
  label: g.label,
  type: "gold" as const,
  sub: g.currency === "IDR" ? "IDR" : "USD",
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tab config — accent colors (dark-mode friendly)
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CFG = {
  crypto: {
    icon: "🪙",
    label: "Crypto",
    // tab active styles
    tabActive: "text-orange-400 border-orange-400",
    // trigger badge
    badge: "bg-orange-500/20 text-orange-300",
    // list selected row
    rowActive: "bg-orange-500/15 ring-1 ring-orange-500/40",
    rowText: "text-orange-300",
    // accent dot selected
    dot: "bg-orange-400",
    // sub-badge
    subBg: "bg-orange-500/10",
    subText: "text-orange-400",
    // check
    check: "text-orange-400",
  },
  idx: {
    icon: "📈",
    label: "Saham IDX",
    tabActive: "text-blue-400 border-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    rowActive: "bg-blue-500/15 ring-1 ring-blue-500/40",
    rowText: "text-blue-300",
    dot: "bg-blue-400",
    subBg: "bg-blue-500/10",
    subText: "text-blue-400",
    check: "text-blue-400",
  },
  gold: {
    icon: "🥇",
    label: "Emas",
    tabActive: "text-yellow-400 border-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
    rowActive: "bg-yellow-500/15 ring-1 ring-yellow-500/40",
    rowText: "text-yellow-300",
    dot: "bg-yellow-400",
    subBg: "bg-yellow-500/10",
    subText: "text-yellow-400",
    check: "text-yellow-400",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SymbolPicker — portal-based modal (centered desktop / bottom-sheet mobile)
// ─────────────────────────────────────────────────────────────────────────────

function SymbolPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (symbol: string, type: "crypto" | "stock" | "gold") => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>("crypto");
  const [query, setQuery] = useState("");
  const [cryptoList, setCryptoList] = useState<AssetOption[]>(FALLBACK_CRYPTO);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [mounted, setMounted] = useState(false);

  // SSR guard for portal
  useEffect(() => setMounted(true), []);

  // Lock body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Load full Binance pairs when crypto tab is first opened
  useEffect(() => {
    if (tab !== "crypto" || cryptoList.length > FALLBACK_CRYPTO.length) return;
    setLoadingCrypto(true);
    fetchActiveCryptoPairs()
      .then((pairs) => {
        if (pairs.length === 0) return;
        setCryptoList(pairs.map((sym) => ({
          symbol: sym,
          label: sym.replace("USDT", "") + " / USDT",
          type: "crypto" as const,
          sub: sym.replace("USDT", ""),
        })));
      })
      .catch(() => { })
      .finally(() => setLoadingCrypto(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const close = () => { setOpen(false); setQuery(""); };

  // Current tab list + search filter
  const rawList: AssetOption[] =
    tab === "crypto" ? cryptoList :
      tab === "idx" ? IDX_OPTIONS :
        GOLD_OPTIONS;

  const filtered = query.trim() === ""
    ? rawList
    : rawList.filter(
      (o) =>
        o.symbol.toLowerCase().includes(query.toLowerCase()) ||
        o.label.toLowerCase().includes(query.toLowerCase())
    );

  // Resolve selected item from all sources
  const allOptions = [...cryptoList, ...IDX_OPTIONS, ...GOLD_OPTIONS];
  const selected = allOptions.find((o) => o.symbol === value);
  const selTab: PickerTab =
    selected?.type === "crypto" ? "crypto" :
      selected?.type === "gold" ? "gold" : "idx";

  const cfg = TAB_CFG[tab];

  const handleTabChange = (t: PickerTab) => { setTab(t); setQuery(""); };

  // ── Modal content (shared between desktop + mobile)
  const modalContent = (
    <>
      {/* Tab strip */}
      <div className="flex border-b border-border/60 shrink-0">
        {(["crypto", "idx", "gold"] as PickerTab[]).map((t) => {
          const c = TAB_CFG[t];
          const act = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer border-b-2 ${act
                  ? `${c.tabActive} bg-card`
                  : "text-muted-foreground/40 border-transparent hover:text-muted-foreground/80"
                }`}
            >
              <span className="text-lg leading-none">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder={`Cari ${cfg.label.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-muted/20 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/20 focus:bg-background transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3.5 text-xs text-muted-foreground/50 hover:text-foreground transition cursor-pointer"
            >✕</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/10 shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          {filtered.length} aset
        </span>
        {tab === "crypto" && loadingCrypto && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-green animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Memuat dari Binance...
          </span>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 p-3 space-y-0.5">
        {filtered.length > 0 ? (
          filtered.map((opt) => {
            const isSelected = opt.symbol === value;
            return (
              <button
                key={opt.symbol}
                type="button"
                onClick={() => { onChange(opt.symbol, opt.type); close(); }}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-100 cursor-pointer group ${isSelected
                    ? `${cfg.rowActive} ${cfg.rowText}`
                    : "hover:bg-muted/50 dark:hover:bg-white/[0.05]"
                  }`}
              >
                <div className={`shrink-0 h-2 w-2 rounded-full transition-colors ${isSelected ? cfg.dot : "bg-border/60 group-hover:bg-muted-foreground/30"
                  }`} />

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isSelected ? "text-inherit" : "text-foreground"
                    }`}>{opt.symbol}</div>
                  {opt.label && opt.label !== opt.symbol && (
                    <div className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{opt.label}</div>
                  )}
                </div>

                {opt.sub && (
                  <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${isSelected ? "opacity-75" : `${cfg.subBg} ${cfg.subText}`
                    }`}>{opt.sub}</span>
                )}

                {isSelected && <Check className={`shrink-0 h-4 w-4 ${cfg.check}`} />}
              </button>
            );
          })
        ) : (
          <div className="py-16 text-center space-y-2">
            <div className="text-4xl opacity-20">🔍</div>
            <div className="text-sm text-muted-foreground/40 font-medium">Aset tidak ditemukan</div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card py-2.5 px-3.5 cursor-pointer hover:border-brand-green/50 hover:bg-muted/20 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-brand-green/30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              <span className={`shrink-0 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${TAB_CFG[selTab].badge}`}>
                {TAB_CFG[selTab].label.replace("Saham ", "")}
              </span>
              <span className="text-sm font-bold text-foreground truncate">{selected.symbol}</span>
              <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:inline">{selected.label}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/50 select-none">Pilih aset...</span>
          )}
        </div>
        <ChevronDown className="shrink-0 h-4 w-4 text-muted-foreground/50" />
      </button>

      {/* ── Portal modal ───────────────────────────────────────────────────── */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          {/* Modal card — bottom sheet on mobile, centered on desktop */}
          <div
            className="
              w-full sm:w-[640px] sm:max-w-[92vw]
              bg-card border border-border/60
              flex flex-col
              shadow-2xl shadow-black/50
              sm:rounded-2xl rounded-t-3xl
              overflow-hidden
              animate-in
              slide-in-from-bottom-4 sm:fade-in-0 sm:zoom-in-95
              duration-200
            "
            style={{ maxHeight: "88dvh" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Pilih Aset</h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Crypto · Saham IDX · Instrumen Emas
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal body (tabs + search + list) */}
            {modalContent}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioItem & SignalSettings types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioTracker
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioTrackerProps {
  currentPrice: number;
  activeSymbol: string;
  isStock: boolean;
}

export function PortfolioTracker({ currentPrice, activeSymbol }: PortfolioTrackerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [assetType, setAssetType] = useState<"crypto" | "stock">("crypto");
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Load portfolio from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("finpulse_portfolio");
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Sync active symbol price
  useEffect(() => {
    if (activeSymbol) {
      setLivePrices((prev) => ({ ...prev, [activeSymbol]: currentPrice }));
    }
  }, [activeSymbol, currentPrice]);

  // Fetch background prices for other portfolio assets
  useEffect(() => {
    async function fetchBackgroundPrices() {
      const prices: Record<string, number> = { ...livePrices };
      let updated = false;
      for (const item of items) {
        if (item.symbol === activeSymbol) continue;
        if (prices[item.symbol] !== undefined) continue;
        try {
          if (item.type === "crypto") {
            prices[item.symbol] = await fetchCryptoPrice(item.symbol);
          } else {
            prices[item.symbol] = await fetchStockPriceFromYahoo(item.symbol);
          }
          updated = true;
        } catch { /* ignore */ }
      }
      if (updated) setLivePrices(prices);
    }
    if (items.length > 0) fetchBackgroundPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setFormError("Jumlah dan harga harus berupa angka positif.");
      return;
    }
    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      type: assetType,
      symbol: symbol.trim().toUpperCase(),
      amount: amtNum,
      avgBuyPrice: priceNum,
    };
    const updated = [...items, newItem];
    setItems(updated);
    localStorage.setItem("finpulse_portfolio", JSON.stringify(updated));
    setSymbol(""); setAmount(""); setAvgBuyPrice("");
    setShowForm(false);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem("finpulse_portfolio", JSON.stringify(updated));
  };

  const fmt = (val: number, type: "crypto" | "stock") =>
    type === "crypto"
      ? `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `Rp ${val.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-green" />
          <h4 className="text-sm font-bold text-foreground">Portofolio Saya</h4>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-green/10 hover:bg-brand-green/20 text-brand-green border border-brand-green/20 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tambah Aset</span>
          <span className="sm:hidden">Tambah</span>
          {showForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Collapsible add form */}
      {showForm && (
        <form onSubmit={handleAddItem} className="px-5 py-4 bg-muted/20 border-b border-border space-y-3">
          {formError && (
            <div className="text-[11px] text-destructive font-semibold bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              ⚠️ {formError}
            </div>
          )}

          {/* Asset picker */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Pilih Aset
            </label>
            <SymbolPicker
              value={symbol}
              onChange={(sym, type) => {
                setSymbol(sym);
                setAssetType(type === "gold" ? "stock" : type);
              }}
            />
          </div>

          {/* Amount + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Jumlah Dimiliki
              </label>
              <input
                type="number" inputMode="decimal" step="any"
                placeholder="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Harga Beli Rata-Rata
              </label>
              <input
                type="number" inputMode="decimal" step="any"
                placeholder={assetType === "crypto" ? "64000" : "10100"}
                value={avgBuyPrice}
                onChange={(e) => setAvgBuyPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-brand-green/20"
            >
              <Plus className="h-4 w-4" />
              Tambah ke Portofolio
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="rounded-xl border border-border bg-card py-2.5 px-4 text-sm font-semibold text-muted-foreground hover:bg-muted transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Assets list */}
      <div className="p-4 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Briefcase className="h-7 w-7 opacity-20" />
            <p className="text-xs font-medium">Belum ada aset di portofolio</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-brand-green font-bold hover:underline cursor-pointer mt-1"
            >
              + Tambah aset pertama kamu
            </button>
          </div>
        ) : (
          items.map((item) => {
            const livePrice = livePrices[item.symbol] ?? null;
            const pnlAbs = livePrice !== null ? (livePrice - item.avgBuyPrice) * item.amount : 0;
            const pnlPct = livePrice !== null ? ((livePrice - item.avgBuyPrice) / item.avgBuyPrice) * 100 : 0;
            const isProfit = pnlAbs >= 0;
            const pnlColor = livePrice === null ? "text-muted-foreground/40" : isProfit ? "text-emerald-400" : "text-red-400";

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-background/60 p-3 flex items-center gap-3 hover:border-border/80 hover:bg-muted/10 transition-all duration-100 group"
              >
                {/* Type badge */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-extrabold select-none ${item.type === "crypto"
                    ? "bg-orange-500/15 text-orange-400 dark:bg-orange-500/20"
                    : "bg-blue-500/15 text-blue-400 dark:bg-blue-500/20"
                  }`}>
                  {item.type === "crypto" ? "CR" : "IDX"}
                </div>

                {/* Symbol + info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground/90 truncate">{item.symbol}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50">{item.amount} unit</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-[10px] text-muted-foreground/50">@ {fmt(item.avgBuyPrice, item.type)}</span>
                  </div>
                </div>

                {/* Live + PnL */}
                <div className="text-right shrink-0">
                  {livePrice !== null ? (
                    <>
                      <div className="text-xs font-semibold text-foreground/90 tabular-nums">{fmt(livePrice, item.type)}</div>
                      <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${pnlColor}`}>
                        {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/30 italic">Memuat...</div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SignalConfigurator
// ─────────────────────────────────────────────────────────────────────────────

interface SignalConfiguratorProps {
  activeSymbol: string;
  currentPrice: number;
}

export function SignalConfigurator({ activeSymbol }: SignalConfiguratorProps) {
  const { subscriptionTier, setSubscriptionTier } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [dcaPrice, setDcaPrice] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      } catch { /* ignore */ }
    }
    setTpPrice(""); setSlPrice(""); setDcaPrice("");
  }, [activeSymbol]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium) return;
    setSaveSuccess(false);
    const savedSignals = localStorage.getItem("finpulse_signals") || "{}";
    let parsed: Record<string, SignalSettings> = {};
    try { parsed = JSON.parse(savedSignals); } catch { parsed = {}; }
    parsed[activeSymbol] = { tp: tpPrice.trim(), sl: slPrice.trim(), dca: dcaPrice.trim() };
    localStorage.setItem("finpulse_signals", JSON.stringify(parsed));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getCleanBase = () => activeSymbol.replace("USDT", "");
  const isStock = activeSymbol.endsWith(".JK") || !activeSymbol.includes("USDT");
  const currencySymbol = isStock ? "Rp" : "$";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-green" />
          <h4 className="text-sm font-bold text-foreground">Sinyal WhatsApp</h4>
        </div>
        <span className="text-[9px] font-bold bg-brand-green/15 text-brand-green px-2 py-0.5 rounded-full select-none uppercase">
          {getCleanBase()} Alerts
        </span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 relative">
        {/* Free tier lock overlay */}
        {!isPremium && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-card/80 backdrop-blur-sm rounded-b-2xl p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Fitur Premium</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-[200px] mx-auto">
                Kirim sinyal TP/SL/DCA ke WhatsApp kamu secara otomatis
              </p>
            </div>
            <button
              onClick={() => setSubscriptionTier("premium")}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 text-white text-xs font-bold px-5 py-2 shadow-md shadow-amber-500/25 hover:opacity-90 transition cursor-pointer"
            >
              <Crown className="h-3.5 w-3.5 fill-current" />
              Upgrade ke Premium
            </button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/70 leading-normal">
          Konfigurasikan notifikasi sinyal trading ke WhatsApp untuk aset <strong className="text-foreground/80">{getCleanBase()}</strong>.
        </p>

        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl p-3 text-xs font-semibold">
            ✓ Konfigurasi sinyal berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-4">
          {[
            { label: "Target Take Profit (TP)", val: tpPrice, set: setTpPrice, ph: "Target TP..." },
            { label: "Stop Loss (SL)", val: slPrice, set: setSlPrice, ph: "Batas Stop Loss..." },
            { label: "DCA Target Harga", val: dcaPrice, set: setDcaPrice, ph: "Target Harga Beli DCA..." },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type="number" inputMode="decimal" step="any"
                  placeholder={ph}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  disabled={!isPremium}
                  className="w-full rounded-xl border border-border bg-background/80 py-2.5 px-3 pr-8 text-sm text-foreground focus:outline-none focus:border-brand-green/60 focus:ring-1 focus:ring-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-muted-foreground/50 uppercase select-none">{currencySymbol}</span>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={!isPremium}
            className="w-full mt-1 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-green/20 hover:opacity-95 transition cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Konfigurasi Alerts
          </button>
        </form>
      </div>
    </div>
  );
}
