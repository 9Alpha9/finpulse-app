import { NextRequest, NextResponse } from "next/server";
const BINANCE_BASE = "https://data-api.binance.vision";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    const qs = symbol
      ? `?symbol=${encodeURIComponent(symbol.toUpperCase())}`
      : "";
    const url = `${BINANCE_BASE}/api/v3/ticker/price${qs}`;

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
    console.error("[/api/crypto/price]", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "fetch failed" },
      { status: 500 }
    );
  }
}
