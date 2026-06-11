import { NextResponse } from "next/server";
import { stockTickers } from "@/src/lib/stocks";

export async function GET() {
  try {
    // Kumpulkan semua simbol (tambahkan .JK untuk saham Indonesia)
    const symbols = [
      "^JKSE", 
      ...Object.keys(stockTickers).filter(s => s !== "IHSG").map(s => `${s}.JK`)
    ];
    
    // Yahoo Finance aman melayani ~50 simbol sekaligus dalam satu request quote
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 60 } // Cache selama 1 menit agar tidak rate-limit
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance responded with status: ${res.status}`);
    }

    const data = await res.json();
    const results = data.quoteResponse?.result || [];

    // Format menjadi map { "BBCA": 10250, "IHSG": 7200, ... }
    const priceMap: Record<string, number> = {};
    for (const item of results) {
      let sym = item.symbol.replace(".JK", "");
      if (item.symbol === "^JKSE") sym = "IHSG";
      if (item.regularMarketPrice) {
        priceMap[sym] = item.regularMarketPrice;
      }
    }

    return NextResponse.json(priceMap);
  } catch (err: any) {
    console.error("Error in bulk stock API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
