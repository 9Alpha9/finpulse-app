/**
 * Binance API Helper for REST fetching and WebSocket streaming
 */

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// 1. Fetch current price of any crypto symbol via REST API
export async function fetchCryptoPrice(symbol: string): Promise<number> {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
  if (!res.ok) throw new Error(`Failed to fetch price for ${symbol} from Binance`);
  const data = await res.json();
  return parseFloat(data.price);
}

// 2. Fetch historical klines for any crypto symbol and interval via REST API
export async function fetchCryptoKlines(
  symbol: string,
  interval: string,
  limit = 1000
): Promise<KlineData[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Failed to fetch klines for ${symbol} from Binance`);
  const data = await res.json();
  
  // Parse kline fields
  return data.map((item: any[]) => {
    return {
      time: Math.floor(item[0] / 1000), // open time in seconds
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    };
  });
}

// 3. Connect to Binance live ticker WebSocket stream dynamically for any symbol
export function connectCryptoWebSocket(
  symbol: string,
  onMessage: (data: { price: number; changePercent: number }) => void,
  onError?: (err: Event) => void
): WebSocket {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const price = parseFloat(payload.c); // Last price
      const changePercent = parseFloat(payload.P); // Price change percent
      onMessage({ price, changePercent });
    } catch (e) {
      console.error(`Error parsing Binance WebSocket frame for ${symbol}:`, e);
    }
  };

  if (onError) {
    ws.onerror = (err) => onError(err);
  }

  return ws;
}

// 4. Fetch all active USDT trading pairs from Binance
export async function fetchActiveCryptoPairs(): Promise<string[]> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    if (!res.ok) throw new Error("Failed to fetch tickers from Binance");
    const data = await res.json();
    
    // Filter for USDT pairs
    const usdtPairs = data
      .map((item: any) => item.symbol)
      .filter((sym: string) => sym.endsWith("USDT"));
      
    // A list of high priority, popular coins to show first
    const popular = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "DOTUSDT", "DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "LINKUSDT", "NEARUSDT", "AVAXUSDT", "MATICUSDT", "LTCUSDT"];
    
    // Sort so popular ones are first, and the rest alphabetically
    const otherPairs = usdtPairs
      .filter((sym: string) => !popular.includes(sym))
      .sort((a: string, b: string) => a.localeCompare(b));
      
    return [...popular.filter(sym => usdtPairs.includes(sym)), ...otherPairs];
  } catch (err) {
    console.error("Error fetching crypto pairs:", err);
    // Fallback static list in case of network issues
    return ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "DOTUSDT", "DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "LINKUSDT", "NEARUSDT"];
  }
}
