"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { useStockPrices } from "@/app/context/StockPriceContext";

// ─── Crypto pairs (fallback sebelum WS aktif) ─────────────────────────────────
const CRYPTO_PAIRS = [
  { symbol: "BTCUSDT", basePrice: 65000 },
  { symbol: "ETHUSDT", basePrice: 3500 },
  { symbol: "SOLUSDT", basePrice: 150 },
  { symbol: "BNBUSDT", basePrice: 600 },
  { symbol: "XRPUSDT", basePrice: 0.5 },
  { symbol: "ADAUSDT", basePrice: 0.4 },
  { symbol: "DOGEUSDT", basePrice: 0.15 },
  { symbol: "TRXUSDT", basePrice: 0.12 },
];

// ─── Saham IDX yang tampil di marquee ────────────────────────────────────────
const STOCK_TICKERS_SCROLL = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "GOTO", "BBNI", "KLBF"];

// ─────────────────────────────────────────────────────────────────────────────
// LiveTickerPrice — deteksi perubahan harga → efek flicker warna
// ─────────────────────────────────────────────────────────────────────────────
function LiveTickerPrice({
  price,
  format = "crypto",
}: {
  price: number;
  format?: "crypto" | "stock" | "index";
}) {
  const { theme } = useThemeAuth();
  const [dir, setDir] = useState<"up" | "down" | "neutral">("neutral");
  const prevRef = useRef(price);

  useEffect(() => {
    if (price === prevRef.current) return;
    setDir(price > prevRef.current ? "up" : "down");
    prevRef.current = price;
    const t = setTimeout(() => setDir("neutral"), 350);
    return () => clearTimeout(t);
  }, [price]);

  let display = "";
  if (format === "crypto") {
    display = price < 0.01
      ? price.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 })
      : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (format === "index") {
    display = price.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    display = Math.round(price).toLocaleString("id-ID");
  }

  const neutralColor = theme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <motion.span
      animate={{
        color: dir === "up" ? "#089981" : dir === "down" ? "#f23645" : neutralColor,
      }}
      transition={{ duration: 0.12 }}
      className="font-mono font-bold tabular-nums text-xs"
    >
      {format === "crypto" ? `$${display}` : format === "index" ? display : `Rp ${display}`}
    </motion.span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useCryptoPrices — Binance WebSocket untuk harga crypto live
// ─────────────────────────────────────────────────────────────────────────────
function useCryptoPrices(): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>(
    () => Object.fromEntries(CRYPTO_PAIRS.map(p => [p.symbol, p.basePrice]))
  );

  useEffect(() => {
    const streams = CRYPTO_PAIRS
      .map(p => `${p.symbol.toLowerCase()}@miniTicker`)
      .join("/");
    const ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${streams}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const t = msg?.data;
        if (t?.s && t?.c) {
          setPrices(prev => ({ ...prev, [t.s]: parseFloat(t.c) }));
        }
      } catch { /* ignore */ }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  return prices;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MarketMarquee({ marketType }: { marketType: "crypto" | "stocks" }) {
  // ✅ Pakai context yang sama dengan StocksPanel
  const { prices: stockPrices } = useStockPrices();
  const cryptoPrices = useCryptoPrices();

  // ── Crypto Marquee ──────────────────────────────────────────────────────────
  const renderCryptoMarquee = () => {
    const items = Array(10).fill(CRYPTO_PAIRS).flat();
    return (
      <div className="flex w-full overflow-hidden bg-card border-b border-border py-2 relative select-none">
        <motion.div
          className="flex items-center whitespace-nowrap gap-10 pr-10"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 110, repeat: Infinity }}
          style={{ willChange: "transform", width: "max-content" }}
        >
          {items.map((c, i) => (
            <div key={`cr-${c.symbol}-${i}`} className="flex items-center gap-1.5 shrink-0">
              <span className="font-semibold text-foreground/70 text-xs">{c.symbol.replace("USDT", "")}</span>
              <LiveTickerPrice price={cryptoPrices[c.symbol] ?? c.basePrice} format="crypto" />
            </div>
          ))}
        </motion.div>
      </div>
    );
  };

  // ── Stocks Marquee ──────────────────────────────────────────────────────────
  const renderStocksMarquee = () => {
    const ihsgPrice = stockPrices["IHSG"] ?? 5886.51;
    const items = Array(10).fill(STOCK_TICKERS_SCROLL).flat();

    return (
      <div className="flex w-full bg-card border-b border-border overflow-hidden relative select-none">
        {/* IHSG — fixed di kiri */}
        <div className="z-10 flex items-center gap-2 px-4 py-2 bg-card border-r border-border shrink-0
                        shadow-[4px_0_16px_rgba(0,0,0,0.07)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.25)]">
          <span className="font-extrabold text-xs text-foreground tracking-wide">IHSG</span>
          <LiveTickerPrice price={ihsgPrice} format="index" />
        </div>

        {/* Saham lain — scrolling */}
        <div className="flex flex-1 overflow-hidden">
          <motion.div
            className="flex items-center whitespace-nowrap gap-10 pl-4 pr-10 py-2"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 110, repeat: Infinity }}
            style={{ willChange: "transform", width: "max-content" }}
          >
            {items.map((sym, i) => {
              const price = stockPrices[sym] ?? 1000;
              return (
                <div key={`st-${sym}-${i}`} className="flex items-center gap-1.5 shrink-0">
                  <span className="font-semibold text-foreground/70 text-xs">{sym}</span>
                  <LiveTickerPrice price={price} format="stock" />
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-full mb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={marketType}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {marketType === "crypto" ? renderCryptoMarquee() : renderStocksMarquee()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}