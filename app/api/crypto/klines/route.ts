import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/crypto/klines?symbol=BTCUSDT&interval=1d&limit=1000&endTime=...
 *
 * Proxy server-side ke data-api.binance.vision
 * (dapat diakses dari server Indonesia, tidak butuh VPN)
 */

const BINANCE_BASE = "https://data-api.binance.vision";

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

    const url = `${BINANCE_BASE}/api/v3/klines?${qs.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("[/api/crypto/klines]", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "fetch failed" },
      { status: 500 }
    );
  }
}
