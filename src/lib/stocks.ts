/**
 * IDX Stock Data Provider for ArthaVerse
 */

export interface StockKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  peRatio: string;
  dividendYield: string;
  marketCap: string;
  volume: string;
  prevClose: number;
}

export const stockTickers: Record<string, Omit<StockInfo, "price" | "change" | "changePercent" | "prevClose">> = {
  BBCA: {
    symbol: "BBCA",
    name: "Bank Central Asia Tbk",
    sector: "Banking / Financial Services",
    peRatio: "24.5x",
    dividendYield: "2.1%",
    marketCap: "Rp 1.263 T",
    volume: "82.4M",
  },
  BBRI: {
    symbol: "BBRI",
    name: "Bank Rakyat Indonesia Tbk",
    sector: "Banking / Financial Services",
    peRatio: "14.8x",
    dividendYield: "4.8%",
    marketCap: "Rp 718 T",
    volume: "125.1M",
  },
  TLKM: {
    symbol: "TLKM",
    name: "Telkom Indonesia Tbk",
    sector: "Telecommunications & Infrastructure",
    peRatio: "15.2x",
    dividendYield: "3.9%",
    marketCap: "Rp 376 T",
    volume: "94.6M",
  },
  BMRI: {
    symbol: "BMRI",
    name: "Bank Mandiri Tbk",
    sector: "Banking / Financial Services",
    peRatio: "11.5x",
    dividendYield: "5.2%",
    marketCap: "Rp 582 T",
    volume: "61.3M",
  },
  ASII: {
    symbol: "ASII",
    name: "Astra International Tbk",
    sector: "Conglomerate / Automotive / Heavy Machinery",
    peRatio: "7.8x",
    dividendYield: "6.8%",
    marketCap: "Rp 210 T",
    volume: "42.8M",
  },
  WBSA: {
    symbol: "WBSA",
    name: "Wahana Buana Samudra Tbk",
    sector: "Logistics / Maritime Cargo & Shipping",
    peRatio: "12.8x",
    dividendYield: "4.5%",
    marketCap: "Rp 2.4 T",
    volume: "15.1M",
  },
};

const basePrices: Record<string, number> = {
  BBCA: 10250,
  BBRI: 4820,
  TLKM: 3820,
  BMRI: 6150,
  ASII: 5225,
  WBSA: 468,
};

// Get current live stock details
export function getStockInfo(symbol: string): StockInfo {
  const meta = stockTickers[symbol] || stockTickers.BBCA;
  const basePrice = basePrices[symbol] || 1000;
  
  // Seed random daily changes
  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomDrift = Math.sin(Date.now() / 86400000 + seed) * 0.015;
  const change = Math.floor(basePrice * randomDrift);
  const prevClose = basePrice - change;
  const price = basePrice;
  const changePercent = (change / prevClose) * 100;
  
  return {
    ...meta,
    price,
    change,
    changePercent,
    prevClose,
  };
}

// Generate realistic daily candlesticks skipping weekends (Fallback)
export function fetchStockKlinesMock(symbol: string, interval: string, limit = 200): StockKline[] {
  const basePrice = basePrices[symbol] || 1000;
  const klines: StockKline[] = [];
  
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  let currentTimestamp = Math.floor(now.getTime() / 1000);
  
  let price = basePrice;
  const seedVal = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let i = 0; i < limit; i++) {
    const dateObj = new Date(currentTimestamp * 1000);
    const day = dateObj.getUTCDay();
    
    if (day === 0 || day === 6) {
      currentTimestamp -= 24 * 60 * 60;
      i--;
      continue;
    }
    
    const rand = Math.sin(i * 0.2 + seedVal) * Math.cos(i * 0.05);
    const volatility = basePrice * 0.012;
    const change = rand * volatility;
    
    const close = Math.round(price);
    const open = Math.round(price - change);
    
    const high = Math.round(Math.max(open, close) + Math.abs(Math.sin(i + seedVal)) * (volatility * 0.5));
    const low = Math.round(Math.min(open, close) - Math.abs(Math.cos(i + seedVal)) * (volatility * 0.5));
    
    klines.unshift({
      time: currentTimestamp,
      open,
      high,
      low,
      close,
    });
    
    price = open;
    currentTimestamp -= 24 * 60 * 60;
  }
  
  return klines;
}

// Fetch real stock prices from Yahoo Finance API via proxy API route
export async function fetchStockPriceFromYahoo(symbol: string): Promise<number> {
  const ticker = symbol.endsWith(".JK") ? symbol : `${symbol}.JK`;
  const res = await fetch(`/api/stocks?symbol=${ticker}&interval=1d`);
  if (!res.ok) throw new Error(`Failed to fetch stock price from API for ${ticker}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const klines = data.klines || [];
  if (klines.length === 0) throw new Error("No kline data returned");
  return klines[klines.length - 1].close;
}

// Fetch real stock klines from Yahoo Finance API via proxy API route
export async function fetchStockKlinesFromYahoo(
  symbol: string,
  interval: string,
  limit = 200
): Promise<StockKline[]> {
  const ticker = symbol.endsWith(".JK") ? symbol : `${symbol}.JK`;
  const res = await fetch(`/api/stocks?symbol=${ticker}&interval=${interval}`);
  if (!res.ok) throw new Error(`Failed to fetch stock klines from API for ${ticker}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const klines = data.klines || [];
  return klines.slice(-limit);
}
