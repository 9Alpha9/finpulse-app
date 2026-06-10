import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/crypto/price?symbol=BTCUSDT
 * GET /api/crypto/price           (all USDT pairs)
 *
 * Proxy ke Binance api.binance.info — dijalankan server-side
 * sehingga tidak terkena CORS maupun blokir ISP di sisi browser.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    const qs = symbol ? `?symbol=${encodeURIComponent(symbol.toUpperCase())}` : "";
    const binanceUrl = `https://api.binance.info/api/v3/ticker/price${qs}`;

    const res = await fetch(binanceUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[/api/crypto/price]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
