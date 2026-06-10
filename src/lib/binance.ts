/**
 * Binance API Helper via Binance Vision (Anti-Blokir Kominfo & Vercel)
 * * Domain diganti ke .vision untuk mengelabui pemblokiran DNS ISP lokal
 * tanpa memerlukan setup proxy server-side yang rumit.
 */

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — Build URL ke Binance Vision (Bypass DNS Blokir)
// ─────────────────────────────────────────────────────────────────────────────

function buildUrl(path: string, params: Record<string, string | number> = {}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const queryString = qs.toString();
  // Menggunakan data-api.binance.vision yang lolos dari sensor internet positif
  return `https://data-api.binance.vision${path}${queryString ? '?' + queryString : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Harga spot saat ini
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCryptoPrice(symbol: string): Promise<number> {
  const res = await fetch(
    buildUrl("/api/v3/ticker/price", { symbol: symbol.toUpperCase() }),
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Gagal ambil harga ${symbol}: HTTP ${res.status}`);
  const data = await res.json();
  return parseFloat(data.price);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Historical klines (batasan 1000 per request)
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

  const res = await fetch(buildUrl("/api/v3/klines", params), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gagal ambil klines ${symbol}: HTTP ${res.status}`);

  const data = await res.json();
  return data.map((item: any[]) => ({
    time: Math.floor(item[0] / 1000), // openTime → detik
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fetch SEMUA klines historis sejak listing dengan paginasi
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
// 4. WebSocket real-time stream (Menggunakan Data-Stream Vision)
// ─────────────────────────────────────────────────────────────────────────────

const WS_HOSTS = [
  "wss://data-stream.binance.vision",
  "wss://stream.binance.info:9443",
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

    ws.onerror = (err) => {
      if (hostIndex < WS_HOSTS.length - 1) {
        hostIndex++;
        console.warn(`[WS] ${url} gagal, mencoba ${WS_HOSTS[hostIndex]}...`);
        tryConnect();
      } else {
        onError?.(err);
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
    const res = await fetch(buildUrl("/api/v3/ticker/price"), {
      cache: "no-store",
    });
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
    console.error("[Binance Vision] Gagal ambil daftar pairs:", err);
    return POPULAR_PAIRS;
  }
}