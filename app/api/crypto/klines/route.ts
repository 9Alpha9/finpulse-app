import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/crypto/klines?symbol=BTCUSDT&interval=1d&limit=1000&endTime=...
 *
 * Proxy ke Binance api.binance.info/api/v3/klines — dijalankan server-side
 * sehingga tidak terkena CORS maupun blokir ISP di sisi browser.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol   = searchParams.get("symbol");
    const interval = searchParams.get("interval");
    const limit    = searchParams.get("limit") ?? "1000";
    const endTime  = searchParams.get("endTime");

    if (!symbol || !interval) {
      return NextResponse.json(
        { error: "Parameter `symbol` dan `interval` wajib diisi." },
        { status: 400 }
      );
    }

    const qs = new URLSearchParams({
      symbol:   symbol.toUpperCase(),
      interval,
      limit,
    });
    if (endTime) qs.set("endTime", endTime);

    const binanceUrl = `https://api.binance.info/api/v3/klines?${qs.toString()}`;

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
    console.error("[/api/crypto/klines]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
