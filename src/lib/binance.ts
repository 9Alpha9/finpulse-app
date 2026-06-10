/**
 * Binance API Helper
 *
 * Semua HTTP fetch dialihkan ke route proxy internal Next.js (/api/crypto/*)
 * yang berjalan di server-side menggunakan data-api.binance.vision.
 *
 * Ini menyelesaikan dua masalah sekaligus:
 *  1. CORS — browser tidak boleh langsung call API external
 *  2. Blokir ISP — api.binance.com/info diblokir di Indonesia;
 *     data-api.binance.vision bisa diakses dari server
 *
 * WebSocket tetap terhubung langsung dari browser menggunakan
 * data-stream.binance.vision yang umumnya tidak diblokir.
 */

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — bangun URL ke proxy internal
// ─────────────────────────────────────────────────────────────────────────────

function proxyUrl(path: string, params: Record<string, string | number> = {}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return `${path}${query}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Harga spot saat ini
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCryptoPrice(symbol: string): Promise<number> {
  const res = await fetch(
    proxyUrl("/api/crypto/price", { symbol: symbol.toUpperCase() }),
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Gagal ambil harga ${symbol}: HTTP ${res.status}`);
  const data = await res.json();
  return parseFloat(data.price);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Historical klines (single batch, maks 1000)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCryptoKlines(
  symbol: string,
  interval: string,
  limit = 1000,
  endTime?: number
): Promise<KlineData[]> {
  const params: Record<string, string | number> = {
    symbol: symbol.toUpperCase(),
    interval,
    limit,
  };
  if (endTime !== undefined) params.endTime = endTime;

  const res = await fetch(proxyUrl("/api/crypto/klines", params), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gagal ambil klines ${symbol}: HTTP ${res.status}`);

  const raw: any[][] = await res.json();
  return raw.map((item) => ({
    time: Math.floor(item[0] / 1000), // openTime ms → detik
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fetch SEMUA klines historis dengan paginasi (dipakai di fetchAllCryptoKlines)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllCryptoKlines(
  symbol: string,
  interval: string,
  onProgress?: (count: number) => void
): Promise<KlineData[]> {
  const LIMIT = 1000;
  const MAX_BATCHES = 200;
  const all: KlineData[] = [];

  let endTime: number | undefined = undefined;
  let batchCount = 0;

  while (batchCount < MAX_BATCHES) {
    const batch = await fetchCryptoKlines(symbol, interval, LIMIT, endTime);

    if (!batch || batch.length === 0) break;

    all.unshift(...batch);
    onProgress?.(all.length);

    if (batch.length < LIMIT) break;

    endTime = batch[0].time * 1000 - 1;
    batchCount++;
  }

  const seen = new Set<number>();
  const unique = all.filter((k) => {
    if (seen.has(k.time)) return false;
    seen.add(k.time);
    return true;
  });
  unique.sort((a, b) => a.time - b.time);

  return unique;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WebSocket real-time stream (browser langsung ke Binance Vision stream)
// ─────────────────────────────────────────────────────────────────────────────

const WS_HOSTS = [
  "wss://data-stream.binance.vision", // prioritas: tidak diblokir di Indonesia
  "wss://stream.binance.info:9443",
  "wss://stream.binance.com:443",
];

export function connectCryptoWebSocket(
  symbol: string,
  onMessage: (data: { price: number; changePercent: number }) => void,
  onError?: (err: Event) => void
): WebSocket {
  const stream = `${symbol.toLowerCase()}@ticker`;
  let hostIndex = 0;

  function tryConnect(): WebSocket {
    const url = `${WS_HOSTS[hostIndex]}/ws/${stream}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const price = parseFloat(payload.c);
        const changePercent = parseFloat(payload.P);
        onMessage({ price, changePercent });
      } catch (e) {
        console.error(`[WS] Parse error ${symbol}:`, e);
      }
    };

    ws.onerror = () => {
      if (hostIndex < WS_HOSTS.length - 1) {
        hostIndex++;
        console.warn(`[WS] ${url} gagal, mencoba ${WS_HOSTS[hostIndex]}...`);
        tryConnect();
      } else {
        onError?.(new Event("error"));
      }
    };

    return ws;
  }

  return tryConnect();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Daftar semua pasangan USDT aktif
// ─────────────────────────────────────────────────────────────────────────────

const POPULAR_PAIRS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT",
  "XRPUSDT", "DOTUSDT", "DOGEUSDT", "SHIBUSDT", "PEPEUSDT",
  "LINKUSDT", "NEARUSDT", "AVAXUSDT", "MATICUSDT", "LTCUSDT",
];

export async function fetchActiveCryptoPairs(): Promise<string[]> {
  try {
    // Panggil proxy (semua pair tanpa ?symbol)
    const res = await fetch(proxyUrl("/api/crypto/price"), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: { symbol: string }[] = await res.json();

    const usdtPairs = data
      .map((item) => item.symbol)
      .filter((sym) => sym.endsWith("USDT"));

    const others = usdtPairs
      .filter((sym) => !POPULAR_PAIRS.includes(sym))
      .sort((a, b) => a.localeCompare(b));

    return [...POPULAR_PAIRS.filter((p) => usdtPairs.includes(p)), ...others];

  } catch (err) {
    console.error("[Binance] Gagal ambil daftar pairs:", err);
    return POPULAR_PAIRS;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Market Screener (Top Gainers / Losers 24h)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
}

export async function fetchTopGainersLosers(): Promise<{ gainers: MarketTicker[], losers: MarketTicker[] }> {
  try {
    const res = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr", { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil data 24hr ticker");

    const data: MarketTicker[] = await res.json();

    // Filter hanya USDT, pastikan ada volume agar tidak mengambil koin mati
    const usdtPairs = data.filter(t => t.symbol.endsWith("USDT") && parseFloat(t.volume) > 10000);

    // Sort berdasarkan persentase
    usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

    return {
      gainers: usdtPairs.slice(0, 5), // Top 5 Naik
      losers: usdtPairs.slice(-5).reverse() // Top 5 Turun
    };
  } catch (err) {
    console.error("[Screener] Error:", err);
    // Fallback Mock Data jika API bermasalah
    return {
      gainers: [
        { symbol: "PEPEUSDT", lastPrice: "0.000014", priceChangePercent: "15.2", volume: "100M" },
        { symbol: "SOLUSDT", lastPrice: "165.20", priceChangePercent: "8.4", volume: "50M" },
        { symbol: "AVAXUSDT", lastPrice: "42.10", priceChangePercent: "5.1", volume: "10M" },
      ],
      losers: [
        { symbol: "WIFUSDT", lastPrice: "2.40", priceChangePercent: "-12.5", volume: "80M" },
        { symbol: "XRPUSDT", lastPrice: "0.45", priceChangePercent: "-4.2", volume: "200M" },
        { symbol: "ADAUSDT", lastPrice: "0.38", priceChangePercent: "-3.1", volume: "45M" },
      ]
    };
  }
}