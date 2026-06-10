/**
 * IDX Stock Data Provider for FinPulse
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
  logo: string;
  changePercent: number;
  peRatio: string;
  dividendYield: string;
  marketCap: string;
  volume: string;
  prevClose: number;
}

// Daftar saham pilihan (LQ45 & Blue Chip Indonesia)
export const stockTickers: Record<string, Omit<StockInfo, "price" | "change" | "changePercent" | "prevClose">> = {
  IHSG: { symbol: "^JKSE", name: "IHSG (Composite Index)", sector: "Market Index", logo: "", peRatio: "-", dividendYield: "-", marketCap: "Rp 11.500 T", volume: "21.5B" },
  BBCA: { symbol: "BBCA", name: "Bank Central Asia Tbk", sector: "Financials", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/e/fc/Logo_Bank_Central_Asia.svg/1200px-Logo_Bank_Central_Asia.svg.png", peRatio: "24.5x", dividendYield: "2.1%", marketCap: "Rp 1.263 T", volume: "82.4M" },
  BBRI: { symbol: "BBRI", name: "Bank Rakyat Indonesia Tbk", sector: "Financials", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/f/f3/Bank_Rakyat_Indonesia_logo.svg/1200px-Bank_Rakyat_Indonesia_logo.svg.png", peRatio: "14.8x", dividendYield: "4.8%", marketCap: "Rp 718 T", volume: "125.1M" },
  BMRI: { symbol: "BMRI", name: "Bank Mandiri Tbk", sector: "Financials", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/a/ad/Bank_Mandiri_logo_2016.svg/1200px-Bank_Mandiri_logo_2016.svg.png", peRatio: "11.5x", dividendYield: "5.2%", marketCap: "Rp 582 T", volume: "61.3M" },
  TLKM: { symbol: "TLKM", name: "Telkom Indonesia Tbk", sector: "Communication", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/7/75/Telkom_Indonesia_2013.svg/1200px-Telkom_Indonesia_2013.svg.png", peRatio: "15.2x", dividendYield: "3.9%", marketCap: "Rp 376 T", volume: "94.6M" },
  ASII: { symbol: "ASII", name: "Astra International Tbk", sector: "Conglomerate", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/d/d7/Astra_International_logo.svg/1200px-Astra_International_logo.svg.png", peRatio: "7.8x", dividendYield: "6.8%", marketCap: "Rp 210 T", volume: "42.8M" },
  BBNI: { symbol: "BBNI", name: "Bank Negara Indonesia Tbk", sector: "Financials", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/3/30/BNI_logo.svg/1200px-BNI_logo.svg.png", peRatio: "10.2x", dividendYield: "4.1%", marketCap: "Rp 195 T", volume: "35.2M" },
  ICBP: { symbol: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Goods", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/5/52/Indofood_CBP_logo.svg/1200px-Indofood_CBP_logo.svg.png", peRatio: "18.5x", dividendYield: "2.4%", marketCap: "Rp 132 T", volume: "12.5M" },
  UNVR: { symbol: "UNVR", name: "Unilever Indonesia Tbk", sector: "Consumer Goods", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/4/41/Unilever_logo.svg/1200px-Unilever_logo.svg.png", peRatio: "28.3x", dividendYield: "4.2%", marketCap: "Rp 105 T", volume: "22.8M" },
  GOTO: { symbol: "GOTO", name: "GoTo Gojek Tokopedia Tbk", sector: "Technology", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/GoTo_logo.svg/1200px-GoTo_logo.svg.png", peRatio: "-", dividendYield: "-", marketCap: "Rp 85 T", volume: "950M" },
  KLBF: { symbol: "KLBF", name: "Kalbe Farma Tbk", sector: "Healthcare", logo: "https://upload.wikimedia.org/wikipedia/id/thumb/e/e6/Logo_Kalbe_Farma.svg/1200px-Logo_Kalbe_Farma.svg.png", peRatio: "22.1x", dividendYield: "2.0%", marketCap: "Rp 78 T", volume: "18.4M" },
  WBSA: { symbol: "WBSA", name: "Wahana Buana Samudra Tbk", sector: "Logistics", logo: "https://wahanabuanasamudra.com/wp-content/uploads/2021/04/cropped-logo-wbs-200x200.png", peRatio: "12.8x", dividendYield: "4.5%", marketCap: "Rp 2.4 T", volume: "15.1M" },
};

// Seed data harga untuk simulasi (Base Price dalam Rupiah)
const basePrices: Record<string, number> = {
  IHSG: 7250, BBCA: 10250, BBRI: 4820, BMRI: 6150, TLKM: 3820, ASII: 5225,
  BBNI: 5100, ICBP: 10450, UNVR: 3650, GOTO: 65, KLBF: 1650, WBSA: 468,
};

export function getStockInfo(symbol: string): StockInfo {
  const meta = stockTickers[symbol] || { symbol, name: "Unknown Stock", sector: "Other", peRatio: "-", dividendYield: "-", marketCap: "-", volume: "-" };
  const basePrice = basePrices[symbol] || 1000;

  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomDrift = Math.sin(Date.now() / 86400000 + seed) * 0.015;
  const change = Math.round(basePrice * randomDrift);

  return {
    ...meta,
    price: basePrice + change,
    change,
    changePercent: (change / basePrice) * 100,
    prevClose: basePrice,
  };
}

export function fetchStockKlinesMock(symbol: string, interval: string, limit = 200): StockKline[] {
  const basePrice = basePrices[symbol] || 1000;
  const klines: StockKline[] = [];
  let currentTimestamp = Math.floor(Date.now() / 1000) - (86400 * 30);
  let price = basePrice;
  const seedVal = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  for (let i = 0; i < limit; i++) {
    const rand = Math.sin(i * 0.2 + seedVal) * Math.cos(i * 0.05);
    const volatility = basePrice * 0.012;
    const change = rand * volatility;

    const close = Math.round(price);
    const open = Math.round(price - change);

    klines.push({
      time: currentTimestamp,
      open,
      high: Math.round(Math.max(open, close) + Math.random() * volatility * 0.5),
      low: Math.round(Math.min(open, close) - Math.random() * volatility * 0.5),
      close,
    });

    price = open;
    currentTimestamp += 86400; // Next day
  }
  return klines;
}

export function getYahooTicker(symbol: string): string {
  return (symbol === "IHSG" || symbol === "^JKSE") ? "^JKSE" : (symbol.endsWith(".JK") ? symbol : `${symbol}.JK`);
}

export async function fetchStockPriceFromYahoo(symbol: string): Promise<number> {
  const ticker = getYahooTicker(symbol);
  const res = await fetch(`/api/stocks?symbol=${ticker}&interval=1d`);
  if (!res.ok) return getStockInfo(symbol).price; // Fallback ke mock
  const data = await res.json();
  return data.klines?.length > 0 ? data.klines[data.klines.length - 1].close : getStockInfo(symbol).price;
}

export async function fetchStockKlinesFromYahoo(symbol: string, interval: string, limit = 200): Promise<StockKline[]> {
  const ticker = getYahooTicker(symbol);
  const res = await fetch(`/api/stocks?symbol=${ticker}&interval=${interval}`);
  if (!res.ok) return fetchStockKlinesMock(symbol, interval, limit); // Fallback ke mock
  const data = await res.json();
  const finalLimit = (symbol === "IHSG" || symbol === "^JKSE") ? Math.max(limit, 100000) : limit;
  return data.klines?.slice(-finalLimit) || fetchStockKlinesMock(symbol, interval, limit);
}