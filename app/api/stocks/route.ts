import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "BBCA.JK";
    const interval = searchParams.get("interval") || "1d";

    // Map standard intervals to Yahoo intervals & ranges
    let yahooInterval = "1d";
    let yahooRange = "1y";

    switch (interval) {
      case "15m":
        yahooInterval = "15m";
        yahooRange = "5d";
        break;
      case "1h":
        yahooInterval = "1h";
        yahooRange = "1mo";
        break;
      case "4h":
        yahooInterval = "1h"; // fallback
        yahooRange = "3mo";
        break;
      case "1d":
        yahooInterval = "1d";
        yahooRange = "1y";
        break;
      case "1w":
        yahooInterval = "1wk";
        yahooRange = "2y";
        break;
      case "1M":
        yahooInterval = "1mo";
        yahooRange = "5y";
        break;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${yahooRange}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 60 } // cache for 1 minute
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance responded with status: ${res.status}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("No chart data returned from Yahoo Finance");
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];

    const klines = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] !== null &&
        highs[i] !== null &&
        lows[i] !== null &&
        closes[i] !== null &&
        opens[i] !== undefined
      ) {
        klines.push({
          time: timestamps[i],
          open: parseFloat(opens[i].toFixed(2)),
          high: parseFloat(highs[i].toFixed(2)),
          low: parseFloat(lows[i].toFixed(2)),
          close: parseFloat(closes[i].toFixed(2)),
        });
      }
    }

    return NextResponse.json({ klines });
  } catch (err: any) {
    console.error("Error in stock API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
