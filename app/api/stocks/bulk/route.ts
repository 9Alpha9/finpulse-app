import { NextResponse } from "next/server";
import { stockTickers } from "@/src/lib/stocks";

export async function GET() {
  try {
    const symbols = [
      "^JKSE",
      ...Object.keys(stockTickers).filter(s => s !== "IHSG").map(s => `${s}.JK`)
    ];

    const priceMap: Record<string, number> = {};

    // Gunakan v8/chart secara paralel karena v7/quote sering terkena blokir (401)
    const promises = symbols.map(async (sym) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 } // Cache 60 detik
      });

      if (!res.ok) return null;

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        let cleanSym = sym.replace(".JK", "");
        if (sym === "^JKSE") cleanSym = "IHSG";
        priceMap[cleanSym] = meta.regularMarketPrice;
      }
    });

    await Promise.allSettled(promises);

    return NextResponse.json(priceMap);
  } catch (err: any) {
    console.error("Error in bulk stock API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
