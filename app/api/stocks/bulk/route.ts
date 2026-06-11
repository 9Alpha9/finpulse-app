import { NextResponse } from "next/server";
import { stockTickers } from "@/src/lib/stocks";

export interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
}

export async function GET() {
  try {
    const symbols = [
      "^JKSE",
      ...Object.keys(stockTickers).filter(s => s !== "IHSG").map(s => `${s}.JK`)
    ];

    const quoteMap: Record<string, StockQuote> = {};

    // Gunakan v8/chart secara paralel karena v7/quote sering terkena blokir (401)
    const promises = symbols.map(async (sym) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 30 } // Cache 30 detik
      });

      if (!res.ok) return;

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return;

      let cleanSym = sym.replace(".JK", "");
      if (sym === "^JKSE") cleanSym = "IHSG";

      const price: number = meta.regularMarketPrice;
      // Yahoo menyediakan previousClose secara langsung di meta
      const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change: number = parseFloat((price - prevClose).toFixed(2));
      const changePercent: number = prevClose > 0
        ? parseFloat(((change / prevClose) * 100).toFixed(2))
        : 0;

      quoteMap[cleanSym] = { price, change, changePercent, prevClose };
    });

    await Promise.allSettled(promises);

    return NextResponse.json(quoteMap);
  } catch (err: any) {
    console.error("Error in bulk stock API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
