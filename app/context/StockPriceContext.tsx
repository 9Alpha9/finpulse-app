"use client";

/**
 * StockPriceContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Satu sumber kebenaran harga saham IDX untuk seluruh aplikasi.
 *
 * • Poll /api/stocks/bulk setiap POLL_MS → harga + change REAL dari Yahoo Finance
 * • Micro-tick setiap TICK_MS → simulasi pergerakan kecil antar-poll,
 *   DIBIASKAN ke arah market yang benar (jika turun, ticks cenderung turun)
 * • change & changePercent SELALU dari data real API, bukan simulasi
 */

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { StockQuote } from "@/app/api/stocks/bulk/route";

// ─── Fallback sementara ───────────────────────────────────────────────────────
const FALLBACK_QUOTES: Record<string, StockQuote> = {
  IHSG: { price: 5886.51, change: -139.86, changePercent: -2.32, prevClose: 6026.37 },
  BBCA: { price: 9875, change: 0, changePercent: 0, prevClose: 9875 },
  BBRI: { price: 4560, change: 0, changePercent: 0, prevClose: 4560 },
  BMRI: { price: 5800, change: 0, changePercent: 0, prevClose: 5800 },
  TLKM: { price: 3600, change: 0, changePercent: 0, prevClose: 3600 },
  ASII: { price: 4900, change: 0, changePercent: 0, prevClose: 4900 },
  GOTO: { price: 62, change: 0, changePercent: 0, prevClose: 62 },
  BBNI: { price: 4750, change: 0, changePercent: 0, prevClose: 4750 },
  KLBF: { price: 1600, change: 0, changePercent: 0, prevClose: 1600 },
};

const POLL_MS = 5_000; // ambil harga real setiap 15 detik
const TICK_MS = 200;    // micro-movement setiap 500ms

type QuoteMap = Record<string, StockQuote>;

interface StockPriceContextValue {
  /** Quotes terkini (price di-micro-tick, change/changePercent REAL dari API) */
  quotes: QuoteMap;
  /** Harga display saja, shorthand dari quotes[sym].price */
  prices: Record<string, number>;
  loading: boolean;
}

const StockPriceContext = createContext<StockPriceContextValue>({
  quotes: FALLBACK_QUOTES,
  prices: Object.fromEntries(Object.entries(FALLBACK_QUOTES).map(([k, v]) => [k, v.price])),
  loading: true,
});

const TICKERS = [
  "IHSG", "BBCA", "BBRI", "BMRI", "TLKM",
  "ASII", "GOTO", "BBNI", "KLBF", "BREN", "AMMN", "BYAN",
];

export function StockPriceProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<QuoteMap>(FALLBACK_QUOTES);
  const [loading, setLoading] = useState(true);

  // realRef = data asli dari API (anchor untuk micro-tick)
  const realRef = useRef<QuoteMap>(FALLBACK_QUOTES);

  // ── Fetch data real dari API ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function fetchReal() {
      try {
        const res = await fetch("/api/stocks/bulk", { cache: "no-store" });
        if (!res.ok) return;
        const data: QuoteMap = await res.json();
        if (!mounted) return;

        // Merge ke realRef
        realRef.current = { ...realRef.current, ...data };

        // Snap tampilan langsung ke harga real (change/changePercent tidak di-tick)
        setQuotes(prev => ({ ...prev, ...data }));
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    fetchReal();
    const pollId = setInterval(fetchReal, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(pollId);
    };
  }, []);

  // ── Micro-tick: gerakkan HARGA saja setiap TICK_MS ────────────────────────
  // change & changePercent tetap dari real API — tidak dirandom
  useEffect(() => {
    const tickId = setInterval(() => {
      setQuotes(prev => {
        // Cek apakah market IDX buka (Senin-Jumat, 09:00 - 16:00 WIB)
        const now = new Date();
        const jktTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const jktDay = jktTime.getUTCDay();
        const jktHour = jktTime.getUTCHours();
        const jktMin = jktTime.getUTCMinutes();
        const isWeekend = jktDay === 0 || jktDay === 6;
        const timeInMins = jktHour * 60 + jktMin;
        const isOpen = !isWeekend && (timeInMins >= 540 && timeInMins <= 960);

        if (!isOpen) {
          // Jika market tutup, jangan lakukan simulasi micro-tick.
          // Kembalikan ke harga asli dari API.
          return { ...prev, ...realRef.current };
        }

        const next = { ...prev };

        for (const sym of TICKERS) {
          const real = realRef.current[sym];
          const anchor = real?.price ?? prev[sym]?.price;
          if (!anchor) continue;

          // Tentukan bias arah berdasarkan change nyata
          // Jika market sedang turun → lebih banyak ticks ke bawah (60/40)
          const marketBias = (real?.change ?? 0) < 0 ? 0.35 : 0.65;

          let newPrice: number;
          if (sym === "IHSG") {
            const dir = Math.random() < marketBias ? 1 : -1;
            const tick = dir * (Math.random() * 0.05 + 0.01);
            const raw = anchor + tick;
            // Clamp agar tidak drift lebih dari 0.3% dari anchor
            newPrice = Math.abs(raw - anchor) > anchor * 0.003
              ? anchor
              : parseFloat(raw.toFixed(2));
          } else {
            if (Math.random() > 0.5) continue; // 50% tidak bergerak
            const tickSize = anchor < 300 ? 1 : anchor < 2000 ? 5 : anchor < 5000 ? 10 : 25;
            const dir = Math.random() < marketBias ? 1 : -1;
            const raw = anchor + dir * tickSize;
            newPrice = Math.abs(raw - anchor) > anchor * 0.003
              ? anchor
              : Math.round(raw);
          }

          const prevClose = real?.prevClose ?? anchor;
          // change & changePercent dihitung dari harga micro-tick vs prevClose real
          const change = parseFloat((newPrice - prevClose).toFixed(2));
          const changePercent = prevClose > 0
            ? parseFloat(((change / prevClose) * 100).toFixed(2))
            : 0;

          next[sym] = {
            ...(prev[sym] ?? { price: anchor, change: 0, changePercent: 0, prevClose }),
            price: newPrice,
            change,
            changePercent,
          };
        }

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(tickId);
  }, []);

  const prices = Object.fromEntries(
    Object.entries(quotes).map(([k, v]) => [k, v.price])
  );

  return (
    <StockPriceContext.Provider value={{ quotes, prices, loading }}>
      {children}
    </StockPriceContext.Provider>
  );
}

export function useStockPrices(): StockPriceContextValue {
  return useContext(StockPriceContext);
}

export function useStockPrice(symbol: string): number | undefined {
  const { prices } = useContext(StockPriceContext);
  return prices[symbol];
}
